#!/bin/bash
# 向 codex 面板发送任务并验证是否开始执行
# 任务内容从 stdin 读取，避免 shell 引号/特殊字符问题
#
# 用法: echo "任务描述" | codex-send-task.sh <面板ID>
#       codex-send-task.sh <面板ID> <<'EOF'
#       在 /path/to/project 中实现以下任务：
#       1. 需求描述...
#       EOF

set -uo pipefail  # 不用 -e，grep 无匹配时返回 1 会误退出

PANE_ID="${1:?用法: echo '任务描述' | $0 <面板ID>}"

MAX_RETRIES=3
VERIFY_WAIT=3

# 从 stdin 读取任务内容（保留换行）
TASK=$(cat)

if [ -z "$TASK" ]; then
  echo "ERROR: 没有从 stdin 收到任务内容"
  exit 1
fi

# 第一步：用 tmux load-buffer + paste-buffer 发送，绕过 send-keys 的引号问题
#   - load-buffer 从字符串加载到 tmux 缓冲区（不经过 shell 解析）
#   - paste-buffer 粘贴到目标面板
tmux load-buffer - <<< "$TASK"
tmux paste-buffer -t "$PANE_ID"
sleep 0.5

# 第二步：发送 Enter 并验证
for attempt in $(seq 1 "$MAX_RETRIES"); do
  tmux send-keys -t "$PANE_ID" "" Enter
  sleep "$VERIFY_WAIT"

  # 如果不再显示空的 › 提示符，说明 codex 已开始处理
  last_line=$(tmux capture-pane -t "$PANE_ID" -p | grep -v '^[[:space:]]*$' | tail -1 || true)
  if ! echo "$last_line" | grep -qE '^\s*›\s*$'; then
    echo "OK: codex is processing (attempt $attempt)"
    exit 0
  fi

  echo "RETRY: Enter did not register (attempt $attempt/$MAX_RETRIES)"
done

echo "FAILED: codex did not start after $MAX_RETRIES attempts"
exit 1
