#!/usr/bin/env bash

set -euo pipefail

WORKFLOW_FILE="android-release.yml"
DEFAULT_REMOTE="github"
DEFAULT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"

usage() {
  cat <<'EOF'
Usage:
  apk-build.sh trigger [--ref <branch-or-sha>] [--repo <owner/name>] [--debug] [--wait]
  apk-build.sh status [--branch <branch>] [--limit <n>] [--repo <owner/name>]
  apk-build.sh download --run-id <id> [--dir <path>] [--repo <owner/name>]

Commands:
  trigger   Trigger the Android APK GitHub Actions workflow.
  status    Show recent runs for the Android APK workflow.
  download  Download artifacts from a workflow run.
EOF
}

die() {
  echo "Error: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

normalize_repo() {
  local remote_url="$1"
  local repo=""

  case "$remote_url" in
    git@github.com:*)
      repo="${remote_url#git@github.com:}"
      ;;
    https://github.com/*)
      repo="${remote_url#https://github.com/}"
      ;;
    ssh://git@github.com/*)
      repo="${remote_url#ssh://git@github.com/}"
      ;;
    *)
      die "unsupported GitHub remote URL: $remote_url"
      ;;
  esac

  repo="${repo%.git}"
  [[ -n "$repo" ]] || die "failed to resolve GitHub repo from remote URL"
  printf '%s\n' "$repo"
}

resolve_repo() {
  local explicit_repo="${1:-}"
  local remote_url=""

  if [[ -n "$explicit_repo" ]]; then
    printf '%s\n' "$explicit_repo"
    return 0
  fi

  remote_url="$(git remote get-url "$DEFAULT_REMOTE" 2>/dev/null || true)"
  [[ -n "$remote_url" ]] || die "git remote '$DEFAULT_REMOTE' not found; add it or pass --repo owner/name"
  normalize_repo "$remote_url"
}

trigger_run() {
  local ref="$DEFAULT_BRANCH"
  local repo=""
  local debug="false"
  local wait_for_run="false"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --ref)
        ref="$2"
        shift 2
        ;;
      --repo)
        repo="$2"
        shift 2
        ;;
      --debug)
        debug="true"
        shift
        ;;
      --wait)
        wait_for_run="true"
        shift
        ;;
      *)
        die "unknown trigger option: $1"
        ;;
    esac
  done

  repo="$(resolve_repo "$repo")"

  gh workflow run "$WORKFLOW_FILE" --repo "$repo" --ref "$ref" -f "debug=$debug"
  echo "Triggered workflow '$WORKFLOW_FILE' for $repo @ $ref (debug=$debug)"

  if [[ "$wait_for_run" != "true" ]]; then
    return 0
  fi

  local attempt run_id=""
  for attempt in 1 2 3 4 5 6; do
    run_id="$(gh run list \
      --repo "$repo" \
      --workflow "$WORKFLOW_FILE" \
      --branch "$ref" \
      --limit 1 \
      --json databaseId \
      --jq '.[0].databaseId // empty')"

    if [[ -n "$run_id" ]]; then
      echo "Watching run $run_id"
      gh run watch "$run_id" --repo "$repo"
      return 0
    fi

    sleep 5
  done

  die "workflow was triggered but no run became visible after waiting"
}

show_status() {
  local branch=""
  local limit="3"
  local repo=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --branch)
        branch="$2"
        shift 2
        ;;
      --limit)
        limit="$2"
        shift 2
        ;;
      --repo)
        repo="$2"
        shift 2
        ;;
      *)
        die "unknown status option: $1"
        ;;
    esac
  done

  repo="$(resolve_repo "$repo")"

  local args=(
    run list
    --repo "$repo"
    --workflow "$WORKFLOW_FILE"
    --limit "$limit"
    --json databaseId,displayTitle,event,headBranch,headSha,status,conclusion,url,createdAt,updatedAt
  )

  if [[ -n "$branch" ]]; then
    args+=(--branch "$branch")
  fi

  gh "${args[@]}"
}

download_artifacts() {
  local run_id=""
  local output_dir=""
  local repo=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --run-id)
        run_id="$2"
        shift 2
        ;;
      --dir)
        output_dir="$2"
        shift 2
        ;;
      --repo)
        repo="$2"
        shift 2
        ;;
      *)
        die "unknown download option: $1"
        ;;
    esac
  done

  [[ -n "$run_id" ]] || die "download requires --run-id"
  repo="$(resolve_repo "$repo")"
  output_dir="${output_dir:-tmp/apk-artifacts/$run_id}"

  mkdir -p "$output_dir"
  gh run download "$run_id" --repo "$repo" --dir "$output_dir"
  echo "Downloaded artifacts to $output_dir"
}

main() {
  require_command git
  require_command gh

  [[ $# -gt 0 ]] || {
    usage
    exit 1
  }

  local command="$1"
  shift

  case "$command" in
    trigger)
      trigger_run "$@"
      ;;
    status)
      show_status "$@"
      ;;
    download)
      download_artifacts "$@"
      ;;
    -h|--help|help)
      usage
      ;;
    *)
      die "unknown command: $command"
      ;;
  esac
}

main "$@"
