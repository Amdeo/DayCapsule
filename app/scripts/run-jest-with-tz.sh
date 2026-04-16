#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: bash scripts/run-jest-with-tz.sh <timezone> [jest args...]" >&2
  exit 1
fi

TIMEZONE="$1"
shift

exec env TZ="$TIMEZONE" pnpm exec jest "$@"
