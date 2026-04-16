#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TIME_SENSITIVE_TESTS=(
  "src/utils/__tests__/timeUtils.test.ts"
  "src/components/__tests__/TimelineEntryMarker.test.tsx"
  "src/components/__tests__/CalendarTimelineItem.test.tsx"
)

for timezone in UTC Asia/Shanghai; do
  echo "==> Running timezone smoke tests under TZ=$timezone"
  bash scripts/run-jest-with-tz.sh "$timezone" --runInBand --runTestsByPath "${TIME_SENSITIVE_TESTS[@]}"
done
