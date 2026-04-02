# 时间轴交互链路 NativeWind 第八批迁移 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变时间轴查看、日历选择、筛选和快捷新增逻辑的前提下，把 `BottomToolbar`、`CalendarTimelineItem`、`CalendarView`、`FilterBar` 迁到 `NativeWind`，并继续收紧样式守卫 allowlist。

**Architecture:** 本轮按“最小底部工具栏 -> 时间轴单条容器 -> 已有测试主干日历 -> 状态和动画更重的筛选栏”四个层次分块迁移。每块都先写失败测试，再做最小实现，迁完立刻从 allowlist 中移除对应文件，最后统一跑 lint、typecheck 和全量测试并回填文档状态。

**Tech Stack:** React Native, NativeWind 4, Tailwind CSS, Jest, Testing Library, React Native Reanimated, Zustand

**Spec:** `docs/superpowers/specs/2026-03-23-timeline-interaction-nativewind-migration-design.md`

**Status:** 已完成实现、验证与文档回填

---

## 变更记录

- 2026-03-23：基于已批准 spec 创建第八批实现计划，范围固定为 `BottomToolbar`、`CalendarTimelineItem`、`CalendarView`、`FilterBar`。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 plan review 先采用本地结构化 review，并在文档中留痕。
- 2026-03-23：已完成本地结构化 review，未发现阻塞执行的问题。
- 2026-03-23：Chunk 1 完成，提交 `9627b37 refactor: migrate bottom toolbar to nativewind`。
- 2026-03-23：Chunk 2 完成，提交 `7fc0eb2 refactor: migrate calendar timeline item to nativewind`。
- 2026-03-23：Chunk 3 完成，提交 `57cc2ca refactor: migrate calendar view to nativewind`。
- 2026-03-23：Chunk 4 完成，提交 `e1db1c7 refactor: migrate filter bar to nativewind`。
- 2026-03-23：Chunk 5 完成，第八批相关测试、全量 lint、typecheck 与全量测试全部通过。

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `app/src/components/__tests__/BottomToolbar.test.tsx` | 锁定底部工具栏根壳层、3 个按钮和点击回调 |
| `app/src/components/__tests__/CalendarTimelineItem.test.tsx` | 锁定时间轴单条壳层、时间文本、圆点和 `EntryCard` 透传 |
| `app/src/components/__tests__/FilterBar.test.tsx` | 锁定筛选栏根壳层、重置按钮和标签弹层 |

### Modified Files

| File | Change |
|------|--------|
| `app/eslint/style-guard-allowlist.js` | 每完成一个迁移块就移除对应 legacy 文件，继续收紧守卫 |
| `app/src/components/BottomToolbar.tsx` | 把底部工具栏壳层迁到 `NativeWind`，保留按钮映射和回调 |
| `app/src/components/CalendarTimelineItem.tsx` | 把时间轴单条壳层迁到 `NativeWind`，保留密度间距和 `EntryCard` 透传 |
| `app/src/components/CalendarView.tsx` | 把日历视图静态壳层迁到 `NativeWind`，保留月份切换、选中状态和时间轴内容逻辑 |
| `app/src/components/FilterBar.tsx` | 把筛选栏与标签弹层静态壳层迁到 `NativeWind`，保留 store 与动画逻辑 |
| `app/src/components/__tests__/CalendarView.test.tsx` | 扩充日历根壳层和关键结构断言 |
| `docs/superpowers/specs/2026-03-23-timeline-interaction-nativewind-migration-design.md` | 实现完成后回填状态、验证结果与偏差说明 |
| `docs/superpowers/plans/2026-03-23-timeline-interaction-nativewind-migration.md` | 执行过程中勾选任务、记录验证结果和收口状态 |

## 执行约束

- 四个组件的展示形态必须保持原样：
  - `BottomToolbar` 仍固定显示 3 个新增按钮
  - `CalendarTimelineItem` 仍保留时间、圆点和卡片容器结构
  - `CalendarView` 仍保留月历格子、当天态、选中态和内容区时间轴
  - `FilterBar` 仍保留类型、时间、标签和标签弹层
- 不能改现有行为边界：
  - `CalendarView` 继续使用 `CalendarTimelineItem`
  - `CalendarTimelineItem` 继续使用 `EntryCard` 的 `calendar` variant
  - `FilterBar` 继续通过 `useEntryStore` 更新筛选状态
  - `BottomToolbar` 继续上抛 `text` / `photo` / `voice`
- 只迁静态视觉表达；动态颜色、动态 padding、Animated style、安全区 padding、状态切换 style 允许继续使用 `style`
- 不重做视觉结构；优先复用现有 token，确实不够时才用最小 arbitrary classes 维持现状
- 每完成一个组件迁移，就从 allowlist 中删除对应文件，避免“迁完仍长期放行”

## Chunk 1: BottomToolbar 底部工具栏迁移

### Task 1: 新增 `BottomToolbar` 测试并迁移底部工具栏

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Create: `app/src/components/__tests__/BottomToolbar.test.tsx`
- Modify: `app/src/components/BottomToolbar.tsx`

- [x] **Step 1: 先写失败测试，锁定根壳层和 3 个按钮**

新增 `app/src/components/__tests__/BottomToolbar.test.tsx`，至少包含：

```ts
it('renders toolbar shell and dispatches button types', () => {
  const onPress = jest.fn();
  const screen = render(<BottomToolbar onPress={onPress} />);

  expect(screen.getByTestId('bottom-toolbar-root')).toBeTruthy();
  fireEvent.press(screen.getByTestId('bottom-toolbar-button-text'));
  fireEvent.press(screen.getByTestId('bottom-toolbar-button-photo'));
  fireEvent.press(screen.getByTestId('bottom-toolbar-button-voice'));

  expect(onPress).toHaveBeenNthCalledWith(1, 'text');
  expect(onPress).toHaveBeenNthCalledWith(2, 'photo');
  expect(onPress).toHaveBeenNthCalledWith(3, 'voice');
});
```

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/BottomToolbar.test.tsx`

Expected: FAIL，原因应包含 `bottom-toolbar-root` 或按钮 testID 尚不存在。

- [x] **Step 3: 最小实现 `BottomToolbar` NativeWind 迁移**

在 `app/src/components/BottomToolbar.tsx`：

- 删除 `StyleSheet.create`
- 保留：
  - `TOOLBAR_BUTTONS`
  - `onPress(type)`
- 把静态壳层迁到 `className`：
  - container
  - toolbar
  - button
- 补以下 `testID`：
  - `bottom-toolbar-root`
  - `bottom-toolbar-button-text`
  - `bottom-toolbar-button-photo`
  - `bottom-toolbar-button-voice`

- [x] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/BottomToolbar.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/BottomToolbar.tsx`

然后跑：

Run: `cd app && pnpm run lint -- src/components/BottomToolbar.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/BottomToolbar.tsx app/src/components/__tests__/BottomToolbar.test.tsx
git commit -m "refactor: migrate bottom toolbar to nativewind"
```

## Chunk 2: CalendarTimelineItem 时间轴单条迁移

### Task 2: 新增 `CalendarTimelineItem` 测试并迁移时间轴单条

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Create: `app/src/components/__tests__/CalendarTimelineItem.test.tsx`
- Modify: `app/src/components/CalendarTimelineItem.tsx`

- [x] **Step 1: 先写失败测试，锁定根壳层、时间和透传**

新增 `app/src/components/__tests__/CalendarTimelineItem.test.tsx`，至少包含：

```ts
it('renders timeline item shell and forwards calendar props', () => {
  const screen = render(
    <CalendarTimelineItem entry={entry} density="default" />
  );

  expect(screen.getByTestId('calendar-timeline-item-root')).toBeTruthy();
  expect(screen.getByTestId('calendar-timeline-item-dot')).toBeTruthy();
  expect(screen.getByTestId('calendar-timeline-item-time')).toBeTruthy();
});
```

再补一条断言，确认 `EntryCard` 收到 `variant="calendar"` 与 `calendarDensity="default"`。

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/CalendarTimelineItem.test.tsx`

Expected: FAIL，原因应包含 `calendar-timeline-item-root` 等 testID 尚不存在。

- [x] **Step 3: 最小实现 `CalendarTimelineItem` NativeWind 迁移**

在 `app/src/components/CalendarTimelineItem.tsx`：

- 删除 `StyleSheet.create`
- 保留：
  - `DENSITY_SPACING`
  - `TYPE_COLORS`
  - `formatHHMM`
  - `EntryCard` 透传
- 把静态壳层迁到 `className`：
  - container
  - dotOuter
  - dot
  - timeWrap
  - timeText
  - cardWrap
- 继续保留：
  - `paddingBottom: spacing`
  - `backgroundColor: dotColor`
  - `color: dotColor`
- 补以下 `testID`：
  - `calendar-timeline-item-root`
  - `calendar-timeline-item-dot`
  - `calendar-timeline-item-time`

- [x] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/CalendarTimelineItem.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/CalendarTimelineItem.tsx`

然后跑：

Run: `cd app && pnpm run lint -- src/components/CalendarTimelineItem.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/CalendarTimelineItem.tsx app/src/components/__tests__/CalendarTimelineItem.test.tsx
git commit -m "refactor: migrate calendar timeline item to nativewind"
```

## Chunk 3: CalendarView 日历视图迁移

### Task 3: 扩充 `CalendarView` 测试并迁移日历视图

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/CalendarView.tsx`
- Modify: `app/src/components/__tests__/CalendarView.test.tsx`

- [x] **Step 1: 先写失败测试，锁定根壳层和关键结构**

在 `app/src/components/__tests__/CalendarView.test.tsx` 增加至少一条断言：

```ts
it('renders calendar view shell and content header', () => {
  const screen = render(<CalendarView {...calendarProps} />);

  expect(screen.getByTestId('calendar-view-root')).toBeTruthy();
  expect(screen.getByTestId('calendar-grid')).toBeTruthy();
  expect(screen.getByTestId('calendar-content-header')).toBeTruthy();
});
```

保留现有月份切换、日期选中和完整卡片能力测试。

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/CalendarView.test.tsx`

Expected: FAIL，原因应包含 `calendar-view-root` 等 testID 尚不存在。

- [x] **Step 3: 最小实现 `CalendarView` NativeWind 迁移**

在 `app/src/components/CalendarView.tsx`：

- 删除 `StyleSheet.create`
- 保留：
  - 所有日期与月份计算逻辑
  - `renderTimelineItems`
  - `contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}`
- 把静态壳层迁到 `className`：
  - container
  - header / navBtn / monthTitle
  - weekRow / weekday
  - grid / dotsRow
  - contentHeader / contentTitle
  - sectionDivider
  - deselectBtn / deselectText
  - dayGroupLabel / emptyText
  - timelineGroup / timelineLine
- 继续保留：
  - `width: ${100 / 7}%`
  - 选中态 / 今天态 / 其他选中态下的动态 style
- 补以下 `testID`：
  - `calendar-view-root`
  - `calendar-grid`
  - `calendar-content-header`

- [x] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/CalendarView.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/CalendarView.tsx`

然后跑：

Run: `cd app && pnpm run lint -- src/components/CalendarView.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/CalendarView.tsx app/src/components/__tests__/CalendarView.test.tsx
git commit -m "refactor: migrate calendar view to nativewind"
```

## Chunk 4: FilterBar 筛选栏迁移

### Task 4: 新增 `FilterBar` 测试并迁移筛选栏

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Create: `app/src/components/__tests__/FilterBar.test.tsx`
- Modify: `app/src/components/FilterBar.tsx`

- [x] **Step 1: 先写失败测试，锁定根壳层、重置按钮和标签弹层**

新增 `app/src/components/__tests__/FilterBar.test.tsx`，至少包含：

```ts
it('renders filter bar shell when visible', async () => {
  const screen = render(<FilterBar isVisible onClose={jest.fn()} />);

  expect(screen.getByTestId('filter-bar-root')).toBeTruthy();
});
```

再补测试覆盖：

- 点击类型筛选会调用 `setFilterType`
- 有筛选状态时显示 `filter-bar-reset-button`
- 打开标签弹层后能找到 `filter-bar-tag-modal`

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/FilterBar.test.tsx`

Expected: FAIL，原因应包含 `filter-bar-root` / `filter-bar-tag-modal` 等 testID 尚不存在。

- [x] **Step 3: 最小实现 `FilterBar` NativeWind 迁移**

在 `app/src/components/FilterBar.tsx`：

- 删除 `StyleSheet.create`
- 保留：
  - `AnimatedButton`
  - `useEntryStore`
  - `getAllTags()` 可见时加载
  - `TagModal` 进入/退出逻辑
- 把静态壳层迁到 `className`
- 继续保留：
  - `Animated.View style={animatedStyle}`
  - 选中态颜色切换 style
  - `style={{ flex: 1 }}`
  - 图标 `marginRight: 4`
- 补以下 `testID`：
  - `filter-bar-root`
  - `filter-bar-reset-button`
  - `filter-bar-tag-modal`

- [x] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/FilterBar.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/FilterBar.tsx`

然后跑：

Run: `cd app && pnpm run lint -- src/components/FilterBar.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/FilterBar.tsx app/src/components/__tests__/FilterBar.test.tsx
git commit -m "refactor: migrate filter bar to nativewind"
```

## Chunk 5: 文档回填与全量验收

### Task 5: 回填 spec / plan 状态并完成全量验证

**Files:**
- Modify: `docs/superpowers/specs/2026-03-23-timeline-interaction-nativewind-migration-design.md`
- Modify: `docs/superpowers/plans/2026-03-23-timeline-interaction-nativewind-migration.md`

- [x] **Step 1: 先跑第八批相关测试集合**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath \
  src/components/__tests__/BottomToolbar.test.tsx \
  src/components/__tests__/CalendarTimelineItem.test.tsx \
  src/components/__tests__/CalendarView.test.tsx \
  src/components/__tests__/FilterBar.test.tsx
```

Expected: PASS

- [x] **Step 2: 跑静态检查与全量测试**

Run: `cd app && pnpm run lint`
Expected: PASS

Run: `cd app && pnpm run typecheck`
Expected: PASS

Run: `cd app && pnpm test --runInBand`
Expected: PASS

- [x] **Step 3: 回填文档执行结果**

在 spec 与 plan 中补：

- 当前状态
- 实际新增 / 修改文件
- 验证命令及结果
- 若实现与计划有轻微偏差，记录原因

- [x] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-03-23-timeline-interaction-nativewind-migration-design.md docs/superpowers/plans/2026-03-23-timeline-interaction-nativewind-migration.md
git commit -m "docs: backfill timeline interaction nativewind migration"
```

## 本地结构化 Review 结论

- 已按 chunk 检查时间轴交互链路边界、测试缺口、allowlist 收口点和最终验收命令
- `BottomToolbar`、`CalendarTimelineItem`、`CalendarView`、`FilterBar` 都可以独立完成“失败测试 -> 最小实现 -> lint 收口 -> 提交”的闭环
- 未发现阻塞执行的问题

## 执行结果

- 已完成 [BottomToolbar.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/BottomToolbar.tsx)、[CalendarTimelineItem.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/CalendarTimelineItem.tsx)、[CalendarView.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/CalendarView.tsx)、[FilterBar.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/FilterBar.tsx) 的 NativeWind 迁移与 allowlist 收口
- 已新增 [BottomToolbar.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/BottomToolbar.test.tsx)、[CalendarTimelineItem.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/CalendarTimelineItem.test.tsx)、[FilterBar.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/FilterBar.test.tsx)
- 已扩充 [CalendarView.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/CalendarView.test.tsx)
- 四个实现提交已按顺序落地：
  - `9627b37 refactor: migrate bottom toolbar to nativewind`
  - `7fc0eb2 refactor: migrate calendar timeline item to nativewind`
  - `57cc2ca refactor: migrate calendar view to nativewind`
  - `e1db1c7 refactor: migrate filter bar to nativewind`

## 验证记录

- `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/BottomToolbar.test.tsx src/components/__tests__/CalendarTimelineItem.test.tsx src/components/__tests__/CalendarView.test.tsx src/components/__tests__/FilterBar.test.tsx`：PASS，4 个 suite / 14 个测试全部通过
- `cd app && pnpm run lint`：PASS
- `cd app && pnpm run typecheck`：PASS
- `cd app && pnpm test --runInBand`：PASS，62 个 suite / 372 个测试全部通过

## 偏差说明

- 无功能性偏差
