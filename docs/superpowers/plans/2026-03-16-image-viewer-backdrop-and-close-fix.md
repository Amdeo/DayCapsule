# 图片查看器遮罩与关闭动画修复 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复两处动画视觉问题：打开时遮罩不在飞入期间显示，关闭时英雄图淡出消除缩略图位置跳变。

**Architecture:** 仅修改 `ImageViewer.tsx`，新增 `heroOpacity` shared value 驱动英雄图关闭淡出；将 opening 阶段遮罩动画改为飞入完成后瞬时出现。所有改动局限在动画逻辑层，不涉及手势、JSX 结构或 prop 接口变更。

**Tech Stack:** React Native 0.81.5、react-native-reanimated v3（`withDelay`、`withTiming`、`cancelAnimation`）、TypeScript 5.9

---

## Chunk 1: 动画修复

### Task 1: 修复遮罩与关闭动画

**Files:**
- Modify: `app/src/components/ImageViewer.tsx`

背景：`ImageViewer.tsx` 当前有两个问题：
1. 第 150 行：`backdropOpacity.value = withTiming(1, openingTiming)` 使遮罩在飞入过程中同步淡入，期望是飞入完成后遮罩瞬时出现
2. 英雄图飞回缩略图坐标后直接关闭 Modal，与实际缩略图渲染位置存在细微偏差，导致位置跳变；需在最后 80ms 将英雄图淡出至透明

---

- [ ] **Step 1: 添加 `withDelay` 到 import**

  找到第 20-28 行的 Reanimated import：

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

  替换为（添加 `withDelay`）：

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

- [ ] **Step 2: 新增 `heroOpacity` shared value**

  找到第 84-85 行（`heroWidth`/`heroHeight` shared values 声明处）：

  ```ts
  const heroWidth = useSharedValue(SCREEN_WIDTH);
  const heroHeight = useSharedValue(SCREEN_HEIGHT);
  ```

  替换为：

  ```ts
  const heroWidth = useSharedValue(SCREEN_WIDTH);
  const heroHeight = useSharedValue(SCREEN_HEIGHT);
  const heroOpacity = useSharedValue(1);
  ```

- [ ] **Step 3: cleanup useEffect 中添加 `cancelAnimation(heroOpacity)`**

  找到第 90-104 行的 cleanup useEffect：

  ```ts
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cancelAnimation(scale);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(dismissY);
      cancelAnimation(dismissScale);
      cancelAnimation(backdropOpacity);
      cancelAnimation(heroLeft);
      cancelAnimation(heroTop);
      cancelAnimation(heroWidth);
      cancelAnimation(heroHeight);
    };
  }, []);
  ```

  替换为：

  ```ts
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cancelAnimation(scale);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(dismissY);
      cancelAnimation(dismissScale);
      cancelAnimation(backdropOpacity);
      cancelAnimation(heroLeft);
      cancelAnimation(heroTop);
      cancelAnimation(heroWidth);
      cancelAnimation(heroHeight);
      cancelAnimation(heroOpacity);
    };
  }, []);
  ```

- [ ] **Step 4: visible useEffect 的 originLayout 分支中重置 `heroOpacity`**

  找到第 122-129 行的 originLayout 分支：

  ```ts
      if (originLayout) {
        // 有坐标：初始化英雄图位置，启动 opening 动画
        heroLeft.value = originLayout.x;
        heroTop.value = originLayout.y;
        heroWidth.value = originLayout.width;
        heroHeight.value = originLayout.height;
        backdropOpacity.value = 0;
        setPhase('opening');
  ```

  替换为：

  ```ts
      if (originLayout) {
        // 有坐标：初始化英雄图位置，启动 opening 动画
        heroLeft.value = originLayout.x;
        heroTop.value = originLayout.y;
        heroWidth.value = originLayout.width;
        heroHeight.value = originLayout.height;
        heroOpacity.value = 1;
        backdropOpacity.value = 0;
        setPhase('opening');
  ```

- [ ] **Step 5: 修改 opening useEffect — 移除遮罩动画，改为飞入完成后瞬时出现**

  找到第 141-151 行的 opening useEffect：

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
      if (finished) {
        backdropOpacity.value = 1;   // 飞入完成后遮罩即刻出现
        runOnJS(setPhase)('open');
      }
    });
    // backdropOpacity 不在飞入期间动画，由完成回调瞬时置 1
  }, [phase, SCREEN_WIDTH, SCREEN_HEIGHT]);
  ```

- [ ] **Step 6: `triggerClose` 中重置 `heroOpacity`**

  找到第 159-176 行的 `triggerClose` 函数：

  ```ts
  const triggerClose = (capturedDismissY: number = 0) => {
    setShowActionSheet(false);
    cancelAnimation(dismissY);
    cancelAnimation(backdropOpacity);
    cancelAnimation(heroLeft);
    cancelAnimation(heroTop);
    cancelAnimation(heroWidth);
    cancelAnimation(heroHeight);
    // 预设英雄图起点（不启动动画，挂载后再由 useEffect 启动）
    heroLeft.value = 0;
    heroTop.value = capturedDismissY;   // 当前图片真实位置
    heroWidth.value = SCREEN_WIDTH;
    heroHeight.value = SCREEN_HEIGHT;
    // 重置手势层（即将隐藏，无视觉影响）
    dismissY.value = 0;
    dismissScale.value = 1;
    setPhase('closing');
  };
  ```

  替换为：

  ```ts
  const triggerClose = (capturedDismissY: number = 0) => {
    setShowActionSheet(false);
    cancelAnimation(dismissY);
    cancelAnimation(backdropOpacity);
    cancelAnimation(heroLeft);
    cancelAnimation(heroTop);
    cancelAnimation(heroWidth);
    cancelAnimation(heroHeight);
    cancelAnimation(heroOpacity);
    // 预设英雄图起点（不启动动画，挂载后再由 useEffect 启动）
    heroLeft.value = 0;
    heroTop.value = capturedDismissY;   // 当前图片真实位置
    heroWidth.value = SCREEN_WIDTH;
    heroHeight.value = SCREEN_HEIGHT;
    heroOpacity.value = 1;
    // 重置手势层（即将隐藏，无视觉影响）
    dismissY.value = 0;
    dismissScale.value = 1;
    setPhase('closing');
  };
  ```

- [ ] **Step 7: `triggerCloseAnimation` 中添加英雄图淡出动画**

  找到第 192-198 行（closing 位置动画块）：

  ```ts
        heroLeft.value = withTiming(x, closingTiming);
        heroTop.value = withTiming(y, closingTiming);
        heroWidth.value = withTiming(width, closingTiming);
        heroHeight.value = withTiming(height, closingTiming, (finished) => {
          if (finished) runOnJS(performClose)();
        });
        backdropOpacity.value = withTiming(0, closingTiming);
  ```

  替换为：

  ```ts
        heroLeft.value = withTiming(x, closingTiming);
        heroTop.value = withTiming(y, closingTiming);
        heroWidth.value = withTiming(width, closingTiming);
        heroHeight.value = withTiming(height, closingTiming, (finished) => {
          if (finished) runOnJS(performClose)();
        });
        // 延迟 170ms 后 80ms 淡出：总计 250ms，与 closingTiming 对齐
        // 英雄图接近缩略图后再消失，避免 Modal 关闭时的位置跳变
        heroOpacity.value = withDelay(170, withTiming(0, { duration: 80 }));
        backdropOpacity.value = withTiming(0, closingTiming);
  ```

- [ ] **Step 8: 旋转 effect 中添加 `cancelAnimation(heroOpacity)`**

  找到第 233-243 行的旋转降级分支：

  ```ts
    if (phase === 'opening' || phase === 'closing') {
      isRotationAborted.current = true;
      cancelAnimation(heroLeft);
      cancelAnimation(heroTop);
      cancelAnimation(heroWidth);
      cancelAnimation(heroHeight);
      cancelAnimation(backdropOpacity);
      backdropOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
        // 直接内联淡出逻辑，避免 startFadeClose 的 exhaustive-deps 问题
        if (finished) runOnJS(performClose)();
      });
    }
  ```

  替换为：

  ```ts
    if (phase === 'opening' || phase === 'closing') {
      isRotationAborted.current = true;
      cancelAnimation(heroLeft);
      cancelAnimation(heroTop);
      cancelAnimation(heroWidth);
      cancelAnimation(heroHeight);
      cancelAnimation(heroOpacity);
      cancelAnimation(backdropOpacity);
      backdropOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
        // 直接内联淡出逻辑，避免 startFadeClose 的 exhaustive-deps 问题
        if (finished) runOnJS(performClose)();
      });
    }
  ```

- [ ] **Step 9: `heroAnimatedStyle` 中添加 `opacity`**

  找到第 368-374 行的 `heroAnimatedStyle`：

  ```ts
  const heroAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: heroLeft.value,
    top: heroTop.value,
    width: heroWidth.value,
    height: heroHeight.value,
  }));
  ```

  替换为：

  ```ts
  const heroAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: heroLeft.value,
    top: heroTop.value,
    width: heroWidth.value,
    height: heroHeight.value,
    opacity: heroOpacity.value,
  }));
  ```

- [ ] **Step 10: TypeScript 编译检查**

  ```bash
  cd app && npx tsc --noEmit 2>&1 | head -20
  ```

  期望：无新增错误。

- [ ] **Step 11: 运行测试套件**

  ```bash
  cd app && npx jest --no-coverage 2>&1 | tail -15
  ```

  期望：所有测试用例 PASS（87 个）。

- [ ] **Step 12: Commit**

  ```bash
  cd app && git add src/components/ImageViewer.tsx
  git commit -m "feat: fix backdrop flash on open, eliminate close position jump"
  ```
