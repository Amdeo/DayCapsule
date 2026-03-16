# 图片查看器关闭淡出时序调整 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将关闭动画中 `heroOpacity` 的淡出改为立即开始、200ms 完成，使英雄图在 `performClose()` 触发前 50ms 已完全透明，消除缩略图位置跳变。

**Architecture:** 仅修改 `app/src/components/ImageViewer.tsx` 第 209 行一处：将 `withDelay(170, withTiming(0, { duration: 80 }))` 替换为 `withTiming(0, { duration: 200 })`；同时移除已无调用点的 `withDelay` import。

**Tech Stack:** React Native 0.81.5、react-native-reanimated v3、TypeScript 5.9

---

## Chunk 1: 淡出时序修改

### Task 1: 调整 heroOpacity 淡出时序并清理 import

**Files:**
- Modify: `app/src/components/ImageViewer.tsx:20-28, 209`

背景：`triggerCloseAnimation` 中当前代码在 t=170ms 才开始淡出英雄图（80ms 完成），与位置动画同时在 t=250ms 结束，导致英雄图在偏高坐标处短暂可见，Modal 关闭时缩略图出现"向下跳动"。改为立即淡出（200ms 完成），英雄图在 t=200ms 已透明，比 Modal 关闭早 50ms。

---

- [ ] **Step 1: 移除 `withDelay` import（第 20-28 行）**

  找到当前 import：

  ```ts
  import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    cancelAnimation,
    runOnJS,
    Easing,
  } from 'react-native-reanimated';
  ```

  替换为（删除 `withDelay` 行）：

  ```ts
  import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    cancelAnimation,
    runOnJS,
    Easing,
  } from 'react-native-reanimated';
  ```

- [ ] **Step 2: 修改 `triggerCloseAnimation` 中的淡出动画（约第 209 行）**

  找到：

  ```ts
        // 延迟 170ms 后 80ms 淡出：总计 250ms，与 closingTiming 对齐
        // 英雄图接近缩略图后再消失，避免 Modal 关闭时的位置跳变
        heroOpacity.value = withDelay(170, withTiming(0, { duration: 80 }));
  ```

  替换为：

  ```ts
        // 立即开始淡出，200ms 完成：比 performClose()（t=250ms）早 50ms 变透明
        // 确保缩略图出现时英雄图已不可见，消除坐标偏差导致的位置跳变
        heroOpacity.value = withTiming(0, { duration: 200 });
  ```

- [ ] **Step 3: TypeScript 编译检查**

  ```bash
  cd app && npx tsc --noEmit 2>&1 | head -20
  ```

  期望：无输出（零错误）。

- [ ] **Step 4: 运行测试套件**

  ```bash
  cd app && npx jest --no-coverage 2>&1 | tail -10
  ```

  期望：`87 passed, 87 total`。

- [ ] **Step 5: Commit**

  ```bash
  cd /Users/cooper/Documents/code/MemoryCapsule && git add app/src/components/ImageViewer.tsx && git commit -m "fix: fade hero earlier on close to eliminate thumbnail position jump"
  ```
