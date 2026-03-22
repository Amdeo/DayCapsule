# 搜索与编辑链路 NativeWind 第二批迁移设计

## 状态

- 当前状态：设计已确认，待进入 implementation plan
- 设计确认日期：2026-03-23

## 评审记录

- 2026-03-23：已确认本轮继续采用渐进迁移，而不是一次性清空整个 allowlist。
- 2026-03-23：已确认第二批优先处理首页延伸链路，不跳去设置页或其他独立页面。
- 2026-03-23：已确认第二批采用推荐方案 A：`SearchOverlay`、`EntryEditor`、`TextEditor`。
- 2026-03-23：已确认本轮目标仍然是把现有样式迁到 `NativeWind`，不借迁移之名重设计页面。
- 2026-03-23：已确认三类壳层分别原地迁移：全屏搜索层、整页编辑器、底部 sheet。
- 2026-03-23：已确认保留现有入口关系：`Timeline.v2` 继续拉起 `SearchOverlay` / `EntryEditor`，`app/(tabs)/index.tsx` 继续拉起 `TextEditor`。
- 2026-03-23：已确认搜索、保存、关闭、标签建议、筛选提交等业务行为不在本轮改动范围内。
- 2026-03-23：已确认本轮会补组件级测试，并在迁移完成后把这 3 个文件从 allowlist 中移除。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 spec review 先采用本地结构化 review 留痕。

## 背景

首页第一批 `NativeWind` 迁移已经完成，`Timeline`、`EntryCard`、`FABMenu`、`Sidebar` 和首页壳层都已经切到新的样式表达方式，并且 `style guard` 已经开始生效。

但首页主使用链路里仍有 3 个高频弹层 / 编辑器文件停留在 allowlist：

- [SearchOverlay.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/SearchOverlay.tsx)
- [EntryEditor.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/EntryEditor.tsx)
- [TextEditor.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/TextEditor.tsx)

这 3 个组件分别覆盖：

- 首页搜索与筛选入口
- 时间流中的记录编辑入口
- 首页快捷新增文字记录入口

如果这 3 个文件继续保留旧的 `StyleSheet` 体系，那么首页已经完成的迁移仍然会留下明显缺口：

- 首页主链路在视觉表达上仍不统一
- 高使用频率弹层继续积累硬编码颜色和壳层样式
- `style guard` 无法继续缩小 allowlist
- 后续再迁移会更容易碰到“顺手重设计”的偏差

因此，第二批最合理的目标不是扩到更多页面，而是先把首页延伸链路收口。

## 目标

- 把 `SearchOverlay`、`EntryEditor`、`TextEditor` 的静态视觉样式迁到 `NativeWind`
- 保持三者现有布局形态和交互路径不变
- 尽量复用现有 `tailwind.config.js` token，避免继续在组件内部写新的硬编码颜色
- 为这批组件补齐直接针对壳层与关键交互的测试
- 迁移完成后，把这 3 个文件从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 中移除

## 非目标

- 不调整首页入口结构
- 不重做搜索筛选信息架构
- 不重做编辑器文案、表单流程或标签建议逻辑
- 不把第二批扩展到日历链路、详情链路或设置类页面
- 不为这 3 个组件额外引入新的抽象层或组件库工程

## 最终方案

### 1. 总体迁移策略

这批文件采用和首页第一批一致的原则：

- 只迁静态样式表达，不改业务行为
- 能用 `className` 表达的静态壳层全部迁走
- 动态、运行时、动画和第三方限制场景允许继续使用 `style`
- 不为迁移重做组件结构，只做“为迁移服务的小收口”

边界具体如下：

- 保留 `Modal`、`Animated.View`、`KeyboardAvoidingView`、`ScrollView` 等原有容器角色
- 保留现有状态、回调和 store 调用
- 保留运行时分支样式，例如类型色、禁用态、`absoluteFillObject`、键盘行为
- 允许为测试补 `testID`

### 2. `SearchOverlay` 迁移设计

[SearchOverlay.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/SearchOverlay.tsx) 继续是“全屏搜索筛选层”，不改成 sheet，也不改成独立页面。

迁移后它仍然保留：

- 外层 `Animated.View`
- `KeyboardAvoidingView`
- 搜索输入框
- 类型 / 时间 / 标签三个 section
- 重置按钮
- 底部固定取消 / 搜索按钮

具体处理方式：

- 全屏背景、搜索框壳层、section 间距、chip 基础样式、footer 按钮区统一改为 `className`
- 类型筛选保留“选中态依类型变化”的语义，但由现有 token 驱动
- `Ionicons` 的 `color` 仍允许保留运行时传值
- `ScrollView` 的内容容器和底部占位保持现有滚动行为，不改变搜索层高度与滚动范围
- 当前 `typeFilters` / `dateOptions` 这样的数据驱动写法继续保留，不因迁移改写为复杂抽象

为了让测试更直接，允许补少量标识，例如：

- `search-overlay-root`
- `search-overlay-input-shell`
- `search-overlay-reset-button`
- `search-overlay-submit-button`

### 3. `EntryEditor` 迁移设计

[EntryEditor.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/EntryEditor.tsx) 继续是“全屏编辑页 + 底部标签 dock”，不改成交互形式完全不同的 modal card，也不改为顶部浮层。

迁移后它仍然保留：

- 全屏 `Modal`
- 背景遮罩
- 顶部 header bar
- 中间正文编辑区
- 底部固定标签 dock
- 类型 badge、创建时间、推荐标签、常用标签

具体处理方式：

- `editorPage`、`headerBar`、`contentSurface`、`metaSection`、`tagDock` 等静态壳层改为 `className`
- 类型 badge 保留运行时样式分支，因为边框色、背景色、文本色要跟 `entry.type` 对齐
- `tagDock` 继续保持绝对定位，不改现在“正文和标签区分层”的结构
- `TextInput` 的静态尺寸、字号、背景、圆角迁到 `NativeWind`
- 顶部返回 / 保存按钮的结构和点击路径保持不变

允许新增少量更稳定的测试锚点，例如：

- `entry-editor-header`
- `entry-editor-type-badge`

已有测试锚点继续沿用：

- `entry-editor-scroll`
- `entry-editor-content-surface`
- `entry-editor-content-input`
- `entry-editor-tag-dock`
- `entry-editor-tags-input`

### 4. `TextEditor` 迁移设计

[TextEditor.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/TextEditor.tsx) 继续是“底部 sheet 式新增文字记录面板”，不改成全屏页，也不改为独立路由。

迁移后它仍然保留：

- `Modal + KeyboardAvoidingView`
- 底部弹起的主容器
- 顶部标题与关闭按钮
- 中间内容区与标签区
- 底部取消 / 保存双按钮

具体处理方式：

- sheet 壳层、header、内容 section、footer 和 chip 改为 `className`
- 90% 高度、顶部圆角、底部操作条结构保持不变
- backdrop 继续用对象样式兜底，不为了去掉 `style` 改动定位方式
- 保存按钮的可用 / 禁用状态允许使用最小条件分支；优先用 `className` 条件切换，如果测试或 NativeWind 兼容性不足，再保留最小 `style`
- 常用标签和建议标签的视觉继续沿用当前语义，不改变层级或交互

建议补的测试锚点：

- `text-editor-sheet`
- `text-editor-content-input`
- `text-editor-tags-input`
- `text-editor-save-button`

### 5. Token 与样式边界

这批迁移优先复用现有 [tailwind.config.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/tailwind.config.js) 已有 token：

- `primary`
- `text`
- `photo`
- `voice`
- `neutral`
- `background`
- `home`
- `copy`
- `border`

原则是：

- 不在组件里新增分散的十六进制颜色
- 只有当前视觉确实无法由现有 token 表达时，才补最小新 token
- 即使需要补 token，也必须是语义化命名，而不是页面私有命名

允许保留 `style` 的场景：

- `Animated` / `Modal` / `KeyboardAvoidingView` 的运行时样式
- 依赖状态的类型色分支
- `absoluteFillObject`
- 少量测试环境仍需通过 `style` 暴露的尺寸或定位信息

### 6. 测试与验收策略

本轮测试策略分为两层。

第一层是组件级测试：

- 新增 [SearchOverlay.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/SearchOverlay.test.tsx)
  - 锁定搜索框、重置按钮、底部操作按钮存在
  - 锁定输入和筛选交互仍可触发搜索流程
- 新增 [TextEditor.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/TextEditor.test.tsx)
  - 锁定底部 sheet 壳层
  - 锁定保存按钮禁用 / 启用行为
  - 锁定取消会清空本地状态
- 扩充 [EntryEditor.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/EntryEditor.test.tsx)
  - 锁定 header、type badge、tag dock 的结构仍在
  - 保留正文和标签保存行为断言

第二层是守卫与全量验收：

- 迁移完成后，从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 删除这 3 个文件
- 跑相关组件测试、`npm run lint`、`npm run typecheck` 和全量 `npm test -- --runInBand`

### 7. 风险与控制

这批最大的风险不是逻辑错误，而是“迁移过程中不自觉改变了页面层级和视觉节奏”。对应控制方式如下：

- 搜索层、整页编辑器、底部 sheet 三种形态分别处理，不混用布局模板
- 不重命名入口关系，不改 modal 展示方式
- 只在需要稳定测试时新增 `testID`，不做无关拆分
- 每迁完一个文件就同步收紧 allowlist，避免回退

## 本地结构化 Review 结论

- 已对第二批范围、入口关系、迁移边界、测试策略和 allowlist 收口方式做本地结构化 review
- 未发现阻塞进入 implementation plan 的问题
- 当前需要继续确认的唯一事项，是用户对书面 spec 是否还要调整
