# Timeline Home Search Test Granularity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为首页时间线与搜索链路补齐高颗粒度 Jest 与 Android Maestro 回归，锁定空态、搜索过滤、详情返回和设置返回主流程。

**Architecture:** 这份计划只处理 `TL-*` 场景，不掺入编辑器和设置页其他子域。Jest 继续沿用现有 `renderHomeScreen`、`timeline.home.*` 与 `index.*` 测试体系，优先补页面联动和 store 规则，再用 `app-core` Maestro flow 锁首页真实 Android 闭环。

**Tech Stack:** React Native, Expo Router, Jest, React Native Testing Library, TypeScript, Maestro YAML, Android emulator

---

## File Structure

- Modify: `app/app/(tabs)/__tests__/index.timeline-state.test.tsx`
  Responsibility: 首页空态、有数据态、刷新/初始加载、同步入口页面语义。
- Modify: `app/app/(tabs)/__tests__/index.search-filter.test.tsx`
  Responsibility: 搜索输入、标签/类型组合、退出恢复。
- Modify: `app/src/components/__tests__/timeline/timeline.home.navigation.test.tsx`
  Responsibility: 时间线卡片进入详情、从详情回流、非文本记录降级。
- Modify: `app/src/components/__tests__/timeline/timeline.home.sync-status.test.tsx`
  Responsibility: 首页同步状态入口显示和状态切换。
- Modify: `app/src/components/__tests__/timeline/timeline.controller.test.tsx`
  Responsibility: 排序/分组/兜底规则。
- Modify: `app/src/components/__tests__/helpers/renderHomeScreen.tsx`
  Responsibility: 如有必要，为刷新和恢复测试补最小 helper 能力，不重写 helper 结构。
- Modify: `app/.maestro/flows/app-core/search-enter-exit.yaml`
  Responsibility: 首页真实搜索打开、取消、返回首页。
- Modify: `app/.maestro/flows/app-core/timeline-open-detail.yaml`
  Responsibility: 首页或搜索结果进入详情再返回。
- Create: `app/.maestro/flows/app-core/home-open-settings-and-back.yaml`
  Responsibility: 首页进入设置再返回首页。
- Modify: `app/.maestro/README.md`
  Responsibility: 记录新 flow 的运行前提和命令。
- Modify: `app/package.json`
  Responsibility: 仅在需要时补最小 `test:frontend:timeline` 入口。

## Task 1: Tighten Home Timeline Page-State Coverage

**Files:**
- Modify: `app/app/(tabs)/__tests__/index.timeline-state.test.tsx`
- Modify: `app/src/components/__tests__/helpers/renderHomeScreen.tsx`
- Test: `app/app/(tabs)/__tests__/index.timeline-state.test.tsx`

- [ ] **Step 1: Add the failing refresh-stability test**

在 `app/app/(tabs)/__tests__/index.timeline-state.test.tsx` 追加：

```tsx
it('keeps existing entries visible while the home screen refreshes', async () => {
  const { screen, spies } = renderHomeScreen({
    entries: [
      {
        id: 'entry-text-1',
        type: 'text',
        content: '刷新前的首页记录',
        tags: ['工作'],
        timestamp: new Date('2026-03-20T09:00:00+08:00').getTime(),
        syncStatus: 'synced',
      },
    ],
  });

  await spies.loadEntries();

  expect(screen.getByTestId('timeline-entry-entry-text-1')).toBeTruthy();
  expect(screen.queryByTestId('timeline-empty-state')).toBeNull();
});
```

- [ ] **Step 2: Run the targeted timeline-state suite to verify current behavior**

Run: `cd app && npm test -- --runTestsByPath "app/(tabs)/__tests__/index.timeline-state.test.tsx" --runInBand`

Expected: PASS if current helper already models the intended behavior, or FAIL pointing to missing refresh helper semantics.

- [ ] **Step 3: Only if needed, add the smallest helper support in `renderHomeScreen.tsx`**

如果 Step 2 暴露 helper 无法表达“刷新时保留已有 entries”，只允许补最小状态更新入口，例如：

```tsx
loadEntries: jest.fn(async () => {
  setEntryStoreState({ entries: mockSourceEntries });
}),
```

不要顺手重写 `renderHomeScreen` 的 store mock 结构。

- [ ] **Step 4: Re-run the timeline-state suite**

Run: `cd app && npm test -- --runTestsByPath "app/(tabs)/__tests__/index.timeline-state.test.tsx" --runInBand`

Expected: PASS

- [ ] **Step 5: Commit the page-state coverage**

```bash
git add "app/app/(tabs)/__tests__/index.timeline-state.test.tsx" app/src/components/__tests__/helpers/renderHomeScreen.tsx
git commit -m "test(home): cover timeline refresh stability"
```

## Task 2: Extend Search Filter And Restore-State Coverage

**Files:**
- Modify: `app/app/(tabs)/__tests__/index.search-filter.test.tsx`
- Modify: `app/src/components/__tests__/helpers/renderHomeScreen.tsx`
- Test: `app/app/(tabs)/__tests__/index.search-filter.test.tsx`

- [ ] **Step 1: Add the failing restore-state test**

在 `app/app/(tabs)/__tests__/index.search-filter.test.tsx` 追加：

```tsx
it('clears only the search overlay while preserving the base timeline after cancel', async () => {
  const { screen } = renderHomeScreen({
    entries: homeEntries,
    allTags: ['旅行', '海边'],
  });

  fireEvent.press(screen.getByTestId('searchbar-search-box'));
  fireEvent.changeText(screen.getByPlaceholderText('搜索记忆...'), '旅行');
  fireEvent.press(screen.getByTestId('search-overlay-cancel-button'));

  await waitFor(() => {
    expect(screen.queryByTestId('search-overlay-root')).toBeNull();
  });

  expect(screen.getByTestId('timeline-entry-entry-text-1')).toBeTruthy();
  expect(screen.getByTestId('timeline-entry-entry-photo-1')).toBeTruthy();
});
```

- [ ] **Step 2: Run the targeted search-filter suite**

Run: `cd app && npm test -- --runTestsByPath "app/(tabs)/__tests__/index.search-filter.test.tsx" --runInBand`

Expected: PASS or a focused FAIL describing search cancel/restore mismatch.

- [ ] **Step 3: If the test fails, patch the minimum home-search mock behavior**

如果失败，只在 `renderHomeScreen.tsx` 中补最小状态恢复语义，例如让取消关闭 overlay 时不覆写 `entries`：

```tsx
setSearchQuery: jest.fn((query: string) => {
  setEntryStoreState({ searchQuery: query });
}),
```

并保持 `mockSourceEntries` 作为非搜索态来源。

- [ ] **Step 4: Re-run the search-filter suite**

Run: `cd app && npm test -- --runTestsByPath "app/(tabs)/__tests__/index.search-filter.test.tsx" --runInBand`

Expected: PASS

- [ ] **Step 5: Commit the search restore coverage**

```bash
git add "app/app/(tabs)/__tests__/index.search-filter.test.tsx" app/src/components/__tests__/helpers/renderHomeScreen.tsx
git commit -m "test(search): cover cancel restore state"
```

## Task 3: Tighten Timeline Navigation And Status Tests

**Files:**
- Modify: `app/src/components/__tests__/timeline/timeline.home.navigation.test.tsx`
- Modify: `app/src/components/__tests__/timeline/timeline.home.sync-status.test.tsx`
- Modify: `app/src/components/__tests__/timeline/timeline.controller.test.tsx`
- Test: `app/src/components/__tests__/timeline/timeline.home.navigation.test.tsx`
- Test: `app/src/components/__tests__/timeline/timeline.home.sync-status.test.tsx`
- Test: `app/src/components/__tests__/timeline/timeline.controller.test.tsx`

- [ ] **Step 1: Add the failing detail-close regression test**

在 `timeline.home.navigation.test.tsx` 追加：

```tsx
it('returns from the text detail page to the timeline list when close is pressed', () => {
  const screen = render(<Timeline />);

  fireEvent.press(screen.getByTestId('timeline-entry-card-entry-text-1'));
  fireEvent.press(screen.getByTestId('timeline-text-detail-close'));

  expect(screen.queryByTestId('timeline-text-detail')).toBeNull();
  expect(screen.getByTestId('timeline-entry-card-entry-text-1')).toBeTruthy();
});
```

- [ ] **Step 2: Add the failing sync-status transition test**

在 `timeline.home.sync-status.test.tsx` 追加：

```tsx
it('falls back safely when the cloud ui state becomes unknown', () => {
  mockUiState = 'hidden';
  const screen = render(<Timeline />);

  expect(screen.queryByTestId('cloud-sync-button')).toBeNull();
});
```

保持这个测试只验证安全降级，不要引入不存在的未知字符串类型。

- [ ] **Step 3: Run the three targeted timeline suites**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/timeline/timeline.home.navigation.test.tsx src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/timeline/timeline.controller.test.tsx --runInBand`

Expected: PASS, 或 FAIL 指向 detail close / status mapping 的真实缺口。

- [ ] **Step 4: If needed, apply the smallest fixes**

如果失败：

- 在测试 mock 中补最小 close 行为，而不是改写整套 navigation mock
- 只在真实 controller/store 暴露明显 mapping 缺口时补最小兜底分支

允许的最小兜底形态：

```ts
if (uiState === 'hidden') {
  return null;
}
```

- [ ] **Step 5: Re-run the timeline suites**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/timeline/timeline.home.navigation.test.tsx src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/timeline/timeline.controller.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 6: Commit the timeline navigation and status coverage**

```bash
git add app/src/components/__tests__/timeline/timeline.home.navigation.test.tsx app/src/components/__tests__/timeline/timeline.home.sync-status.test.tsx app/src/components/__tests__/timeline/timeline.controller.test.tsx
git commit -m "test(timeline): tighten home navigation coverage"
```

## Task 4: Finish Android App-Core Timeline And Search Flows

**Files:**
- Modify: `app/.maestro/flows/app-core/search-enter-exit.yaml`
- Modify: `app/.maestro/flows/app-core/timeline-open-detail.yaml`
- Create: `app/.maestro/flows/app-core/home-open-settings-and-back.yaml`
- Modify: `app/.maestro/README.md`
- Modify: `app/package.json`
- Test: `app/.maestro/flows/app-core/search-enter-exit.yaml`
- Test: `app/.maestro/flows/app-core/timeline-open-detail.yaml`
- Test: `app/.maestro/flows/app-core/home-open-settings-and-back.yaml`

- [ ] **Step 1: Add the new home-settings-back flow**

创建 `app/.maestro/flows/app-core/home-open-settings-and-back.yaml`：

```yaml
appId: com.memorycapsule.app
---
- runFlow: ../../common/launch-app.yaml
- runFlow: ../../common/open-sidebar.yaml
- tapOn: "设置"
- assertVisible:
    id: settings-page-root
- back
- assertVisible:
    id: home-screen-root
```

- [ ] **Step 2: Keep existing app-core flows single-purpose**

确认 `search-enter-exit.yaml` 只保留：

```yaml
appId: com.memorycapsule.app
---
- runFlow: ../../common/launch-app.yaml
- runFlow: ../../common/open-search-overlay.yaml
- tapOn:
    id: search-overlay-cancel-button
- assertVisible:
    id: home-screen-root
```

确认 `timeline-open-detail.yaml` 只保留“打开详情并返回首页”的主闭环，不混入编辑或修复逻辑。

- [ ] **Step 3: Run the three app-core flows one by one**

Run:

```bash
cd app
maestro test .maestro/flows/app-core/search-enter-exit.yaml
maestro test .maestro/flows/app-core/timeline-open-detail.yaml
maestro test .maestro/flows/app-core/home-open-settings-and-back.yaml
```

Expected: 3 条 flow 均 PASS；如果某条失败，失败应直接指向缺失 `testID`、入口文案或返回层级。

- [ ] **Step 4: Update docs and the smallest package script only if needed**

如果需要分组入口，在 `app/package.json` 里增加：

```json
"test:frontend:timeline": "jest --runInBand --runTestsByPath \"app/(tabs)/__tests__/index.timeline-state.test.tsx\" \"app/(tabs)/__tests__/index.search-filter.test.tsx\" src/components/__tests__/timeline/timeline.home.navigation.test.tsx src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/timeline/timeline.controller.test.tsx"
```

并在 `app/.maestro/README.md` 增补：

```md
maestro test app/.maestro/flows/app-core/home-open-settings-and-back.yaml
```

- [ ] **Step 5: Commit the Maestro and entrypoint updates**

```bash
git add app/.maestro/flows/app-core/search-enter-exit.yaml app/.maestro/flows/app-core/timeline-open-detail.yaml app/.maestro/flows/app-core/home-open-settings-and-back.yaml app/.maestro/README.md app/package.json
git commit -m "test(maestro): add home timeline app-core flows"
```
