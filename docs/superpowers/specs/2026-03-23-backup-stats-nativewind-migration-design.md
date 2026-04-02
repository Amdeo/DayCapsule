# 备份与统计链路 NativeWind 第六批迁移设计

## 状态

- 当前状态：已完成实现并通过验证
- 设计确认日期：2026-03-23
- 实现完成日期：2026-03-23

## 评审记录

- 2026-03-23：已完成第五批“设置与账号链路”迁移，当前 worktree 继续在 `nativewind-style-guardrails` 上推进下一批。
- 2026-03-23：已检查剩余 allowlist，确认 `BackupPage`、`BackupExportSheet`、`StatsPage` 适合作为同一批次收口。
- 2026-03-23：已确认本轮目标仍然是把现有样式迁到 `NativeWind`，不借迁移之名改页面结构或文案。
- 2026-03-23：用户已明确要求后续自动推进，不再逐项请示；本轮设计基于该授权直接落文并继续 planning。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 spec review 继续采用本地结构化 review 留痕。
- 2026-03-23：`BackupExportSheet`、`BackupPage`、`StatsPage` 已全部迁到 `NativeWind`，并从 allowlist 中移除。
- 2026-03-23：第六批相关测试、全量 lint、typecheck 与全量测试均已通过。

## 背景

前五批迁移已经完成了首页壳层、搜索编辑链路、详情操作链路、侧栏二级页共享壳层，以及设置与账号链路的 NativeWind 收口。

当前仍在 allowlist 的备份与统计相关文件是：

- [BackupPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/BackupPage.tsx)
- [BackupExportSheet.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/BackupExportSheet.tsx)
- [StatsPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/StatsPage.tsx)

这 3 个文件组成同一条相邻链路：

- `Sidebar` 拉起 `BackupPage` 和 `StatsPage`
- `BackupPage` 内部继续拉起 `BackupExportSheet`
- 三者都依赖已迁移的 [DetailPageShell.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/DetailPageShell.tsx) 或已稳定的 Modal 壳层

因此，把它们作为“备份与统计链路”一起迁移，可以延续侧栏二级页的视觉收口，同时避免把媒体/时间轴高耦合区域过早混进来。

## 目标

- 把 `BackupPage`、`BackupExportSheet`、`StatsPage` 的静态视觉样式迁到 `NativeWind`
- 保持导出、保存到文件、导入、iCloud 提示、统计聚合与趋势展示逻辑不变
- 为这批组件补齐稳定的根壳层和关键卡片测试锚点
- 迁移完成后，把这 3 个文件从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 中移除

## 非目标

- 不改备份 ZIP 生成、恢复数据、提取媒体、保存到系统目录等服务逻辑
- 不改统计口径、时间维度计算、近 6 个月趋势算法和标签排序逻辑
- 不把本轮扩展到 `PhotoGrid`、`ImageViewer`、`VoiceRecorder` 或时间轴组件
- 不改侧栏入口位置、页面标题和现有文案

## 方案对比

### 方案 A：`BackupPage`、`BackupExportSheet`、`StatsPage` 一起迁移

- 优点：三者都属于侧栏二级页，风格和壳层接近；`BackupPage` 与 `BackupExportSheet` 有直接依赖，适合一次性收口；`StatsPage` 结构独立但复杂度低，适合顺手完成
- 缺点：需要同时处理一个 Modal 和两个详情页

### 方案 B：只做 `BackupPage` 与 `BackupExportSheet`

- 优点：更聚焦，风险更低
- 缺点：`StatsPage` 会继续留在 allowlist，侧栏二级页视觉迁移会再多切一批，收益偏低

### 方案 C：扩成“备份 + 统计 + 媒体”大批次

- 优点：allowlist 下降更快
- 缺点：会把 `PhotoGrid`、`ImageViewer`、`VoiceRecorder` 等高复杂度文件混进来，批次边界变差，不适合当前节奏

推荐采用方案 A。

## 最终方案

### 1. 总体迁移策略

本轮继续沿用前五批的原则：

- 只迁静态样式表达，不改业务行为
- 能用 `className` 表达的静态壳层全部迁走
- 运行时尺寸、颜色、图表高度和 Modal 安全区占位继续允许保留 `style`
- 不为迁移重做结构，只做最小的测试锚点和样式收口

固定边界如下：

- `BackupPage` 保留导出、导入、保存到文件、备份历史、iCloud 可用性与 Alert 流程
- `BackupExportSheet` 保留 Modal 打开/关闭、遮罩点击关闭、底部安全区占位
- `StatsPage` 保留全部聚合计算、趋势图高度换算、标签排序与滚动结构

### 2. `BackupExportSheet` 迁移设计

[BackupExportSheet.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/BackupExportSheet.tsx) 是这批最小的文件，优先迁移。

迁移后它仍然保留：

- `Modal`
- 点击遮罩关闭
- “保存到文件” / “取消” 两个动作
- `insets.bottom` 占位

具体处理方式：

- 删除 `StyleSheet.create`
- 用 `className` 表达：
  - 容器
  - backdrop
  - sheetWrap / sheet
  - handle
  - title / subtitle
  - actionButton / cancelButton
  - actionText / cancelText
- `StyleSheet.absoluteFill` 改成 `className="absolute inset-0"`
- 底部安全区继续保留 `style={{ height: insets.bottom }}`

允许补的稳定测试锚点：

- `backup-export-sheet`

### 3. `BackupPage` 迁移设计

[BackupPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/BackupPage.tsx) 结构比设置页简单，但包含多个 section 和操作卡片。

迁移后它仍然保留：

- `refreshBackupInfo`
- `handleExport`
- `handleSaveToFiles`
- `handleImport`
- `Alert`
- `BackupExportSheet` 的显隐控制

具体处理方式：

- 删除 `StyleSheet.create`
- 把静态壳层迁到 `className`：
  - section title
  - info card
  - row / rowLabel / rowValue
  - action card
  - action icon / content / title / subtitle
  - action button / disabled
  - iCloud card / header / title / text / highlight
- 保留：
  - 备份历史最后一行 `borderBottomWidth: 0`
  - iCloud 可用性对应的动态 icon color / title color
  - 导出中 / 导入中按钮状态文案

允许补的稳定测试锚点：

- `backup-page-root`
- `backup-page-storage-card`
- `backup-page-icloud-card`

### 4. `StatsPage` 迁移设计

[StatsPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/StatsPage.tsx) 以静态展示为主，适合在这批一并收口。

迁移后它仍然保留：

- `useMemo` 里的所有统计计算
- 总览卡片、时间维度、近 6 个月趋势、常用标签的顺序
- 趋势条高度计算 `Math.max((m.count / stats.maxCount) * 88, 4)`

具体处理方式：

- 删除 `StyleSheet.create`
- 把静态壳层迁到 `className`：
  - section title
  - grid
  - statCard / statIcon / statContent / statValue / statLabel
  - infoCard
  - row / rowLabel / rowValue
  - barChart / barItem / barCount / barTrack / barLabel
  - bottomPadding
- 保留：
  - `StatCard` 左边框颜色与图标底色
  - 趋势柱高度
  - 近 6 个月数据映射逻辑

允许补的稳定测试锚点：

- `stats-page-root`
- `stats-overview-grid`
- `stats-trend-card`

### 5. 测试与验收策略

第一层是组件级测试：

- 扩充 [BackupExportSheet.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/BackupExportSheet.test.tsx)
  - 锁定 sheet 根壳层存在
  - 继续保留保存和关闭回调断言
- 扩充 [BackupPage.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/BackupPage.test.tsx)
  - 锁定页面根壳层、存储卡和 iCloud 卡存在
  - 继续保留导出、保存到文件和历史分享流转断言
- 新增 [StatsPage.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/StatsPage.test.tsx)
  - 锁定页面根壳层、总览网格、趋势卡存在
  - 锁定统计文案和语音总时长展示不回归

第二层是守卫与全量验收：

- 迁移完成后，从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 删除：
  - `src/components/BackupExportSheet.tsx`
  - `src/components/BackupPage.tsx`
  - `src/components/StatsPage.tsx`
- 跑相关组件测试、`pnpm run lint`、`pnpm run typecheck` 和全量 `pnpm test --runInBand`

### 6. 风险与控制

这批最大风险有两类：

- `BackupPage` 误碰导出 / 导入逻辑，导致回归
- `StatsPage` 趋势图和统计口径在迁移中被改坏

对应控制方式：

- 先迁最小的 `BackupExportSheet`
- 再迁带有实际操作流的 `BackupPage`
- 最后迁纯展示但有统计聚合的 `StatsPage`
- 每个文件都坚持失败测试先行
- 对动态高度、动态颜色和运行时边框保留最小 `style`

## 本地结构化 Review 结论

- 已检查第六批范围、上下游依赖、测试现状和 allowlist 收口点
- `BackupExportSheet`、`BackupPage`、`StatsPage` 可以组成一条边界清晰的连续迁移链路
- 未发现阻塞进入 implementation plan 的问题

## 实现结果

- 已完成 [BackupExportSheet.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/BackupExportSheet.tsx)、[BackupPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/BackupPage.tsx)、[StatsPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/StatsPage.tsx) 的静态样式迁移，三者均不再依赖 `StyleSheet.create`
- 已补稳定测试锚点：
  - `backup-export-sheet`
  - `backup-page-root`
  - `backup-page-storage-card`
  - `backup-page-icloud-card`
  - `stats-page-root`
  - `stats-overview-grid`
  - `stats-trend-card`
- 已新增 [StatsPage.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/StatsPage.test.tsx)，补齐统计页的独立回归保护
- 已从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 删除这 3 个组件，完成第六批备份与统计链路收口
- 入口关系和业务行为保持不变：
  - `Sidebar -> BackupPage`
  - `Sidebar -> StatsPage`
  - `BackupPage -> BackupExportSheet`
  - 备份导出、保存到文件、导入恢复、iCloud 提示、统计聚合与趋势计算逻辑均未调整

## 验证结果

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
- `StatsPage` 新增了独立测试文件，这是对原有测试覆盖的补足，不影响运行时行为
