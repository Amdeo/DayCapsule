# Tag Management And Stats Test Granularity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为预制标签管理、设置页标签入口和标签统计页补齐细粒度自动化测试，并保留一条稳定的 Android Maestro 真实导航回归。

**Architecture:** 这批实现以 `Jest + React Native Testing Library` 为主，重点把预制标签管理页的加载条件、输入/上限、确认弹窗和拖拽边界拆成单语义测试。对于当前不够稳的查询点，只补最小 `testID` 锚点，不改产品行为；`Maestro` 继续只验证“设置页进入标签管理并返回”的真实链路，不承担细碎业务分支。

**Tech Stack:** React Native, Jest, React Native Testing Library, Maestro YAML, Android emulator

---

## Scope Note

本 plan 只覆盖以下范围：

- `TagManagementPage` 的细粒度页面/控制器测试
- `SettingsPage` 的标签管理入口测试
- `TagsPage` 的聚合、空态、可见性和关闭行为测试
- `settings-to-tag-management` smoke flow 的回归验证

以下内容不在本 plan 中实现：

- `commonTagsStore` 的大规模新增测试
- 新的标签产品能力
- 新的 Android E2E 大流程
- iOS 专项自动化

## File Structure

- Modify: `app/src/components/tag-management-page/TagManagementPageContent.tsx`
  Purpose: 为输入框、添加按钮、恢复默认入口补稳定 `testID`，避免测试依赖文案或图标结构。
- Modify: `app/src/components/tag-management-page/TagManagementTagRow.tsx`
  Purpose: 为删除按钮补稳定 `testID`，让删除确认测试不依赖 icon 文本 mock。
- Modify: `app/src/components/tags-page/TagsPageContent.tsx`
  Purpose: 为标签统计行补稳定 `testID`，支撑排序与逐行关闭断言。
- Modify: `app/src/components/__tests__/TagManagementPage.test.tsx`
  Purpose: 扩展加载条件、输入/trim、`submitEditing`、上限禁用、删除/恢复确认、拖拽边界测试。
- Modify: `app/src/components/__tests__/SettingsPage.test.tsx`
  Purpose: 把标签管理入口测试收紧到“入口存在 + 打开弹窗”两类稳定断言。
- Modify: `app/src/components/__tests__/TagsPage.test.tsx`
  Purpose: 扩展隐藏态、聚合、忽略 `undefined tags`、计数排序和多行关闭测试。
- Modify: `app/package.json`
  Purpose: 增加本批标签相关测试的分组脚本，便于后续反复回归。
- Test: `app/.maestro/flows/smoke/settings-to-tag-management.yaml`
  Purpose: 验证 Android 真实导航链路仍然可用。

### Task 1: Add Stable Tag Selectors And A Mutable Tag Management Test Harness

**Files:**
- Modify: `app/src/components/tag-management-page/TagManagementPageContent.tsx`
- Modify: `app/src/components/tag-management-page/TagManagementTagRow.tsx`
- Modify: `app/src/components/__tests__/TagManagementPage.test.tsx`
- Test: `app/src/components/__tests__/TagManagementPage.test.tsx`

- [ ] **Step 1: Write the failing selector-driven load and submit tests**

在 `app/src/components/__tests__/TagManagementPage.test.tsx` 先写两条基于新锚点的失败用例：

```tsx
it('loads common tags only when visible and not loaded', () => {
  setMockCommonTagsState({ isLoaded: false });
  const { rerender } = render(<TagManagementPage visible={false} onClose={jest.fn()} />);

  expect(mockLoadCommonTags).not.toHaveBeenCalled();

  rerender(<TagManagementPage visible onClose={jest.fn()} />);

  expect(mockLoadCommonTags).toHaveBeenCalledTimes(1);
});

it('submits trimmed text from submitEditing and clears the input', async () => {
  const screen = render(<TagManagementPage visible onClose={jest.fn()} />);

  fireEvent.changeText(screen.getByTestId('tag-management-add-input'), '  灵感  ');
  await act(async () => {
    fireEvent(screen.getByTestId('tag-management-add-input'), 'submitEditing');
  });

  expect(mockAddCommonTag).toHaveBeenCalledWith('灵感');
  expect(screen.getByTestId('tag-management-add-input')).toHaveProp('value', '');
});
```

- [ ] **Step 2: Run the targeted suite to verify it fails**

Run: `cd app && pnpm test -- --runTestsByPath src/components/__tests__/TagManagementPage.test.tsx --runInBand`

Expected: FAIL，因为当前页面还没有 `tag-management-add-input` 之类的稳定锚点，且测试文件还没有可重置的 store mock 状态。

- [ ] **Step 3: Implement the minimal selector and mock-state support**

在 `app/src/components/tag-management-page/TagManagementPageContent.tsx` 补：

```tsx
<TouchableOpacity testID="tag-management-reset-button" ...>
<TextInput testID="tag-management-add-input" ... />
<TouchableOpacity testID="tag-management-add-button" ...>
```

在 `app/src/components/tag-management-page/TagManagementTagRow.tsx` 补：

```tsx
<TouchableOpacity testID={`preset-tag-delete-${index}`} onPress={() => onDelete(tag)} ...>
```

在 `app/src/components/__tests__/TagManagementPage.test.tsx` 把固定 mock 改成可重置状态：

```tsx
const defaultStoreState = {
  tags: ['工作', '学习', '旅行'],
  isLoaded: true,
};

let mockStoreState = { ...defaultStoreState };

function setMockCommonTagsState(overrides: Partial<typeof defaultStoreState> = {}) {
  mockStoreState = { ...defaultStoreState, ...overrides };
}
```

并让 `useCommonTagsStore` 返回 `mockStoreState` 与各个 mock action 的组合对象。

- [ ] **Step 4: Re-run the targeted suite to verify it passes**

Run: `cd app && pnpm test -- --runTestsByPath src/components/__tests__/TagManagementPage.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/components/tag-management-page/TagManagementPageContent.tsx app/src/components/tag-management-page/TagManagementTagRow.tsx app/src/components/__tests__/TagManagementPage.test.tsx
git commit -m "test(tags): add stable tag management selectors"
```

### Task 2: Expand Tag Management Behavior Coverage

**Files:**
- Modify: `app/src/components/__tests__/TagManagementPage.test.tsx`
- Test: `app/src/components/__tests__/TagManagementPage.test.tsx`

- [ ] **Step 1: Write the failing behavior tests for limit, destructive confirms, and drag boundaries**

在同一个测试文件中新增这些单语义用例：

```tsx
it('disables the input and add button when preset tags reach MAX_TAGS', () => {
  setMockCommonTagsState({ tags: Array.from({ length: 20 }, (_, index) => `标签${index}`) });
  const screen = render(<TagManagementPage visible onClose={jest.fn()} />);

  expect(screen.getByTestId('tag-management-add-input')).toHaveProp('editable', false);
  expect(screen.getByTestId('tag-management-add-button')).toHaveProp('disabled', true);
  expect(screen.getByPlaceholderText('最多 20 个预制标签')).toBeTruthy();
});

it('cancels and confirms delete through alert actions', () => {
  const screen = render(<TagManagementPage visible onClose={jest.fn()} />);

  fireEvent.press(screen.getByTestId('preset-tag-delete-0'));
  pressLatestAlertButton('取消');
  expect(mockRemoveCommonTag).not.toHaveBeenCalled();

  fireEvent.press(screen.getByTestId('preset-tag-delete-0'));
  pressLatestAlertButton('删除');
  expect(mockRemoveCommonTag).toHaveBeenCalledWith('工作');
});

it('does not reorder when drag never crosses a row threshold', async () => {
  render(<TagManagementPage visible onClose={jest.fn()} />);

  act(() => {
    responderConfigs[0].onPanResponderGrant();
    jest.advanceTimersByTime(200);
    responderConfigs[0].onPanResponderMove(null, { dy: 20 });
  });

  await act(async () => {
    await responderConfigs[0].onPanResponderRelease();
  });

  expect(mockReorderCommonTags).not.toHaveBeenCalled();
});
```

再补 `恢复初始预制标签` 的取消/确认分支，以及空输入点击添加不调用 store 的用例。

- [ ] **Step 2: Run the suite to verify the new cases fail or expose harness gaps**

Run: `cd app && pnpm test -- --runTestsByPath src/components/__tests__/TagManagementPage.test.tsx --runInBand`

Expected: 至少部分新增用例失败，暴露 alert 按钮触发、上限状态重置或拖拽 helper 的缺口；如果个别用例一次通过，保留它们作为回归基线，不为制造失败而改业务代码。

- [ ] **Step 3: Finish the minimal test helpers without changing product behavior**

在测试文件中补两个小 helper：

```tsx
function pressLatestAlertButton(text: string) {
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] ?? [];
  buttons.find((button: { text?: string }) => button.text === text)?.onPress?.();
}

function resetTagManagementMocks() {
  jest.clearAllMocks();
  responderConfigs.length = 0;
  setMockCommonTagsState();
}
```

同时把现有拖拽测试改成“跨行触发 reorder”和“未跨行不 reorder”两条独立断言，不再在一个用例里混测所有拖拽语义。

- [ ] **Step 4: Re-run the tag management suite to verify it passes**

Run: `cd app && pnpm test -- --runTestsByPath src/components/__tests__/TagManagementPage.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/components/__tests__/TagManagementPage.test.tsx
git commit -m "test(tags): expand preset tag management coverage"
```

### Task 3: Tighten Settings Entry And Tag Stats Coverage

**Files:**
- Modify: `app/src/components/tags-page/TagsPageContent.tsx`
- Modify: `app/src/components/__tests__/SettingsPage.test.tsx`
- Modify: `app/src/components/__tests__/TagsPage.test.tsx`
- Modify: `app/package.json`
- Test: `app/src/components/__tests__/SettingsPage.test.tsx`
- Test: `app/src/components/__tests__/TagsPage.test.tsx`

- [ ] **Step 1: Write the failing settings and tags-page tests**

在 `app/src/components/__tests__/SettingsPage.test.tsx` 新增入口语义测试：

```tsx
it('renders the preset tag management entry with subtitle and stable testID', async () => {
  const { screen } = renderSettingsPage();

  await waitFor(() => {
    expect(screen.getByText('其他')).toBeTruthy();
  });

  expect(screen.getByTestId('settings-open-tag-management')).toBeTruthy();
  expect(screen.getByText('管理可快速选择的预制标签')).toBeTruthy();
});
```

在 `app/src/components/__tests__/TagsPage.test.tsx` 新增失败用例：

```tsx
it('does not render anything when the page is hidden', () => {
  mockUseEntryStore.mockReturnValue({ entries: [{ id: '1', type: 'text', content: 'a', timestamp: 1, tags: ['旅行'], syncStatus: 'synced' }] });
  const screen = render(<TagsPage visible={false} onClose={jest.fn()} />);

  expect(screen.queryByTestId('tags-page-root')).toBeNull();
});

it('aggregates repeated tags, ignores undefined tags, and renders rows in descending count order', () => {
  mockUseEntryStore.mockReturnValue({
    entries: [
      { id: '1', type: 'text', content: 'a', timestamp: 1, tags: ['旅行', '工作'], syncStatus: 'synced' },
      { id: '2', type: 'text', content: 'b', timestamp: 2, tags: ['旅行'], syncStatus: 'synced' },
      { id: '3', type: 'text', content: 'c', timestamp: 3, tags: undefined, syncStatus: 'synced' },
    ],
  });

  const screen = render(<TagsPage visible onClose={jest.fn()} />);
  const rows = screen.getAllByTestId('tags-page-row');

  expect(within(rows[0]).getByText('#旅行')).toBeTruthy();
  expect(within(rows[1]).getByText('#工作')).toBeTruthy();
});
```

再补一条“点击不同标签行都会触发 `onClose`”的测试。

- [ ] **Step 2: Run the targeted suites to verify they fail**

Run: `cd app && pnpm test -- --runTestsByPath src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/TagsPage.test.tsx --runInBand`

Expected: FAIL，因为 `TagsPageContent` 还没有 `tags-page-row` 选择器，新断言无法稳定定位统计行。

- [ ] **Step 3: Implement the minimal row anchor and grouped test script**

在 `app/src/components/tags-page/TagsPageContent.tsx` 给每个统计行补：

```tsx
<TouchableOpacity testID="tags-page-row" ...>
```

在 `app/package.json` 增加：

```json
"test:frontend:tags": "jest --runInBand --runTestsByPath src/components/__tests__/TagManagementPage.test.tsx src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/TagsPage.test.tsx"
```

并把 `TagsPage.test.tsx` 的数据构造改成覆盖：

- 空态
- `visible=false`
- 聚合同名标签
- 忽略 `undefined tags`
- 计数降序
- 多个标签行都可触发关闭

- [ ] **Step 4: Re-run the targeted suites and the new grouped script**

Run: `cd app && pnpm test -- --runTestsByPath src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/TagsPage.test.tsx --runInBand`
Expected: PASS

Run: `cd app && pnpm run test:frontend:tags`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/components/tags-page/TagsPageContent.tsx app/src/components/__tests__/SettingsPage.test.tsx app/src/components/__tests__/TagsPage.test.tsx app/package.json
git commit -m "test(tags): cover settings entry and tag stats"
```

### Task 4: Run Final Verification Including Android Smoke

**Files:**
- Test: `app/src/components/__tests__/TagManagementPage.test.tsx`
- Test: `app/src/components/__tests__/SettingsPage.test.tsx`
- Test: `app/src/components/__tests__/TagsPage.test.tsx`
- Test: `app/.maestro/flows/smoke/settings-to-tag-management.yaml`

- [ ] **Step 1: Re-run the grouped tag-related Jest suite**

Run: `cd app && pnpm run test:frontend:tags`

Expected: PASS

- [ ] **Step 2: Re-run the Android smoke flow for settings to tag management**

Run: `cd app && maestro test .maestro/flows/smoke/settings-to-tag-management.yaml`

Expected: PASS，链路应覆盖：首页 -> 设置页 -> 预制标签管理 -> 设置页 -> 首页

- [ ] **Step 3: Inspect git status before final handoff**

Run: `git status --short`

Expected: 只剩本批计划内修改；如果有额外脏文件，先确认是否来自同一批工作再决定是否补充验证。

- [ ] **Step 4: Handoff**

记录最终验证结果，并在执行阶段结束时引用：

- `pnpm run test:frontend:tags`
- `maestro test .maestro/flows/smoke/settings-to-tag-management.yaml`

作为完成依据。
