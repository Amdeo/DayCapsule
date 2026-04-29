---
name: apk-build
description: Trigger the current repository's GitHub Actions Android APK workflow through `gh`, inspect recent runs, watch active builds, and download APK artifacts. Use when the user asks to start a remote APK build, rebuild the current branch, fetch the latest unsigned APK artifact, or diagnose a failed GitHub APK build for this repo.
---

# APK Build

Use this skill to drive the repository's GitHub APK build workflow with `gh` instead of hand-writing long commands.

## Workflow

1. Confirm the repository has a GitHub remote named `github` and that `gh` is authenticated.
2. Trigger `.github/workflows/android-release.yml` for the desired ref.
3. Watch or inspect the newest run when the user wants status.
4. Download the artifact when the build succeeds.

## Defaults

- Workflow file: `android-release.yml`
- Preferred remote: `github`
- Default ref: current local branch
- Default artifact directory: `tmp/apk-artifacts/<run-id>`

## Commands

Run the helper script from the repo root:

```bash
bash .codex/skills/apk-build/scripts/apk-build.sh trigger
bash .codex/skills/apk-build/scripts/apk-build.sh trigger --ref main --debug
bash .codex/skills/apk-build/scripts/apk-build.sh trigger --wait
bash .codex/skills/apk-build/scripts/apk-build.sh status
bash .codex/skills/apk-build/scripts/apk-build.sh status --branch main --limit 5
bash .codex/skills/apk-build/scripts/apk-build.sh download --run-id 123456789 --dir tmp/apk
```

## Execution Notes

- Prefer the helper script over raw `gh` commands so repo selection stays correct even though this workspace's `origin` is Gitea.
- The script resolves the GitHub repo from `git remote get-url github`. Override with `--repo owner/name` only when needed.
- For actual remote operations, run `gh auth status` first if authentication might be stale.
- If `trigger --wait` is used, the script waits for the newly created run to appear and then calls `gh run watch`.
- `status` prints a compact JSON view of recent runs so the result is easy to summarize back to the user.
- `download` pulls every artifact from the chosen run. The APK artifact produced by this workflow is usually named `daycapsule-unsigned-release-apk-<run_number>`.

## Failure Handling

- If the `github` remote is missing, stop and ask the user before guessing another repo.
- If `gh` is missing or unauthenticated, report the exact verification command:

```bash
gh --version
gh auth status
```

- If the newest run is not visible immediately after `workflow run`, retry listing a few times before treating it as a failure.
