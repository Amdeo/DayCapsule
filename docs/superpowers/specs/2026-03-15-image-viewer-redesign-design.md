# 图片查看器重设计 设计文档

**日期：** 2026-03-15
**状态：** 已批准

---

## 目标

将图片查看器改造为微信朋友圈风格的沉浸式体验：去除所有浮动按钮，改用纯手势交互。默认状态下只有图片和黑色背景，通过手势完成所有操作。

---

## 当前问题

现有 `ImageViewer.tsx` 存在：
- 左上「重置」按钮（圆形，含边框）
- 右上「关闭」按钮（圆形，含边框）
- 底部手势提示徽章（含多个图标）

三个 UI 元素干扰观图体验，且功能可完全由手势替代。

---

## 手势系统设计

共 5 种手势，全部通过 `react-native-gesture-handler` 的 Gesture API 统一管理。

### 手势功能表

| 手势 | 触发条件 | 行为 |
|------|---------|------|
| 单击 | 等待双击失败后（约 200ms）触发 | 淡出关闭查看器 |
| 双击 | 快速两次点击 | 1× ↔ 2× 缩放切换 |
| 长按 | 按住 ≥ 500ms | 弹出操作菜单（保存 / 分享） |
| 下滑拖动 | Pan `onBegin` 时 `scale ≈ 1` 且 `dy ≥ 0` | 图片跟手移动，缩小+背景渐透明 |
| 捏合/平移 | `scale > 1` 时 Pan；任意时 Pinch | 自由缩放与平移图片 |

### 手势组合结构

```ts
const composedGesture = Gesture.Race(
  singleTapGesture.requireExternalGestureToFail(doubleTapGesture), // 等双击失败后触发
  doubleTapGesture,
  longPressGesture,
  Gesture.Simultaneous(pinchGesture, panGesture),
);
```

说明：
- `singleTapGesture.requireExternalGestureToFail(doubleTapGesture)`：单击等待双击失败后才激活，延迟约 200ms
- `Race` 中先激活的手势取消其他手势（Pan/Pinch 开始拖动后会取消 LongPress，符合预期）
- `Simultaneous(pinch, pan)` 保持捏合与平移同时生效

### Pan 模式锁定（防跳变）

Pan 的"下滑关闭模式"与"平移图片模式"**在 `onBegin` 时一次性锁定**，整个拖动生命周期不再重新判断：

```ts
const panMode = useSharedValue<0 | 1>(0); // 0 = translate, 1 = dismiss

// onBegin：锁定模式
onBegin: () => {
  panMode.value = (scale.value >= 0.9 && scale.value <= 1.1) ? 1 : 0;
},
// onUpdate：只读 panMode.value，不再读 scale
// onEnd：重置 panMode.value = 0
```

这样避免了捏合中途改变 scale 导致的模式跳变。

---

## SharedValue 列表

| 名称 | 类型 | 说明 |
|------|------|------|
| `scale` | number | 当前缩放值 |
| `savedScale` | number | Pan/Pinch 结束时保存的缩放值 |
| `translateX` | number | 图片水平偏移（平移模式） |
| `translateY` | number | 图片垂直偏移（平移模式） |
| `savedTranslateX` | number | Pan 结束时保存的 X 偏移（多次拖动累积） |
| `savedTranslateY` | number | Pan 结束时保存的 Y 偏移（多次拖动累积） |
| `dismissY` | number | 下滑关闭模式的垂直偏移 |
| `dismissScale` | number | 下滑时图片缩放（随 dismissY 线性减小） |
| `backdropOpacity` | number | 背景不透明度（随 dismissY 线性减小） |
| `panMode` | 0 \| 1 | Pan 模式锁：0 = 平移图片，1 = 下滑关闭 |

> **注意：** `savedTranslateX/Y` 保留，用于 Pan `onEnd` 累积平移位置，确保多次拖动不跳变。

---

## 下滑关闭动画

计算公式（在 `useAnimatedStyle` 的 worklet 中）：

```ts
dismissScale = clamp(1 - dismissY.value / SCREEN_HEIGHT * 0.8, 0.6, 1)
backdropOpacity = clamp(1 - dismissY.value / SCREEN_HEIGHT * 1.5, 0, 1)
```

**松手判断（Pan `onEnd`）：**
- `dismissY > 80dp` → 执行关闭：`dismissY` 动画到 `SCREEN_HEIGHT`，`backdropOpacity` 到 0，完成后调用 `onClose()` 并重置所有值
- `dismissY ≤ 80dp` → 弹性回弹：`dismissY`、`dismissScale`、`backdropOpacity` spring 回初始值

---

## 操作菜单（Action Sheet）

**触发：** 长按图片 ≥ 500ms

**样式：** 深色底部弹窗，半透明遮罩背景

**选项：**

1. **保存到相册**
   - 库：`expo-media-library`（已安装）
   - 流程：`MediaLibrary.getPermissionsAsync()` → 未授权则 `requestPermissionsAsync()` → 授权后 `saveToLibraryAsync(imageUri)`
   - 成功/失败均用 `Alert` 提示
   - 权限配置：`app.json` 中需声明 `NSPhotoLibraryAddUsageDescription`（iOS）；Android API ≤ 28 需 `WRITE_EXTERNAL_STORAGE`（实现时核查 app.json 是否已配置）

2. **分享**
   - 库：React Native 内置 `Share`（`syncService.ts` 已在使用）
   - 调用 `Share.share({ url: imageUri })`

**关闭菜单：** 点击半透明遮罩或"取消"按钮；由 `useState<boolean>` 控制显隐

---

## 移除的元素

- `closeButton` / `closeButtonInner` 样式及对应 `TouchableOpacity`（关闭改由单击手势触发）
- `resetButton` / `resetButtonInner` 样式及对应 `TouchableOpacity`
- `hintContainer` / `hintBadge` 样式及对应 `View`
- `resetTransform` 函数中对按钮的对外暴露（内部仍可保留用于关闭时重置状态）
- `zoomTo100` 函数（仅供 resetButton 使用）

---

## 修改范围

**仅修改一个文件：** `app/src/components/ImageViewer.tsx`

依赖库（全部已安装）：
- `react-native-gesture-handler` — 手势
- `react-native-reanimated` — 动画
- `expo-media-library` — 保存到相册
- `react-native`（内置） — `Share`、`Alert`、`Modal`

---

## Props 接口（不变）

```ts
interface ImageViewerProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
}
```

调用方无需任何修改。

---

## 验收标准

1. 打开查看器 → 只有图片和黑色背景，无任何浮动按钮
2. 单击图片 → 约 200ms 延迟后淡出关闭
3. 双击图片 → 1× ↔ 2× 缩放切换
4. 捏合 → 自由缩放（0.5×–5×）
5. 缩放后拖动 → 平移图片；多次拖动位置正确累积（不跳变）
6a. 未缩放时下滑 > 80dp 松手 → 弹性缩小淡出后关闭
6b. 未缩放时下滑 ≤ 80dp 松手 → 弹性回弹，不关闭
7. scale > 1 时向下 Pan → 平移图片，不触发下滑关闭
8. 长按图片 → 弹出操作菜单（保存到相册 / 分享 / 取消）
9. 操作菜单：点击遮罩或取消 → 菜单关闭，图片查看器保持打开
10. 保存到相册 → 申请权限后写入，Alert 提示结果
11. 分享 → 系统分享面板打开
12. 所有原有测试无回归
