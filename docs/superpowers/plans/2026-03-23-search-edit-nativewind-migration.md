# 搜索与编辑链路 NativeWind 第二批迁移 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不重做首页视觉和交互的前提下，把首页延伸链路里的 `SearchOverlay`、`EntryEditor`、`TextEditor` 迁到 `NativeWind`，并继续收紧样式守卫 allowlist。

**Architecture:** 先补齐这批组件真正需要的第二批语义 token，然后按“全屏搜索层 -> 全屏编辑器 -> 底部 sheet”三个独立形态分块迁移。每个块都先写失败测试，再做最小实现，迁完立刻从 allowlist 中移除对应文件，最后跑 lint、typecheck 和全量测试并回填文档状态。

**Tech Stack:** React Native, Expo Router, NativeWind 4, Tailwind CSS, Jest, Testing Library, React Native Reanimated

**Spec:** `docs/superpowers/specs/2026-03-23-search-edit-nativewind-migration-design.md`

---

## 变更记录

- 2026-03-23：基于已批准 spec 创建第二批实现计划，范围固定为 `SearchOverlay`、`EntryEditor`、`TextEditor`。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 plan review 先采用本地结构化 review，并在文档中留痕。
- 2026-03-23：已完成本地结构化 review，未发现阻塞执行的问题。

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `app/src/components/__tests__/SearchOverlay.test.tsx` | 锁定搜索层壳层、重置入口和搜索提交流程在迁移后不回归 |
| `app/src/components/__tests__/TextEditor.test.tsx` | 锁定底部 sheet、保存禁用态、取消清空本地状态等关键行为 |

### Modified Files

| File | Change |
|------|--------|
| `app/tailwind.config.js` | 补齐第二批搜索/编辑链路所需的最小语义 token，避免在组件里新增散落十六进制颜色 |
| `app/eslint/style-guard-allowlist.js` | 每完成一个迁移块就移除对应 legacy 文件，继续收紧守卫 |
| `app/src/components/SearchOverlay.tsx` | 把全屏搜索层的静态壳层、section、chip、footer 按钮迁到 `NativeWind`，保留动画和运行时筛选色分支 |
| `app/src/components/EntryEditor.tsx` | 把全屏编辑页和底部 tag dock 的静态视觉迁到 `NativeWind`，保留类型色和绝对定位等必要动态样式 |
| `app/src/components/TextEditor.tsx` | 把底部 sheet 的静态壳层、section、footer 和按钮迁到 `NativeWind`，保留 modal/backdrop/键盘相关动态样式 |
| `app/src/components/__tests__/EntryEditor.test.tsx` | 补 header、type badge 和 tag dock 结构回归断言 |
| `docs/superpowers/specs/2026-03-23-search-edit-nativewind-migration-design.md` | 实现完成后回填状态、验证结果和偏差说明 |
| `docs/superpowers/plans/2026-03-23-search-edit-nativewind-migration.md` | 执行过程中勾选任务、记录验证结果和收口状态 |

## 执行约束

- 三个组件的展示形态必须保持原样：
  - `SearchOverlay` 仍是全屏搜索层
  - `EntryEditor` 仍是全屏编辑页 + 底部 tag dock
  - `TextEditor` 仍是底部 sheet
- 不能改现有入口关系：
  - `Timeline.v2` 继续拉起 `SearchOverlay` / `EntryEditor`
  - `app/(tabs)/index.tsx` 继续拉起 `TextEditor`
- 只迁静态视觉表达；动画、键盘行为、运行时尺寸、`absoluteFillObject`、类型色分支允许继续使用 `style`
- 不在组件内部新增新的十六进制颜色；确实缺 token 时，只能补语义化 token
- 每完成一个组件迁移，就从 allowlist 中删除对应文件，避免“迁完仍长期放行”

## Chunk 1: SearchOverlay 与第二批 token 基线

### Task 1: 补第二批最小 token，并把 `SearchOverlay` 迁到 `NativeWind`

**Files:**
- Modify: `app/tailwind.config.js`
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/SearchOverlay.tsx`
- Create: `app/src/components/__tests__/SearchOverlay.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定搜索层壳层和提交行为**

在 `app/src/components/__tests__/SearchOverlay.test.tsx` 新建测试，最少覆盖：

```ts
it('renders the existing full-screen search shell when visible', () => {
  const screen = render(<SearchOverlay visible onClose={jest.fn()} onSearch={jest.fn()} />);

  expect(screen.getByTestId('search-overlay-root')).toBeTruthy();
  expect(screen.getByPlaceholderText('搜索记忆...')).toBeTruthy();
  expect(screen.getByText('类型')).toBeTruthy();
  expect(screen.getByText('时间')).toBeTruthy();
  expect(screen.getByText('标签')).toBeTruthy();
});

it('resets local filters from the reset action without closing the overlay', () => {
  const screen = render(<SearchOverlay visible onClose={jest.fn()} onSearch={jest.fn()} />);

  fireEvent.changeText(screen.getByPlaceholderText('搜索记忆...'), '旅行');
  fireEvent.press(screen.getByText('文字'));
  fireEvent.press(screen.getByTestId('search-overlay-reset-button'));

  expect(screen.getByPlaceholderText('搜索记忆...').props.value).toBe('');
});

it('submits search filters once and closes the overlay', async () => {
  const onClose = jest.fn();
  const onSearch = jest.fn();
  const screen = render(<SearchOverlay visible onClose={onClose} onSearch={onSearch} />);

  fireEvent.changeText(screen.getByPlaceholderText('搜索记忆...'), '旅行');
  fireEvent.press(screen.getByTestId('search-overlay-submit-button'));

  await waitFor(() => expect(mockApplySearchFilters).toHaveBeenCalledTimes(1));
  expect(onSearch).toHaveBeenCalledWith('旅行');
  expect(onClose).toHaveBeenCalledTimes(1);
});
```

测试里直接 mock：

- `useEntryStore`
- `useCommonTagsStore`
- `Ionicons`

并把 `mockApplySearchFilters`、`mockGetAllTags` 暴露成可断言的 jest.fn。

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/SearchOverlay.test.tsx`

Expected: FAIL，原因应包含新 test 文件引用的 `testID` 尚不存在，或 `SearchOverlay` 仍未暴露这些结构锚点。

- [ ] **Step 3: 最小实现第二批 token 和 `SearchOverlay` 迁移**

在 `app/tailwind.config.js` 补这批需要的最小语义 token，优先覆盖：

- 搜索层背景 / 表面
- 浅灰 chip 背景
- 弱边框
- 次级提示文案
- 重置按钮浅色背景

可接受的方向示例：

```js
extend: {
  colors: {
    overlay: {
      background: '#FAF8F5',
      surface: '#FFFFFF',
      muted: '#F0F0F0',
      subtle: '#FAFAFA',
    },
    border: {
      subtle: '#E5E5E5',
      overlay: '#EFEFEF',
    },
    copy: {
      hint: '#C0C0C0',
    },
  },
}
```

在 `app/src/components/SearchOverlay.tsx`：

- 删除 `StyleSheet.create`
- 把 `overlay`、`container`、`searchSection`、`searchBox`、`section`、`chips`、`resetButton`、`footer`、`cancelButton`、`searchButton` 改为 `className`
- 保留：
  - 外层 `Animated.View` 的 entering / exiting
  - `KeyboardAvoidingView` 的 `behavior`
  - 类型 chip 选中态的运行时色值
  - 需要最小对象样式的占位高度和图标色
- 补以下 `testID`：
  - `search-overlay-root`
  - `search-overlay-input-shell`
  - `search-overlay-reset-button`
  - `search-overlay-submit-button`

- [ ] **Step 4: 运行组件测试并移出 allowlist**

先跑：

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/SearchOverlay.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/SearchOverlay.tsx`

然后跑：

Run: `cd app && npm run lint -- src/components/SearchOverlay.tsx`

Expected: PASS，说明 `SearchOverlay` 已不再依赖 allowlist。

- [ ] **Step 5: Commit**

```bash
git add app/tailwind.config.js app/eslint/style-guard-allowlist.js app/src/components/SearchOverlay.tsx app/src/components/__tests__/SearchOverlay.test.tsx
git commit -m "refactor: migrate search overlay to nativewind"
```

## Chunk 2: EntryEditor 全屏编辑器迁移

### Task 2: 扩充 `EntryEditor` 测试并迁移全屏编辑页壳层

**Files:**
- Modify: `app/tailwind.config.js`
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/EntryEditor.tsx`
- Modify: `app/src/components/__tests__/EntryEditor.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定 header / type badge / tag dock**

在 `app/src/components/__tests__/EntryEditor.test.tsx` 增加：

```ts
it('keeps the header and type badge visible in the full-screen editor shell', () => {
  const screen = render(
    <EntryEditor visible entry={textEntry} onSave={jest.fn()} onClose={jest.fn()} />
  );

  expect(screen.getByTestId('entry-editor-header')).toBeTruthy();
  expect(screen.getByTestId('entry-editor-type-badge')).toBeTruthy();
  expect(screen.getByText('编辑记录')).toBeTruthy();
});

it('keeps the bottom tag dock pinned as a separate editing region', () => {
  const screen = render(
    <EntryEditor visible entry={textEntry} onSave={jest.fn()} onClose={jest.fn()} />
  );

  expect(screen.getByTestId('entry-editor-tag-dock')).toBeTruthy();
  expect(screen.getByTestId('entry-editor-tags-input')).toBeTruthy();
});
```

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/EntryEditor.test.tsx`

Expected: FAIL，原因应包含 `entry-editor-header` 或 `entry-editor-type-badge` 尚不存在。

- [ ] **Step 3: 最小实现 `EntryEditor` NativeWind 迁移**

如果 `EntryEditor` 现有暖色系仍缺 token，就在 `app/tailwind.config.js` 继续补最小语义 token，优先覆盖：

- 编辑页背景
- 内容 surface
- 弱边框
- 次级标签文案
- tag dock 背景

可接受的方向示例：

```js
colors: {
  editor: {
    canvas: '#FAF8F5',
    surface: '#FFFDF9',
    tag: '#F7F2EA',
    muted: '#A08F82',
    body: '#2F241E',
  },
}
```

在 `app/src/components/EntryEditor.tsx`：

- 删除 `StyleSheet.create`
- 把 `editorPage`、`headerBar`、`main`、`scrollContent`、`contentSurface`、`metaSection`、`tagDock`、`commonChip`、`tagChip`、`suggestionChip` 等静态壳层迁到 `className`
- 保留：
  - `Modal`
  - `KeyboardAvoidingView`
  - backdrop
  - `typeBadge` 的运行时 border/background/text 色分支
  - `tagDock` 的绝对定位
- 补以下 `testID`：
  - `entry-editor-header`
  - `entry-editor-type-badge`

- [ ] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/EntryEditor.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/EntryEditor.tsx`

然后跑：

Run: `cd app && npm run lint -- src/components/EntryEditor.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/tailwind.config.js app/eslint/style-guard-allowlist.js app/src/components/EntryEditor.tsx app/src/components/__tests__/EntryEditor.test.tsx
git commit -m "refactor: migrate entry editor to nativewind"
```

## Chunk 3: TextEditor 底部 Sheet 迁移

### Task 3: 新增 `TextEditor` 测试并迁移底部 sheet

**Files:**
- Modify: `app/tailwind.config.js`
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/TextEditor.tsx`
- Create: `app/src/components/__tests__/TextEditor.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定底部 sheet 和保存禁用态**

在 `app/src/components/__tests__/TextEditor.test.tsx` 新建测试，至少覆盖：

```ts
it('renders the existing bottom sheet shell when visible', () => {
  const screen = render(<TextEditor visible onSave={jest.fn()} onCancel={jest.fn()} />);

  expect(screen.getByTestId('text-editor-sheet')).toBeTruthy();
  expect(screen.getByText('添加文字记录')).toBeTruthy();
});

it('keeps save disabled until content is entered', () => {
  const screen = render(<TextEditor visible onSave={jest.fn()} onCancel={jest.fn()} />);

  const saveButton = screen.getByTestId('text-editor-save-button');
  expect(saveButton.props.accessibilityState?.disabled ?? saveButton.props.disabled).toBe(true);

  fireEvent.changeText(screen.getByTestId('text-editor-content-input'), '新的记录');
  expect(screen.getByTestId('text-editor-save-button').props.disabled).toBe(false);
});

it('clears local draft state when cancelled', () => {
  const onCancel = jest.fn();
  const screen = render(<TextEditor visible onSave={jest.fn()} onCancel={onCancel} />);

  fireEvent.changeText(screen.getByTestId('text-editor-content-input'), '草稿');
  fireEvent.changeText(screen.getByTestId('text-editor-tags-input'), '生活');
  fireEvent.press(screen.getByText('取消'));

  expect(onCancel).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/TextEditor.test.tsx`

Expected: FAIL，原因应包含 `text-editor-sheet`、`text-editor-content-input` 或 `text-editor-save-button` 尚不存在。

- [ ] **Step 3: 最小实现 `TextEditor` NativeWind 迁移**

如果底部 sheet 仍缺 token，就在 `app/tailwind.config.js` 补最小语义 token，优先覆盖：

- sheet 表面
- 浅灰输入背景
- footer 分隔线
- 禁用按钮背景 / 文案

可接受的方向示例：

```js
colors: {
  sheet: {
    surface: '#FFFFFF',
    muted: '#F5F5F5',
    disabled: '#D1D1D1',
  },
}
```

在 `app/src/components/TextEditor.tsx`：

- 删除 `StyleSheet.create`
- 把 `editor`、`header`、`contentContainer`、`typeTag`、`section`、`footer`、`button`、`commonChip`、`suggestionChip` 等静态样式迁到 `className`
- 保留：
  - `Modal`
  - `KeyboardAvoidingView`
  - backdrop
  - 保存按钮禁用态的最小条件分支
  - 必要的阴影或尺寸对象样式（仅在 `className` 无法稳定表达时）
- 补以下 `testID`：
  - `text-editor-sheet`
  - `text-editor-content-input`
  - `text-editor-tags-input`
  - `text-editor-save-button`

- [ ] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/TextEditor.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/TextEditor.tsx`

然后跑：

Run: `cd app && npm run lint -- src/components/TextEditor.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/tailwind.config.js app/eslint/style-guard-allowlist.js app/src/components/TextEditor.tsx app/src/components/__tests__/TextEditor.test.tsx
git commit -m "refactor: migrate text editor to nativewind"
```

## Chunk 4: 文档回填与全量验收

### Task 4: 回填 spec / plan 状态并完成全量验证

**Files:**
- Modify: `docs/superpowers/specs/2026-03-23-search-edit-nativewind-migration-design.md`
- Modify: `docs/superpowers/plans/2026-03-23-search-edit-nativewind-migration.md`

- [ ] **Step 1: 先跑第二批相关测试集合**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath \
  src/components/__tests__/SearchOverlay.test.tsx \
  src/components/__tests__/EntryEditor.test.tsx \
  src/components/__tests__/TextEditor.test.tsx
```

Expected: PASS

- [ ] **Step 2: 跑静态检查与全量测试**

Run: `cd app && npm run lint`
Expected: PASS

Run: `cd app && npm run typecheck`
Expected: PASS

Run: `cd app && npm test -- --runInBand`
Expected: PASS

- [ ] **Step 3: 回填文档执行结果**

在 spec 与 plan 中补：

- 当前状态
- 实际新增 / 修改文件
- 验证命令及结果
- 若实现与计划有轻微偏差，记录原因

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-03-23-search-edit-nativewind-migration-design.md docs/superpowers/plans/2026-03-23-search-edit-nativewind-migration.md
git commit -m "docs: backfill search edit nativewind migration"
```

## 本地结构化 Review 结论

- 已按 chunk 检查文件边界、测试顺序、allowlist 收口点和最终验收命令
- 每个组件都可以独立完成“失败测试 -> 最小实现 -> lint 收口 -> 提交”的闭环
- 未发现阻塞执行的问题
