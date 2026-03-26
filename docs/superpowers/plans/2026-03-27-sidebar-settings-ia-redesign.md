# 侧边菜单与设置页信息架构重组 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把侧边菜单收敛成 `统计 / 备份与同步 / 设置` 三个一级入口，并把 `标签管理 / 帮助与反馈 / 关于` 统一回收到重组后的设置页中，同时补上新的摘要卡与分组结构。

**Architecture:** 本轮按“菜单收口 -> 设置入口迁移 -> 摘要与视觉增强 -> 回归验证”四段执行。先用失败测试锁定新的入口关系，再最小化调整侧栏状态和设置页分组，最后补顶部摘要卡与视觉层级，确保业务逻辑不变、只重构 IA 与呈现方式。

**Tech Stack:** React Native, Expo Router, TypeScript, Jest, React Native Testing Library, React Native Reanimated

**Spec:** `docs/superpowers/specs/2026-03-27-sidebar-settings-ia-redesign.md`

**Status:** 待执行

---

## 变更记录

- 2026-03-27：基于已批准 spec 创建实现计划，范围固定为侧边菜单、设置页分组、设置页支持入口和顶部摘要卡。
- 2026-03-27：当前会话未显式授权使用子代理 review，本轮 plan review 采用本地结构化 review 留痕。

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `app/src/components/settings-page/SettingsOverviewCard.tsx` | 承载设置页顶部摘要卡，集中展示账号、同步模式、后端地址和存储概览 |

### Modified Files

| File | Change |
|------|--------|
| `app/app/(tabs)/index.tsx` | 收口侧栏页级显隐状态，只保留 `settings / stats / backup` |
| `app/src/components/Sidebar.tsx` | 继承新的 `SidebarPageStateProps`，删除已迁出菜单的显隐 props |
| `app/src/components/sidebar/sidebarConfig.ts` | 菜单项收敛为 3 个入口，并新增副标题字段 |
| `app/src/components/sidebar/SidebarPanel.tsx` | 渲染新的菜单项卡片结构、副标题和系统入口分隔 |
| `app/src/components/sidebar/Sidebar.styles.ts` | 调整菜单卡片、标题区、分隔和系统入口视觉层级 |
| `app/src/components/sidebar/useSidebarController.ts` | 更新 action 映射，只处理 `settings / stats / backup` |
| `app/src/components/sidebar/SidebarPages.tsx` | 只从侧栏直接挂载 `SettingsPage / StatsPage / BackupPage` |
| `app/src/components/SettingsPage.tsx` | 新增 `showHelp / showAbout` 本地状态，连接设置页内支持入口与对话壳层 |
| `app/src/components/settings-page/SettingsPageDialogs.tsx` | 在设置页内挂载 `HelpPage` 和 `AboutPage` |
| `app/src/components/settings-page/SettingsPageContent.tsx` | 重排 section 顺序，迁移入口位置，接入顶部摘要卡与支持分组 |
| `app/src/components/settings-page/SettingsSection.tsx` | 更新 section 标题到 testID 的映射，覆盖新分组名称 |
| `app/src/components/settings-page/SettingsStorageInfo.tsx` | 调整为数据与存储组内的摘要卡风格 |
| `app/src/components/settings-page/SettingsPage.styles.ts` | 为顶部摘要卡、分组卡片、支持区和危险区补充样式 |
| `app/src/components/__tests__/Sidebar.test.tsx` | 锁定新菜单结构、已移除入口和页面挂载关系 |
| `app/src/components/__tests__/SettingsPage.test.tsx` | 锁定新分组结构、支持入口、顶部摘要卡和标签管理入口 |
| `docs/superpowers/specs/2026-03-27-sidebar-settings-ia-redesign.md` | 实现完成后回填状态、验证结果和偏差说明 |
| `docs/superpowers/plans/2026-03-27-sidebar-settings-ia-redesign.md` | 执行时勾选步骤并记录验证结果 |

## 执行约束

- 不改 `StatsPage`、`BackupPage`、`HelpPage`、`AboutPage`、`TagManagementPage` 的内部业务逻辑。
- 不改设置页中的登录 / 登出、云端模式、后端连接测试、缓存清理、重置设置等行为，仅调整入口归属和视觉结构。
- 继续保持设置页为单页滚动，不引入新的导航栈或复杂多级路由。
- 每个任务都先写失败测试，再做最小实现；新增视觉结构必须配套稳定 `testID` 或可断言文本。
- 每个任务完成后都跑对应的目标测试，最后再跑整体回归。

## Chunk 1: 侧边菜单收口为 3 个一级入口

### Task 1: 用失败测试锁定新的菜单项与挂载关系

**Files:**
- Modify: `app/src/components/__tests__/Sidebar.test.tsx`
- Modify: `app/src/components/sidebar/sidebarConfig.ts`
- Modify: `app/src/components/sidebar/SidebarPanel.tsx`
- Modify: `app/src/components/sidebar/useSidebarController.ts`
- Modify: `app/src/components/sidebar/SidebarPages.tsx`
- Modify: `app/src/components/Sidebar.tsx`
- Modify: `app/app/(tabs)/index.tsx`

- [ ] **Step 1: 写失败测试，锁定菜单只剩 3 个一级入口**

在 `app/src/components/__tests__/Sidebar.test.tsx` 增加断言，明确：

```ts
it('renders only stats, backup and settings entries in the sidebar menu', () => {
  const screen = renderSidebar();

  expect(screen.getByTestId('sidebar-menu-stats')).toBeTruthy();
  expect(screen.getByTestId('sidebar-menu-backup')).toBeTruthy();
  expect(screen.getByTestId('sidebar-menu-settings')).toBeTruthy();

  expect(screen.queryByTestId('sidebar-menu-tags')).toBeNull();
  expect(screen.queryByTestId('sidebar-menu-help')).toBeNull();
  expect(screen.queryByTestId('sidebar-menu-about')).toBeNull();
});
```

再补一条断言，确认点击 `设置`、`统计`、`备份与同步` 时仍只会挂载对应页面。

- [ ] **Step 2: 运行侧栏测试，确认当前实现失败**

Run: `cd app && npm test -- --runInBand --runTestsByPath src/components/__tests__/Sidebar.test.tsx`

Expected: FAIL，原因应包含 `sidebar-menu-tags` / `sidebar-menu-help` / `sidebar-menu-about` 仍然存在。

- [ ] **Step 3: 写最小实现，收口侧栏配置与状态**

按以下最小边界修改：

- `app/src/components/sidebar/sidebarConfig.ts`
  - 删除 `tags`、`help`、`about`
  - 为保留项增加 `description`
- `app/src/components/sidebar/SidebarPanel.tsx`
  - 渲染标题 + 副标题
  - `设置` 前保留系统入口分隔
- `app/src/components/sidebar/useSidebarController.ts`
  - `SidebarAction` 只映射 `settings / stats / backup`
- `app/src/components/sidebar/SidebarPages.tsx`
  - 只保留 `SettingsPage`、`StatsPage`、`BackupPage`
- `app/app/(tabs)/index.tsx`
  - 删除 `showAbout`、`showTags`、`showHelp`
  - `SidebarShell` 只传 3 组显隐状态

目标代码形态：

```ts
const actionSetters: Record<SidebarAction, SidebarSetter> = {
  settings: setShowSettings,
  stats: setShowStats,
  backup: setShowBackup,
};
```

- [ ] **Step 4: 重新运行侧栏测试并补一次类型检查**

Run: `cd app && npm test -- --runInBand --runTestsByPath src/components/__tests__/Sidebar.test.tsx`

Expected: PASS

Run: `cd app && npm run typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/app/\(tabs\)/index.tsx app/src/components/Sidebar.tsx app/src/components/sidebar/sidebarConfig.ts app/src/components/sidebar/SidebarPanel.tsx app/src/components/sidebar/Sidebar.styles.ts app/src/components/sidebar/useSidebarController.ts app/src/components/sidebar/SidebarPages.tsx app/src/components/__tests__/Sidebar.test.tsx
git commit -m "refactor: collapse sidebar IA to three primary entries"
```

## Chunk 2: 把支持与标签入口迁入设置页

### Task 2: 用失败测试锁定新的设置页分组与入口归属

**Files:**
- Modify: `app/src/components/__tests__/SettingsPage.test.tsx`
- Modify: `app/src/components/SettingsPage.tsx`
- Modify: `app/src/components/settings-page/SettingsPageDialogs.tsx`
- Modify: `app/src/components/settings-page/SettingsPageContent.tsx`
- Modify: `app/src/components/settings-page/SettingsSection.tsx`

- [ ] **Step 1: 写失败测试，锁定新的 section 标题和支持入口**

在 `app/src/components/__tests__/SettingsPage.test.tsx` 增加断言，至少覆盖：

```ts
it('renders the regrouped settings sections and support entries', async () => {
  const { screen } = await renderSettingsPage();

  expect(screen.getByText('账户与同步')).toBeTruthy();
  expect(screen.getByText('提醒')).toBeTruthy();
  expect(screen.getByText('内容显示')).toBeTruthy();
  expect(screen.getByText('数据与存储')).toBeTruthy();
  expect(screen.getByText('标签管理')).toBeTruthy();
  expect(screen.getByText('支持')).toBeTruthy();
  expect(screen.getByText('危险操作')).toBeTruthy();

  expect(screen.getByTestId('settings-open-tag-management')).toBeTruthy();
  expect(screen.getByTestId('settings-open-help')).toBeTruthy();
  expect(screen.getByTestId('settings-open-about')).toBeTruthy();
});
```

再补一条断言，点击 `settings-open-help` 和 `settings-open-about` 后能看到对应页面标题。

- [ ] **Step 2: 运行设置页组装测试，确认当前实现失败**

Run: `cd app && npm test -- --runInBand --runTestsByPath src/components/__tests__/SettingsPage.test.tsx`

Expected: FAIL，原因应包含旧 section 名称仍为 `账户 / 通知 / 数据 / 存储 / 其他 / 后端`，且帮助与关于入口尚不存在。

- [ ] **Step 3: 写最小实现，重排设置页入口并接入支持子页**

按以下边界修改：

- `app/src/components/SettingsPage.tsx`
  - 增加 `showHelp`、`showAbout`
  - 传递 `onOpenHelp`、`onOpenAbout`
- `app/src/components/settings-page/SettingsPageDialogs.tsx`
  - 挂载 `HelpPage` 与 `AboutPage`
- `app/src/components/settings-page/SettingsPageContent.tsx`
  - 把 `后端连接` 移入 `账户与同步`
  - 把 `标签管理` 从 `其他` 抽成独立组
  - 新增 `支持` section，包含 `帮助与反馈` 与 `关于`
  - 把 `重置设置` 放到 `危险操作`
- `app/src/components/settings-page/SettingsSection.tsx`
  - 更新 testID 映射：

```ts
const SETTINGS_SECTION_TEST_IDS: Record<string, string> = {
  '账户与同步': 'settings-section-account-sync',
  '提醒': 'settings-section-reminders',
  '内容显示': 'settings-section-display',
  '数据与存储': 'settings-section-data-storage',
  '标签管理': 'settings-section-tags',
  '支持': 'settings-section-support',
  '危险操作': 'settings-section-danger',
};
```

- [ ] **Step 4: 重新运行设置页组装测试**

Run: `cd app && npm test -- --runInBand --runTestsByPath src/components/__tests__/SettingsPage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/components/SettingsPage.tsx app/src/components/settings-page/SettingsPageDialogs.tsx app/src/components/settings-page/SettingsPageContent.tsx app/src/components/settings-page/SettingsSection.tsx app/src/components/__tests__/SettingsPage.test.tsx
git commit -m "refactor: move support and tag entry points into settings"
```

## Chunk 3: 增加顶部摘要卡并重塑数据与存储卡片

### Task 3: 用失败测试锁定设置页摘要卡和存储摘要展示

**Files:**
- Create: `app/src/components/settings-page/SettingsOverviewCard.tsx`
- Modify: `app/src/components/settings-page/SettingsPageContent.tsx`
- Modify: `app/src/components/settings-page/SettingsStorageInfo.tsx`
- Modify: `app/src/components/settings-page/SettingsPage.styles.ts`
- Modify: `app/src/components/__tests__/SettingsPage.test.tsx`

- [ ] **Step 1: 写失败测试，锁定顶部摘要卡**

在 `app/src/components/__tests__/SettingsPage.test.tsx` 增加断言：

```ts
it('renders the settings overview card with account, sync and storage summary', async () => {
  const { screen } = await renderSettingsPage({ authenticated: true });

  expect(screen.getByTestId('settings-overview-card')).toBeTruthy();
  expect(screen.getByText('当前账号')).toBeTruthy();
  expect(screen.getByText('同步模式')).toBeTruthy();
  expect(screen.getByText('当前后端')).toBeTruthy();
  expect(screen.getByText('存储概览')).toBeTruthy();
});
```

如果现有 `settings-storage-card` 继续复用，也补一条断言确认它仍位于 `数据与存储` 组中。

- [ ] **Step 2: 运行设置页测试，确认当前实现失败**

Run: `cd app && npm test -- --runInBand --runTestsByPath src/components/__tests__/SettingsPage.test.tsx`

Expected: FAIL，原因应包含 `settings-overview-card` 尚不存在。

- [ ] **Step 3: 写最小实现，接入摘要卡和存储摘要布局**

新增 `app/src/components/settings-page/SettingsOverviewCard.tsx`，建议接口：

```ts
interface SettingsOverviewCardProps {
  isAuthenticated: boolean;
  userEmail?: string;
  cloudMode: boolean | 'switching';
  currentServerUrl: string;
  usedSpace: string;
}
```

渲染四行摘要：

```tsx
<View testID="settings-overview-card">
  <OverviewRow label="当前账号" value={isAuthenticated ? userEmail ?? '已登录' : '未登录'} />
  <OverviewRow label="同步模式" value={cloudMode === true ? '云端' : cloudMode === 'switching' ? '切换中' : '本地'} />
  <OverviewRow label="当前后端" value={currentServerUrl} />
  <OverviewRow label="存储概览" value={usedSpace} />
</View>
```

然后：

- 在 `SettingsPageContent` 最顶部插入 `SettingsOverviewCard`
- 让 `SettingsStorageInfo` 继续保留统计行，但样式升级成独立摘要卡
- 在 `SettingsPage.styles.ts` 中新增：
  - `overviewCard`
  - `overviewRow`
  - `overviewLabel`
  - `overviewValue`
  - 如有需要，为危险区和支持区增加更明确的间距 / 背景 token

- [ ] **Step 4: 重新运行设置页测试**

Run: `cd app && npm test -- --runInBand --runTestsByPath src/components/__tests__/SettingsPage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/components/settings-page/SettingsOverviewCard.tsx app/src/components/settings-page/SettingsPageContent.tsx app/src/components/settings-page/SettingsStorageInfo.tsx app/src/components/settings-page/SettingsPage.styles.ts app/src/components/__tests__/SettingsPage.test.tsx
git commit -m "feat: add settings overview summary card"
```

## Chunk 4: 视觉收口与全量回归

### Task 4: 调整菜单卡片层级并完成回归验证与文档收口

**Files:**
- Modify: `app/src/components/sidebar/Sidebar.styles.ts`
- Modify: `app/src/components/sidebar/SidebarPanel.tsx`
- Modify: `docs/superpowers/specs/2026-03-27-sidebar-settings-ia-redesign.md`
- Modify: `docs/superpowers/plans/2026-03-27-sidebar-settings-ia-redesign.md`

- [ ] **Step 1: 先补一个侧栏标题 / 副标题断言**

在 `app/src/components/__tests__/Sidebar.test.tsx` 增加对副标题的断言，例如：

```ts
expect(screen.getByText('查看记录、照片、语音概览')).toBeTruthy();
expect(screen.getByText('管理本地备份与云端同步')).toBeTruthy();
expect(screen.getByText('调整账号、显示和存储偏好')).toBeTruthy();
```

- [ ] **Step 2: 运行侧栏测试，确认副标题断言先失败**

Run: `cd app && npm test -- --runInBand --runTestsByPath src/components/__tests__/Sidebar.test.tsx`

Expected: FAIL，原因应包含副标题文本尚未渲染。

- [ ] **Step 3: 完成侧栏视觉收口的最小实现**

在 `SidebarPanel.tsx` / `Sidebar.styles.ts` 中完成：

- 标题区弱化“菜单”单点感，可增加轻说明文本
- 一级入口改成更完整的卡片行
- `设置` 前维持清晰分隔
- 右箭头弱化，图标容器统一

这一步只做视觉层次增强，不再修改导航关系。

- [ ] **Step 4: 跑完整回归**

Run: `cd app && npm test -- --runInBand --runTestsByPath src/components/__tests__/Sidebar.test.tsx src/components/__tests__/SettingsPage.test.tsx`

Expected: PASS

Run: `cd app && npm run test:frontend:settings`

Expected: PASS

Run: `cd app && npm run typecheck`

Expected: PASS

Run: `cd app && npm run lint`

Expected: PASS

并手动验证：

- 菜单里只有 `统计 / 备份与同步 / 设置`
- `帮助与反馈`、`关于` 能从设置页打开
- `标签管理` 仍可从设置页进入
- 设置页的摘要卡、支持区和危险操作区视觉层级清晰

- [ ] **Step 5: 更新文档状态并提交最终收口**

要求：

- 将 spec 状态更新为已实现
- 在本计划中勾选已完成步骤并记录验证结果

```bash
git add app/src/components/sidebar/SidebarPanel.tsx app/src/components/sidebar/Sidebar.styles.ts app/src/components/__tests__/Sidebar.test.tsx docs/superpowers/specs/2026-03-27-sidebar-settings-ia-redesign.md docs/superpowers/plans/2026-03-27-sidebar-settings-ia-redesign.md
git commit -m "refactor: redesign sidebar and settings information architecture"
```

## 最终验证清单

- [ ] `cd app && npm test -- --runInBand --runTestsByPath src/components/__tests__/Sidebar.test.tsx src/components/__tests__/SettingsPage.test.tsx`
- [ ] `cd app && npm run test:frontend:settings`
- [ ] `cd app && npm run typecheck`
- [ ] `cd app && npm run lint`
- [ ] 手动验证菜单只保留 3 个一级入口
- [ ] 手动验证帮助与关于已迁入设置页支持区
- [ ] 手动验证标签管理已迁入设置页且仍可打开
- [ ] 手动验证顶部摘要卡和数据与存储摘要卡视觉层级正确
- [ ] 文档状态已回填

## 本地结构化 Review 结论

- 任务拆分符合“先入口关系、再设置分组、最后视觉收口”的依赖顺序。
- 每个 Chunk 都能独立形成可验证增量，适合按 TDD 小步提交执行。
- 已显式覆盖父层状态收口、设置页 support 子页显隐和摘要卡新增，未遗漏关键边界。
