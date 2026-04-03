#!/bin/bash
# 检查所有指定 codex 面板的执行状态
# 用法: codex-check-status.sh <面板ID1> [面板ID2] [面板ID3] ...
# 示例: codex-check-status.sh %5 %6 %7

set -uo pipefail  # 不用 -e，grep 无匹配时返回 1 会误退出

if [ $# -eq 0 ]; then
  echo "用法: $0 <面板ID1> [面板ID2] ..."
  exit 1
fi

echo "=== CODEX STATUS REPORT ==="
for pane in "$@"; do
  echo "--- Panel $pane ---"
  output=$(tmux capture-pane -t "$pane" -p 2>/dev/null | tail -8) || {
    echo "  STATUS: DEAD (panel not found)"
    continue
  }

  # grep -v 可能返回空（面板全空白），用 || true 防止退出
  last_line=$(echo "$output" | grep -v '^[[:space:]]*$' | tail -1 || true)
  if [ -z "$last_line" ]; then
    echo "  STATUS: EMPTY (panel has no output)"
  elif echo "$last_line" | grep -qE '^\s*›\s*$'; then
    echo "  STATUS: IDLE (waiting for input or finished)"
  else
    echo "  STATUS: RUNNING"
  fi
  echo "  LAST OUTPUT:"
  echo "$output" | sed 's/^/    /'
  echo ""
done
