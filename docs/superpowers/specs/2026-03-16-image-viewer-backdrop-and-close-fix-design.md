# 图片查看器遮罩与关闭动画修复 — 设计规格

**日期：** 2026-03-16
**状态：** 待实现
**影响文件：** `app/src/components/ImageViewer.tsx`

---

## 1. 需求摘要

修复两处视觉问题：

1. **打开时无黑色背景**：英雄图飞入全屏过程中不显示黑色遮罩，落定后遮罩才出现
2. **关闭时消除位置跳变**：英雄图关闭动画末尾淡出，避免 Modal 关闭时缩略图出现位置不一致的跳帧

---

## 2. 具体变更

### 2.1 opening 阶段：移除遮罩动画

**当前行为：** opening useEffect 中 `backdropOpacity.value = withTiming(1, openingTiming)`，遮罩与英雄图同步从 0 淡入到 1。

**目标行为：** 打开过程中遮罩保持 opacity=0（不可见），英雄图飞入动画完成后遮罩立即出现（opacity 直接置 1）。

**变更：**

1. 从 opening useEffect 中删除 `backdropOpacity.value = withTiming(1, openingTiming)` 这一行
2. 在 `heroHeight` 动画完成回调中，`runOnJS(setPhase)('open')` 之前，将 backdropOpacity 直接置 1：

```ts
// opening 动画
useEffect(() => {
  if (phase !== 'opening') return;
  const openingTiming = { duration: 280, easing: Easing.out(Easing.cubic) };
  heroLeft.value = withTiming(0, openingTiming);
  heroTop.value = withTiming(0, openingTiming);
  heroWidth.value = withTiming(SCREEN_WIDTH, openingTiming);
  heroHeight.value = withTiming(SCREEN_HEIGHT, openingTiming, (finished) => {
    if (finished) {
      backdropOpacity.value = 1;      // 飞入完成后遮罩即刻出现
      runOnJS(setPhase)('open');
    }
  });
  // 注意：backdropOpacity 动画已移除
}, [phase, SCREEN_WIDTH, SCREEN_HEIGHT]);
```

> 注意：`backdropOpacity` 在 `visible` useEffect 中会被重置为 0（`originLayout` 存在时）或通过 withTiming 淡入（无 originLayout 降级路径）。降级路径（无 originLayout）的淡入行为保持不变。

### 2.2 closing 阶段：英雄图末尾淡出

**当前行为：** 英雄图精确飞回缩略图坐标，`heroHeight` 动画完成后调用 `performClose()`。Modal 关闭时缩略图出现，若与英雄最终落点有细微偏差，产生位置跳变。

**目标行为：** 关闭动画最后 80ms 英雄图淡出至透明，Modal 关闭时英雄图已不可见，缩略图自然显现，无位置跳变。

**新增 shared value：**

```ts
const heroOpacity = useSharedValue(1);
```

**cleanup useEffect 中补充取消：**

```ts
cancelAnimation(heroOpacity);
```

**triggerClose 中重置：**

在 `heroLeft.value = 0` 等预设行之后添加：

```ts
heroOpacity.value = 1;
```

**triggerCloseAnimation 中添加淡出动画：**

在现有 4 个 hero 位置动画之后、`backdropOpacity` 动画之前，添加：

```ts
heroOpacity.value = withDelay(170, withTiming(0, { duration: 80 }));
```

时序说明：关闭动画总时长 250ms，延迟 170ms 后开始 80ms 的淡出，确保英雄图接近缩略图位置后再淡出，视觉上自然消失。

**heroAnimatedStyle 中使用 opacity：**

```ts
const heroAnimatedStyle = useAnimatedStyle(() => ({
  position: 'absolute',
  left: heroLeft.value,
  top: heroTop.value,
  width: heroWidth.value,
  height: heroHeight.value,
  opacity: heroOpacity.value,   // 新增
}));
```

---

## 3. 不变部分

- 无 originLayout 的降级路径（`backdropOpacity.value = withTiming(1, { duration: 250 })`）保持不变
- closing 动画的位置动画（heroLeft/Top/Width/Height withTiming 250ms）保持不变
- 旋转降级逻辑保持不变（但需在旋转 effect 中同样 `cancelAnimation(heroOpacity)` 并不需要额外处理，因为 heroOpacity 会在下次打开时重置）
- 手势交互层（withSpring）保持不变

---

## 4. 测试要点

| 场景 | 预期行为 |
|------|---------|
| 点击缩略图打开 | 英雄图飞入全屏期间背景透明（Timeline 可见），落定后黑色遮罩即刻出现 |
| 单击关闭（缩略图在屏幕内） | 英雄图飞向缩略图，最后 80ms 淡出，Modal 关闭时无位置跳变 |
| 下滑关闭 | 同上，英雄图末尾淡出 |
| 关闭（缩略图不在屏幕内）| 走 startFadeClose，行为不变（heroOpacity 不参与）|
| 无 originLayout 降级 | 纯淡入/淡出，行为不变 |
| 快速连续打开关闭 | heroOpacity 在每次 triggerClose 中重置为 1，无状态残留 |
