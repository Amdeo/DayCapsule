# 壳层与兜底页 NativeWind 最终批 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变根布局初始化、tabs 路由配置、模板页文案和错误恢复行为的前提下，把剩余 6 个 legacy 文件迁到 `NativeWind`，并让样式守卫 allowlist 清零。

**Architecture:** 本轮按“模板页 -> ErrorBoundary -> tabs layout -> root layout”四个层次收尾。每块都先写失败测试，再做最小实现，迁完立刻从 allowlist 中移除对应文件，最后统一跑 lint、typecheck 和全量测试并回填文档状态。

**Tech Stack:** Expo Router, React Native, NativeWind 4, Tailwind CSS, Jest, Testing Library

**Spec:** `docs/superpowers/specs/2026-03-23-shell-fallback-nativewind-migration-design.md`

---

## 变更记录

- 2026-03-23：基于已批准 spec 创建最终批实现计划，范围固定为 `app/app/_layout.tsx`、`app/app/(tabs)/_layout.tsx`、`app/app/(tabs)/two.tsx`、`app/app/+not-found.tsx`、`app/app/modal.tsx`、`src/components/ErrorBoundary.tsx`。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 plan review 先采用本地结构化 review，并在文档中留痕。
- 2026-03-23：已完成本地结构化 review，未发现阻塞执行的问题。

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `app/app/__tests__/shell-fallback-pages.test.tsx` | 锁定模板页根壳层与基础文案 |
| `app/app/(tabs)/__tests__/_layout.test.tsx` | 锁定 tabs layout 的图标壳层输出 |
| `app/src/components/__tests__/ErrorBoundary.test.tsx` | 锁定 ErrorBoundary 报错态壳层与重试按钮 |

### Modified Files

| File | Change |
|------|--------|
| `app/eslint/style-guard-allowlist.js` | 最终清空剩余 legacy 文件与基线 |
| `app/app/(tabs)/two.tsx` | 把模板 tab 页壳层迁到 `NativeWind` |
| `app/app/+not-found.tsx` | 把 not-found 页壳层迁到 `NativeWind` |
| `app/app/modal.tsx` | 把模板 modal 页壳层迁到 `NativeWind` |
| `app/src/components/ErrorBoundary.tsx` | 把错误兜底页壳层迁到 `NativeWind`，保留上报与重试逻辑 |
| `app/app/(tabs)/_layout.tsx` | 把 tab icon 的静态样式迁到 `NativeWind` 壳层表达 |
| `app/app/__tests__/_layout.photo-upload.test.tsx` | 扩充根布局壳层断言，保留原有 photo upload 回归保护 |
| `app/app/_layout.tsx` | 把根布局最外层静态 style 迁到 `NativeWind` |
| `docs/superpowers/specs/2026-03-23-shell-fallback-nativewind-migration-design.md` | 实现完成后回填状态、验证结果与偏差说明 |
| `docs/superpowers/plans/2026-03-23-shell-fallback-nativewind-migration.md` | 执行过程中勾选任务、记录验证结果和最终清零状态 |

## 执行约束

- 六个文件的页面/壳层结构必须保持原样：
  - `two.tsx`、`+not-found.tsx`、`modal.tsx` 仍维持现有模板结构
  - `ErrorBoundary` 仍显示标题、错误信息和重试按钮
  - `app/app/(tabs)/_layout.tsx` 仍只有 `index`、`two` 两个 screen
  - `app/app/_layout.tsx` 仍按现有顺序包裹 `GestureHandlerRootView -> SafeAreaProvider -> ErrorBoundary -> ThemeProvider -> Stack`
- 不能改现有业务行为：
  - 根布局初始化和监听逻辑保持不变
  - tabs 路由和 `tabBarStyle: { display: 'none' }` 保持不变
  - `StatusBar` 平台逻辑、`Link href="/"`、`EditScreenInfo` 调用保持不变
  - `ErrorBoundary` 的 Sentry 上报和 `handleReset` 保持不变
- 只迁静态视觉表达；导航配置对象、平台判断和异步初始化逻辑允许原样保留
- 最终完成后 `style-guard-allowlist.js` 的 `legacyFiles` 应为空数组

## Chunk 1: 模板页迁移

### Task 1: 新增模板页测试并迁移 `two.tsx`、`+not-found.tsx`、`modal.tsx`

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Create: `app/app/__tests__/shell-fallback-pages.test.tsx`
- Modify: `app/app/(tabs)/two.tsx`
- Modify: `app/app/+not-found.tsx`
- Modify: `app/app/modal.tsx`

- [ ] **Step 1: 先写失败测试，锁定 3 个模板页根壳层**

新增 `app/app/__tests__/shell-fallback-pages.test.tsx`，至少覆盖：

- `tab-two-root`
- `not-found-root`
- `modal-root`

并保留现有模板文案断言。

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath app/__tests__/shell-fallback-pages.test.tsx`

Expected: FAIL，原因应包含上述 testID 尚不存在。

- [ ] **Step 3: 最小实现模板页 NativeWind 迁移**

在 `app/app/(tabs)/two.tsx`、`app/app/+not-found.tsx`、`app/app/modal.tsx`：

- 删除 `StyleSheet.create`
- 把静态壳层迁到 `className`
- 补以下 `testID`：
  - `tab-two-root`
  - `not-found-root`
  - `modal-root`

- [ ] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath app/__tests__/shell-fallback-pages.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `app/(tabs)/two.tsx`
- `app/+not-found.tsx`
- `app/modal.tsx`

然后跑：

Run: `cd app && npm run lint -- app/(tabs)/two.tsx app/+not-found.tsx app/modal.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/app/(tabs)/two.tsx app/app/+not-found.tsx app/app/modal.tsx app/app/__tests__/shell-fallback-pages.test.tsx
git commit -m "refactor: migrate shell fallback pages to nativewind"
```

## Chunk 2: ErrorBoundary 迁移

### Task 2: 新增 `ErrorBoundary` 测试并迁移错误兜底组件

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Create: `app/src/components/__tests__/ErrorBoundary.test.tsx`
- Modify: `app/src/components/ErrorBoundary.tsx`

- [ ] **Step 1: 先写失败测试，锁定报错态壳层和重试按钮**

新增 `app/src/components/__tests__/ErrorBoundary.test.tsx`，至少覆盖：

- 渲染抛错子组件后能找到 `error-boundary-root`
- 显示错误信息
- 点击 `error-boundary-reset` 后恢复正常内容

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/ErrorBoundary.test.tsx`

Expected: FAIL，原因应包含 `error-boundary-root` / `error-boundary-reset` 尚不存在。

- [ ] **Step 3: 最小实现 `ErrorBoundary` NativeWind 迁移**

在 `app/src/components/ErrorBoundary.tsx`：

- 删除 `StyleSheet.create`
- 保留：
  - `getDerivedStateFromError`
  - `componentDidCatch`
  - `handleReset`
- 把静态壳层迁到 `className`
- 补以下 `testID`：
  - `error-boundary-root`
  - `error-boundary-reset`

- [ ] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/ErrorBoundary.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/ErrorBoundary.tsx`

然后跑：

Run: `cd app && npm run lint -- src/components/ErrorBoundary.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/ErrorBoundary.tsx app/src/components/__tests__/ErrorBoundary.test.tsx
git commit -m "refactor: migrate error boundary to nativewind"
```

## Chunk 3: Tabs Layout 迁移

### Task 3: 新增 tabs layout 测试并迁移 `app/app/(tabs)/_layout.tsx`

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Create: `app/app/(tabs)/__tests__/_layout.test.tsx`
- Modify: `app/app/(tabs)/_layout.tsx`

- [ ] **Step 1: 先写失败测试，锁定 tab icon 壳层**

新增 `app/app/(tabs)/__tests__/_layout.test.tsx`，mock `Tabs` 后至少覆盖：

- 调用 `tabBarIcon` 时能找到 `tab-layout-icon-list`
- 调用 `tabBarIcon` 时能找到 `tab-layout-icon-gear`

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath app/(tabs)/__tests__/_layout.test.tsx`

Expected: FAIL，原因应包含 icon testID 尚不存在。

- [ ] **Step 3: 最小实现 tabs layout NativeWind 迁移**

在 `app/app/(tabs)/_layout.tsx`：

- 去掉 `FontAwesome` 的静态 `style`
- 用外层 `View className` 表达 `marginBottom: -3`
- 补图标壳层 `testID`

- [ ] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath app/(tabs)/__tests__/_layout.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `app/(tabs)/_layout.tsx`

然后跑：

Run: `cd app && npm run lint -- app/(tabs)/_layout.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/app/(tabs)/_layout.tsx app/app/(tabs)/__tests__/_layout.test.tsx
git commit -m "refactor: migrate tabs layout to nativewind"
```

## Chunk 4: Root Layout 迁移

### Task 4: 扩充 `_layout.photo-upload` 测试并迁移 `app/app/_layout.tsx`

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/app/__tests__/_layout.photo-upload.test.tsx`
- Modify: `app/app/_layout.tsx`

- [ ] **Step 1: 先写失败测试，锁定根布局壳层**

在 `app/app/__tests__/_layout.photo-upload.test.tsx` 增加至少一条断言：

```ts
expect(screen.getByTestId('root-layout-shell')).toBeTruthy();
```

必要时调整 `GestureHandlerRootView` mock，使其能透传 `testID`。

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath app/__tests__/_layout.photo-upload.test.tsx`

Expected: FAIL，原因应包含 `root-layout-shell` 尚不存在。

- [ ] **Step 3: 最小实现 root layout NativeWind 迁移**

在 `app/app/_layout.tsx`：

- 保留全部初始化、副作用和路由逻辑
- 仅把 `GestureHandlerRootView style={{ flex: 1 }}` 改成 `className="flex-1"`
- 补 `testID="root-layout-shell"`

- [ ] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath app/__tests__/_layout.photo-upload.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `app/_layout.tsx`

然后跑：

Run: `cd app && npm run lint -- app/_layout.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/app/_layout.tsx app/app/__tests__/_layout.photo-upload.test.tsx
git commit -m "refactor: migrate root layout to nativewind"
```

## Chunk 5: 文档回填与最终验收

### Task 5: 回填 spec / plan 状态并完成最终验证

**Files:**
- Modify: `docs/superpowers/specs/2026-03-23-shell-fallback-nativewind-migration-design.md`
- Modify: `docs/superpowers/plans/2026-03-23-shell-fallback-nativewind-migration.md`

- [ ] **Step 1: 先跑最终批相关测试集合**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath \
  app/__tests__/shell-fallback-pages.test.tsx \
  src/components/__tests__/ErrorBoundary.test.tsx \
  app/(tabs)/__tests__/_layout.test.tsx \
  app/__tests__/_layout.photo-upload.test.tsx
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
- allowlist 已清零
- 若实现与计划有轻微偏差，记录原因

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-03-23-shell-fallback-nativewind-migration-design.md docs/superpowers/plans/2026-03-23-shell-fallback-nativewind-migration.md
git commit -m "docs: backfill shell fallback nativewind migration"
```

## 本地结构化 Review 结论

- 已按 chunk 检查最终批边界、现有测试基线、allowlist 清零路径和最终验收命令
- 6 个剩余文件都可以独立完成“失败测试 -> 最小实现 -> lint 收口 -> 提交”的闭环
- 未发现阻塞执行的问题
