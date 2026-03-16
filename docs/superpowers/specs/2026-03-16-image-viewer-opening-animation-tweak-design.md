# 图片查看器打开动画微调 — 设计规格

**日期：** 2026-03-16
**状态：** 待实现
**影响文件：** `app/src/components/ImageViewer.tsx`

---

## 1. 需求摘要

对共享元素过渡动画做两处视觉微调：

1. **去除打开阶段的弹簧回弹**：英雄图飞入全屏的动画改为平滑减速，不再有弹跳感
2. **去除英雄图黑色背景**：英雄图覆盖层自身不设背景色，遮罩由单独的 backdrop 层提供

---

## 2. 具体变更

### 2.1 opening 动画：`withSpring` → `withTiming`

**位置：** `ImageViewer.tsx` — opening 阶段 `useEffect`

将现有 5 个 `withSpring` 调用替换为 `withTiming`：

| 属性 | 旧 | 新 |
|------|----|----|
| `heroLeft.value` | `withSpring(0, springConfig)` | `withTiming(0, openingTiming)` |
| `heroTop.value` | `withSpring(0, springConfig)` | `withTiming(0, openingTiming)` |
| `heroWidth.value` | `withSpring(SCREEN_WIDTH, springConfig)` | `withTiming(SCREEN_WIDTH, openingTiming)` |
| `heroHeight.value` | `withSpring(SCREEN_HEIGHT, springConfig, cb)` | `withTiming(SCREEN_HEIGHT, openingTiming, cb)` |
| `backdropOpacity.value` | `withSpring(1, springConfig)` | `withTiming(1, openingTiming)` |

动画曲线配置：

```ts
const openingTiming = { duration: 280, easing: Easing.out(Easing.cubic) };
```

- `duration: 280ms`：与 closing（250ms）接近，打开略长符合视觉直觉
- `Easing.out(Easing.cubic)`：与 closing 动画曲线一致，保持打开/关闭对称感

`springConfig` 常量及 `withSpring` import 均可保留（手势交互层仍在使用）。

### 2.2 英雄图样式：移除 `backgroundColor`

**位置：** `ImageViewer.tsx` — `heroAnimatedStyle`

```ts
// 变更前
const heroAnimatedStyle = useAnimatedStyle(() => ({
  position: 'absolute',
  left: heroLeft.value,
  top: heroTop.value,
  width: heroWidth.value,
  height: heroHeight.value,
  backgroundColor: '#000000',   // ← 移除此行
}));

// 变更后
const heroAnimatedStyle = useAnimatedStyle(() => ({
  position: 'absolute',
  left: heroLeft.value,
  top: heroTop.value,
  width: heroWidth.value,
  height: heroHeight.value,
}));
```

遮罩效果由 `<Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnimatedStyle]} />` 独立承担，不依赖英雄图背景色。

---

## 3. 不变部分

- 手势交互（双击缩放、捏合、下滑取消弹回）继续使用 `withSpring`
- closing 动画已是 `withTiming`，不做修改
- `styles.backdrop` 的 `backgroundColor: '#000000'` 保留

---

## 4. 测试要点

| 场景 | 预期行为 |
|------|---------|
| 点击缩略图打开 | 英雄图平滑飞入全屏，无弹跳，遮罩同步淡入 |
| 打开过程中英雄图边缘 | 无黑色填充，仅图片内容 + 背后遮罩层渐暗 |
| 单击关闭 | 行为不变（closing 动画未修改） |
| 下滑取消（未达阈值） | 弹回效果保留（手势层 withSpring 不变） |
