# 图片查看器共享元素过渡动画 — 设计规格

**日期：** 2026-03-16
**状态：** 待实现
**影响文件：** `app/src/components/ImageViewer.tsx`、`app/src/components/EntryCard.tsx`

---

## 1. 需求摘要

为图片查看器的打开和关闭实现微信朋友圈风格的共享元素过渡动画：

- **打开**：图片从 Timeline 卡片中的缩略图位置飞入全屏，黑色遮罩同步淡入
- **关闭（单击）**：图片从全屏飞回缩略图原始位置，遮罩同步淡出
- **关闭（下滑）**：松手后触发与单击关闭相同的飞回逻辑
- **降级**：若关闭时缩略图已滚出屏幕（不在视口内），改为原地淡出

---

## 2. 组件接口变更

### 2.1 `ImageViewerProps` 新增字段

```ts
interface OriginLayout {
  x: number;       // 缩略图左上角屏幕 x 坐标（measureInWindow 返回值）
  y: number;       // 缩略图左上角屏幕 y 坐标（measureInWindow 返回值）
  width: number;   // 缩略图宽度
  height: number;  // 缩略图高度（calculateImageHeight 计算值）
}

interface ImageViewerProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  originLayout?: OriginLayout;
  thumbnailRef?: React.RefObject<React.ElementRef<typeof Image>>;
}
```

- `originLayout`：可选，打开时的缩略图坐标快照，用于 opening 动画起点
- `thumbnailRef`：可选，缩略图 `<Image>` 的 ref，供 `ImageViewer` 在关闭时重新测量最新坐标
- 两者均不传时，行为完全等同于现有实现（淡入/淡出）

### 2.2 `EntryCard` 变更

**声明 ref：**

```ts
const thumbnailRef = useRef<React.ElementRef<typeof Image>>(null);
```

将 ref 挂载在 `<Image>` 组件本身（非外层 `<View>` 或 `<TouchableOpacity>`），确保 `measureInWindow` 测量图片自身坐标。

**时序控制（关键）：** `measureInWindow` 是异步 native 桥接回调，不在 React automatic batching 范围。为避免 Modal 在 `originLayout` state 提交前已渲染（导致首帧以淡入降级启动），必须在回调内才调用两次 setState：

```ts
const handleImagePress = () => {
  if (photoError) return;
  if (thumbnailRef.current) {
    thumbnailRef.current.measureInWindow((x, y, width, height) => {
      setOriginLayout({ x, y, width, height });
      setShowImageViewer(true);
    });
  } else {
    setShowImageViewer(true); // 降级：无 ref 时淡入
  }
};
```

**传递给 ImageViewer：**

```tsx
<ImageViewer
  visible={showImageViewer}
  imageUri={entry.media.uri}
  onClose={() => setShowImageViewer(false)}
  originLayout={originLayout ?? undefined}
  thumbnailRef={thumbnailRef}
/>
```

---

## 3. 动画状态机

使用 React state `phase: 'idle' | 'opening' | 'open' | 'closing' | 'closing-fade'` 驱动层可见性切换；Reanimated shared values 驱动动画数值。

```
idle
  │  visible=true & originLayout 存在
  ▼
opening     英雄图从 originLayout → 全屏，backdrop opacity 0→1
  │  动画完成回调 → runOnJS(setPhase)('open')
  ▼
open        正常手势交互（现有逻辑不变）
  │  触发关闭（单击 / 下滑松手）→ triggerClose()
  ▼
closing     重新测量缩略图坐标，判断可见性
  ├─ 可见   → 英雄图从当前位置飞回最新 originLayout，backdrop 1→0
  │           动画完成 → runOnJS(performClose)()
  └─ 不可见 → closing-fade：backdrop 1→0，完成 → runOnJS(performClose)()
```

无 `originLayout` 时跳过 opening/closing，直接复用现有淡入/淡出逻辑。

---

## 4. 英雄覆盖层实现

### 4.1 渲染结构

```tsx
<Modal>
  <GestureHandlerRootView>
    <Animated.View backdropStyle />       {/* 遮罩，始终渲染 */}

    {/* 英雄覆盖层：opening / closing 阶段 */}
    {(phase === 'opening' || phase === 'closing') && (
      <Animated.Image style={heroImageStyle} source={{ uri: imageUri }} />
    )}

    {/* 手势交互层：open 阶段 */}
    {phase === 'open' && (
      <GestureDetector gesture={composedGesture}>
        <Animated.View>{/* 现有图片手势层 */}</Animated.View>
      </GestureDetector>
    )}

    {/* Action Sheet（不变）*/}
  </GestureHandlerRootView>
</Modal>
```

### 4.2 英雄图动画值与坐标系

英雄图使用 `position: 'absolute'`，其 `left/top/width/height` 均为**相对于 Modal 根节点（全屏）的绝对坐标**，与 `measureInWindow` 返回的屏幕坐标一致（Modal `statusBarTranslucent` 时两者坐标系相同）。

| 动画值 | opening 起点 | opening 终点 |
|--------|-------------|-------------|
| `heroLeft` | `originLayout.x` | `0` |
| `heroTop` | `originLayout.y` | `0` |
| `heroWidth` | `originLayout.width` | `SCREEN_WIDTH` |
| `heroHeight` | `originLayout.height` | `SCREEN_HEIGHT` |
| `backdropOpacity` | `0` | `1` |

closing 方向相反；起点 `heroTop = 0 + dismissY.value`（见 §4.3）。

**英雄图样式：** `resizeMode="contain"`（与现有全屏图片一致，保证动画前后无跳变），背景色 `#000000`（与遮罩色一致，避免非黑色边缘）。

### 4.3 下滑过渡到 closing 的时序（关键）

**坐标系说明：** 在手势层中，图片通过 `transform: [{ translateY: dismissY.value }]` 向下偏移。`dismissY.value` 是相对于图片原始位置（屏幕顶部 `top=0`）的位移量，与英雄图 `position: absolute` 的 `top` 绝对坐标语义一致（两者均从屏幕顶部算起）。因此 `heroTop` 初始值直接取 `dismissY.value` 是正确的。

**步骤（在 JS 线程，`triggerClose()` 中执行）：**

```
1. cancelAnimation(dismissY)           // 停止下滑动画
2. cancelAnimation(backdropOpacity)    // 停止任何 backdrop 动画
3. 预设英雄图共享值（不启动动画，只赋初始值）：
     heroLeft.value  = 0
     heroTop.value   = dismissY.value  // 当前真实偏移，作为飞回起点
     heroWidth.value = SCREEN_WIDTH
     heroHeight.value = SCREEN_HEIGHT
4. dismissY.value = 0                  // 重置（手势层即将隐藏，无视觉影响）
5. dismissScale.value = 1
6. setPhase('closing')                 // 触发 React 渲染，挂载英雄图
// 注意：动画在步骤 7 的 useEffect 中启动，确保英雄图已挂载
```

**步骤 7 — 动画启动（`useEffect`）：**

在 `ImageViewer` 内：

```ts
useEffect(() => {
  if (phase !== 'closing') return;
  // 英雄图已挂载，此时安全启动动画
  triggerCloseAnimation();
}, [phase]);
```

`triggerCloseAnimation()` 负责重新 `measureInWindow`（见 §5），获取最新坐标后启动飞回或淡出。

### 4.4 `singleTapGesture` 修改

```ts
// 旧：
singleTapGesture.onEnd → backdropOpacity = withTiming(0, ..., () => runOnJS(performClose)())

// 新：
singleTapGesture.onEnd → runOnJS(triggerClose)()
```

`triggerClose()` 负责：预设英雄图共享值（此时无 dismissY 偏移，heroTop = 0）、setPhase('closing')。原有的 `backdropOpacity withTiming` 调用需移除，避免与飞回动画中的 backdrop 动画冲突。

### 4.5 动画曲线

| 阶段 | 曲线 | 参数 |
|------|------|------|
| opening | `withSpring` | `damping: 28, stiffness: 300` |
| closing（飞回） | `withTiming` | `duration: 250, easing: Easing.out(Easing.cubic)` |
| closing-fade | `withTiming` | `duration: 200` |

---

## 5. 关闭时的坐标更新与可见性判断

`triggerCloseAnimation()`（在 `phase === 'closing'` 的 useEffect 中执行）：

```ts
function triggerCloseAnimation() {
  if (!thumbnailRef?.current) {
    startFadeClose();
    return;
  }
  thumbnailRef.current.measureInWindow((x, y, width, height) => {
    const isVisible = y + height > 0 && y < SCREEN_HEIGHT;
    if (isVisible) {
      // 飞回最新坐标
      heroLeft.value = withTiming(x, closingTiming);
      heroTop.value = withTiming(y, closingTiming);
      heroWidth.value = withTiming(width, closingTiming);
      heroHeight.value = withTiming(height, closingTiming, (finished) => {
        if (finished) runOnJS(performClose)();
      });
      backdropOpacity.value = withTiming(0, closingTiming);
    } else {
      startFadeClose();
    }
  });
}

function startFadeClose() {
  backdropOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
    if (finished) runOnJS(performClose)();
  });
}
```

---

## 6. `onRequestClose`（Android 返回键）

将现有 `onRequestClose` 中的 `backdropOpacity withTiming + performClose()` 替换为 `triggerClose()`，行为与单击关闭一致。

---

## 7. 向后兼容

`originLayout` 和 `thumbnailRef` 均为可选 prop：
- 不传时：`visible=true` → 直接进入 `open` 阶段，`backdropOpacity` 淡入；关闭 → 执行 `closing-fade`。现有行为完全不变。
- 现有手势（捏合、平移、双击缩放、长按菜单）在 `open` 阶段完全不变。

---

## 8. 已知局限与边界处理

### 设备旋转

- **`opening` / `closing` 阶段**：检测到 `useWindowDimensions()` 返回新尺寸，立即中止动画，调用 `startFadeClose()`。
- **`open` 阶段**：检测到旋转时，将 `originLayout` 置为 `null`（不关闭 Modal），使后续关闭操作自动降级为 `closing-fade`，不强制关闭图片查看器。

### `GestureHandlerRootView` 嵌套

现有代码已在 Modal 内嵌套 `GestureHandlerRootView`，本次不改变该结构（作为已知技术债）。如 Android 出现手势问题，需将其提升至应用根节点。

---

## 9. 测试要点

| 场景 | 预期行为 |
|------|---------|
| 点击缩略图打开 | 图片从缩略图位置飞入全屏，遮罩同步淡入 |
| 单击关闭（缩略图在屏幕内） | 图片飞回缩略图原位，遮罩淡出 |
| 下滑关闭（缩略图在屏幕内） | 松手后图片从当前偏移位置飞回缩略图原位 |
| 关闭（缩略图已滚出屏幕） | 图片原地淡出 |
| 查看期间列表滚动后关闭 | 飞回到关闭时重新测量的最新缩略图位置 |
| 不传 originLayout / thumbnailRef | 现有淡入/淡出行为不变 |
| 快速连续打开关闭 | 动画不卡顿、无状态残留 |
| 设备旋转（open 阶段） | 保持查看器打开，后续关闭降级为淡出 |
| 设备旋转（opening/closing 阶段） | 立即中止飞行动画，淡出关闭 |
| Android 返回键关闭 | 与单击关闭行为一致（飞回或淡出） |
