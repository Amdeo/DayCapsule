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
2. Swipeable 提供卡片偏移的视觉反馈（`renderRightActions` 返回宽度为 `1` 的透明占位 View，确保 `onSwipeableOpen` 正常触发）
3. 滑动距离超过阈值（40px）松手后，`onSwipeableOpen('right')` 触发（向左滑对应 `'right'` 方向）
4. 调用 `swipeableRef.current.close()` 使卡片立即弹回原位
5. 同时 `setShowActionSheet(true)` 弹出底部操作面板
6. 用户选择操作或通过遮罩点击/下滑手势关闭面板

---

## 视觉设计

### 底部面板（默认状态）

- **遮罩层：** `rgba(0,0,0,0.4)` 半透明，点击遮罩关闭面板
- **面板容器：** 白色背景，顶部圆角 `borderTopLeftRadius: 24, borderTopRightRadius: 24`
- **动画：** `Modal` 的 `animationType="none"`，面板通过 `react-native-reanimated` 的 `withSpring` 从底部滑入（项目已有 reanimated 依赖，无需新增）
- **类型色条：** 面板顶部 4px 高度色条，颜色与卡片类型对应：
  - 文字记录：紫色 `#A491D3`
  - 照片记录：青色 `#77C9D4`
  - 语音记录：橙色 `#F5A623`
- **拖拽指示条：** 色条下方居中显示灰色短横条（pill 形状，`width: 36, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0'`）

### 选项列表（默认状态）

| 选项 | 图标 | 文字颜色 |
|------|------|----------|
| 编辑 | `pencil-outline`（Ionicons，灰色 `#8E8E93`） | `#1A1A1A` |
| 删除 | `trash-outline`（Ionicons，红色 `#FF3B30`） | `#FF3B30` |

选项之间有 1px 分割线（`#F0F0F0`）。每个选项行高 56px，左侧图标，右侧 16px padding。

### 删除确认状态（内联）

点击「删除」后，面板**内联切换**为确认视图（不新增层级）：

- **标题文字：** 「确认删除这条记录？」，居中，`fontSize: 16, fontWeight: '600', color: '#1A1A1A'`
- **副标题文字：** 「此操作无法撤销」，居中，`fontSize: 13, color: '#8E8E93'`，标题下方 4px 间距
- **确认删除按钮：** 全宽圆角按钮（`borderRadius: 14`），背景色 `#FF3B30`，白色文字「删除」，高度 52px
- **返回按钮：** 文字按钮「取消」，颜色 `#8E8E93`，居中，位于确认按钮下方 8px
- 点击「取消」返回默认选项列表视图（面板不关闭）

### 取消按钮（默认状态底部）

- 独立圆角卡片（`borderRadius: 14`），与选项列表有 8px 间距
- 居中文字「取消」，颜色 `#8E8E93`，高度 52px
- 点击关闭面板

### 下滑手势关闭

在面板容器上添加 `PanResponder`（RN 原生，无需 gesture-handler），检测向下拖拽速度 > 500 时触发关闭动画（`withTiming` 滑出）。不使用 gesture-handler 的 `PanGestureHandler`，避免与外层 Swipeable 的手势响应链冲突。

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

- 使用 React Native 原生 `Modal`（`transparent={true}`，`animationType="none"`）
- 内部维护 `mode: 'menu' | 'confirm'` state，控制默认选项视图与删除确认视图的切换
- `onDelete` 在用户在确认视图点击「删除」时才调用（不是点击第一个「删除」选项时）
- 面板进入/退出动画使用 `react-native-reanimated` 的 `withSpring` / `withTiming`
- 无需新增第三方依赖

### 修改：`EntryCard.tsx`

| 变更项 | 说明 |
|--------|------|
| 新增 `showActionSheet` state | 控制底部面板显示 |
| `renderRightActions` | 返回宽度为 `1`、透明的占位 View，确保 `onSwipeableOpen` 正常触发 |
| `onSwipeableOpen` | 先调用 `swipeableRef.current?.close()`，再 `setShowActionSheet(true)` |
| 移除 `isSwipeOpen` prop | 不再需要多卡片互斥逻辑 |
| 移除 `onSwipeStart` prop | 同上 |
| 移除 `onSwipeClose` prop | 同上 |
| 渲染 `<EntryActionSheet>` | 传入 `entryType`、`onEdit`、`onDelete`、`onClose` 回调，回调内部直接使用已有 `entry.id` |
| 移除 `handleActionDelete` 函数 | 删除确认逻辑移入 `EntryActionSheet` |

### 修改：`Timeline.v2.tsx`

| 变更项 | 说明 |
|--------|------|
| 移除 `openSwipeId` state | 不再需要跟踪当前展开的滑动卡片 |
| 移除 `handleSwipeStart` / `handleSwipeClose` 函数 | 逻辑不再需要 |
| 移除向 EntryCard 传递的三个 swipe 相关 props | 与 EntryCard 接口变更同步 |

### 多卡片互斥

由于 `showActionSheet` state 存在于 EntryCard 内部（而非 Timeline 层面），同一时间理论上可能存在多个面板。采用以下方案防止叠加：

- Timeline 维护 `activeActionSheetId: string | null` state（替代原来的 `openSwipeId`）
- EntryCard 接收新 prop `isActionSheetActive: boolean`
- 当 `isActionSheetActive` 从 `true` 变为 `false` 时（其他卡片打开面板），调用 `setShowActionSheet(false)`
- 这与原有的 `isSwipeOpen` 互斥机制逻辑一致，仅改变触发时机

**注意：** 将 `activeActionSheetId` 逻辑加入 Timeline，EntryCard 接口新增 `isActionSheetActive` 和 `onActionSheetOpen` 两个 prop。

---

## 不变部分

- Swipeable 的 `friction`、`leftThreshold`、`rightThreshold`、`overshootRight` 等参数保持不变
- EntryCard 其余所有功能（播放音频、查看图片、展开文本等）不受影响

---

## 测试要点

1. 左滑后卡片能正确弹回原位，底部面板正常弹出
2. 点击「编辑」触发编辑流程，面板关闭
3. 点击「删除」切换为确认视图；确认后调用删除并关闭面板；确认视图中「取消」返回选项列表
4. 点击遮罩关闭面板
5. 下滑手势（速度 > 500）关闭面板
6. 三种卡片类型（文字/照片/语音）的色条颜色正确
7. iPhone 底部安全区 padding 正确
8. 面板已打开时，左滑另一张卡片：当前面板关闭，新卡片面板弹出（互斥）
9. 面板已打开时，再次左滑同一张卡片：无重复弹出，保持现有面板
