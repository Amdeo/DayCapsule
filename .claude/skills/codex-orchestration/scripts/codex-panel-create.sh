#!/bin/bash
# 在指定面板右侧创建 N 个 codex 面板，启动 codex 并等待就绪
# 用法: codex-panel-create.sh <主面板ID> <面板数量> [左侧宽度百分比]
# 示例: codex-panel-create.sh %0 2 40
#       codex-panel-create.sh %0 1       # 单任务，默认 50%

set -uo pipefail  # 不用 -e，手动处理错误以支持部分失败继续

MAIN_PANE="${1:?用法: $0 <主面板ID> <面板数量> [左侧宽度%]}"
COUNT="${2:?用法: $0 <主面板ID> <面板数量> [左侧宽度%]}"
LEFT_WIDTH="${3:-$(( COUNT == 1 ? 50 : (COUNT >= 3 ? 30 : 40) ))}"

CREATED_PANES=()
FAILED_CREATE=0
MAX_WAIT=15  # 最大等待秒数

# 创建面板（部分失败时继续创建后续面板）
for i in $(seq 1 "$COUNT"); do
  if [ "$i" -eq 1 ]; then
    # 第一个：在主面板右侧水平分屏，-P -F 直接输出新面板 ID
    NEW_PANE=$(tmux split-window -t "$MAIN_PANE" -h -P -F '#{pane_id}' 2>/dev/null) || {
      echo "ERROR: 无法在 $MAIN_PANE 右侧创建面板（窗口空间不足？）"
      FAILED_CREATE=$((FAILED_CREATE + 1))
      continue
    }
  else
    # 后续：在上一个 codex 面板下方垂直分屏
    if [ ${#CREATED_PANES[@]} -eq 0 ]; then
      echo "SKIP: 没有可用面板来分屏第 $i 个面板"
      FAILED_CREATE=$((FAILED_CREATE + 1))
      continue
    fi
    NEW_PANE=$(tmux split-window -t "${CREATED_PANES[${#CREATED_PANES[@]}-1]}" -v -P -F '#{pane_id}' 2>/dev/null) || {
      echo "WARN: 第 $i 个面板创建失败（窗口空间不足？），跳过"
      FAILED_CREATE=$((FAILED_CREATE + 1))
      continue
    }
  fi
  CREATED_PANES+=("$NEW_PANE")
  echo "CREATED: $NEW_PANE (panel $i)"
done

if [ ${#CREATED_PANES[@]} -eq 0 ]; then
  echo "ERROR: 没有成功创建任何面板"
  exit 1
fi

# 调整左侧宽度
tmux resize-pane -t "$MAIN_PANE" -x "${LEFT_WIDTH}%" 2>/dev/null || true

# 在每个面板启动 codex 并等待就绪
READY_PANES=()
FAILED_PANES=()

for pane in "${CREATED_PANES[@]}"; do
  tmux send-keys -t "$pane" "codex" Enter

  waited=0
  ready=false
  while [ "$waited" -lt "$MAX_WAIT" ]; do
    sleep 2
    waited=$((waited + 2))
    # 过滤空行再取末尾——codex UI 底部有大量空行
    output=$(tmux capture-pane -t "$pane" -p 2>/dev/null | grep -v '^[[:space:]]*$' | tail -3) || break
    if echo "$output" | grep -q '›'; then
      ready=true
      break
    fi
  done

  if $ready; then
    READY_PANES+=("$pane")
  else
    FAILED_PANES+=("$pane")
    echo "WARN: $pane codex 未就绪（${MAX_WAIT}s 超时）"
  fi
done

# 输出结果（供 Claude 解析）
echo "=== CODEX PANEL REPORT ==="
echo "READY: ${READY_PANES[*]:-none}"
echo "FAILED: ${FAILED_PANES[*]:-none}"
echo "ALL_CREATED: ${CREATED_PANES[*]}"

if [ ${#FAILED_PANES[@]} -gt 0 ]; then
  echo "WARNING: ${#FAILED_PANES[@]} panel(s) failed to start codex"
  # exit 0 而非 exit 1 — 让 Claude 根据 READY 列表决定后续操作
  # 部分成功也是有用的
fi
exit 0
