#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

for flow in .maestro/flows/app-core/*.yaml; do
  if [[ "$(basename "$flow")" == "settings-sync-status-open.yaml" ]]; then
    continue
  fi
  adb shell am force-stop com.memorycapsule.app >/dev/null 2>&1 || true
  adb shell monkey -p com.memorycapsule.app -c android.intent.category.LAUNCHER 1 >/dev/null
  maestro test "$flow"
done
