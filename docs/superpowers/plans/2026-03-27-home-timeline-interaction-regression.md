# Home Timeline Interaction Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为首页时间线补齐 4 条主交互 Jest 页面级回归，锁住空态切换、分页触发、筛选联动和详情/编辑关闭回落。

**Architecture:** 继续复用 `renderHomeScreen.tsx` 作为首页级轻量 harness，不新建重型页面集成夹具。先给 harness 增加最小可测入口，再新增一个聚焦首页时间线主交互的新测试文件，最后用 `timeline` 相关旧套件和前端全量 Jest 做回归收口。

**Tech Stack:** React Native, Expo Router, Jest, React Native Testing Library, TypeScript

---

## 验证结果

- 2026-03-27：已运行
  `cd app && npm test -- --runTestsByPath src/components/__tests__/timeline/timeline.home.interactions.test.tsx src/components/__tests__/timeline/timeline.home.navigation.test.tsx src/components/__tests__/timeline/timeline.home.sync-status.test.tsx 'app/(tabs)/__tests__/index.timeline-state.test.tsx' --runInBand`
  - 结果：PASS（4 个 suite，20 个测试全部通过）
- 2026-03-27：已运行 `cd app && npm test -- --runInBand`
  - 结果：PASS（110 个 suite，722 个测试全部通过）

## Scope Note

本 plan 只实现以下 4 条首页时间线主交互回归：

- `HT-01` 空态与数据态切换
- `HT-02` 分页加载触发契约
- `HT-03` 首页筛选结果联动
- `HT-04` 详情/编辑后的关闭回落

以下内容不在本 plan 中实现：

- Sidebar / FAB / 同步状态额外回归
- 真正的跨页面导航
- Android 返回键和前后台切换
- 录音、拍照、媒体上传队列
- 为了测试而重构首页业务代码

## File Structure

- Modify: `app/src/components/__tests__/helpers/renderHomeScreen.tsx`
  Purpose: 在不改首页业务代码的前提下，为首页时间线回归测试暴露最小的状态更新、分页触发和详情/编辑可见性入口。
- Create: `app/src/components/__tests__/timeline/timeline.home.interactions.test.tsx`
  Purpose: 承载 4 条首页时间线主交互回归，不与现有 `navigation`、`sync-status` 套件混合。
- Modify: `app/src/components/__tests__/timeline/timeline.home.navigation.test.tsx`
  Purpose: 仅在新 harness 改动影响现有断言时做最小同步，避免旧测试和新 helper 语义分叉。

## Task 1: Extend HomeScreen Harness For Interaction Regressions

**Files:**
- Modify: `app/src/components/__tests__/helpers/renderHomeScreen.tsx`
- Test: `app/src/components/__tests__/timeline/timeline.home.interactions.test.tsx`

- [ ] **Step 1: Write the first failing home interaction test for empty-to-data switching**

在 `app/src/components/__tests__/timeline/timeline.home.interactions.test.tsx` 先新增 `HT-01`：

```tsx
it('switches from the empty state to timeline entries when the home store receives data', () => {
  const { screen, controls } = renderHomeScreen();

  expect(screen.getByTestId('timeline-empty-state')).toBeTruthy();

  controls.setEntries([
    {
      id: 'entry-text-1',
      type: 'text',
      content: '新出现的首页记录',
      timestamp: new Date('2026-03-27T10:00:00+08:00').getTime(),
      syncStatus: 'synced',
    } as Entry,
  ]);

  expect(screen.getByTestId('timeline-entry-entry-text-1')).toBeTruthy();
  expect(screen.queryByTestId('timeline-empty-state')).toBeNull();
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/timeline/timeline.home.interactions.test.tsx --runInBand`

Expected: FAIL，因为当前 `renderHomeScreen()` 还没有暴露 `controls.setEntries()`，也没有稳定的首页级数据切换入口。

- [ ] **Step 3: Implement the minimal harness controls for entry and pagination state**

在 `app/src/components/__tests__/helpers/renderHomeScreen.tsx` 只做最小增强：

1. 让 `mockSourceEntries` 和 `mockEntryStoreState.entries` 可以在测试中同步更新：

```tsx
const setEntries = (entries: Entry[]) => {
  mockSourceEntries = entries;
  setEntryStoreState({ entries });
};
```

2. 暴露一个最小分页状态更新器：

```tsx
const setPagination = (pagination: Pick<MockEntryStoreState, 'hasMore' | 'isLoadingMore'>) => {
  setEntryStoreState(pagination);
};
```

3. 在 `mockTimelineContentModule` 中只加一个测试用触发点，而不是复制真实 `SectionList` 行为：

```tsx
{hasEntries && hasMore ? (
  <Pressable testID="timeline-load-more-trigger" onPress={loadMore}>
    <Text>加载更多</Text>
  </Pressable>
) : null}
```

4. 如果 `isLoadingMore` 为 `true`，补一个稳定 footer 标识：

```tsx
{isLoadingMore ? <View testID="timeline-loading-more-indicator" /> : null}
```

5. `renderHomeScreen()` 返回：

```tsx
controls: {
  setEntries,
  setPagination,
}
```

- [ ] **Step 4: Re-run the targeted test to verify it passes**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/timeline/timeline.home.interactions.test.tsx --runInBand`

Expected: PASS，只通过 `HT-01`，其余用例还未写。

- [ ] **Step 5: Commit the harness baseline**

```bash
git add app/src/components/__tests__/helpers/renderHomeScreen.tsx app/src/components/__tests__/timeline/timeline.home.interactions.test.tsx
git commit -m "test(home): add timeline interaction harness controls"
```

## Task 2: Add The Four Home Timeline Interaction Regressions

**Files:**
- Create: `app/src/components/__tests__/timeline/timeline.home.interactions.test.tsx`
- Modify: `app/src/components/__tests__/helpers/renderHomeScreen.tsx`
- Modify: `app/src/components/__tests__/timeline/timeline.home.navigation.test.tsx`
- Test: `app/src/components/__tests__/timeline/timeline.home.interactions.test.tsx`

- [ ] **Step 1: Add the failing pagination regression**

在 `timeline.home.interactions.test.tsx` 新增 `HT-02`：

```tsx
it('calls loadMore once from the home timeline when more entries are available', () => {
  const { screen, spies, controls } = renderHomeScreen({
    entries: [entry],
  });

  controls.setPagination({ hasMore: true, isLoadingMore: false });

  fireEvent.press(screen.getByTestId('timeline-load-more-trigger'));

  expect(spies.loadMore).toHaveBeenCalledTimes(1);
});

it('does not expose the load-more trigger while loading-more is already in progress', () => {
  const { screen, controls } = renderHomeScreen({
    entries: [entry],
  });

  controls.setPagination({ hasMore: true, isLoadingMore: true });

  expect(screen.queryByTestId('timeline-load-more-trigger')).toBeNull();
  expect(screen.getByTestId('timeline-loading-more-indicator')).toBeTruthy();
});
```

- [ ] **Step 2: Run the targeted suite to verify the new pagination assertions fail correctly**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/timeline/timeline.home.interactions.test.tsx --runInBand`

Expected: 如果 `mockTimelineContentModule` 还没正确接 `hasMore / isLoadingMore / loadMore`，这里会 FAIL，失败原因应指向缺少触发点或状态未联动，而不是测试拼写错误。

- [ ] **Step 3: Make the minimal harness adjustments for pagination behavior**

只在 `mockTimelineContentModule` 补足当前测试真正需要的 props 透传：

```tsx
TimelineContent: ({
  hasEntries,
  displayEntries,
  hasMore,
  loadMore,
  isLoadingMore,
}: {
  hasEntries: boolean;
  displayEntries: Entry[];
  hasMore: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
}) => { ... }
```

不要在 helper 里复制真实 `SectionList` 的 `onEndReachedThreshold`、滚动节流或虚拟化细节。

- [ ] **Step 4: Add the failing filter-linkage regression**

新增 `HT-03`：

```tsx
it('updates the home timeline results when search filters are applied through the shared store state', async () => {
  const { screen, spies } = renderHomeScreen({
    entries: [
      textEntry,
      photoEntry,
    ],
    allTags: ['旅行', '工作'],
  });

  await act(async () => {
    await spies.applySearchFilters({
      query: '旅行',
      type: 'photo',
      dateRange: 'all',
      tags: ['旅行'],
    });
  });

  expect(screen.getByTestId('timeline-entry-entry-photo-1')).toBeTruthy();
  expect(screen.queryByTestId('timeline-entry-entry-text-1')).toBeNull();
});
```

- [ ] **Step 5: Run the targeted suite to verify the filter regression fails or exposes a harness gap**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/timeline/timeline.home.interactions.test.tsx --runInBand`

Expected: 如果当前 helper 里 `applySearchFilters()` 只改 store、不驱动首页重新展示，测试会 FAIL；如果已经能跑绿，可以直接记录该行为已被现有 helper 支撑。

- [ ] **Step 6: Apply the smallest helper fix only if the filter regression fails**

只允许以下最小修正之一：

```tsx
applySearchFilters: jest.fn(async (filters) => {
  const nextEntries = applyFilters(mockSourceEntries, filters);
  setEntryStoreState({
    searchQuery: filters.query ?? '',
    filterType: filters.type ?? 'all',
    filterDateRange: filters.dateRange ?? 'all',
    selectedTags: filters.tags ?? [],
    entries: nextEntries,
  });
}),
```

如果当前实现已经如此，不做额外改动。

- [ ] **Step 7: Add the failing detail/edit close regression**

新增 `HT-04`：

```tsx
it('returns the home timeline to a stable list state after closing detail and editor flows', () => {
  const { screen } = renderHomeScreen({
    entries: [textEntry],
  });

  fireEvent.press(screen.getByTestId('timeline-entry-card-entry-text-1'));
  expect(screen.getByTestId('timeline-text-detail')).toBeTruthy();

  fireEvent.press(screen.getByTestId('timeline-text-detail-close'));
  expect(screen.queryByTestId('timeline-text-detail')).toBeNull();
  expect(screen.getByTestId('timeline-entry-entry-text-1')).toBeTruthy();

  fireEvent.press(screen.getByTestId('timeline-entry-card-entry-text-1'));
  fireEvent.press(screen.getByTestId('timeline-text-detail-edit'));
  expect(screen.getByTestId('timeline-entry-editor')).toBeTruthy();

  fireEvent.press(screen.getByTestId('timeline-entry-editor-close'));
  expect(screen.queryByTestId('timeline-entry-editor')).toBeNull();
  expect(screen.getByTestId('timeline-entry-entry-text-1')).toBeTruthy();
});
```

- [ ] **Step 8: Run the targeted suite to verify all four regressions**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/timeline/timeline.home.interactions.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 9: Synchronize the existing navigation suite only if helper changes require it**

如果 `renderHomeScreen` 或共享 mock 语义变动导致旧导航套件需要最小同步，只允许做不改变测试目标的更新，例如：

```tsx
// 仅同步新的 testID 或 helper 导入方式，不新增业务断言
```

如果旧文件无需改动，保持不变。

- [ ] **Step 10: Commit the home interaction regressions**

```bash
git add app/src/components/__tests__/helpers/renderHomeScreen.tsx app/src/components/__tests__/timeline/timeline.home.interactions.test.tsx app/src/components/__tests__/timeline/timeline.home.navigation.test.tsx
git commit -m "test(home): add timeline interaction regressions"
```

## Task 3: Run Focused And Full Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-03-27-home-timeline-interaction-regression.md`

- [ ] **Step 1: Run the focused timeline regression command**

Run:

```bash
cd app && npm test -- --runTestsByPath \
  src/components/__tests__/timeline/timeline.home.interactions.test.tsx \
  src/components/__tests__/timeline/timeline.home.navigation.test.tsx \
  src/components/__tests__/timeline/timeline.home.sync-status.test.tsx \
  app/(tabs)/__tests__/index.timeline-state.test.tsx \
  --runInBand
```

Expected: PASS

- [ ] **Step 2: Run the front-end full Jest suite**

Run: `cd app && npm test -- --runInBand`

Expected: PASS

- [ ] **Step 3: Inspect git status and record actual outputs**

Run: `git status --short`

Expected: 只剩本轮相关改动；如果工作区干净，则记录为 clean。

- [ ] **Step 4: Update this plan with verification notes**

在本文档顶部或验证区域补充：

```md
## 验证结果

- 2026-03-27：已运行 ...
  - 结果：PASS
```

- [ ] **Step 5: Commit the plan/status update**

```bash
git add docs/superpowers/plans/2026-03-27-home-timeline-interaction-regression.md
git commit -m "docs(plan): record home timeline interaction verification"
```
