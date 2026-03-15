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

共 5 种手势，全部通过 `react-native-gesture-handler` 的 Gesture API 统一管理：

| 手势 | 触发条件 | 行为 |
|------|---------|------|
| 单击 | 等待 200ms 确认非双击后触发 | 淡出关闭查看器 |
| 双击 | 快速两次点击 | 1× ↔ 2× 缩放切换，缩放中心为点击位置 |
| 长按 | 按住 ≥ 500ms | 弹出操作菜单（保存 / 分享） |
| 下滑拖动 | `scale ≈ 1` 时向下 Pan | 图片跟手移动，同时缩小+背景渐透明 |
| 捏合/平移 | `scale > 1` | 自由缩放与平移图片 |

**手势冲突处理：**
- 单击手势调用 `.requireExternalGestureToFail(doubleTapGesture)`，延迟约 200ms，确保双击优先
- `scale ≈ 1`（0.9–1.1 范围）且 `dy > 0` 时，Pan 手势进入"下滑关闭模式"；否则进入"平移图片模式"
- LongPress 与 Tap 独立，互不干扰

---

## 下滑关闭动画

使用 3 个 `useSharedValue` 驱动：

| SharedValue | 初始值 | 说明 |
|-------------|--------|------|
| `dismissY` | 0 | 图片垂直偏移量（跟手） |
| `dismissScale` | 1 | 图片缩放比（随偏移线性缩小，最小 0.6） |
| `backdropOpacity` | 1 | 背景不透明度（随偏移线性降低，最小 0） |

计算公式：
```
dismissScale = clamp(1 - dismissY / SCREEN_HEIGHT * 0.8, 0.6, 1)
backdropOpacity = clamp(1 - dismissY / SCREEN_HEIGHT * 1.5, 0, 1)
```

**松手判断：**
- `dismissY > 80dp` → 执行关闭：`dismissY` 动画到 `SCREEN_HEIGHT`，完成后调用 `onClose()`
- `dismissY ≤ 80dp` → 弹性回弹：`dismissY` spring 回 0，`dismissScale` 和 `backdropOpacity` 同步恢复

---

## 操作菜单（Action Sheet）

**触发：** 长按图片 500ms

**样式：** 深色底部弹窗（iOS 风格），与 `voicePlayRow` 已有的 `actionSheet` 样式保持一致

**选项：**

1. **保存到相册**
   - 库：`expo-media-library`（已安装）
   - 流程：先调用 `MediaLibrary.getPermissionsAsync()` 检查权限；未授权则调用 `MediaLibrary.requestPermissionsAsync()`；授权后调用 `MediaLibrary.saveToLibraryAsync(imageUri)`
   - 成功/失败均用 `Alert` 提示用户

2. **分享**
   - 库：React Native 内置 `Share`（项目 `syncService.ts` 已在使用）
   - 调用 `Share.share({ url: imageUri })`

**关闭菜单：** 点击半透明遮罩或"取消"按钮

---

## 移除的元素

- `resetButton` / `resetButtonInner` 样式及对应 `TouchableOpacity`
- `hintContainer` / `hintBadge` 样式及对应 `View`
- `zoomTo100` 函数（仅供 resetButton 使用）
- `savedTranslateX` / `savedTranslateY` 相关逻辑（随 resetButton 一同移除，但捏合/平移仍保留独立 savedScale）

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
2. 单击图片 → 关闭（约 200ms 延迟，区分双击）
3. 双击图片 → 1× ↔ 2× 缩放
4. 捏合 → 自由缩放（0.5×–5×）
5. 缩放后拖动 → 平移图片
6. 未缩放时下滑 → 图片跟手缩小，超 80dp 松手后完成关闭，不足 80dp 弹回
7. 长按图片 → 弹出操作菜单（保存到相册 / 分享 / 取消）
8. 保存到相册 → 申请权限后写入，结果提示
9. 分享 → 系统分享面板打开
10. 所有原有测试无回归
