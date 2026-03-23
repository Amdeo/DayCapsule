# 时间轴交互链路 NativeWind 第八批迁移设计

## 状态

- 当前状态：已完成实现并通过验证
- 设计确认日期：2026-03-23
- 实现完成日期：2026-03-23

## 评审记录

- 2026-03-23：已完成第七批“媒体查看与录音链路”迁移，当前 worktree 继续在 `nativewind-style-guardrails` 上推进下一批。
- 2026-03-23：已检查剩余 allowlist，确认 `BottomToolbar`、`CalendarTimelineItem`、`CalendarView`、`FilterBar` 构成一组边界稳定的时间轴交互组件。
- 2026-03-23：已确认本轮目标仍然是把现有样式迁到 `NativeWind`，不借迁移之名改时间轴切换、日期选择、筛选或按钮行为。
- 2026-03-23：用户已明确要求后续自动推进，不再逐项请示；本轮设计基于该授权直接落文并继续 planning。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 spec review 继续采用本地结构化 review 留痕。
- 2026-03-23：`BottomToolbar`、`CalendarTimelineItem`、`CalendarView`、`FilterBar` 已全部迁到 `NativeWind`，并从 allowlist 中移除。
- 2026-03-23：第八批相关测试、全量 lint、typecheck 与全量测试均已通过。

## 背景

前七批迁移已经完成首页壳层、搜索编辑链路、详情操作链路、侧栏二级页共享壳层、设置与账号链路、备份与统计链路，以及媒体查看与录音链路的 NativeWind 收口。

当前仍在 allowlist 中、且与时间轴交互最相关的文件是：

- [BottomToolbar.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/BottomToolbar.tsx)
- [CalendarTimelineItem.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/CalendarTimelineItem.tsx)
- [CalendarView.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/CalendarView.tsx)
- [FilterBar.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/FilterBar.tsx)

它们在交互层面的关系如下：

- `CalendarView` 负责月历格子、日期切换和内容区时间轴渲染
- `CalendarTimelineItem` 是 `CalendarView` 内容区的单条时间轴容器
- `FilterBar` 提供类型、时间和标签筛选控制
- `BottomToolbar` 提供底部快速新增入口

虽然 `FilterBar` 与 `BottomToolbar` 当前不在 `CalendarView` 内直接引用，但两者都属于时间轴入口/筛选控制层，且都是存量 legacy 样式组件。把这四个文件作为一批处理，可以一次性收口“时间轴查看 + 筛选 + 快捷操作”这一层交互外壳，同时把剩余页面壳层留到最后一批处理。

## 目标

- 把 `BottomToolbar`、`CalendarTimelineItem`、`CalendarView`、`FilterBar` 的静态视觉样式迁到 `NativeWind`
- 保持月份切换、日期选中、时间轴条目透传、筛选状态和标签弹层逻辑不变
- 为缺失测试的组件补齐稳定的根壳层和关键状态测试锚点
- 迁移完成后，把这 4 个文件从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 中移除

## 非目标

- 不改 `CalendarView` 的月份切换、当天高亮、日期选中/取消和月内分组逻辑
- 不改 `CalendarTimelineItem` 对 `EntryCard` 的透传和密度间距规则
- 不改 `FilterBar` 的 store 依赖、标签查询、类型/日期/标签筛选逻辑和标签弹层动画行为
- 不改 `BottomToolbar` 的按钮数量、按钮顺序和点击回调类型
- 不把本轮扩展到 `app/_layout.tsx`、`app/(tabs)/_layout.tsx`、`app/modal.tsx` 或 `ErrorBoundary.tsx`

## 方案对比

### 方案 A：四个文件整批迁移

- 优点：时间轴交互层一次收口，allowlist 下降更明显；两个轻量组件可以先建立本批样式基线，再处理 `CalendarView` 和 `FilterBar`
- 缺点：需要同时覆盖日历内容区和筛选弹层两类交互，测试面更宽

### 方案 B：只做 `CalendarTimelineItem`、`CalendarView`

- 优点：链路最直接，聚焦当前主渲染路径
- 缺点：`FilterBar` 和 `BottomToolbar` 仍继续留在 allowlist，时间轴交互层不能一批收口

### 方案 C：只做 `BottomToolbar`、`FilterBar`

- 优点：文件尺寸小，迁移快
- 缺点：`CalendarView` 相关核心 legacy 文件仍在，收益偏低

推荐采用方案 A。

## 最终方案

### 1. 总体迁移策略

本轮继续沿用前七批的原则：

- 只迁静态样式表达，不改业务行为
- 能用 `className` 表达的静态壳层全部迁走
- 动态颜色、运行时 padding、Animated style、按状态切换的颜色和 `ScrollView` 内容 padding 继续允许保留 `style`
- 不为迁移重做结构，只做最小测试锚点和样式收口

固定边界如下：

- `BottomToolbar` 保留按钮映射、回调类型和绝对定位浮层语义
- `CalendarTimelineItem` 保留 `density` 间距、类型颜色与 `EntryCard` 透传
- `CalendarView` 保留月份计算、日期选中、月内分组、时间轴渲染和安全区 padding
- `FilterBar` 保留 `useEntryStore` 依赖、标签加载、筛选按钮逻辑与 `TagModal` 动画

### 2. `BottomToolbar` 迁移设计

[BottomToolbar.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/BottomToolbar.tsx) 是本批最小文件，优先迁移。

迁移后它仍然保留：

- `TOOLBAR_BUTTONS` 顺序
- `onPress(type)` 回调
- 绝对定位底部浮层

具体处理方式：

- 删除 `StyleSheet.create`
- 用 `className` 表达：
  - container
  - toolbar
  - button
- 保留：
  - 阴影若 NativeWind 表达不完整时的最小 style

允许补的稳定测试锚点：

- `bottom-toolbar-root`
- `bottom-toolbar-button-text`
- `bottom-toolbar-button-photo`
- `bottom-toolbar-button-voice`

### 3. `CalendarTimelineItem` 迁移设计

[CalendarTimelineItem.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/CalendarTimelineItem.tsx) 结构简单，但承载时间轴点、时间和卡片容器三块壳层，适合在 `BottomToolbar` 之后迁移。

迁移后它仍然保留：

- `DENSITY_SPACING`
- `TYPE_COLORS`
- `formatHHMM`
- 对 `EntryCard` 的全部透传

具体处理方式：

- 删除 `StyleSheet.create`
- 用 `className` 表达：
  - container
  - dotOuter
  - dot
  - timeWrap
  - timeText
  - cardWrap
- 保留：
  - `paddingBottom: spacing`
  - `backgroundColor: dotColor`
  - `color: dotColor`
  - 绝对定位时间轴圆点的必要 style

允许补的稳定测试锚点：

- `calendar-timeline-item-root`
- `calendar-timeline-item-dot`
- `calendar-timeline-item-time`

### 4. `CalendarView` 迁移设计

[CalendarView.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/CalendarView.tsx) 已有较完整测试，是本批主干组件。

迁移后它仍然保留：

- `currentDate` / `selectedKey`
- `entryMap` / `monthEntries` / `monthDayGroups` / `calendarDays`
- `prevMonth` / `nextMonth` / `handleDayPress`
- `renderTimelineItems`
- 安全区 `paddingBottom: 24 + insets.bottom`

具体处理方式：

- 删除 `StyleSheet.create`
- 用 `className` 表达：
  - container
  - header / navBtn / monthTitle
  - weekRow / weekday
  - grid / dayCell
  - dotsRow
  - contentHeader / contentTitle
  - sectionDivider
  - deselectBtn / deselectText
  - dayGroupLabel / emptyText
  - timelineGroup / timelineLine
- 保留：
  - `contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}`
  - `width: ${100 / 7}%`
  - 日期选中、今天态、其他选中态下的动态背景色/边框色/透明度

允许补的稳定测试锚点：

- `calendar-view-root`
- `calendar-grid`
- `calendar-content-header`

### 5. `FilterBar` 迁移设计

[FilterBar.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/FilterBar.tsx) 是本批最复杂文件，最后迁移。

迁移后它仍然保留：

- `AnimatedButton` 的 `scale` 动画
- `useEntryStore` 读取和更新逻辑
- `getAllTags()` 的可见时加载策略
- `TagModal` 的 `visible / shouldRender / isAnimating` 生命周期
- 标签弹层的进入/退出动画与关闭行为

具体处理方式：

- 删除 `StyleSheet.create`
- 把静态壳层迁到 `className`：
  - container / headerRow / headerTitle / closeButton
  - section / sectionTitle / scrollContent
  - filterButton / iconContainer / filterLabel / filterCount
  - dateButton / dateLabel
  - resetSection / resetButton / resetText
  - tagButton / tagButtonText / selectedTag / selectedTagText / removeTagButton
  - modalContainer / modalBackdrop / modalContent
  - modalHeader / modalTitle / modalHeaderButtons
  - clearButton / clearButtonText / closeModalButton
  - tagList / emptyState / emptyText / emptyHint / tagGrid
  - tagChip / tagChipText
  - modalFooter / doneButton / doneButtonText
- 保留：
  - `Animated.View style={animatedStyle}`
  - `style` 数组里基于选中状态切换的背景色、文字色
  - `Pressable style={StyleSheet.absoluteFill}` 可改为 `className="absolute inset-0"` 或最小静态 style
  - `style={{ flex: 1 }}`
  - 图标 `marginRight: 4`

允许补的稳定测试锚点：

- `filter-bar-root`
- `filter-bar-tag-modal`
- `filter-bar-reset-button`

### 6. 测试与验收策略

第一层是组件级测试：

- 新增 `BottomToolbar.test.tsx`
  - 锁定根壳层和 3 个按钮
  - 锁定点击分别回传 `text` / `photo` / `voice`
- 新增 `CalendarTimelineItem.test.tsx`
  - 锁定根壳层、时间文本和圆点存在
  - 锁定 `EntryCard` 收到 `variant="calendar"` 和 `density`
- 扩充 `CalendarView.test.tsx`
  - 锁定根壳层、日历网格和内容标题区存在
  - 继续保留月份切换、日期选中、完整卡片能力断言
- 新增 `FilterBar.test.tsx`
  - 锁定根壳层存在
  - 覆盖类型筛选、重置按钮、标签弹层壳层和清除行为

第二层是守卫与全量验收：

- 迁移完成后，从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 删除：
  - `src/components/BottomToolbar.tsx`
  - `src/components/CalendarTimelineItem.tsx`
  - `src/components/CalendarView.tsx`
  - `src/components/FilterBar.tsx`
- 跑相关组件测试、`npm run lint`、`npm run typecheck` 和全量 `npm test -- --runInBand`

### 7. 风险与控制

这批最大风险有三类：

- `CalendarView` 的日期选中、月份切换和点位状态在迁移中被误改
- `CalendarTimelineItem` 的密度间距或 `EntryCard` 透传被误伤
- `FilterBar` 的标签弹层动画和筛选状态切换在迁移中回归

对应控制方式：

- 先迁 `BottomToolbar`
- 再迁 `CalendarTimelineItem`
- 然后在现有测试基础上迁 `CalendarView`
- 最后迁 `FilterBar`
- 对动态颜色、动态 padding、Animated style 和按状态切换的 style 坚持最小保留

## 本地结构化 Review 结论

- 已检查第八批范围、组件关系、测试缺口和 allowlist 收口点
- `BottomToolbar`、`CalendarTimelineItem`、`CalendarView`、`FilterBar` 可以组成一批边界稳定的时间轴交互样式迁移链路
- 未发现阻塞进入 implementation plan 的问题

## 实现结果

- 已完成 [BottomToolbar.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/BottomToolbar.tsx)、[CalendarTimelineItem.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/CalendarTimelineItem.tsx)、[CalendarView.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/CalendarView.tsx)、[FilterBar.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/FilterBar.tsx) 的静态样式迁移，四者均不再依赖 `StyleSheet.create`
- 已补稳定测试锚点：
  - `bottom-toolbar-root`
  - `bottom-toolbar-button-text`
  - `bottom-toolbar-button-photo`
  - `bottom-toolbar-button-voice`
  - `calendar-timeline-item-root`
  - `calendar-timeline-item-dot`
  - `calendar-timeline-item-time`
  - `calendar-view-root`
  - `calendar-grid`
  - `calendar-content-header`
  - `filter-bar-root`
  - `filter-bar-reset-button`
  - `filter-bar-tag-modal`
- 已新增 [BottomToolbar.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/BottomToolbar.test.tsx)、[CalendarTimelineItem.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/CalendarTimelineItem.test.tsx)、[FilterBar.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/FilterBar.test.tsx)，并扩充 [CalendarView.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/CalendarView.test.tsx)
- 已从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 删除这 4 个组件，完成第八批时间轴交互链路收口
- 时间轴与筛选行为保持不变：
  - `BottomToolbar` 仍上抛 `text / photo / voice`
  - `CalendarTimelineItem` 仍透传 `EntryCard` 的 `calendar` variant 与密度
  - `CalendarView` 的月份切换、日期选中、当天态和月内分组逻辑未调整
  - `FilterBar` 的 store 筛选状态、标签查询和标签弹层动画语义未调整

## 验证结果

- `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/BottomToolbar.test.tsx src/components/__tests__/CalendarTimelineItem.test.tsx src/components/__tests__/CalendarView.test.tsx src/components/__tests__/FilterBar.test.tsx`：PASS，4 个 suite / 14 个测试全部通过
- `cd app && npm run lint`：PASS
- `cd app && npm run typecheck`：PASS
- `cd app && npm test -- --runInBand`：PASS，62 个 suite / 372 个测试全部通过

## 偏差说明

- 无功能性偏差
