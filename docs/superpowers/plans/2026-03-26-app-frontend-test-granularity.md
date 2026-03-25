# App Frontend Test Granularity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 App 前端建立首批按模块拆分、按层负责的细颗粒度自动化测试实现，优先补齐设置/同步、时间线/搜索、编辑/图片和 Android app-core Maestro 回归。

**Architecture:** 本计划只实现设计文档中的 P0 首批批次，不把 P1/P2 一起塞进同一轮执行。核心做法是先补最小稳定锚点和共享测试 helper，再按 `Settings + Sync`、`Timeline + Search`、`Editor + Image` 三个模块包各自补 `Jest-Unit/Jest-Page`，最后再落 Android `Maestro` 闭环与入口文档。这样每一批都能独立验证、独立提交，并且避免继续扩张现有的大测试文件。

**Tech Stack:** React Native, Expo, Jest, React Native Testing Library, Zustand, Maestro YAML flows, Android emulator

---

## Scope Note

这个 plan 只覆盖设计文档中的首批 P0 实现：

- 设置页与云同步入口
- 时间线首页与搜索/筛选
- 文本编辑与图片链路
- Android app-core Maestro flows

以下内容不在本 plan 中直接实现：

- P1 支撑模块的全量细拆
- P2 信息页 smoke 全量铺开
- iOS 专项差异回归
- CI 编排和并行策略

这些内容在本批通过后，再拆后续独立 plan。

## File Structure

- Create: `app/src/components/__tests__/helpers/renderSettingsPage.tsx`
  Purpose: 抽出设置页的 store/mock/render helper，避免新的 settings-page suites 继续复制 `SettingsPage.test.tsx` 的 setup。
- Create: `app/src/components/__tests__/helpers/renderHomeScreen.tsx`
  Purpose: 抽出首页 `app/app/(tabs)/index.tsx` 的共享 provider、store 和 route mock，支撑时间线与搜索联动测试。
- Create: `app/src/components/__tests__/helpers/renderEntryEditor.tsx`
  Purpose: 抽出 `EntryEditor` 的统一 render helper，稳定控制 entry、save callback 和 onClose mock。
- Modify: `app/src/components/EntryEditor.tsx`
  Purpose: 为返回和保存按钮补稳定 `testID`，让页面测试和 Maestro 都能稳定定位。
- Modify: `app/src/components/search-overlay/SearchOverlayFooter.tsx`
  Purpose: 为取消按钮补稳定 `testID`，支撑搜索退出和 Android 返回层级测试。
- Modify: `app/src/components/__tests__/EntryEditor.test.tsx`
  Purpose: 锁定 `EntryEditor` 新增锚点和现有 header/input 行为。
- Modify: `app/src/components/__tests__/SearchOverlay.test.tsx`
  Purpose: 锁定 `SearchOverlay` 的取消/重置/搜索基础锚点行为。
- Create: `app/src/components/__tests__/settings-page/settings-page.preferences.test.tsx`
  Purpose: 覆盖本地偏好设置项的默认值、切换、持久化和失败回滚。
- Create: `app/src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx`
  Purpose: 覆盖云模式开启、关闭、初始流判断和失败回滚。
- Create: `app/src/components/__tests__/settings-page/settings-page.sync-status.test.tsx`
  Purpose: 覆盖同步状态入口、状态摘要展示、失败/异常计数回流。
- Create: `app/src/components/__tests__/settings-page/settings-page.repair-entry.test.tsx`
  Purpose: 覆盖修复提示入口、立即修复、稍后处理和异常计数回流。
- Create: `app/src/components/__tests__/settings-page/settings-page.backend-env.test.tsx`
  Purpose: 覆盖后端环境切换和连接测试的页面行为。
- Modify: `app/src/components/__tests__/SettingsPage.test.tsx`
  Purpose: 把现有大文件收缩成 smoke + 跨分区总装配验证，不再承接所有细分场景。
- Create: `app/app/(tabs)/__tests__/index.timeline-state.test.tsx`
  Purpose: 覆盖首页空态、有数据态、刷新回流和同步状态入口。
- Create: `app/app/(tabs)/__tests__/index.search-filter.test.tsx`
  Purpose: 覆盖首页搜索入口、搜索态、筛选态、退出恢复和结果回流。
- Create: `app/src/components/__tests__/timeline/timeline.home.navigation.test.tsx`
  Purpose: 覆盖 `Timeline.v2` 卡片点击、详情页回流和缺图卡片降级行为。
- Create: `app/src/components/__tests__/timeline/timeline.home.sync-status.test.tsx`
  Purpose: 覆盖首页云同步按钮的展示规则和状态映射。
- Create: `app/src/components/__tests__/search/search-overlay.filters.test.tsx`
  Purpose: 覆盖标签/类型/时间筛选组合规则。
- Create: `app/src/components/__tests__/search/search-overlay.restore-state.test.tsx`
  Purpose: 覆盖搜索退出、详情返回、清空关键字和保留条件策略。
- Modify: `app/app/(tabs)/__tests__/index.render.test.tsx`
  Purpose: 保留首页最基础渲染 smoke，把细颗粒场景迁出。
- Modify: `app/src/components/__tests__/SearchBar.safe-area.test.tsx`
  Purpose: 增补搜索入口按钮和 view mode 切换的稳定断言。
- Create: `app/src/components/__tests__/editor/entry-editor.dirty-state.test.tsx`
  Purpose: 覆盖文本脏状态、还原原值、输入法边界和保存按钮启用规则。
- Create: `app/src/components/__tests__/editor/entry-editor.save-flow.test.tsx`
  Purpose: 覆盖新建/编辑保存成功、保存失败、重复点击去重。
- Create: `app/src/components/__tests__/editor/entry-editor.leave-guard.test.tsx`
  Purpose: 覆盖未保存离开保护、取消离开和确认离开。
- Create: `app/src/components/__tests__/image/photo-grid.render.test.tsx`
  Purpose: 覆盖单图、多图、超长图和大图数量的展示差异。
- Create: `app/src/components/__tests__/image/image-viewer.navigation.test.tsx`
  Purpose: 覆盖查看器打开、索引切换、关闭和 action sheet 展示。
- Create: `app/src/components/__tests__/image/entry-card.missing-media-variants.test.tsx`
  Purpose: 覆盖缺图、坏图、repairable/repair-pending 降级表现。
- Modify: `app/app/(tabs)/__tests__/index.photo.test.ts`
  Purpose: 扩展首页照片创建/恢复路径，而不是继续把所有图片回归只压在 service 测试上。
- Modify: `app/src/components/__tests__/EntryCard.missing-media.test.tsx`
  Purpose: 只保留现有基础行为，把变体矩阵迁到新文件。
- Modify: `app/src/components/__tests__/ImageViewer.shared-element.test.tsx`
  Purpose: 只保留过渡动画/共享元素 smoke，把导航和交互迁到新文件。
- Create: `app/.maestro/common/open-search-overlay.yaml`
  Purpose: 从首页稳定打开搜索浮层。
- Create: `app/.maestro/common/open-first-entry.yaml`
  Purpose: 从首页打开首个可见记录详情。
- Create: `app/.maestro/common/open-entry-editor.yaml`
  Purpose: 从首页进入可编辑文本记录或新建编辑页。
- Create: `app/.maestro/flows/app-core/timeline-open-detail.yaml`
  Purpose: 覆盖首页打开详情再返回。
- Create: `app/.maestro/flows/app-core/editor-unsaved-leave-guard.yaml`
  Purpose: 覆盖编辑页未保存离开保护。
- Create: `app/.maestro/flows/app-core/search-enter-exit.yaml`
  Purpose: 覆盖搜索浮层进入、取消和结果恢复。
- Create: `app/.maestro/flows/app-core/image-viewer-back-navigation.yaml`
  Purpose: 覆盖图片查看器打开和 Android 返回关闭。
- Create: `app/.maestro/flows/app-core/settings-sync-status-open.yaml`
  Purpose: 覆盖设置页打开同步状态入口。
- Create: `app/.maestro/flows/app-core/settings-repair-prompt.yaml`
  Purpose: 覆盖设置页修复提示可再次拉起。
- Modify: `app/.maestro/README.md`
  Purpose: 增补 app-core flows 的前提、命令和选择器约束。
- Modify: `app/package.json`
  Purpose: 增加首批前端测试分组脚本，避免每次手写超长 `jest --runTestsByPath` 命令。

### Task 1: Add Shared Test Helpers And Stable App-Core Anchors

**Files:**
- Create: `app/src/components/__tests__/helpers/renderSettingsPage.tsx`
- Create: `app/src/components/__tests__/helpers/renderHomeScreen.tsx`
- Create: `app/src/components/__tests__/helpers/renderEntryEditor.tsx`
- Modify: `app/src/components/EntryEditor.tsx`
- Modify: `app/src/components/search-overlay/SearchOverlayFooter.tsx`
- Modify: `app/src/components/__tests__/EntryEditor.test.tsx`
- Modify: `app/src/components/__tests__/SearchOverlay.test.tsx`
- Test: `app/src/components/__tests__/EntryEditor.test.tsx`
- Test: `app/src/components/__tests__/SearchOverlay.test.tsx`

- [ ] **Step 1: Write the failing EntryEditor and SearchOverlay anchor tests**

在 `app/src/components/__tests__/EntryEditor.test.tsx` 新增失败断言：

```tsx
it('renders stable back and save button testIDs', () => {
  render(<EntryEditor visible entry={entry} onSave={jest.fn()} onClose={jest.fn()} />);

  expect(screen.getByTestId('entry-editor-back-button')).toBeTruthy();
  expect(screen.getByTestId('entry-editor-save-button')).toBeTruthy();
});
```

在 `app/src/components/__tests__/SearchOverlay.test.tsx` 新增失败断言：

```tsx
it('renders a stable cancel button testID for dismiss flows', () => {
  render(<SearchOverlay visible onClose={jest.fn()} onSearch={jest.fn()} />);

  expect(screen.getByTestId('search-overlay-cancel-button')).toBeTruthy();
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/EntryEditor.test.tsx src/components/__tests__/SearchOverlay.test.tsx --runInBand`

Expected: FAIL，因为 `EntryEditor` 和 `SearchOverlayFooter` 还没有这些稳定锚点。

- [ ] **Step 3: Implement the minimal anchor changes**

在 `app/src/components/EntryEditor.tsx` 给 header 按钮补充：

```tsx
<Pressable testID="entry-editor-back-button" onPress={onClose} ...>
...
<Pressable testID="entry-editor-save-button" onPress={handleSave} ...>
```

在 `app/src/components/search-overlay/SearchOverlayFooter.tsx` 给取消按钮补充：

```tsx
<Pressable testID="search-overlay-cancel-button" style={styles.cancelButton} onPress={onCancel}>
```

- [ ] **Step 4: Re-run the targeted tests to verify they pass**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/EntryEditor.test.tsx src/components/__tests__/SearchOverlay.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Extract reusable render helpers for settings, home and editor**

创建三个最小 helper：

```tsx
// app/src/components/__tests__/helpers/renderSettingsPage.tsx
export function renderSettingsPage(overrides?: Partial<RenderSettingsPageOptions>) {
  // 统一构造 auth/settings/cloud mocks，并返回 render(...) 结果
}
```

```tsx
// app/src/components/__tests__/helpers/renderHomeScreen.tsx
export function renderHomeScreen(overrides?: Partial<RenderHomeScreenOptions>) {
  // 统一构造 route/store/home-screen mocks，并返回 render(...) 结果
}
```

```tsx
// app/src/components/__tests__/helpers/renderEntryEditor.tsx
export function renderEntryEditor(overrides?: Partial<EntryEditorProps>) {
  // 提供默认 entry、onSave 和 onClose，减少后续重复 setup
}
```

- [ ] **Step 6: Commit**

```bash
git add app/src/components/EntryEditor.tsx app/src/components/search-overlay/SearchOverlayFooter.tsx app/src/components/__tests__/EntryEditor.test.tsx app/src/components/__tests__/SearchOverlay.test.tsx app/src/components/__tests__/helpers/renderSettingsPage.tsx app/src/components/__tests__/helpers/renderHomeScreen.tsx app/src/components/__tests__/helpers/renderEntryEditor.tsx
git commit -m "test(frontend): add app-core test helpers and anchors"
```

### Task 2: Build Focused Settings And Sync Jest Suites

**Files:**
- Create: `app/src/components/__tests__/settings-page/settings-page.preferences.test.tsx`
- Create: `app/src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx`
- Create: `app/src/components/__tests__/settings-page/settings-page.sync-status.test.tsx`
- Create: `app/src/components/__tests__/settings-page/settings-page.repair-entry.test.tsx`
- Create: `app/src/components/__tests__/settings-page/settings-page.backend-env.test.tsx`
- Modify: `app/src/components/__tests__/SettingsPage.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.preferences.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.sync-status.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.repair-entry.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.backend-env.test.tsx`

- [ ] **Step 1: Write the failing preference and cloud-mode page tests**

在 `settings-page.preferences.test.tsx` 新增失败用例：

```tsx
it('persists local preference toggles and restores them on re-open', async () => {
  const screen = renderSettingsPage();

  fireEvent.press(screen.getByText('自动备份'));
  unmount();

  const reopened = renderSettingsPage();
  expect(reopened.getByRole('switch', { name: '自动备份' })).toHaveProp('value', true);
});
```

在 `settings-page.cloud-mode.test.tsx` 新增失败用例：

```tsx
it('keeps local mode when enabling cloud mode fails', async () => {
  mockSwitchDataSource.mockRejectedValueOnce(new Error('network down'));

  const screen = renderSettingsPage({ cloudMode: false, authenticated: true });
  fireEvent.press(screen.getByText('启用云端模式'));

  await waitFor(() => expect(mockSwitchDataSource).toHaveBeenCalled());
  expect(screen.getByText('未开启云端模式')).toBeTruthy();
});
```

- [ ] **Step 2: Run the two new suites to verify they fail**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/settings-page/settings-page.preferences.test.tsx src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx --runInBand`

Expected: FAIL，因为 helper 还未接入，且新的页面粒度行为还未被独立建模。

- [ ] **Step 3: Implement the minimal test setup for settings preferences and cloud mode**

使用 `renderSettingsPage` helper，把现有 `SettingsPage.test.tsx` 里的大块 mock/setup 抽到 helper 中；只在新 suite 中注入最少依赖：

```tsx
const { screen, mocks } = renderSettingsPage({
  authenticated: true,
  cloudMode: false,
});
```

必要时把现有通用 mock 常量搬到 helper 中导出，避免在 5 个文件里重复定义。

- [ ] **Step 4: Re-run the two suites to verify they pass**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/settings-page/settings-page.preferences.test.tsx src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Write the failing sync-status, repair-entry and backend-env suites**

分别新增最小失败用例：

```tsx
it('renders sync summary counts when opening sync status', async () => {
  const screen = renderSettingsPage({ cloudMode: true, authenticated: true });

  fireEvent.press(screen.getByTestId('settings-show-sync-status'));

  await waitFor(() => {
    expect(mockShowCloudSyncStatusAlert).toHaveBeenCalledWith(expect.objectContaining({
      pendingEntries: 2,
      failedEntries: 1,
    }));
  });
});
```

```tsx
it('reopens the repair prompt from the dedicated repair entry', async () => {
  const screen = renderSettingsPage({ e2eSyncLab: true });

  fireEvent.press(screen.getByTestId('e2e-sync-show-repair-prompt'));
  expect(mockShowSyncRepairPrompt).toHaveBeenCalled();
});
```

```tsx
it('keeps the previous backend environment when switching fails', async () => {
  mockSwitchBackendEnvironment.mockRejectedValueOnce(new Error('timeout'));
  const screen = renderSettingsPage();

  fireEvent.press(screen.getByText('切换环境'));
  await waitFor(() => expect(mockSwitchBackendEnvironment).toHaveBeenCalled());
  expect(screen.getByText('https://server-a.example.com')).toBeTruthy();
});
```

- [ ] **Step 6: Run the three new suites to verify they fail**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/settings-page/settings-page.sync-status.test.tsx src/components/__tests__/settings-page/settings-page.repair-entry.test.tsx src/components/__tests__/settings-page/settings-page.backend-env.test.tsx --runInBand`

Expected: FAIL，直到新的 suites 和 helper 都建立完毕。

- [ ] **Step 7: Implement the minimal suite coverage and shrink the legacy SettingsPage file**

做法：

1. 用新 helper 补齐 3 个新 suites
2. 把 `SettingsPage.test.tsx` 收缩为 smoke + 总装配验证
3. 保留当前真正跨分区的总成断言，迁走细颗粒场景

不要一次性重写整个文件，先迁一个场景、跑一次，再迁下一类。

- [ ] **Step 8: Run the full settings batch**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/settings-page/settings-page.preferences.test.tsx src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx src/components/__tests__/settings-page/settings-page.sync-status.test.tsx src/components/__tests__/settings-page/settings-page.repair-entry.test.tsx src/components/__tests__/settings-page/settings-page.backend-env.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add app/src/components/__tests__/SettingsPage.test.tsx app/src/components/__tests__/settings-page/settings-page.preferences.test.tsx app/src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx app/src/components/__tests__/settings-page/settings-page.sync-status.test.tsx app/src/components/__tests__/settings-page/settings-page.repair-entry.test.tsx app/src/components/__tests__/settings-page/settings-page.backend-env.test.tsx app/src/components/__tests__/helpers/renderSettingsPage.tsx
git commit -m "test(settings): split sync and preferences coverage"
```

### Task 3: Build Timeline And Search Jest Suites

**Files:**
- Create: `app/app/(tabs)/__tests__/index.timeline-state.test.tsx`
- Create: `app/app/(tabs)/__tests__/index.search-filter.test.tsx`
- Create: `app/src/components/__tests__/timeline/timeline.home.navigation.test.tsx`
- Create: `app/src/components/__tests__/timeline/timeline.home.sync-status.test.tsx`
- Create: `app/src/components/__tests__/search/search-overlay.filters.test.tsx`
- Create: `app/src/components/__tests__/search/search-overlay.restore-state.test.tsx`
- Modify: `app/app/(tabs)/__tests__/index.render.test.tsx`
- Modify: `app/src/components/__tests__/SearchBar.safe-area.test.tsx`
- Test: `app/app/(tabs)/__tests__/index.timeline-state.test.tsx`
- Test: `app/app/(tabs)/__tests__/index.search-filter.test.tsx`
- Test: `app/src/components/__tests__/timeline/timeline.home.navigation.test.tsx`
- Test: `app/src/components/__tests__/timeline/timeline.home.sync-status.test.tsx`
- Test: `app/src/components/__tests__/search/search-overlay.filters.test.tsx`
- Test: `app/src/components/__tests__/search/search-overlay.restore-state.test.tsx`

- [ ] **Step 1: Write the failing home timeline state tests**

在 `index.timeline-state.test.tsx` 新增最小失败用例：

```tsx
it('keeps the old timeline list when refresh fails', async () => {
  const { screen, mocks } = renderHomeScreen({ entries: seededEntries });
  mocks.loadEntries.mockRejectedValueOnce(new Error('refresh failed'));

  fireEvent(screen.getByTestId('home-screen-root'), 'refresh');

  await waitFor(() => expect(mocks.loadEntries).toHaveBeenCalled());
  expect(screen.getByText('已存在记录 A')).toBeTruthy();
});
```

```tsx
it('renders the sync status action when cloud mode is active', () => {
  const { screen } = renderHomeScreen({ cloudMode: true });
  expect(screen.getByTestId('cloud-sync-button')).toBeTruthy();
});
```

- [ ] **Step 2: Run the home timeline tests to verify they fail**

Run: `cd app && npm test -- --runTestsByPath "app/(tabs)/__tests__/index.timeline-state.test.tsx" src/components/__tests__/timeline/timeline.home.sync-status.test.tsx --runInBand`

Expected: FAIL，因为 helper 和分场景断言还未建立。

- [ ] **Step 3: Implement the minimal home-screen helper and timeline suites**

用 `renderHomeScreen` helper 统一：

- 路由 mock
- `entryStore` 默认数据
- `settingsStore` / `authStore` 默认状态
- 首页所需 service mock

然后分别把首页空态/刷新/同步按钮和 `Timeline.v2` 导航断言拆到新文件中，不再挤进 `index.render.test.tsx`。

- [ ] **Step 4: Re-run the home timeline tests to verify they pass**

Run: `cd app && npm test -- --runTestsByPath "app/(tabs)/__tests__/index.timeline-state.test.tsx" src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/timeline/timeline.home.navigation.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Write the failing search/filter suites**

在 `index.search-filter.test.tsx` 和 `search-overlay.*.test.tsx` 中新增失败用例：

```tsx
it('restores the default home list after closing the overlay without active filters', async () => {
  const { screen } = renderHomeScreen({ entries: seededEntries });

  fireEvent.press(screen.getByTestId('searchbar-search-box'));
  fireEvent.press(screen.getByTestId('search-overlay-cancel-button'));

  expect(screen.getByText('已存在记录 A')).toBeTruthy();
});
```

```tsx
it('keeps tag filters when clearing only the keyword', async () => {
  render(<SearchOverlay visible onClose={jest.fn()} onSearch={jest.fn()} />);

  // 先设置 local query + local tags，再清空 query
  expect(filteredResults).toEqual(expect.arrayContaining([tagMatchedEntry]));
});
```

- [ ] **Step 6: Run the search/filter suites to verify they fail**

Run: `cd app && npm test -- --runTestsByPath "app/(tabs)/__tests__/index.search-filter.test.tsx" src/components/__tests__/search/search-overlay.filters.test.tsx src/components/__tests__/search/search-overlay.restore-state.test.tsx src/components/__tests__/SearchBar.safe-area.test.tsx --runInBand`

Expected: FAIL，因为新的页面组合行为还没有被独立建模。

- [ ] **Step 7: Implement the minimal search suite coverage**

做法：

1. 用 `renderHomeScreen` helper 建搜索入口和结果回流测试
2. 用 `SearchOverlay` 独立组件测试建筛选组合规则
3. 只保留 `SearchBar.safe-area.test.tsx` 的基础布局 smoke

优先覆盖：

- 进入搜索态
- 取消退出
- 关键字清空
- 标签与类型组合
- 详情返回后结果刷新策略

- [ ] **Step 8: Run the full timeline/search batch**

Run: `cd app && npm test -- --runTestsByPath "app/(tabs)/__tests__/index.render.test.tsx" "app/(tabs)/__tests__/index.timeline-state.test.tsx" "app/(tabs)/__tests__/index.search-filter.test.tsx" src/components/__tests__/SearchBar.safe-area.test.tsx src/components/__tests__/timeline/timeline.home.navigation.test.tsx src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/search/search-overlay.filters.test.tsx src/components/__tests__/search/search-overlay.restore-state.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add app/app/(tabs)/__tests__/index.render.test.tsx app/app/(tabs)/__tests__/index.timeline-state.test.tsx app/app/(tabs)/__tests__/index.search-filter.test.tsx app/src/components/__tests__/SearchBar.safe-area.test.tsx app/src/components/__tests__/timeline/timeline.home.navigation.test.tsx app/src/components/__tests__/timeline/timeline.home.sync-status.test.tsx app/src/components/__tests__/search/search-overlay.filters.test.tsx app/src/components/__tests__/search/search-overlay.restore-state.test.tsx app/src/components/__tests__/helpers/renderHomeScreen.tsx
git commit -m "test(home): add timeline and search regression suites"
```

### Task 4: Build Editor, Image And Home Photo Jest Suites

**Files:**
- Create: `app/src/components/__tests__/editor/entry-editor.dirty-state.test.tsx`
- Create: `app/src/components/__tests__/editor/entry-editor.save-flow.test.tsx`
- Create: `app/src/components/__tests__/editor/entry-editor.leave-guard.test.tsx`
- Create: `app/src/components/__tests__/image/photo-grid.render.test.tsx`
- Create: `app/src/components/__tests__/image/image-viewer.navigation.test.tsx`
- Create: `app/src/components/__tests__/image/entry-card.missing-media-variants.test.tsx`
- Modify: `app/app/(tabs)/__tests__/index.photo.test.ts`
- Modify: `app/src/components/__tests__/EntryCard.missing-media.test.tsx`
- Modify: `app/src/components/__tests__/ImageViewer.shared-element.test.tsx`
- Test: `app/src/components/__tests__/editor/entry-editor.dirty-state.test.tsx`
- Test: `app/src/components/__tests__/editor/entry-editor.save-flow.test.tsx`
- Test: `app/src/components/__tests__/editor/entry-editor.leave-guard.test.tsx`
- Test: `app/src/components/__tests__/image/photo-grid.render.test.tsx`
- Test: `app/src/components/__tests__/image/image-viewer.navigation.test.tsx`
- Test: `app/src/components/__tests__/image/entry-card.missing-media-variants.test.tsx`
- Test: `app/app/(tabs)/__tests__/index.photo.test.ts`

- [ ] **Step 1: Write the failing editor suites**

最小失败用例示例：

```tsx
it('marks the editor dirty only when content actually changes', () => {
  const { screen } = renderEntryEditor();
  fireEvent.changeText(screen.getByTestId('entry-editor-content-input'), '新的正文');

  expect(screen.getByTestId('entry-editor-save-button')).not.toHaveProp('disabled', true);
});
```

```tsx
it('does not call onSave twice when save is pressed repeatedly', async () => {
  const onSave = jest.fn();
  const { screen } = renderEntryEditor({ onSave });

  fireEvent.press(screen.getByTestId('entry-editor-save-button'));
  fireEvent.press(screen.getByTestId('entry-editor-save-button'));

  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
});
```

```tsx
it('shows a leave-confirmation path when unsaved edits exist', () => {
  // 先产生脏状态，再触发 close
  expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('未保存'));
});
```

- [ ] **Step 2: Run the editor suites to verify they fail**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/editor/entry-editor.dirty-state.test.tsx src/components/__tests__/editor/entry-editor.save-flow.test.tsx src/components/__tests__/editor/entry-editor.leave-guard.test.tsx --runInBand`

Expected: FAIL，因为新的细颗粒行为还未单独建模。

- [ ] **Step 3: Implement the minimal editor suite coverage**

使用 `renderEntryEditor` helper，把现有 `EntryEditor.test.tsx` 里的基础 render 留作 smoke，把脏状态、保存与离开保护迁到三个新文件中。必要时用 `Alert.alert` spy 断言离开保护路径。

- [ ] **Step 4: Re-run the editor suites to verify they pass**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/editor/entry-editor.dirty-state.test.tsx src/components/__tests__/editor/entry-editor.save-flow.test.tsx src/components/__tests__/editor/entry-editor.leave-guard.test.tsx src/components/__tests__/EntryEditor.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Write the failing image and photo-entry suites**

示例失败用例：

```tsx
it('keeps rendering valid thumbnails when one media item is missing', () => {
  render(<EntryCard entry={entryWithMixedMedia} ... />);
  expect(screen.getByText('图片异常')).toBeTruthy();
  expect(screen.getByTestId('entry-card')).toBeTruthy();
});
```

```tsx
it('opens the image viewer and preserves the requested image index', () => {
  render(<ImageViewer visible imageUri="file://photo-2.jpg" onClose={jest.fn()} ... />);
  expect(screen.getByTestId('image-viewer-root')).toBeTruthy();
});
```

```tsx
it('keeps local photo entry state when upload enqueue fails', async () => {
  // 针对 app/app/(tabs)/index.photo.test.ts 的首页照片创建路径
  expect(mockAddLocalEntry).toHaveBeenCalled();
  expect(logger.warn).toHaveBeenCalled();
});
```

- [ ] **Step 6: Run the image/photo suites to verify they fail**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/image/photo-grid.render.test.tsx src/components/__tests__/image/image-viewer.navigation.test.tsx src/components/__tests__/image/entry-card.missing-media-variants.test.tsx "app/(tabs)/__tests__/index.photo.test.ts" --runInBand`

Expected: FAIL，因为新的分文件矩阵和首页照片恢复断言还未建立。

- [ ] **Step 7: Implement the minimal image and photo-entry suite coverage**

做法：

1. `PhotoGrid` 只管布局矩阵
2. `ImageViewer.shared-element.test.tsx` 保留共享元素 smoke
3. 新的 `image-viewer.navigation.test.tsx` 负责打开/关闭/索引切换
4. `EntryCard.missing-media.test.tsx` 保留基础路径，把缺图/坏图变体矩阵迁到新文件
5. `index.photo.test.ts` 增补首页照片创建失败保留、本地回流和完整性异常降级断言

- [ ] **Step 8: Run the full editor/image batch**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/EntryEditor.test.tsx src/components/__tests__/editor/entry-editor.dirty-state.test.tsx src/components/__tests__/editor/entry-editor.save-flow.test.tsx src/components/__tests__/editor/entry-editor.leave-guard.test.tsx src/components/__tests__/ImageViewer.shared-element.test.tsx src/components/__tests__/EntryCard.missing-media.test.tsx src/components/__tests__/image/photo-grid.render.test.tsx src/components/__tests__/image/image-viewer.navigation.test.tsx src/components/__tests__/image/entry-card.missing-media-variants.test.tsx "app/(tabs)/__tests__/index.photo.test.ts" --runInBand`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add app/src/components/__tests__/editor/entry-editor.dirty-state.test.tsx app/src/components/__tests__/editor/entry-editor.save-flow.test.tsx app/src/components/__tests__/editor/entry-editor.leave-guard.test.tsx app/src/components/__tests__/image/photo-grid.render.test.tsx app/src/components/__tests__/image/image-viewer.navigation.test.tsx app/src/components/__tests__/image/entry-card.missing-media-variants.test.tsx app/app/(tabs)/__tests__/index.photo.test.ts app/src/components/__tests__/EntryCard.missing-media.test.tsx app/src/components/__tests__/ImageViewer.shared-element.test.tsx app/src/components/__tests__/helpers/renderEntryEditor.tsx
git commit -m "test(editor): add editor and image regression suites"
```

### Task 5: Add Android App-Core Maestro Flows

**Files:**
- Create: `app/.maestro/common/open-search-overlay.yaml`
- Create: `app/.maestro/common/open-first-entry.yaml`
- Create: `app/.maestro/common/open-entry-editor.yaml`
- Create: `app/.maestro/flows/app-core/timeline-open-detail.yaml`
- Create: `app/.maestro/flows/app-core/editor-unsaved-leave-guard.yaml`
- Create: `app/.maestro/flows/app-core/search-enter-exit.yaml`
- Create: `app/.maestro/flows/app-core/image-viewer-back-navigation.yaml`
- Create: `app/.maestro/flows/app-core/settings-sync-status-open.yaml`
- Create: `app/.maestro/flows/app-core/settings-repair-prompt.yaml`
- Modify: `app/.maestro/README.md`
- Test: `app/.maestro/flows/app-core/timeline-open-detail.yaml`
- Test: `app/.maestro/flows/app-core/editor-unsaved-leave-guard.yaml`
- Test: `app/.maestro/flows/app-core/search-enter-exit.yaml`
- Test: `app/.maestro/flows/app-core/image-viewer-back-navigation.yaml`
- Test: `app/.maestro/flows/app-core/settings-sync-status-open.yaml`
- Test: `app/.maestro/flows/app-core/settings-repair-prompt.yaml`

- [ ] **Step 1: Write the first failing Maestro flow for search enter/exit**

创建 `app/.maestro/flows/app-core/search-enter-exit.yaml`：

```yaml
appId: com.memorycapsule.app
---
- runFlow: ../../common/launch-app.yaml
- tapOn:
    id: searchbar-search-box
- assertVisible:
    id: search-overlay-root
- tapOn:
    id: search-overlay-cancel-button
- assertNotVisible:
    id: search-overlay-root
- assertVisible:
    id: home-screen-root
```

- [ ] **Step 2: Run the single Maestro flow to verify it fails for the expected reason**

Run: `cd app && maestro test .maestro/flows/app-core/search-enter-exit.yaml`

Expected: FAIL，直到新的 flow 文件和稳定锚点都真正接好。

- [ ] **Step 3: Add reusable common flows**

创建：

```yaml
# open-search-overlay.yaml
appId: com.memorycapsule.app
---
- runFlow: launch-app.yaml
- tapOn:
    id: searchbar-search-box
- assertVisible:
    id: search-overlay-root
```

```yaml
# open-first-entry.yaml
appId: com.memorycapsule.app
---
- runFlow: launch-app.yaml
- tapOn:
    id: entry-card
    index: 0
```

```yaml
# open-entry-editor.yaml
appId: com.memorycapsule.app
---
- runFlow: launch-app.yaml
- tapOn:
    id: mock-text-detail-edit
```

如果 `open-entry-editor` 无法直接复用真实按钮，就用实际可见的新建或编辑入口重写，但不要用坐标点击。

- [ ] **Step 4: Add the remaining app-core flows**

按同样模式补齐：

- `timeline-open-detail.yaml`
- `editor-unsaved-leave-guard.yaml`
- `image-viewer-back-navigation.yaml`
- `settings-sync-status-open.yaml`
- `settings-repair-prompt.yaml`

每个 flow 只保留一条主断言，不把多条业务分支塞进同一个 YAML。

- [ ] **Step 5: Run the full app-core Maestro batch**

Run: `cd app && maestro test .maestro/flows/app-core`

Expected: 全部 PASS；若某条依赖真实数据，必须先在 README 中写清前置条件。

- [ ] **Step 6: Update the Maestro README**

在 `app/.maestro/README.md` 补充：

- app-core suite 的运行命令
- 需要的 Android 模拟器/开发包前提
- 与 cloud-sync suite 的区别
- 哪些 flows 依赖真实数据，哪些只依赖本地可见 UI

- [ ] **Step 7: Commit**

```bash
git add app/.maestro/common/open-search-overlay.yaml app/.maestro/common/open-first-entry.yaml app/.maestro/common/open-entry-editor.yaml app/.maestro/flows/app-core/timeline-open-detail.yaml app/.maestro/flows/app-core/editor-unsaved-leave-guard.yaml app/.maestro/flows/app-core/search-enter-exit.yaml app/.maestro/flows/app-core/image-viewer-back-navigation.yaml app/.maestro/flows/app-core/settings-sync-status-open.yaml app/.maestro/flows/app-core/settings-repair-prompt.yaml app/.maestro/README.md
git commit -m "test(maestro): add app-core android regression flows"
```

### Task 6: Add Package-Level Test Entry Points And Run Final Verification

**Files:**
- Modify: `app/package.json`
- Modify: `app/.maestro/README.md`
- Test: `app/package.json`
- Test: all new Jest suites
- Test: all new Maestro app-core flows

- [ ] **Step 1: Add package scripts for the new test batches**

在 `app/package.json` 新增：

```json
{
  "scripts": {
    "test:frontend:settings": "jest --runInBand --runTestsByPath src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/settings-page/settings-page.preferences.test.tsx src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx src/components/__tests__/settings-page/settings-page.sync-status.test.tsx src/components/__tests__/settings-page/settings-page.repair-entry.test.tsx src/components/__tests__/settings-page/settings-page.backend-env.test.tsx",
    "test:frontend:home": "jest --runInBand --runTestsByPath app/(tabs)/__tests__/index.render.test.tsx app/(tabs)/__tests__/index.timeline-state.test.tsx app/(tabs)/__tests__/index.search-filter.test.tsx src/components/__tests__/timeline/timeline.home.navigation.test.tsx src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/search/search-overlay.filters.test.tsx src/components/__tests__/search/search-overlay.restore-state.test.tsx",
    "test:frontend:editor-image": "jest --runInBand --runTestsByPath src/components/__tests__/EntryEditor.test.tsx src/components/__tests__/editor/entry-editor.dirty-state.test.tsx src/components/__tests__/editor/entry-editor.save-flow.test.tsx src/components/__tests__/editor/entry-editor.leave-guard.test.tsx src/components/__tests__/ImageViewer.shared-element.test.tsx src/components/__tests__/EntryCard.missing-media.test.tsx src/components/__tests__/image/photo-grid.render.test.tsx src/components/__tests__/image/image-viewer.navigation.test.tsx src/components/__tests__/image/entry-card.missing-media-variants.test.tsx app/(tabs)/__tests__/index.photo.test.ts",
    "test:maestro:app-core": "maestro test .maestro/flows/app-core"
  }
}
```

- [ ] **Step 2: Run the settings batch script**

Run: `cd app && npm run test:frontend:settings`

Expected: PASS

- [ ] **Step 3: Run the home batch script**

Run: `cd app && npm run test:frontend:home`

Expected: PASS

- [ ] **Step 4: Run the editor/image batch script**

Run: `cd app && npm run test:frontend:editor-image`

Expected: PASS

- [ ] **Step 5: Run the Maestro batch script**

Run: `cd app && npm run test:maestro:app-core`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/package.json app/.maestro/README.md
git commit -m "chore(test): add frontend regression batch commands"
```

## Verification Checklist

- [ ] `EntryEditor`、`SearchOverlay` 新增稳定锚点已被单测锁定
- [ ] 设置页被拆成 5 个聚焦 suites，原大文件只保留 smoke
- [ ] 首页时间线与搜索/筛选被拆成页面级 suites
- [ ] 编辑器、图片查看器和缺图/坏图链路有独立 suites
- [ ] Android app-core Maestro flows 可以按目录批量运行
- [ ] `package.json` 提供 settings / home / editor-image / maestro 分组命令
- [ ] `app/.maestro/README.md` 已写清 app-core suite 的运行前提

## Follow-Up After This Batch

本 plan 完成后，再单独开后续 plan 处理以下内容：

1. P1 登录/备份/权限/错误反馈/语音模块的细颗粒度拆分
2. P2 关于页/帮助页/统计页/Sidebar smoke 套件
3. iOS 差异回归
4. CI 并行执行和缓存优化
