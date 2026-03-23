# 设置与账号链路 NativeWind 第五批迁移 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不重做设置页视觉和业务流程的前提下，把 `LoginPage`、`TagManagementPage`、`SettingsPage` 迁到 `NativeWind`，并继续收紧样式守卫 allowlist。

**Architecture:** 本轮按“最简单表单页 -> 拖拽管理页 -> 主设置页”三个层次分块迁移。每块都先写失败测试，再做最小实现，迁完立刻从 allowlist 中移除对应文件，最后统一跑 lint、typecheck 和全量测试并回填文档状态。

**Tech Stack:** React Native, Expo Router, NativeWind 4, Tailwind CSS, Jest, Testing Library, React Native Animated, PanResponder

**Spec:** `docs/superpowers/specs/2026-03-23-settings-account-nativewind-migration-design.md`

**Status:** 已完成实现、验证与文档回填

---

## 变更记录

- 2026-03-23：基于已批准 spec 创建第五批实现计划，范围固定为 `LoginPage`、`TagManagementPage`、`SettingsPage`。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 plan review 先采用本地结构化 review，并在文档中留痕。
- 2026-03-23：已完成本地结构化 review，未发现阻塞执行的问题。
- 2026-03-23：Chunk 1 完成，提交 `fae9bcd refactor: migrate login page to nativewind`。
- 2026-03-23：Chunk 2 完成，提交 `9990099 refactor: migrate tag management page to nativewind`。
- 2026-03-23：Chunk 3 完成，提交 `b2010c4 refactor: migrate settings page to nativewind`。
- 2026-03-23：Chunk 4 完成，第五批相关测试、全量 lint、typecheck 与全量测试全部通过。

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| 无 | 本轮仅扩充现有测试文件，不新增独立测试文件 |

### Modified Files

| File | Change |
|------|--------|
| `app/eslint/style-guard-allowlist.js` | 每完成一个迁移块就移除对应 legacy 文件，继续收紧守卫 |
| `app/src/components/LoginPage.tsx` | 把登录/注册页静态壳层迁到 `NativeWind`，保留提交校验与 loading 逻辑 |
| `app/src/components/TagManagementPage.tsx` | 把预制标签管理页静态壳层迁到 `NativeWind`，保留拖拽排序与输入逻辑 |
| `app/src/components/SettingsPage.tsx` | 把主设置页静态壳层和选择器迁到 `NativeWind`，保留业务回调和子页入口 |
| `app/src/components/__tests__/LoginPage.test.tsx` | 扩充登录页根壳层与模式切换断言 |
| `app/src/components/__tests__/TagManagementPage.test.tsx` | 扩充预制标签管理页根壳层与容器断言 |
| `app/src/components/__tests__/SettingsPage.test.tsx` | 扩充设置页根壳层与存储卡片断言 |
| `docs/superpowers/specs/2026-03-23-settings-account-nativewind-migration-design.md` | 实现完成后回填状态、验证结果与偏差说明 |
| `docs/superpowers/plans/2026-03-23-settings-account-nativewind-migration.md` | 执行过程中勾选任务、记录验证结果和收口状态 |

## 执行约束

- 三个组件的展示形态必须保持原样：
  - `LoginPage` 仍是简单的登录 / 注册表单
  - `TagManagementPage` 仍是可拖拽排序的预制标签管理页
  - `SettingsPage` 仍按“账户 / 通知 / 数据 / 存储 / 其他”分区展示
- 不能改现有入口关系：
  - `Sidebar` 继续拉起 `SettingsPage`
  - `SettingsPage` 继续拉起 `LoginPage` 和 `TagManagementPage`
- 只迁静态视觉表达；`Alert`、`Switch`、运行时尺寸、拖拽位移、动画值允许继续使用 `style`
- 不在组件内部新增新的十六进制颜色；优先复用已有 token，确实不够时才用最小 arbitrary classes 维持现状
- 每完成一个组件迁移，就从 allowlist 中删除对应文件，避免“迁完仍长期放行”

## Chunk 1: LoginPage 登录页迁移

### Task 1: 扩充 `LoginPage` 测试并迁移登录/注册表单页

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/LoginPage.tsx`
- Modify: `app/src/components/__tests__/LoginPage.test.tsx`

- [x] **Step 1: 先写失败测试，锁定登录页根壳层和模式切换**

在 `app/src/components/__tests__/LoginPage.test.tsx` 增加至少一条断言：

```ts
it('renders the login page shell inside the existing detail shell', () => {
  const screen = render(
    <LoginPage visible={true} onClose={jest.fn()} onSuccess={jest.fn()} />
  );

  expect(screen.getByTestId('login-page-root')).toBeTruthy();
  expect(screen.getByPlaceholderText('邮箱')).toBeTruthy();
  expect(screen.getByText('登录')).toBeTruthy();
});
```

保留现有登录提交与切换注册模式测试。

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/LoginPage.test.tsx`

Expected: FAIL，原因应包含 `login-page-root` 尚不存在。

- [x] **Step 3: 最小实现 `LoginPage` NativeWind 迁移**

在 `app/src/components/LoginPage.tsx`：

- 删除 `StyleSheet.create`
- 保留：
  - `handleSubmit`
  - `resetForm`
  - 登录 / 注册模式切换
  - `Alert`
  - `ActivityIndicator`
- 把静态壳层迁到 `className`：
  - form
  - input
  - hint
  - button / buttonDisabled
  - buttonText
  - switchButton / switchText
- `TextInput` 继续保留 `placeholderTextColor`
- 补以下 `testID`：
  - `login-page-root`

- [x] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/LoginPage.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/LoginPage.tsx`

然后跑：

Run: `cd app && npm run lint -- src/components/LoginPage.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/LoginPage.tsx app/src/components/__tests__/LoginPage.test.tsx
git commit -m "refactor: migrate login page to nativewind"
```

## Chunk 2: TagManagementPage 预制标签管理页迁移

### Task 2: 扩充 `TagManagementPage` 测试并迁移拖拽管理页

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/TagManagementPage.tsx`
- Modify: `app/src/components/__tests__/TagManagementPage.test.tsx`

- [x] **Step 1: 先写失败测试，锁定根壳层与标签容器**

在 `app/src/components/__tests__/TagManagementPage.test.tsx` 增加至少一条断言：

```ts
it('renders the preset tag management shell and tag container', () => {
  const screen = render(<TagManagementPage visible onClose={() => {}} />);

  expect(screen.getByTestId('tag-management-root')).toBeTruthy();
  expect(screen.getByTestId('tag-management-tags-container')).toBeTruthy();
  expect(screen.getByText('恢复初始预制标签')).toBeTruthy();
});
```

保留现有添加标签与拖拽排序测试。

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/TagManagementPage.test.tsx`

Expected: FAIL，原因应包含 `tag-management-root` 或 `tag-management-tags-container` 尚不存在。

- [x] **Step 3: 最小实现 `TagManagementPage` NativeWind 迁移**

在 `app/src/components/TagManagementPage.tsx`：

- 删除 `StyleSheet.create`
- 保留：
  - `Animated.Value`
  - `PanResponder`
  - `ROW_HEIGHT`
  - `LONG_PRESS_MS`
  - 拖拽与重排逻辑
  - `scrollEnabled={dragState == null}`
- 把静态壳层迁到 `className`：
  - resetRow
  - sectionHeader / sectionTitle / sectionSubtitle
  - hint
  - tagRow / tagRowActive 可拆成“静态 className + 动态 style”
  - tagLeft / dragHandle / tagName
  - addRow / addInput / addButton
- 继续保留：
  - `positionedRow`
  - `top`
  - `transform: [{ translateY: ... }]`
  - `containerHeight`
- 补以下 `testID`：
  - `tag-management-root`
  - `tag-management-tags-container`

- [x] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/TagManagementPage.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/TagManagementPage.tsx`

然后跑：

Run: `cd app && npm run lint -- src/components/TagManagementPage.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/TagManagementPage.tsx app/src/components/__tests__/TagManagementPage.test.tsx
git commit -m "refactor: migrate tag management page to nativewind"
```

## Chunk 3: SettingsPage 主设置页迁移

### Task 3: 扩充 `SettingsPage` 测试并迁移主设置页

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/SettingsPage.tsx`
- Modify: `app/src/components/__tests__/SettingsPage.test.tsx`

- [x] **Step 1: 先写失败测试，锁定根壳层与存储卡片**

在 `app/src/components/__tests__/SettingsPage.test.tsx` 增加至少一条断言：

```ts
it('renders the settings shell and storage card inside the existing detail shell', async () => {
  const screen = render(<SettingsPage visible onClose={() => {}} />);

  await waitFor(() => {
    expect(screen.getByText('< 0.1 MB')).toBeTruthy();
  });

  expect(screen.getByTestId('settings-page-root')).toBeTruthy();
  expect(screen.getByTestId('settings-section-account')).toBeTruthy();
  expect(screen.getByTestId('settings-storage-card')).toBeTruthy();
});
```

保留现有日历密度切换、预制标签入口、同步状态、云端模式切换等测试。

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/SettingsPage.test.tsx`

Expected: FAIL，原因应包含 `settings-page-root` / `settings-section-account` / `settings-storage-card` 尚不存在。

- [x] **Step 3: 最小实现 `SettingsPage` NativeWind 迁移**

在 `app/src/components/SettingsPage.tsx`：

- 删除 `StyleSheet.create`
- 保留：
  - 所有 `handle*` 回调
  - `Alert`
  - `Switch`
  - `useEffect`
  - store / service 调用
  - `TagManagementPage` 与 `LoginPage` 子页显隐状态
- 把静态壳层迁到 `className`：
  - section
  - sectionTitle
  - settingItem
  - settingIcon / dangerIcon
  - settingContent / settingTitle / settingSubtitle
  - storageInfo / storageRow / storageLabel / storageValue
  - `CalendarDensitySelector`
  - `CardSpacingSelector`
  - `PhotoHeightSelector`
  - `SettingButton`
- 继续保留：
  - `Switch` 的 `trackColor` / `thumbColor`
  - `PhotoHeightSelector` 预览块高度
  - 分段选择器选中态若仍需 style 组合的最小对象样式
- 补以下 `testID`：
  - `settings-page-root`
  - `settings-section-account`
  - `settings-storage-card`

- [x] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/SettingsPage.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/SettingsPage.tsx`

然后跑：

Run: `cd app && npm run lint -- src/components/SettingsPage.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/SettingsPage.tsx app/src/components/__tests__/SettingsPage.test.tsx
git commit -m "refactor: migrate settings page to nativewind"
```

## Chunk 4: 文档回填与全量验收

### Task 4: 回填 spec / plan 状态并完成全量验证

**Files:**
- Modify: `docs/superpowers/specs/2026-03-23-settings-account-nativewind-migration-design.md`
- Modify: `docs/superpowers/plans/2026-03-23-settings-account-nativewind-migration.md`

- [x] **Step 1: 先跑第五批相关测试集合**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath \
  src/components/__tests__/LoginPage.test.tsx \
  src/components/__tests__/TagManagementPage.test.tsx \
  src/components/__tests__/SettingsPage.test.tsx
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
git add docs/superpowers/specs/2026-03-23-settings-account-nativewind-migration-design.md docs/superpowers/plans/2026-03-23-settings-account-nativewind-migration.md
git commit -m "docs: backfill settings account nativewind migration"
```

## 执行结果

- 已完成 `LoginPage`、`TagManagementPage`、`SettingsPage` 的 NativeWind 迁移，并全部从 allowlist 中移除
- 已新增并验证以下测试锚点：
  - `login-page-root`
  - `tag-management-root`
  - `tag-management-tags-container`
  - `settings-page-root`
  - `settings-section-account`
  - `settings-storage-card`
- 已完成 3 次功能提交：
  - `fae9bcd refactor: migrate login page to nativewind`
  - `9990099 refactor: migrate tag management page to nativewind`
  - `b2010c4 refactor: migrate settings page to nativewind`

## 验证记录

- `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/LoginPage.test.tsx`：PASS
- `cd app && npm run lint -- src/components/LoginPage.tsx`：PASS
- `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/TagManagementPage.test.tsx`：PASS
- `cd app && npm run lint -- src/components/TagManagementPage.tsx`：PASS
- `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/SettingsPage.test.tsx`：PASS
- `cd app && npm run lint -- src/components/SettingsPage.tsx`：PASS
- `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/LoginPage.test.tsx src/components/__tests__/TagManagementPage.test.tsx src/components/__tests__/SettingsPage.test.tsx`：PASS，3 个 suite / 13 个测试全部通过
- `cd app && npm run lint`：PASS
- `cd app && npm run typecheck`：PASS
- `cd app && npm test -- --runInBand`：PASS，56 个 suite / 358 个测试全部通过

## 偏差说明

- 无功能性偏差
- `SettingsPage` 额外引入了少量 `className` 字符串常量复用公共卡片样式；这属于样式表达层面的收口，不影响业务逻辑和界面结构

## 本地结构化 Review 结论

- 已按 chunk 检查设置链路边界、测试顺序、allowlist 收口点和最终验收命令
- 每个组件都可以独立完成“失败测试 -> 最小实现 -> lint 收口 -> 提交”的闭环
- 未发现阻塞执行的问题
