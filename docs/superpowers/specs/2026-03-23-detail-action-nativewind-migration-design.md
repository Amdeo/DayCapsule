# 详情与操作链路 NativeWind 第三批迁移设计

## 状态

- 当前状态：已实现并完成验证
- 设计确认日期：2026-03-23
- 实现完成日期：2026-03-23

## 评审记录

- 2026-03-23：已确认继续采用渐进迁移，不把整仓剩余 allowlist 一次性铺开。
- 2026-03-23：已确认第三批继续围绕首页主路径，而不是跳去设置类页面。
- 2026-03-23：已确认本轮采用推荐方案 A：`TextEntryDetailPage`、`EntryActionSheet`、`CloudSyncStatusButton`。
- 2026-03-23：已确认本轮目标仍然是把现有样式迁到 `NativeWind`，不借迁移之名重设计页面。
- 2026-03-23：已确认入口关系保持不变：`Timeline.v2` 继续拉起 `TextEntryDetailPage` 和 `CloudSyncStatusButton`，`EntryCard` 继续拉起 `EntryActionSheet`。
- 2026-03-23：已确认动态动画、状态色、`Modal` / backdrop、运行时透明度等场景允许继续保留 `style`。
- 2026-03-23：已确认 `TextEntryDetailPage` 只迁自身内容层，不把 [DetailPageShell.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/DetailPageShell.tsx) 一并纳入本轮。
- 2026-03-23：已确认本轮会补组件级测试，并在迁移完成后把这 3 个文件从 allowlist 中移除。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 spec review 先采用本地结构化 review 留痕。
- 2026-03-23：实现已按设计完成，三个目标文件均已迁出 allowlist，验证命令全部通过。

## 背景

首页第一批与第二批 `NativeWind` 迁移已经分别覆盖了：

- 首页壳层、Timeline、EntryCard、FAB、Sidebar
- 搜索 / 编辑链路：`SearchOverlay`、`EntryEditor`、`TextEditor`

但首页主使用链路里仍有 3 个高频组件停留在 allowlist：

- [TextEntryDetailPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/TextEntryDetailPage.tsx)
- [EntryActionSheet.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/EntryActionSheet.tsx)
- [CloudSyncStatusButton.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/CloudSyncStatusButton.tsx)

这三者分别承担：

- 文本记录详情查看
- 卡片级编辑 / 删除操作面板
- 首页顶部云同步状态提示入口

如果它们继续停留在旧的 `StyleSheet` 体系里，那么首页主路径仍然存在明显断点：

- 详情查看与卡片操作链路的样式表达方式仍不统一
- 频繁出现的按钮、面板和详情内容继续保留散落硬编码色值
- `style guard` 无法继续缩小 allowlist
- 后续切到日历 / 媒体链路前，首页主流转路径仍未完全收口

因此，第三批最自然的目标不是扩到独立页面，而是继续把首页剩余主路径补齐。

## 目标

- 把 `TextEntryDetailPage`、`EntryActionSheet`、`CloudSyncStatusButton` 的静态视觉样式迁到 `NativeWind`
- 保持现有入口关系、布局形态和交互路径不变
- 尽量复用现有 `tailwind.config.js` token，避免继续在组件内部新增散落十六进制颜色
- 为这批组件补齐直接锁定壳层与关键交互的测试
- 迁移完成后，把这 3 个文件从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 中移除

## 非目标

- 不改 `Timeline.v2` 与 `EntryCard` 的入口关系
- 不重做详情页信息架构或操作面板交互流程
- 不调整云同步状态文案、状态机或点击后的业务行为
- 不把本轮扩展到 `CalendarView`、`PhotoGrid` 或其他设置类页面
- 不把 [DetailPageShell.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/DetailPageShell.tsx) 一并纳入本轮重构

## 最终方案

### 1. 总体迁移策略

这批文件继续沿用前两批的原则：

- 只迁静态样式表达，不改业务行为
- 能用 `className` 表达的静态壳层全部迁走
- 动态、运行时、动画和第三方限制场景继续保留 `style`
- 不为迁移重做组件结构，只做“为迁移服务的小收口”

边界固定如下：

- 保留 `Modal`、`Animated`、`PanResponder`、`DetailPageShell`、状态机与回调逻辑
- 保留运行时分支样式，例如 handle 类型色、同步状态点颜色、动画 transform
- 允许为测试补 `testID`
- 允许把原来散落在 `StyleSheet` 中的静态块改为小的 `className` 组合，但不做额外架构拆分

### 2. `TextEntryDetailPage` 迁移设计

[TextEntryDetailPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/TextEntryDetailPage.tsx) 本轮只迁它自己的内容层，不把 [DetailPageShell.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/DetailPageShell.tsx) 拉进来一起改。

迁移后它仍然保留：

- `DetailPageShell` 作为外层壳
- 右上角“编辑”按钮
- 正文 hero block
- 创建时间 / 最近编辑信息区
- 标签区和标签 chip

具体处理方式：

- `contentContainerStyle` 对应的静态间距迁到 `NativeWind`
- `editButton`、`heroBlock`、`metaSection`、`metaRow`、`tagsWrap`、`tagChip` 改为 `className`
- 时间格式化函数继续原样保留
- `onEdit(entry)`、`onClose` 的调用时机保持不变

允许补的稳定测试锚点：

- `text-entry-detail-root`
- `text-entry-detail-hero`
- `text-entry-detail-tags`

### 3. `EntryActionSheet` 迁移设计

[EntryActionSheet.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/EntryActionSheet.tsx) 继续是“动画 + 手势驱动的底部操作面板”，不改成交互形态不同的弹窗，也不重写出现 / 退出逻辑。

迁移后它仍然保留：

- `Modal`
- `PanResponder`
- `translateY` / `backdropOpacity`
- `menu` / `confirm` 两种模式
- `ENTRY_ACTION_SHEET_EXIT_DURATION`

具体处理方式：

- `panel`、`optionGroup`、`optionRow`、`divider`、`cancelButton`、`confirmGroup` 等静态壳层改为 `className`
- handle 继续保留类型色运行时分支
- backdrop 透明度动画、面板位移动画继续保留在 `useAnimatedStyle`
- 安全区底部补白继续保留运行时 `insets.bottom`
- 不改 `edit` 不自动关闭、`delete` 先进入确认态、`confirm delete` 再触发删除并关闭的流程

允许补的稳定测试锚点：

- `action-sheet-panel`
- `action-sheet-option-group`

现有锚点继续沿用：

- `action-sheet-overlay`
- `action-sheet-handle`
- `action-sheet-edit`
- `action-sheet-delete`
- `action-sheet-cancel`
- `action-sheet-confirm-delete`
- `action-sheet-confirm-cancel`

### 4. `CloudSyncStatusButton` 迁移设计

[CloudSyncStatusButton.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/CloudSyncStatusButton.tsx) 继续保持“小圆按钮 + 云图标 + 状态点 / 同步中环”的视觉结构。

迁移后它仍然保留：

- `Animated.Value` 呼吸动画
- `Animated.Value` 旋转动画
- `syncing` 时的 ring 与云图标双层结构
- 非 `syncing` 时的状态点

具体处理方式：

- 按钮壳层和静态云图标容器迁到 `className`
- 同步中 ring 的 transform 继续保留在 `style`
- 状态点颜色继续保留运行时分支
- 不改按钮尺寸、不改状态点位置、不改点击行为

允许补的稳定测试锚点：

- `cloud-sync-shell`

现有锚点继续沿用：

- `cloud-sync-button`
- `cloud-sync-spinner`
- `cloud-sync-dot-synced`
- `cloud-sync-dot-pending`
- `cloud-sync-dot-failed`

### 5. Token 与样式边界

这批迁移优先复用现有 [tailwind.config.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/tailwind.config.js) 已有 token，尤其是：

- `primary`
- `text`
- `photo`
- `voice`
- `neutral`
- `background`
- `copy`
- `border`
- 已在第二批补齐的 `editor.*`

原则是：

- 不在组件内部新增分散十六进制颜色
- 只有当前视觉确实无法由现有 token 表达时，才补最小新 token
- 即使需要补 token，也必须是语义化命名，而不是页面私有命名

允许保留 `style` 的场景：

- `Animated` / `useAnimatedStyle`
- `PanResponder` 相关位移
- handle / 状态点 / spinner 的运行时色值
- `insets.bottom`
- `DetailPageShell` 仍要求通过对象传入的容器样式

### 6. 测试与验收策略

本轮测试策略分为两层。

第一层是组件级测试：

- 新增 [TextEntryDetailPage.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/TextEntryDetailPage.test.tsx)
  - 锁定正文、创建时间、最近编辑、标签渲染
  - 锁定右上角编辑按钮点击会把当前 entry 传给 `onEdit`
- 扩充 [EntryActionSheet.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/EntryActionSheet.test.tsx)
  - 锁定面板壳层存在
  - 锁定 handle 类型色不回归
  - 锁定确认态、退出延时和 reopen 回菜单的行为不变
- 扩充 [CloudSyncStatusButton.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/CloudSyncStatusButton.test.tsx)
  - 锁定按钮壳层仍存在
  - 锁定 `syncing` spinner 仍在
  - 锁定 `synced/pending/failed` 三种状态点仍分别渲染

第二层是守卫与全量验收：

- 迁移完成后，从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 删除这 3 个文件
- 跑相关组件测试、`pnpm run lint`、`pnpm run typecheck` 和全量 `pnpm test --runInBand`

### 7. 风险与控制

这批最大的风险不是逻辑实现，而是“把详情页、面板和状态按钮做成了不同于现状的新视觉组件”。对应控制方式如下：

- `TextEntryDetailPage` 只迁内容层，不碰 `DetailPageShell`
- `EntryActionSheet` 不改动画时长和模式切换流程
- `CloudSyncStatusButton` 不改尺寸、状态点位置和动画结构
- 只在需要稳定测试时新增 `testID`
- 每迁完一个文件就同步收紧 allowlist，避免回退

## 实现结果

- `TextEntryDetailPage` 已完成内容层迁移，保留 `DetailPageShell`、时间格式化和 `onEdit(entry)` 行为，并补充 `text-entry-detail-root`、`text-entry-detail-hero`、`text-entry-detail-tags` 测试锚点。
- `EntryActionSheet` 已完成面板静态壳层迁移，保留 `Modal`、`PanResponder`、`translateY` / `backdropOpacity`、确认态与关闭流程，并补充 `action-sheet-panel`、`action-sheet-option-group` 测试锚点。
- `CloudSyncStatusButton` 已完成按钮壳层迁移，保留呼吸动画、旋转动画、spinner ring / status dot 的运行时样式，并补充 `cloud-sync-shell` 测试锚点。
- `app/eslint/style-guard-allowlist.js` 已移除这 3 个目标文件，首页主路径第三批不再依赖 legacy 放行。

## 验证结果

- `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/TextEntryDetailPage.test.tsx src/components/__tests__/EntryActionSheet.test.tsx src/components/__tests__/CloudSyncStatusButton.test.tsx`：PASS
- `cd app && pnpm run lint`：PASS
- `cd app && pnpm run typecheck`：PASS
- `cd app && pnpm test --runInBand`：PASS

## 实现备注

- 本轮没有新增 Tailwind 语义 token。
- `TextEntryDetailPage` 优先复用了 `editor.*`、`copy.*`、`border.editor-soft` 等现有 token。
- `EntryActionSheet` 与 `CloudSyncStatusButton` 为保持现有视觉不漂移，沿用了组件原有的少量精确色值，并改为 NativeWind arbitrary classes 表达。

## 本地结构化 Review 结论

- 已对第三批范围、入口关系、迁移边界、测试策略和 allowlist 收口方式做本地结构化 review
- 未发现阻塞执行与验收的问题
- 实现结果与设计边界一致，无需额外 spec 调整
