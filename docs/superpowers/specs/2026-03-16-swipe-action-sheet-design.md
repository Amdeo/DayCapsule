# 设计文档：滑动触发底部操作面板

**日期：** 2026-03-16
**状态：** 已批准
**影响范围：** EntryCard、Timeline.v2、新增 EntryActionSheet 组件

---

## 背景

当前 EntryCard 组件通过 `react-native-gesture-handler` 的 `Swipeable` 实现左滑操作：左滑后右侧露出「编辑」和「删除」两个色块按钮。

**问题：** 色块按钮占据卡片空间，视觉上较为突兀，与整体极简现代风格不一致。

**目标：** 保留滑动手势触发操作的交互习惯，但将操作界面改为从屏幕底部弹出的面板，提升视觉一致性和操作舒适度。

---

## 交互流程

1. 用户向左滑动 EntryCard
2. Swipeable 提供卡片偏移的视觉反馈
3. 滑动距离超过阈值（40px）松手后，`onSwipeableOpen` 触发
4. 调用 `swipeableRef.current.close()` 使卡片立即弹回原位
5. 同时 `setShowActionSheet(true)` 弹出底部操作面板
6. 用户点击「编辑」或「删除」选项，或点击遮罩/下滑关闭面板

---

## 视觉设计

### 底部面板

- **遮罩层：** `rgba(0,0,0,0.4)` 半透明，点击遮罩关闭面板
- **面板容器：** 白色背景，顶部圆角 `borderTopLeftRadius: 24, borderTopRightRadius: 24`，通过 `withSpring` 从底部滑入
- **类型色条：** 面板顶部 4px 高度色条，颜色与卡片类型对应：
  - 文字记录：紫色 `#A491D3`
  - 照片记录：青色 `#77C9D4`
  - 语音记录：橙色 `#F5A623`
- **拖拽指示条：** 色条下方居中显示灰色短横条（pill 形状）

### 选项列表

| 选项 | 图标 | 颜色 |
|------|------|------|
| 编辑 | `pencil-outline`（Ionicons） | 默认文字色 `#1A1A1A` |
| 删除 | `trash-outline`（Ionicons） | 危险色 `#FF3B30` |

选项之间有 1px 分割线（`#F0F0F0`）。

### 取消按钮

- 独立圆角卡片（`borderRadius: 14`），与选项列表有 8px 间距
- 居中文字「取消」，颜色 `#8E8E93`
- 点击关闭面板

### 安全区

底部使用 `useSafeAreaInsets` 的 `bottom` 值作为 padding，兼容 iPhone 底部 Home 指示条。

---

## 组件架构

### 新增：`EntryActionSheet.tsx`

```
props:
  visible: boolean
  entryType: 'text' | 'photo' | 'voice'
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
```

- 使用 React Native 原生 `Modal`（`transparent={true}`，`animationType="slide"`）
- 内部维护删除确认逻辑（替代现有 `Alert.alert`）
- 无需新增第三方依赖

### 修改：`EntryCard.tsx`

| 变更项 | 说明 |
|--------|------|
| 新增 `showActionSheet` state | 控制底部面板显示 |
| `renderRightActions` | 返回宽度为 0 的透明占位 View，仅保留手势检测 |
| `onSwipeableOpen` | 先关闭 Swipeable，再触发面板显示 |
| 移除 `isSwipeOpen` prop | 不再需要多卡片互斥逻辑 |
| 移除 `onSwipeStart` prop | 同上 |
| 移除 `onSwipeClose` prop | 同上 |
| 渲染 `<EntryActionSheet>` | 传入 entryType 和回调 |

### 修改：`Timeline.v2.tsx`

| 变更项 | 说明 |
|--------|------|
| 移除 `openSwipeId` state | 不再需要跟踪当前展开的滑动卡片 |
| 移除相关 `handleSwipeStart` / `handleSwipeClose` 函数 | 逻辑不再需要 |
| 移除向 EntryCard 传递的三个 swipe 相关 props | 与 EntryCard 接口变更同步 |

---

## 不变部分

- 删除前仍需二次确认（在 EntryActionSheet 内部处理，替代当前的 `Alert.alert`）
- Swipeable 的 `friction`、`leftThreshold`、`rightThreshold` 等参数保持不变
- EntryCard 其余所有功能（播放音频、查看图片、展开文本等）不受影响

---

## 测试要点

1. 左滑后卡片能正确弹回原位，底部面板正常弹出
2. 点击「编辑」正确触发编辑流程
3. 点击「删除」弹出确认，确认后正确删除
4. 点击遮罩或下滑能关闭面板
5. 三种卡片类型（文字/照片/语音）的色条颜色正确
6. iPhone 底部安全区 padding 正确
7. 快速连续左滑不会出现面板叠加或动画残留
