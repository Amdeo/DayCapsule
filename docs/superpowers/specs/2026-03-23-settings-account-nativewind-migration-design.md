# 设置与账号链路 NativeWind 第五批迁移设计

## 状态

- 当前状态：已完成实现并通过验证
- 设计确认日期：2026-03-23
- 实现完成日期：2026-03-23

## 评审记录

- 2026-03-23：已确认继续做下一批 NativeWind 渐进迁移，而不是先回主分支收尾。
- 2026-03-23：已选择优先处理设置/账号链路，范围固定为 `SettingsPage`、`LoginPage`、`TagManagementPage`。
- 2026-03-23：已确认这批按“整条链路一次收口”处理，而不是只迁子页。
- 2026-03-23：已确认本轮目标仍然是把现有样式迁到 `NativeWind`，不借迁移之名重设计页面。
- 2026-03-23：已确认 `SettingsPage` 继续通过已迁移的 `DetailPageShell` 承载，`LoginPage` 与 `TagManagementPage` 的入口和显隐关系保持不变。
- 2026-03-23：已确认云同步切换、通知调度、缓存清理、设置重置、登录/注册、预制标签拖拽等业务逻辑全部保持不变。
- 2026-03-23：用户已明确要求后续自动推进，不再逐项请示；本轮设计基于该授权直接落文并继续 planning。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 spec review 先采用本地结构化 review 留痕。
- 2026-03-23：`LoginPage`、`TagManagementPage`、`SettingsPage` 已全部迁到 `NativeWind`，并从 allowlist 中移除。
- 2026-03-23：第五批相关测试、全量 lint、typecheck 与全量测试均已通过。

## 背景

前四批 `NativeWind` 迁移已经覆盖了：

- 首页壳层、Timeline、EntryCard、FAB、Sidebar
- 搜索 / 编辑链路：`SearchOverlay`、`EntryEditor`、`TextEditor`
- 详情 / 操作链路：`TextEntryDetailPage`、`EntryActionSheet`、`CloudSyncStatusButton`
- 侧栏二级页共享链路：`DetailPageShell`、`AboutPage`、`HelpPage`、`TagsPage`

但设置与账号相关链路里，仍有 3 个高频用户可见文件停留在 allowlist：

- [SettingsPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/SettingsPage.tsx)
- [LoginPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/LoginPage.tsx)
- [TagManagementPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/TagManagementPage.tsx)

这三者形成一条明确的链路：

- `Sidebar` 拉起 `SettingsPage`
- `SettingsPage` 继续拉起 `LoginPage` 与 `TagManagementPage`
- 三者都依赖已完成迁移的 [DetailPageShell.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/DetailPageShell.tsx)

如果只迁 `LoginPage` / `TagManagementPage`，`SettingsPage` 自身仍然保留大量 `StyleSheet` 壳层；如果只迁 `SettingsPage`，子页链路仍然会割裂。因此，这一批最自然的方案仍然是整条设置/账号链路一起收口。

## 目标

- 把 `SettingsPage`、`LoginPage`、`TagManagementPage` 的静态视觉样式迁到 `NativeWind`
- 保持设置页入口关系、信息结构与关键交互不变
- 为这批组件补齐共享根壳层和关键交互测试
- 迁移完成后，把这 3 个文件从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 中移除

## 非目标

- 不改 `Sidebar` 中“设置”入口的位置与交互
- 不改云同步切换策略、数据源切换逻辑、通知调度逻辑
- 不改登录 / 注册表单流程与错误提示
- 不改预制标签拖拽、删除、恢复默认、数量上限逻辑
- 不把本轮扩展到 `BackupPage`、`StatsPage` 或其他设置类页面

## 最终方案

### 1. 总体迁移策略

本轮继续沿用前四批的原则：

- 只迁静态样式表达，不改业务行为
- 能用 `className` 表达的静态壳层全部迁走
- 运行时分支、动画、手势、`Switch` 配置和尺寸计算继续保留 `style`
- 不为迁移重做组件结构，只做“为迁移服务的小收口”

固定边界如下：

- `SettingsPage` 继续保留所有 `Alert`、`useEffect`、store 调用、服务调用和子页显隐状态
- `LoginPage` 继续保留登录 / 注册模式切换与 loading 流程
- `TagManagementPage` 继续保留 `Animated`、`PanResponder`、`ROW_HEIGHT`、`LONG_PRESS_MS` 和拖拽重排逻辑
- 允许补最小 `testID`
- 允许继续使用运行时 `style` 处理 `Switch`、绝对定位拖拽行、选中卡片阴影、预览高度、动画位移

### 2. `LoginPage` 迁移设计

[LoginPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/LoginPage.tsx) 是最简单的设置子页，优先迁移。

迁移后它仍然保留：

- 登录 / 注册模式切换
- 邮箱、密码、确认密码输入
- loading 态按钮
- `Alert` 提示
- 登录成功后调用 `onSuccess()`

具体处理方式：

- `form`、`input`、`hint`、`button`、`buttonDisabled`、`buttonText`、`switchButton`、`switchText` 改为 `className`
- `TextInput` 继续保留 `placeholderTextColor`
- loading 态继续保留 `ActivityIndicator`
- 提交校验与错误处理逻辑完全保持不变

允许补的稳定测试锚点：

- `login-page-root`

### 3. `TagManagementPage` 迁移设计

[TagManagementPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/TagManagementPage.tsx) 结构复杂但业务边界很清晰：列表拖拽和输入区逻辑不动，只迁静态壳层。

迁移后它仍然保留：

- `useCommonTagsStore` 的加载、增删改和恢复默认
- `Animated.Value`
- `PanResponder`
- 长按进入拖拽
- `scrollEnabled={dragState == null}`
- `ROW_HEIGHT` 驱动的定位计算

具体处理方式：

- 静态壳层迁到 `className`：
  - reset row
  - section header
  - hint
  - tag row
  - tagLeft / drag handle / tagName
  - addRow / addInput / addButton
- 继续保留 `positionedRow`、`activeRow`、`translateY`、`top`、`containerHeight` 等运行时样式
- 若选中拖拽行的背景 / 阴影仍需运行时 style 组合，可保留最小对象样式

允许补的稳定测试锚点：

- `tag-management-root`
- `tag-management-tags-container`

### 4. `SettingsPage` 迁移设计

[SettingsPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/SettingsPage.tsx) 是这批的主文件，最后迁移。

迁移后它仍然保留：

- `useSettingsStore` / `useAuthStore` / `useEntryStore` 状态读取
- 所有 `handle*` 回调逻辑
- 云同步切换 / 初始流程 / 离线切换对话框
- 通知调度与存储统计
- `TagManagementPage` 与 `LoginPage` 子页显隐

具体处理方式：

- 把静态壳层迁到 `className`：
  - section
  - section title
  - setting item
  - setting icon / danger icon
  - setting content / title / subtitle
  - storage info / storage row
  - `CardSpacingSelector`
  - `CalendarDensitySelector`
  - `PhotoHeightSelector`
  - `SettingButton`
- `Switch` 的 `trackColor` / `thumbColor` 继续保留
- `PhotoHeightSelector` 中预览块高度继续保留运行时 style
- `CalendarDensitySelector` / `CardSpacingSelector` 中选中态阴影若仍需 style 组合，可保留最小对象样式
- 不改 section 顺序：
  - 账户
  - 通知
  - 数据
  - 存储
  - 其他

允许补的稳定测试锚点：

- `settings-page-root`
- `settings-section-account`
- `settings-storage-card`

### 5. 测试与验收策略

本轮测试策略分为两层。

第一层是组件级测试：

- 扩充 [LoginPage.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/LoginPage.test.tsx)
  - 锁定根壳层存在
  - 锁定登录模式和注册模式切换不回归
  - 继续保留登录提交行为断言
- 扩充 [TagManagementPage.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/TagManagementPage.test.tsx)
  - 锁定根壳层和标签容器存在
  - 继续保留添加标签、拖拽排序行为断言
- 扩充 [SettingsPage.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/SettingsPage.test.tsx)
  - 锁定设置页根壳层和存储卡片存在
  - 继续保留日历密度切换、预制标签入口、同步状态、云端切换行为断言

第二层是守卫与全量验收：

- 迁移完成后，从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 删除：
  - `src/components/LoginPage.tsx`
  - `src/components/TagManagementPage.tsx`
  - `src/components/SettingsPage.tsx`
- 跑相关组件测试、`npm run lint`、`npm run typecheck` 和全量 `npm test -- --runInBand`

### 6. 风险与控制

这批最大的风险不是“迁不动样式”，而是“在 SettingsPage 里误触业务逻辑，导致云同步/登录/通知流程回归”。对应控制方式如下：

- 先迁最简单的 `LoginPage`
- 再迁逻辑边界明确但有手势的 `TagManagementPage`
- 最后迁 `SettingsPage`
- 页面根壳层和关键入口用测试锚点锁定
- 保留所有业务回调和 `Alert` 文案，不在本轮做任何逻辑清理

## 本地结构化 Review 结论

- 已对设置/账号链路范围、共享依赖关系、业务边界和测试策略做本地结构化 review
- 当前范围适合继续按“失败测试 -> 最小实现 -> lint 收口 -> 提交”的节奏执行
- 未发现阻塞进入 implementation plan 的问题

## 实现结果

- 已完成 [LoginPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/LoginPage.tsx)、[TagManagementPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/TagManagementPage.tsx)、[SettingsPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/SettingsPage.tsx) 的静态样式迁移，三者均不再依赖 `StyleSheet.create`
- 已补稳定测试锚点：
  - `login-page-root`
  - `tag-management-root`
  - `tag-management-tags-container`
  - `settings-page-root`
  - `settings-section-account`
  - `settings-storage-card`
- 已从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 删除这 3 个组件，完成第五批设置/账号链路收口
- 入口关系和业务行为保持不变：
  - `Sidebar -> SettingsPage`
  - `SettingsPage -> LoginPage`
  - `SettingsPage -> TagManagementPage`
  - 云同步切换、通知调度、缓存清理、设置重置、登录/注册、拖拽重排逻辑均未调整

## 验证结果

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
- `SettingsPage` 中新增了少量 `className` 字符串常量，用于复用原本重复的卡片壳层样式；这只影响样式表达方式，不改变组件结构和行为
