# 壳层与兜底页 NativeWind 最终批迁移设计

## 状态

- 当前状态：已完成实现并通过验证
- 设计确认日期：2026-03-23
- 实现完成日期：2026-03-23

## 评审记录

- 2026-03-23：已完成第八批“时间轴交互链路”迁移，当前 worktree 继续在 `nativewind-style-guardrails` 上推进最后一批。
- 2026-03-23：已检查剩余 allowlist，确认 `app/app/_layout.tsx`、`app/app/(tabs)/_layout.tsx`、`app/app/(tabs)/two.tsx`、`app/app/+not-found.tsx`、`app/app/modal.tsx`、`src/components/ErrorBoundary.tsx` 构成最后一组壳层与兜底页存量文件。
- 2026-03-23：已确认本轮目标仍然是把现有样式迁到 `NativeWind`，不借迁移之名改导航结构、兜底页语义或错误恢复行为。
- 2026-03-23：用户已明确要求后续自动推进，不再逐项请示；本轮设计基于该授权直接落文并继续 planning。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 spec review 继续采用本地结构化 review 留痕。
- 2026-03-23：最终批 6 个文件已全部迁到 `NativeWind`，`style-guard-allowlist.js` 已清零。
- 2026-03-23：最终批相关测试、全量 lint、typecheck 与全量测试均已通过。

## 背景

前八批迁移已经完成首页壳层、搜索编辑链路、详情操作链路、侧栏二级页共享壳层、设置与账号链路、备份与统计链路、媒体查看与录音链路，以及时间轴交互链路的 NativeWind 收口。

当前 allowlist 剩余的 6 个文件是：

- [app/app/_layout.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/_layout.tsx)
- [app/app/(tabs)/_layout.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/(tabs)/_layout.tsx)
- [app/app/(tabs)/two.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/(tabs)/two.tsx)
- [app/app/+not-found.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/+not-found.tsx)
- [app/app/modal.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/modal.tsx)
- [ErrorBoundary.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/ErrorBoundary.tsx)

它们共同构成应用最外层壳层与兜底体验：

- `app/app/_layout.tsx` 是 Expo Router 根布局
- `app/app/(tabs)/_layout.tsx` 是 tabs 壳层
- `two.tsx`、`+not-found.tsx`、`modal.tsx` 是模板残留页
- `ErrorBoundary.tsx` 是运行时错误兜底组件

因此把它们作为最终一批处理，可以一次性清空剩余 allowlist，完成整个 NativeWind 守卫收口。

## 目标

- 把最后 6 个 legacy 文件的静态视觉样式迁到 `NativeWind`
- 保持根布局初始化逻辑、tabs 路由配置、模板页文案/结构和错误边界恢复逻辑不变
- 为缺失测试的壳层与兜底页补齐稳定回归保护
- 迁移完成后，让 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 清空 `legacyFiles`

## 非目标

- 不改 `app/app/_layout.tsx` 的初始化流程、迁移逻辑、同步逻辑或监听逻辑
- 不改 `app/app/(tabs)/_layout.tsx` 的路由结构、隐藏 tab bar 策略或 screen name
- 不把模板页改造成新的产品页面，只迁静态壳层表达
- 不改 `ErrorBoundary` 的报错上报、错误文案和点击重试行为

## 方案对比

### 方案 A：6 个文件整批收尾

- 优点：allowlist 一次性清零，收尾最干净；文件大多结构简单，批次边界清晰
- 缺点：包含一个重初始化根布局，测试和修改要更谨慎

### 方案 B：先清模板页和 ErrorBoundary，再单独留 layout

- 优点：风险更低
- 缺点：会多切一批，收尾节奏变差

推荐采用方案 A。

## 最终方案

### 1. 总体迁移策略

本轮继续沿用前八批的原则：

- 只迁静态样式表达，不改业务行为
- 能用 `className` 表达的静态壳层全部迁走
- 导航配置对象、平台条件分支和初始化逻辑继续保持原状
- 不为迁移重做页面结构，只做最小测试锚点和样式收口

固定边界如下：

- `app/app/_layout.tsx` 只改 `GestureHandlerRootView` 的静态 style 壳层
- `app/app/(tabs)/_layout.tsx` 只改图标壳层和静态样式表达
- `two.tsx`、`+not-found.tsx`、`modal.tsx` 只改模板页静态壳层
- `ErrorBoundary.tsx` 只改错误页静态壳层

### 2. 模板页迁移设计

[app/app/(tabs)/two.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/(tabs)/two.tsx)、[app/app/+not-found.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/+not-found.tsx)、[app/app/modal.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/modal.tsx) 都是 Expo 模板残留页，适合作为最终批起手部分。

迁移后它们仍然保留：

- 现有文案和页面结构
- `EditScreenInfo` 调用
- `Link` 跳转
- `StatusBar` 平台分支

具体处理方式：

- 删除 `StyleSheet.create`
- 用 `className` 表达：
  - 容器
  - 标题
  - 分隔线
  - 链接壳层
- 保留：
  - `Stack.Screen options`
  - `StatusBar` 平台逻辑
  - `View` 的 `lightColor` / `darkColor`

允许补的稳定测试锚点：

- `tab-two-root`
- `not-found-root`
- `modal-root`

### 3. `ErrorBoundary` 迁移设计

[ErrorBoundary.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/ErrorBoundary.tsx) 是最终批里唯一真正的兜底组件。

迁移后它仍然保留：

- `getDerivedStateFromError`
- `componentDidCatch`
- `Sentry.captureException`
- `handleReset`

具体处理方式：

- 删除 `StyleSheet.create`
- 用 `className` 表达：
  - container
  - title
  - message
  - button
  - buttonText
- 保留：
  - 错误信息文案
  - 重试按钮回调

允许补的稳定测试锚点：

- `error-boundary-root`
- `error-boundary-reset`

### 4. `app/app/(tabs)/_layout.tsx` 迁移设计

[app/app/(tabs)/_layout.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/(tabs)/_layout.tsx) 的主要 legacy 点是 tab icon 的静态 style。

迁移后它仍然保留：

- `Tabs` 配置
- `Colors[colorScheme ?? 'light'].tint`
- `headerShown: false`
- `tabBarStyle: { display: 'none' }`

具体处理方式：

- 把 `FontAwesome` 的 `style={{ marginBottom: -3 }}` 改成外层 `View` 或可接受的 `className`
- 不改 `screenOptions` 的导航语义

允许补的稳定测试锚点：

- `tab-layout-icon-list`
- `tab-layout-icon-gear`

### 5. `app/app/_layout.tsx` 迁移设计

[app/app/_layout.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/_layout.tsx) 是最终批风险最高文件，但本轮只改壳层，不碰初始化逻辑。

迁移后它仍然保留：

- 所有 `useEffect` 初始化流程
- 数据迁移、同步、补传和监听逻辑
- `Stack.Screen` 路由结构
- `ThemeProvider` / `SafeAreaProvider` / `ErrorBoundary` 包装顺序

具体处理方式：

- 把 `GestureHandlerRootView style={{ flex: 1 }}` 改成 `className="flex-1"`
- 补稳定测试锚点，便于在现有 `_layout.photo-upload.test.tsx` 上扩充断言
- 不动任何异步初始化代码和路由配置

允许补的稳定测试锚点：

- `root-layout-shell`

### 6. 测试与验收策略

第一层是组件/页面级测试：

- 新增 `app/app/__tests__/shell-fallback-pages.test.tsx`
  - 锁定 `two.tsx`、`+not-found.tsx`、`modal.tsx` 根壳层存在
- 新增 `app/src/components/__tests__/ErrorBoundary.test.tsx`
  - 锁定报错态壳层、错误信息和重试按钮
- 新增 `app/app/(tabs)/__tests__/_layout.test.tsx`
  - 锁定 `tabBarIcon` 返回的图标壳层 testID
- 扩充 [app/app/__tests__/_layout.photo-upload.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/__tests__/_layout.photo-upload.test.tsx)
  - 锁定根布局壳层存在
  - 保留原有 photo upload 回归断言

第二层是守卫与全量验收：

- 迁移完成后，从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 删除：
  - `app/_layout.tsx`
  - `app/(tabs)/_layout.tsx`
  - `app/(tabs)/two.tsx`
  - `app/+not-found.tsx`
  - `app/modal.tsx`
  - `src/components/ErrorBoundary.tsx`
- 跑最终批相关测试、`npm run lint`、`npm run typecheck` 和全量 `npm test -- --runInBand`

### 7. 风险与控制

这批最大风险有三类：

- `app/app/_layout.tsx` 的初始化链路被误碰
- `app/app/(tabs)/_layout.tsx` 的导航配置被误改
- `ErrorBoundary` 的报错恢复行为回归

对应控制方式：

- 先迁模板页
- 再迁 `ErrorBoundary`
- 然后迁 tabs layout
- 最后只做根布局的最小壳层收口
- 对导航配置对象和初始化逻辑坚持只读，不做借迁移的结构调整

## 本地结构化 Review 结论

- 已检查最终批范围、剩余 allowlist、现有 `_layout` 测试基线和模板页结构
- 这 6 个文件可以作为 NativeWind 守卫清零的最后一批处理
- 未发现阻塞进入 implementation plan 的问题

## 实现结果

- 已完成 [app/app/(tabs)/two.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/(tabs)/two.tsx)、[app/app/+not-found.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/+not-found.tsx)、[app/app/modal.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/modal.tsx)、[ErrorBoundary.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/ErrorBoundary.tsx)、[app/app/(tabs)/_layout.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/(tabs)/_layout.tsx)、[app/app/_layout.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/_layout.tsx) 的静态样式迁移
- 已补稳定测试锚点：
  - `tab-two-root`
  - `not-found-root`
  - `modal-root`
  - `error-boundary-root`
  - `error-boundary-reset`
  - `tab-layout-icon-list`
  - `tab-layout-icon-gear`
  - `root-layout-shell`
- 已新增 [shell-fallback-pages.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/__tests__/shell-fallback-pages.test.tsx)、[_layout.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/(tabs)/__tests__/_layout.test.tsx)、[ErrorBoundary.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/ErrorBoundary.test.tsx)，并扩充 [_layout.photo-upload.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/__tests__/_layout.photo-upload.test.tsx)
- [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 已清空：
  - `legacyFiles: []`
  - `ruleBaselines: {}`
- 行为边界保持不变：
  - 根布局初始化、副作用、同步和监听逻辑未调整
  - tabs 路由结构与隐藏 tab bar 语义未调整
  - 模板页文案、`Link`、`EditScreenInfo`、`StatusBar` 平台逻辑未调整
  - `ErrorBoundary` 的 Sentry 上报与重试恢复逻辑未调整

## 验证结果

- `cd app && npx jest --run-in-band --runTestsByPath app/__tests__/shell-fallback-pages.test.tsx src/components/__tests__/ErrorBoundary.test.tsx app/(tabs)/__tests__/_layout.test.tsx app/__tests__/_layout.photo-upload.test.tsx`：PASS，4 个 suite / 9 个测试全部通过
- `cd app && npm run lint`：PASS
- `cd app && npm run typecheck`：PASS
- `cd app && npm test -- --runInBand`：PASS，65 个 suite / 378 个测试全部通过

## 偏差说明

- 无功能性偏差
