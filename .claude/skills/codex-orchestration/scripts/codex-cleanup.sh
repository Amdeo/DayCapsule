#!/bin/bash
# 关闭指定的 codex 面板
# 用法: codex-cleanup.sh <面板ID1> [面板ID2] ...
# 示例: codex-cleanup.sh %5 %6 %7

set -euo pipefail

if [ $# -eq 0 ]; then
  echo "用法: $0 <面板ID1> [面板ID2] ..."
  exit 1
fi

closed=0
failed=0

for pane in "$@"; do
  if tmux kill-pane -t "$pane" 2>/dev/null; then
    echo "CLOSED: $pane"
    closed=$((closed + 1))
  else
    echo "SKIP: $pane (not found or already closed)"
    failed=$((failed + 1))
  fi
done

echo "=== CLEANUP DONE: $closed closed, $failed skipped ==="
