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
  x: number;       // 缩略图左上角屏幕 x 坐标
  y: number;       // 缩略图左上角屏幕 y 坐标
  width: number;   // 缩略图宽度
  height: number;  // 缩略图高度
}

interface ImageViewerProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  originLayout?: OriginLayout;   // 新增，可选，向后兼容
}
```

不传 `originLayout` 时，行为降级为当前的淡出/淡入。

### 2.2 `EntryCard` 变更

- 为缩略图 `Image` 组件添加 `ref`（`imageRef = useRef<View>(null)`）
- 在 `handleImagePress` 中调用 `imageRef.current.measureInWindow(x, y, w, h => ...)` 获取屏幕坐标
- 将坐标存入 state：`originLayout: OriginLayout | null`
- 将 `originLayout` 传入 `<ImageViewer>`

---

## 3. 动画状态机

```
idle
  │  visible=true & originLayout 存在
  ▼
opening     英雄图从 originLayout → 全屏，backdrop opacity 0→1
  │  动画完成
  ▼
open        正常手势交互（现有逻辑不变）
  │  触发关闭（单击 / 下滑松手）
  ▼
closing     检测缩略图是否在视口内
  ├─ 可见   → 英雄图从全屏 → originLayout，backdrop opacity 1→0，完成后 onClose()
  └─ 不可见 → closing-fade：原地 opacity 1→0，完成后 onClose()
```

无 `originLayout` 时：`idle → open（淡入）→ open → closing-fade`（维持现有行为）。

---

## 4. 英雄覆盖层实现

### 4.1 渲染结构

在 Modal 内新增一个绝对定位的「英雄图」层，与现有手势交互层互斥显示：

```
<Modal>
  <GestureHandlerRootView>
    <Animated.View backdrop />            {/* 遮罩 */}

    {/* 英雄覆盖层（opening / closing 阶段可见）*/}
    <Animated.Image heroImageStyle />

    {/* 手势交互层（open 阶段可见）*/}
    <GestureDetector>
      <Animated.View imageContainer />
    </GestureDetector>

    {/* Action Sheet（不变）*/}
  </GestureHandlerRootView>
</Modal>
```

### 4.2 英雄图动画值

使用 Reanimated `useSharedValue` 直接驱动 `position: 'absolute'` 的 `left / top / width / height`：

| 动画值 | opening 起点 | opening 终点 |
|--------|-------------|-------------|
| `heroLeft` | `originLayout.x` | `0` |
| `heroTop` | `originLayout.y` | `0` |
| `heroWidth` | `originLayout.width` | `SCREEN_WIDTH` |
| `heroHeight` | `originLayout.height` | `SCREEN_HEIGHT` |
| `backdropOpacity` | `0` | `1` |

closing 时动画方向相反。

### 4.3 动画曲线

| 阶段 | 曲线 | 参数 |
|------|------|------|
| opening | `withSpring` | `damping: 28, stiffness: 300` |
| closing（飞回） | `withTiming` | `duration: 250, easing: Easing.out(Easing.cubic)` |
| closing-fade | `withTiming` | `duration: 200` |

### 4.4 阶段切换

- 英雄图可见性：`heroOpacity` 在 `open` 阶段设为 `0`，`opening`/`closing` 阶段设为 `1`
- 手势交互层可见性：仅在 `open` 阶段渲染（或用 `pointerEvents="none"` 屏蔽）
- 使用 `runOnJS` 在动画完成回调中切换 React 状态

---

## 5. 缩略图可见性判断

关闭前在 JS 线程执行：

```ts
function isThumbnailVisible(layout: OriginLayout, screenHeight: number): boolean {
  return layout.y + layout.height > 0 && layout.y < screenHeight;
}
```

满足条件则执行飞回动画，否则执行淡出降级。

---

## 6. 下滑手势适配

现有 `panGesture` 的 dismiss 逻辑修改 `onEnd` 分支：

- 原：`dismissY.value > DISMISS_THRESHOLD` → 滑出屏幕底部后 `onClose()`
- 改：`dismissY.value > DISMISS_THRESHOLD` → 重置 dismissY/dismissScale，进入 `closing` 状态（触发飞回或淡出）

飞回动画的终点坐标使用 `originLayout`（与单击关闭共用同一套逻辑）。

---

## 7. 向后兼容

`originLayout` 为可选 prop。不传时：
- `opening`：直接进入 `open` 状态，backdrop 淡入（维持现有行为）
- `closing`：淡出（维持现有行为）

已有的所有手势（捏合缩放、平移、双击缩放、长按菜单）在 `open` 阶段完全不变。

---

## 8. 测试要点

| 场景 | 预期行为 |
|------|---------|
| 点击缩略图打开 | 图片从缩略图位置飞入全屏，遮罩同步淡入 |
| 单击关闭（缩略图在屏幕内） | 图片飞回缩略图原位，遮罩淡出 |
| 下滑关闭（缩略图在屏幕内） | 松手后图片飞回缩略图原位 |
| 关闭（缩略图已滚出屏幕） | 图片原地淡出 |
| 不传 originLayout | 现有淡入/淡出行为不变 |
| 快速连续打开关闭 | 动画不卡顿、无状态残留 |
| 设备旋转 | 以新的屏幕尺寸为全屏目标 |
