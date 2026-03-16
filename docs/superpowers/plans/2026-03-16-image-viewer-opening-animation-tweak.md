# 图片查看器打开动画微调 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将打开动画的弹簧回弹改为平滑减速曲线，并移除英雄图覆盖层的黑色背景色。

**Architecture:** 仅修改 `ImageViewer.tsx` 中的 opening `useEffect` 和 `heroAnimatedStyle`，将 5 处 `withSpring` 替换为 `withTiming`，移除 `backgroundColor: '#000000'`。手势交互层的 `withSpring` 保持不变。

**Tech Stack:** React Native 0.81.5、react-native-reanimated v3、TypeScript 5.9

---

## Chunk 1: 动画微调

### Task 1: 替换 opening 动画曲线并移除英雄图背景色

**Files:**
- Modify: `app/src/components/ImageViewer.tsx`

**背景：** opening `useEffect`（约第 136-151 行）目前使用 `withSpring(damping:28, stiffness:300)` 驱动英雄图飞入，会产生轻微弹跳。目标是改为 `withTiming` + `Easing.out(Easing.cubic)`，`duration: 280ms`，与 closing 动画曲线一致。同时 `heroAnimatedStyle` 的 `backgroundColor: '#000000'` 也需移除。

- [ ] **Step 1: 替换 opening useEffect 中的 withSpring**

  找到约第 136 行的 opening `useEffect`：

  ```ts
  // opening 动画：英雄图从缩略图坐标飞入全屏
  useEffect(() => {
    if (phase !== 'opening') return;
    const springConfig = { damping: 28, stiffness: 300 };
    heroLeft.value = withSpring(0, springConfig);
    heroTop.value = withSpring(0, springConfig);
    heroWidth.value = withSpring(SCREEN_WIDTH, springConfig);
    heroHeight.value = withSpring(SCREEN_HEIGHT, springConfig, (finished) => {
      if (finished) runOnJS(setPhase)('open');
    });
    backdropOpacity.value = withSpring(1, springConfig);
  }, [phase, SCREEN_WIDTH, SCREEN_HEIGHT]);
  ```

  替换为：

  ```ts
  // opening 动画：英雄图从缩略图坐标飞入全屏
  useEffect(() => {
    if (phase !== 'opening') return;
    const openingTiming = { duration: 280, easing: Easing.out(Easing.cubic) };
    heroLeft.value = withTiming(0, openingTiming);
    heroTop.value = withTiming(0, openingTiming);
    heroWidth.value = withTiming(SCREEN_WIDTH, openingTiming);
    heroHeight.value = withTiming(SCREEN_HEIGHT, openingTiming, (finished) => {
      if (finished) runOnJS(setPhase)('open');
    });
    backdropOpacity.value = withTiming(1, openingTiming);
  }, [phase, SCREEN_WIDTH, SCREEN_HEIGHT]);
  ```

  > 注意：`withSpring` import 保持不变（手势交互层仍在使用）。

- [ ] **Step 2: 移除 heroAnimatedStyle 中的 backgroundColor**

  找到约第 365 行的 `heroAnimatedStyle`：

  ```ts
  const heroAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: heroLeft.value,
    top: heroTop.value,
    width: heroWidth.value,
    height: heroHeight.value,
    backgroundColor: '#000000',
  }));
  ```

  移除 `backgroundColor` 行，改为：

  ```ts
  const heroAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: heroLeft.value,
    top: heroTop.value,
    width: heroWidth.value,
    height: heroHeight.value,
  }));
  ```

- [ ] **Step 3: 确认 TypeScript 编译无新增报错**

  ```bash
  cd app && npx tsc --noEmit 2>&1 | head -20
  ```

  期望：无新增错误。

- [ ] **Step 4: 运行测试套件**

  ```bash
  cd app && npx jest --no-coverage 2>&1 | tail -10
  ```

  期望：87 个测试用例全部 PASS。

- [ ] **Step 5: Commit**

  ```bash
  cd app && git add src/components/ImageViewer.tsx
  git commit -m "feat: use timing curve for opening animation, remove hero bg color"
  ```
