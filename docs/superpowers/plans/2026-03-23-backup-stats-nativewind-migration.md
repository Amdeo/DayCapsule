# 备份与统计链路 NativeWind 第六批迁移 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变备份、导入、统计逻辑的前提下，把 `BackupExportSheet`、`BackupPage`、`StatsPage` 迁到 `NativeWind`，并继续收紧样式守卫 allowlist。

**Architecture:** 本轮按“最小底部弹层 -> 带操作流的备份页 -> 纯展示统计页”三个层次分块迁移。每块都先写失败测试，再做最小实现，迁完立刻从 allowlist 中移除对应文件，最后统一跑 lint、typecheck 和全量测试并回填文档状态。

**Tech Stack:** React Native, Expo Router, NativeWind 4, Tailwind CSS, Jest, Testing Library

**Spec:** `docs/superpowers/specs/2026-03-23-backup-stats-nativewind-migration-design.md`

**Status:** 已完成实现、验证与文档回填

---

## 变更记录

- 2026-03-23：基于已批准 spec 创建第六批实现计划，范围固定为 `BackupExportSheet`、`BackupPage`、`StatsPage`。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 plan review 先采用本地结构化 review，并在文档中留痕。
- 2026-03-23：已完成本地结构化 review，未发现阻塞执行的问题。
- 2026-03-23：Chunk 1 完成，提交 `75332b8 refactor: migrate backup export sheet to nativewind`。
- 2026-03-23：Chunk 2 完成，提交 `878d7ab refactor: migrate backup page to nativewind`。
- 2026-03-23：Chunk 3 完成，提交 `4257e25 refactor: migrate stats page to nativewind`。
- 2026-03-23：Chunk 4 完成，第六批相关测试、全量 lint、typecheck 与全量测试全部通过。

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `app/src/components/__tests__/StatsPage.test.tsx` | 锁定统计页根壳层、总览网格与趋势卡，并覆盖基础统计文案 |

### Modified Files

| File | Change |
|------|--------|
| `app/eslint/style-guard-allowlist.js` | 每完成一个迁移块就移除对应 legacy 文件，继续收紧守卫 |
| `app/src/components/BackupExportSheet.tsx` | 把底部导出弹层静态壳层迁到 `NativeWind`，保留 Modal 与安全区占位 |
| `app/src/components/BackupPage.tsx` | 把备份页静态壳层迁到 `NativeWind`，保留导出、导入、保存和 iCloud 提示逻辑 |
| `app/src/components/StatsPage.tsx` | 把统计页卡片、列表和趋势图静态壳层迁到 `NativeWind`，保留统计聚合逻辑 |
| `app/src/components/__tests__/BackupExportSheet.test.tsx` | 扩充导出弹层根壳层断言 |
| `app/src/components/__tests__/BackupPage.test.tsx` | 扩充备份页根壳层、存储卡和 iCloud 卡断言 |
| `docs/superpowers/specs/2026-03-23-backup-stats-nativewind-migration-design.md` | 实现完成后回填状态、验证结果与偏差说明 |
| `docs/superpowers/plans/2026-03-23-backup-stats-nativewind-migration.md` | 执行过程中勾选任务、记录验证结果和收口状态 |

## 执行约束

- 三个组件的展示形态必须保持原样：
  - `BackupExportSheet` 仍是底部导出弹层
  - `BackupPage` 仍按“本地存储 / 本地备份 / 备份历史 / 导入备份 / iCloud 同步”分区展示
  - `StatsPage` 仍按“总览 / 时间维度 / 近6个月趋势 / 常用标签”分区展示
- 不能改现有入口关系：
  - `Sidebar` 继续拉起 `BackupPage` 和 `StatsPage`
  - `BackupPage` 继续拉起 `BackupExportSheet`
- 只迁静态视觉表达；`Alert`、运行时边框、柱图高度、安全区占位允许继续使用 `style`
- 不在组件内部新增新的视觉结构；优先复用现有 token，确实不够时才用最小 arbitrary classes 维持现状
- 每完成一个组件迁移，就从 allowlist 中删除对应文件，避免“迁完仍长期放行”

## Chunk 1: BackupExportSheet 导出弹层迁移

### Task 1: 扩充 `BackupExportSheet` 测试并迁移导出弹层

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/BackupExportSheet.tsx`
- Modify: `app/src/components/__tests__/BackupExportSheet.test.tsx`

- [x] **Step 1: 先写失败测试，锁定弹层根壳层**

在 `app/src/components/__tests__/BackupExportSheet.test.tsx` 增加至少一条断言：

```ts
it('renders the export sheet shell when visible', () => {
  const screen = render(<BackupExportSheet {...baseProps} />);

  expect(screen.getByTestId('backup-export-sheet')).toBeTruthy();
  expect(screen.getByText('导出备份')).toBeTruthy();
});
```

保留现有保存和关闭回调测试。

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/BackupExportSheet.test.tsx`

Expected: FAIL，原因应包含 `backup-export-sheet` 尚不存在。

- [x] **Step 3: 最小实现 `BackupExportSheet` NativeWind 迁移**

在 `app/src/components/BackupExportSheet.tsx`：

- 删除 `StyleSheet.create`
- 保留：
  - `Modal`
  - `onRequestClose`
  - 遮罩点击关闭
  - `insets.bottom`
- 把静态壳层迁到 `className`：
  - container
  - backdrop
  - sheetWrap / sheet
  - handle
  - title / subtitle
  - actionButton / actionText
  - cancelButton / cancelText
- `StyleSheet.absoluteFill` 改为 `className="absolute inset-0"`
- 补以下 `testID`：
  - `backup-export-sheet`

- [x] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/BackupExportSheet.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/BackupExportSheet.tsx`

然后跑：

Run: `cd app && pnpm run lint -- src/components/BackupExportSheet.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/BackupExportSheet.tsx app/src/components/__tests__/BackupExportSheet.test.tsx
git commit -m "refactor: migrate backup export sheet to nativewind"
```

## Chunk 2: BackupPage 备份页迁移

### Task 2: 扩充 `BackupPage` 测试并迁移备份页

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/BackupPage.tsx`
- Modify: `app/src/components/__tests__/BackupPage.test.tsx`

- [x] **Step 1: 先写失败测试，锁定页面根壳层和关键卡片**

在 `app/src/components/__tests__/BackupPage.test.tsx` 增加至少一条断言：

```ts
it('renders the backup page shell and key cards', async () => {
  const screen = render(<BackupPage visible onClose={jest.fn()} />);

  await waitFor(() => {
    expect(screen.getByText('本地存储')).toBeTruthy();
  });

  expect(screen.getByTestId('backup-page-root')).toBeTruthy();
  expect(screen.getByTestId('backup-page-storage-card')).toBeTruthy();
  expect(screen.getByTestId('backup-page-icloud-card')).toBeTruthy();
});
```

保留现有导出、保存到文件和历史分享流转测试。

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/BackupPage.test.tsx`

Expected: FAIL，原因应包含 `backup-page-root` / `backup-page-storage-card` / `backup-page-icloud-card` 尚不存在。

- [x] **Step 3: 最小实现 `BackupPage` NativeWind 迁移**

在 `app/src/components/BackupPage.tsx`：

- 删除 `StyleSheet.create`
- 保留：
  - `refreshBackupInfo`
  - `handleExport`
  - `handleSaveToFiles`
  - `handleImport`
  - `Alert`
  - `BackupExportSheet` 的显隐控制
- 把静态壳层迁到 `className`：
  - sectionTitle
  - infoCard
  - row / rowLabel / rowValue
  - actionCard / actionIcon / actionContent / actionTitle / actionSubtitle
  - actionButton / actionButtonDisabled / actionButtonText
  - iCloudCard / iCloudHeader / iCloudTitle / iCloudText / iCloudHighlight
- 继续保留：
  - 备份历史最后一行 `borderBottomWidth: 0`
  - iCloud 可用性对应的动态颜色
  - 导出中 / 导入中按钮运行时状态
- 补以下 `testID`：
  - `backup-page-root`
  - `backup-page-storage-card`
  - `backup-page-icloud-card`

- [x] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/BackupPage.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/BackupPage.tsx`

然后跑：

Run: `cd app && pnpm run lint -- src/components/BackupPage.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/BackupPage.tsx app/src/components/__tests__/BackupPage.test.tsx
git commit -m "refactor: migrate backup page to nativewind"
```

## Chunk 3: StatsPage 统计页迁移

### Task 3: 新增 `StatsPage` 测试并迁移统计页

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Create: `app/src/components/__tests__/StatsPage.test.tsx`
- Modify: `app/src/components/StatsPage.tsx`

- [x] **Step 1: 先写失败测试，锁定根壳层、总览网格和趋势卡**

新增 `app/src/components/__tests__/StatsPage.test.tsx`，至少包含：

```ts
it('renders the stats page shell and trend card', () => {
  const screen = render(<StatsPage visible onClose={() => {}} />);

  expect(screen.getByTestId('stats-page-root')).toBeTruthy();
  expect(screen.getByTestId('stats-overview-grid')).toBeTruthy();
  expect(screen.getByTestId('stats-trend-card')).toBeTruthy();
  expect(screen.getByText('总览')).toBeTruthy();
});
```

同时补一条覆盖语音总时长或标签统计的断言。

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/StatsPage.test.tsx`

Expected: FAIL，原因应包含 `stats-page-root` / `stats-overview-grid` / `stats-trend-card` 尚不存在。

- [x] **Step 3: 最小实现 `StatsPage` NativeWind 迁移**

在 `app/src/components/StatsPage.tsx`：

- 删除 `StyleSheet.create`
- 保留：
  - `useMemo` 里的统计聚合逻辑
  - `formatDuration`
  - 趋势条高度计算
- 把静态壳层迁到 `className`：
  - sectionTitle
  - grid
  - statCard / statIcon / statContent / statValue / statLabel
  - infoCard
  - row / rowLabel / rowValue
  - barChart / barItem / barCount / barTrack / barLabel
  - bottomPadding
- 继续保留：
  - `StatCard` 左边框颜色与图标底色
  - 趋势条高度
- 补以下 `testID`：
  - `stats-page-root`
  - `stats-overview-grid`
  - `stats-trend-card`

- [x] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/StatsPage.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/StatsPage.tsx`

然后跑：

Run: `cd app && pnpm run lint -- src/components/StatsPage.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/StatsPage.tsx app/src/components/__tests__/StatsPage.test.tsx
git commit -m "refactor: migrate stats page to nativewind"
```

## Chunk 4: 文档回填与全量验收

### Task 4: 回填 spec / plan 状态并完成全量验证

**Files:**
- Modify: `docs/superpowers/specs/2026-03-23-backup-stats-nativewind-migration-design.md`
- Modify: `docs/superpowers/plans/2026-03-23-backup-stats-nativewind-migration.md`

- [x] **Step 1: 先跑第六批相关测试集合**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath \
  src/components/__tests__/BackupExportSheet.test.tsx \
  src/components/__tests__/BackupPage.test.tsx \
  src/components/__tests__/StatsPage.test.tsx
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
git add docs/superpowers/specs/2026-03-23-backup-stats-nativewind-migration-design.md docs/superpowers/plans/2026-03-23-backup-stats-nativewind-migration.md
git commit -m "docs: backfill backup stats nativewind migration"
```

## 执行结果

- 已完成 `BackupExportSheet`、`BackupPage`、`StatsPage` 的 NativeWind 迁移，并全部从 allowlist 中移除
- 已新增并验证以下测试锚点：
  - `backup-export-sheet`
  - `backup-page-root`
  - `backup-page-storage-card`
  - `backup-page-icloud-card`
  - `stats-page-root`
  - `stats-overview-grid`
  - `stats-trend-card`
- 已新增 `app/src/components/__tests__/StatsPage.test.tsx`，补齐统计页独立测试覆盖
- 已完成 3 次功能提交：
  - `75332b8 refactor: migrate backup export sheet to nativewind`
  - `878d7ab refactor: migrate backup page to nativewind`
  - `4257e25 refactor: migrate stats page to nativewind`

## 验证记录

- `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/BackupExportSheet.test.tsx`：PASS
- `cd app && pnpm run lint -- src/components/BackupExportSheet.tsx`：PASS
- `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/BackupPage.test.tsx`：PASS
- `cd app && pnpm run lint -- src/components/BackupPage.tsx`：PASS
- `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/StatsPage.test.tsx`：PASS
- `cd app && pnpm run lint -- src/components/StatsPage.tsx`：PASS
- `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/BackupExportSheet.test.tsx src/components/__tests__/BackupPage.test.tsx src/components/__tests__/StatsPage.test.tsx`：PASS，3 个 suite / 8 个测试全部通过
- `cd app && pnpm run lint`：PASS
- `cd app && pnpm run typecheck`：PASS
- `cd app && pnpm test --runInBand`：PASS，57 个 suite / 359 个测试全部通过

## 偏差说明

- 无功能性偏差
- `StatsPage` 新增独立测试文件属于计划内补强，不影响运行时逻辑和视觉结构

## 本地结构化 Review 结论

- 已按 chunk 检查备份/统计链路边界、测试现状、allowlist 收口点和最终验收命令
- `BackupExportSheet`、`BackupPage`、`StatsPage` 都可以独立完成“失败测试 -> 最小实现 -> lint 收口 -> 提交”的闭环
- 未发现阻塞执行的问题
