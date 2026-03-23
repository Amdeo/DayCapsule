# 详情与操作链路 NativeWind 第三批迁移 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不重做首页视觉和交互的前提下，把首页剩余主路径里的 `TextEntryDetailPage`、`EntryActionSheet`、`CloudSyncStatusButton` 迁到 `NativeWind`，并继续收紧样式守卫 allowlist。

**Architecture:** 本轮按“详情页内容层 -> 动画操作面板 -> 顶部状态按钮”三个独立形态分块迁移。每块都先写失败测试，再做最小实现，迁完立刻从 allowlist 中移除对应文件，最后统一跑 lint、typecheck 和全量测试并回填文档状态。

**Tech Stack:** React Native, Expo Router, NativeWind 4, Tailwind CSS, Jest, Testing Library, React Native Reanimated

**Spec:** `docs/superpowers/specs/2026-03-23-detail-action-nativewind-migration-design.md`

---

## 变更记录

- 2026-03-23：基于已批准 spec 创建第三批实现计划，范围固定为 `TextEntryDetailPage`、`EntryActionSheet`、`CloudSyncStatusButton`。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 plan review 先采用本地结构化 review，并在文档中留痕。
- 2026-03-23：已完成本地结构化 review，未发现阻塞执行的问题。
- 2026-03-23：已按 TDD 顺序完成三个目标组件的 NativeWind 迁移、allowlist 收口与文档回填。

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `app/src/components/__tests__/TextEntryDetailPage.test.tsx` | 锁定文本详情页正文、元信息、标签和编辑按钮交互在迁移后不回归 |

### Modified Files

| File | Change |
|------|--------|
| `app/eslint/style-guard-allowlist.js` | 每完成一个迁移块就移除对应 legacy 文件，继续收紧守卫 |
| `app/src/components/TextEntryDetailPage.tsx` | 把详情页内容层静态壳层迁到 `NativeWind`，保留 `DetailPageShell` 与时间格式逻辑 |
| `app/src/components/EntryActionSheet.tsx` | 把底部操作面板的静态壳层迁到 `NativeWind`，保留动画、手势、模式切换和安全区逻辑 |
| `app/src/components/CloudSyncStatusButton.tsx` | 把状态按钮的静态壳层迁到 `NativeWind`，保留呼吸/旋转动画和状态色分支 |
| `app/src/components/__tests__/EntryActionSheet.test.tsx` | 补面板壳层、确认态与颜色回归断言 |
| `app/src/components/__tests__/CloudSyncStatusButton.test.tsx` | 补按钮壳层与同步中/状态点结构回归断言 |
| `docs/superpowers/specs/2026-03-23-detail-action-nativewind-migration-design.md` | 实现完成后回填状态、验证结果与偏差说明 |
| `docs/superpowers/plans/2026-03-23-detail-action-nativewind-migration.md` | 执行过程中勾选任务、记录验证结果和收口状态 |

## 执行约束

- 三个组件的展示形态必须保持原样：
  - `TextEntryDetailPage` 仍通过 `DetailPageShell` 承载详情页内容
  - `EntryActionSheet` 仍是底部弹出的操作面板
  - `CloudSyncStatusButton` 仍是圆形按钮 + 云图标 + 状态点 / 同步中环
- 不能改现有入口关系：
  - `Timeline.v2` 继续拉起 `TextEntryDetailPage` 和 `CloudSyncStatusButton`
  - `EntryCard` 继续拉起 `EntryActionSheet`
- 只迁静态视觉表达；动画、键盘 / 安全区、运行时尺寸、状态色分支允许继续使用 `style`
- 不在组件内部新增新的十六进制颜色；优先复用已有 token，确实不够时才补最小语义 token
- 每完成一个组件迁移，就从 allowlist 中删除对应文件，避免“迁完仍长期放行”

## Chunk 1: TextEntryDetailPage 内容层迁移

### Task 1: 新增 `TextEntryDetailPage` 测试并迁移详情页内容层

**Files:**
- Create: `app/src/components/__tests__/TextEntryDetailPage.test.tsx`
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/TextEntryDetailPage.tsx`

- [x] **Step 1: 先写失败测试，锁定详情页内容和编辑入口**

在 `app/src/components/__tests__/TextEntryDetailPage.test.tsx` 新建测试。直接 mock [DetailPageShell.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/DetailPageShell.tsx)，让它渲染：

- `title`
- `headerRight`
- `children`

至少覆盖：

```ts
it('renders the text detail content, meta rows and tags inside the existing shell', () => {
  const screen = render(
    <TextEntryDetailPage visible entry={entry} onClose={jest.fn()} onEdit={jest.fn()} />
  );

  expect(screen.getByTestId('text-entry-detail-root')).toBeTruthy();
  expect(screen.getByTestId('text-entry-detail-hero')).toBeTruthy();
  expect(screen.getByText(entry.content)).toBeTruthy();
  expect(screen.getByText('创建时间')).toBeTruthy();
  expect(screen.getByText('最近编辑')).toBeTruthy();
  expect(screen.getByTestId('text-entry-detail-tags')).toBeTruthy();
});

it('calls onEdit with the current entry from the existing header action', () => {
  const onEdit = jest.fn();
  const screen = render(
    <TextEntryDetailPage visible entry={entry} onClose={jest.fn()} onEdit={onEdit} />
  );

  fireEvent.press(screen.getByTestId('text-entry-detail-edit-button'));
  expect(onEdit).toHaveBeenCalledWith(entry);
});
```

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/TextEntryDetailPage.test.tsx`

Expected: FAIL，原因应包含 `text-entry-detail-root` / `text-entry-detail-hero` / `text-entry-detail-tags` 尚不存在。

- [x] **Step 3: 最小实现 `TextEntryDetailPage` NativeWind 迁移**

在 `app/src/components/TextEntryDetailPage.tsx`：

- 删除 `StyleSheet.create`
- 保留 `DetailPageShell`、`formatDateTime()`、`onEdit(entry)` 行为
- 用内部根容器承接原来的 `contentContainerStyle` 间距，不改 `DetailPageShell` 本身
- 把编辑按钮、hero block、meta rows、tags wrap、tag chip 改为 `className`
- 优先复用已存在的 `editor.*`、`copy.*`、`border.editor-soft` 等 token
- 补以下 `testID`：
  - `text-entry-detail-root`
  - `text-entry-detail-hero`
  - `text-entry-detail-tags`

- [x] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/TextEntryDetailPage.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/TextEntryDetailPage.tsx`

然后跑：

Run: `cd app && npm run lint -- src/components/TextEntryDetailPage.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/TextEntryDetailPage.tsx app/src/components/__tests__/TextEntryDetailPage.test.tsx
git commit -m "refactor: migrate text entry detail to nativewind"
```

## Chunk 2: EntryActionSheet 动画面板迁移

### Task 2: 扩充 `EntryActionSheet` 测试并迁移底部操作面板壳层

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/EntryActionSheet.tsx`
- Modify: `app/src/components/__tests__/EntryActionSheet.test.tsx`

- [x] **Step 1: 先写失败测试，锁定面板壳层与确认态**

在 `app/src/components/__tests__/EntryActionSheet.test.tsx` 增加：

```ts
it('renders the bottom sheet panel shell when visible', () => {
  const { getByTestId } = render(<EntryActionSheet {...baseProps} visible={true} />);

  expect(getByTestId('action-sheet-panel')).toBeTruthy();
  expect(getByTestId('action-sheet-option-group')).toBeTruthy();
});

it('keeps the panel shell mounted in confirm mode', () => {
  const { getByTestId } = render(<EntryActionSheet {...baseProps} visible={true} />);

  fireEvent.press(getByTestId('action-sheet-delete'));

  expect(getByTestId('action-sheet-panel')).toBeTruthy();
  expect(getByTestId('action-sheet-handle')).toBeTruthy();
});
```

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/EntryActionSheet.test.tsx`

Expected: FAIL，原因应包含 `action-sheet-panel` 或 `action-sheet-option-group` 尚不存在。

- [x] **Step 3: 最小实现 `EntryActionSheet` NativeWind 迁移**

在 `app/src/components/EntryActionSheet.tsx`：

- 删除 `StyleSheet.create`
- 保留：
  - `Modal`
  - `PanResponder`
  - `translateY` / `backdropOpacity`
  - `ENTRY_ACTION_SHEET_EXIT_DURATION`
  - `menu` / `confirm` 模式切换
  - `insets.bottom`
- 把静态壳层迁到 `className`：
  - 容器底部布局
  - panel
  - option group
  - option row
  - divider
  - cancel button
  - confirm group
- handle 继续保留类型色运行时分支
- overlay/backdrop 的透明度动画继续保留在 `useAnimatedStyle`
- 补以下 `testID`：
  - `action-sheet-panel`
  - `action-sheet-option-group`

- [x] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/EntryActionSheet.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/EntryActionSheet.tsx`

然后跑：

Run: `cd app && npm run lint -- src/components/EntryActionSheet.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/EntryActionSheet.tsx app/src/components/__tests__/EntryActionSheet.test.tsx
git commit -m "refactor: migrate entry action sheet to nativewind"
```

## Chunk 3: CloudSyncStatusButton 状态按钮迁移

### Task 3: 扩充 `CloudSyncStatusButton` 测试并迁移状态按钮壳层

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/CloudSyncStatusButton.tsx`
- Modify: `app/src/components/__tests__/CloudSyncStatusButton.test.tsx`

- [x] **Step 1: 先写失败测试，锁定按钮壳层与同步中结构**

在 `app/src/components/__tests__/CloudSyncStatusButton.test.tsx` 增加：

```ts
it('renders the shared cloud sync button shell for non-hidden states', () => {
  const screen = render(<CloudSyncStatusButton uiState="synced" onPress={jest.fn()} />);

  expect(screen.getByTestId('cloud-sync-button')).toBeTruthy();
  expect(screen.getByTestId('cloud-sync-shell')).toBeTruthy();
});

it('keeps the cloud shell visible while syncing', () => {
  const screen = render(<CloudSyncStatusButton uiState="syncing" onPress={jest.fn()} />);

  expect(screen.getByTestId('cloud-sync-shell')).toBeTruthy();
  expect(screen.getByTestId('cloud-sync-spinner')).toBeTruthy();
});
```

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/CloudSyncStatusButton.test.tsx`

Expected: FAIL，原因应包含 `cloud-sync-shell` 尚不存在。

- [x] **Step 3: 最小实现 `CloudSyncStatusButton` NativeWind 迁移**

在 `app/src/components/CloudSyncStatusButton.tsx`：

- 删除 `StyleSheet.create`
- 保留：
  - `Animated.Value`
  - 呼吸动画与旋转动画
  - spinner ring / status dot 的运行时 transform 与颜色分支
- 把静态壳层迁到 `className`：
  - 外层圆形按钮
  - 云图标容器
  - ring 的非 transform 静态边框尺寸
  - status dot 的静态定位尺寸
- 补以下 `testID`：
  - `cloud-sync-shell`

- [x] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/CloudSyncStatusButton.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/CloudSyncStatusButton.tsx`

然后跑：

Run: `cd app && npm run lint -- src/components/CloudSyncStatusButton.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/CloudSyncStatusButton.tsx app/src/components/__tests__/CloudSyncStatusButton.test.tsx
git commit -m "refactor: migrate cloud sync button to nativewind"
```

## Chunk 4: 文档回填与全量验收

### Task 4: 回填 spec / plan 状态并完成全量验证

**Files:**
- Modify: `docs/superpowers/specs/2026-03-23-detail-action-nativewind-migration-design.md`
- Modify: `docs/superpowers/plans/2026-03-23-detail-action-nativewind-migration.md`

- [x] **Step 1: 先跑第三批相关测试集合**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath \
  src/components/__tests__/TextEntryDetailPage.test.tsx \
  src/components/__tests__/EntryActionSheet.test.tsx \
  src/components/__tests__/CloudSyncStatusButton.test.tsx
```

Expected: PASS

- [x] **Step 2: 跑静态检查与全量测试**

Run: `cd app && npm run lint`
Expected: PASS

Run: `cd app && npm run typecheck`
Expected: PASS

Run: `cd app && npm test -- --runInBand`
Expected: PASS

- [x] **Step 3: 回填文档执行结果**

在 spec 与 plan 中补：

- 当前状态
- 实际新增 / 修改文件
- 验证命令及结果
- 若实现与计划有轻微偏差，记录原因

- [x] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-03-23-detail-action-nativewind-migration-design.md docs/superpowers/plans/2026-03-23-detail-action-nativewind-migration.md
git commit -m "docs: backfill detail action nativewind migration"
```

## 执行结果

- 已完成 `TextEntryDetailPage`、`EntryActionSheet`、`CloudSyncStatusButton` 的静态壳层 NativeWind 迁移，入口关系、动画、手势与业务行为保持不变。
- 已新增 `app/src/components/__tests__/TextEntryDetailPage.test.tsx`，并扩充 `EntryActionSheet.test.tsx`、`CloudSyncStatusButton.test.tsx`。
- 已从 `app/eslint/style-guard-allowlist.js` 移除：
  - `src/components/TextEntryDetailPage.tsx`
  - `src/components/EntryActionSheet.tsx`
  - `src/components/CloudSyncStatusButton.tsx`
- 未新增新的 Tailwind 语义 token；详情页优先复用 `editor.*` / `copy.*` / `border.editor-soft`，动作面板与同步按钮保留原有精确色值并改为 NativeWind arbitrary classes，以避免视觉偏移。

## 验证结果

- `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/TextEntryDetailPage.test.tsx src/components/__tests__/EntryActionSheet.test.tsx src/components/__tests__/CloudSyncStatusButton.test.tsx`：PASS
- `cd app && npm run lint`：PASS
- `cd app && npm run typecheck`：PASS
- `cd app && npm test -- --runInBand`：PASS

## 本地结构化 Review 结论

- 已按 chunk 检查文件边界、测试顺序、allowlist 收口点和最终验收命令
- 每个组件都可以独立完成“失败测试 -> 最小实现 -> lint 收口 -> 提交”的闭环
- 未发现阻塞执行的问题
