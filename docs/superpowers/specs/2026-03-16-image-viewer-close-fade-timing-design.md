# 图片查看器关闭淡出时序调整 — 设计规格

**日期：** 2026-03-16
**状态：** 待实现
**影响文件：** `app/src/components/ImageViewer.tsx`

---

## 1. 需求摘要

关闭动画中英雄图的最终坐标与缩略图实际位置存在细微偏差，导致 Modal 关闭瞬间缩略图出现"向下跳动"。根本原因是 `heroOpacity` 淡出与位置动画同时在 t=250ms 完成，导致英雄图在错误坐标处仍有短暂可见性。

**修复策略：** 让 `heroOpacity` 在 t=200ms 提前完成淡出，给 Modal 关闭留 50ms 的"透明缓冲"，缩略图出现时英雄图已不可见，坐标误差不再影响视觉。

---

## 2. 具体变更

### 2.1 `triggerCloseAnimation` 中调整淡出时序

**位置：** `ImageViewer.tsx` — `triggerCloseAnimation` 函数内

**变更前：**
```ts
heroOpacity.value = withDelay(170, withTiming(0, { duration: 80 }));
```

**变更后：**
```ts
heroOpacity.value = withTiming(0, { duration: 200 });
```

**时序说明：**

| 时间点 | 改前 | 改后 |
|--------|------|------|
| t=0ms | 位置动画开始，heroOpacity=1 | 位置动画开始，heroOpacity 开始淡出 |
| t=170ms | heroOpacity 开始淡出，opacity=1 | heroOpacity = 0.15（线性插值 1−170/200） |
| t=200ms | heroOpacity = 0.625（已运行 30/80ms） | heroOpacity = 0（已完全透明）|
| t=250ms | heroOpacity=0，performClose() | performClose()，英雄图已透明 50ms |

改后英雄图提前 50ms 变透明，`performClose()` 触发时缩略图出现无视觉对比参照，跳变不可见。

> 注意：t=200ms 到 t=250ms 之间，英雄图已透明但 `backdropOpacity` 仍有约 20% 残留（250ms 线性淡出）。这段 50ms 的"无图片内容"状态是设计预期——黑色遮罩继续淡出，Modal 随后关闭，不视为 bug。

---

## 3. 不变部分

- 位置动画（`heroLeft/Top/Width/Height` withTiming 250ms）不变
- `backdropOpacity` 动画不变
- `withDelay` import 保留（不做清理）
- `triggerClose` 中 `heroOpacity.value = 1` 重置不变
- `startFadeClose` 降级路径不变

---

## 4. 测试要点

| 场景 | 预期行为 |
|------|---------|
| 单击关闭（缩略图在屏幕内） | 英雄图缩小同时逐渐淡出，200ms 后完全透明，Modal 关闭时无位置跳变 |
| 下滑关闭 | 同上 |
| 快速连续打开关闭 | heroOpacity 在 triggerClose 中重置为 1，无状态残留 |
| 关闭（缩略图不在屏幕内）| 走 startFadeClose，行为不变 |
