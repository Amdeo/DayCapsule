# 侧栏二级页 NativeWind 第四批迁移设计

## 状态

- 当前状态：已实现并完成验证
- 设计确认日期：2026-03-23
- 实现完成日期：2026-03-23

## 评审记录

- 2026-03-23：已确认继续做下一批 NativeWind 渐进迁移，而不是切回主分支收尾。
- 2026-03-23：已确认第四批选择方案 A，优先处理侧栏二级页链路。
- 2026-03-23：已确认第四批范围为 `DetailPageShell`、`AboutPage`、`HelpPage`、`TagsPage`。
- 2026-03-23：已确认把共享壳层 `DetailPageShell` 一并纳入本轮，而不是后置。
- 2026-03-23：已确认本轮目标仍然是把现有样式迁到 `NativeWind`，不借迁移之名重设计页面。
- 2026-03-23：已确认侧栏入口关系保持不变，`Sidebar` 继续负责拉起 `AboutPage`、`HelpPage`、`TagsPage`。
- 2026-03-23：已确认 `DetailPageShell` 继续保留 `Modal`、进出场动画、safe area 和 `contentContainerStyle` / `scrollEnabled` 接口。
- 2026-03-23：已确认本轮采用先补测试、再做最小迁移、迁完即移出 allowlist 的收口方式。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 spec review 先采用本地结构化 review 留痕。
- 2026-03-23：实现已按设计完成，4 个目标文件均已迁出 allowlist，验证命令全部通过。

## 背景

首页第一批、搜索编辑第二批、详情操作第三批 `NativeWind` 迁移已经分别覆盖了：

- 首页壳层、Timeline、EntryCard、FAB、Sidebar
- 搜索 / 编辑链路：`SearchOverlay`、`EntryEditor`、`TextEditor`
- 详情 / 操作链路：`TextEntryDetailPage`、`EntryActionSheet`、`CloudSyncStatusButton`

但侧栏拉起的二级页链路里，仍有一组共享壳层明确、用户高频可见的 legacy 文件停留在 allowlist：

- [DetailPageShell.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/DetailPageShell.tsx)
- [AboutPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/AboutPage.tsx)
- [HelpPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/HelpPage.tsx)
- [TagsPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/TagsPage.tsx)

这 4 个文件形成了一条很完整的共享链路：

- `Sidebar` 负责入口和显隐状态
- `DetailPageShell` 负责 modal、顶部栏和内容容器
- `AboutPage`、`HelpPage`、`TagsPage` 负责具体内容块

如果只迁页面、不迁共享壳层，那么这条链路还会继续被 `DetailPageShell` 卡住；如果只迁共享壳层、不迁页面，那么用户可见页面仍停留在旧写法里。因此，第四批最自然的切法不是拆开做，而是把这条链路一次性收口。

## 目标

- 把 `DetailPageShell`、`AboutPage`、`HelpPage`、`TagsPage` 的静态视觉样式迁到 `NativeWind`
- 保持侧栏入口关系、页面信息结构和关键交互不变
- 为这批组件补齐共享壳层与关键交互测试
- 迁移完成后，把这 4 个文件从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 中移除

## 非目标

- 不重做 `Sidebar` 结构或菜单层级
- 不改 `AboutPage`、`HelpPage`、`TagsPage` 的信息架构
- 不改 `HelpPage` FAQ 展开交互和邮件跳转行为
- 不改 `TagsPage` 的标签统计逻辑和点击关闭行为
- 不扩展到 `SettingsPage`、`BackupPage`、`StatsPage` 等其他侧栏页面

## 最终方案

### 1. 总体迁移策略

本轮继续沿用前三批的原则：

- 只迁静态样式表达，不改业务行为
- 能用 `className` 表达的静态壳层全部迁走
- 动画、运行时尺寸、safe area 和第三方限制场景继续保留 `style`
- 不为迁移重做组件结构，只做“为迁移服务的小收口”

固定边界如下：

- `Sidebar` 不纳入本轮
- `DetailPageShell` 保留 `Modal`、`GestureHandlerRootView`、`FadeIn/FadeOut/SlideInRight/SlideOutRight`
- `AboutPage`、`HelpPage`、`TagsPage` 只改静态视觉表达
- 允许补最小 `testID`
- 允许继续使用运行时 `style` 处理 `insets.top`、`insets.bottom`、全屏高度和透传容器样式

### 2. `DetailPageShell` 迁移设计

[DetailPageShell.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/DetailPageShell.tsx) 是这批的共享壳层，优先迁移。

迁移后它仍然保留：

- `Modal`
- `GestureHandlerRootView`
- `FadeIn` / `FadeOut`
- `SlideInRight` / `SlideOutRight`
- `contentContainerStyle`
- `scrollEnabled`

具体处理方式：

- `container`、`backdrop`、`page`、`header`、`backButton`、`headerTitle`、`headerRight`、`headerSpacer`、`content`、`staticContent` 改为 `className`
- `screen height` 继续保留在运行时 `style`
- `paddingTop: insets.top + 20` 和 `paddingBottom: 40 + insets.bottom` 继续保留在运行时 `style`
- `contentContainerStyle` 仍然透传给 `ScrollView` / 静态内容容器，不改外部调用方式
- `StyleSheet.absoluteFill` 若保留更符合框架约束，可继续保留

允许补的稳定测试锚点：

- `detail-page-shell`
- `detail-page-header`
- `detail-page-header-right`

现有锚点继续沿用：

- `detail-page-backdrop`
- `detail-page-back-button`
- `detail-page-scroll`
- `detail-page-content`

### 3. `AboutPage` 迁移设计

[AboutPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/AboutPage.tsx) 是纯静态信息页，本轮只迁内容块样式，不改内容顺序。

迁移后它仍然保留：

- logo emoji 与应用名
- 版本号与 tagline
- 功能特性列表
- 技术栈列表
- 开发者说明
- GitHub / 文档跳转按钮
- 版权区

具体处理方式：

- `logoSection`、`logoContainer`、`section`、`sectionTitle`、`featureList`、`featureItem`、`featureIcon`、`techStack`、`techItem`、`linkButton`、`footer` 等改为 `className`
- `FeatureItem` 和 `TechItem` 不单独拆文件，只做原地迁移
- `Linking.openURL()` 行为保持不变
- emoji、文案和链接目标保持不变

允许补的稳定测试锚点：

- `about-page-root`

### 4. `HelpPage` 迁移设计

[HelpPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/HelpPage.tsx) 保持 FAQ 折叠列表和联系卡片结构不变。

迁移后它仍然保留：

- FAQ 列表
- 点击展开 / 收起答案
- 联系说明文案
- 邮件反馈按钮

具体处理方式：

- `sectionTitle`、`faqList`、`faqItem`、`faqHeader`、`faqQ`、`faqA`、`contactCard`、`contactButton` 改为 `className`
- FAQ 的 `open` 状态逻辑原样保留
- 邮件跳转继续使用 `Linking.openURL('mailto:...')`
- 不改 FAQ 文案内容和排序

允许补的稳定测试锚点：

- `help-page-root`

### 5. `TagsPage` 迁移设计

[TagsPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/TagsPage.tsx) 保持“空态 / 列表态”两种结构不变。

迁移后它仍然保留：

- `useMemo` 统计标签数量
- 空态 emoji、提示文案
- 标签统计列表
- 点击标签行触发 `onClose`

具体处理方式：

- `hint`、`tagRow`、`tagLeft`、`tagDot`、`tagName`、`tagRight`、`empty`、`emptyText`、`emptyHint` 改为 `className`
- 空态使用内部容器承接原来的居中布局；若仍需通过 `contentContainerStyle` 驱动 `flexGrow`，则保留透传对象
- 不改 `tagStats` 的计算逻辑

允许补的稳定测试锚点：

- `tags-page-root`
- `tags-page-empty`

### 6. 测试与验收策略

本轮测试策略分为两层。

第一层是组件级测试：

- 扩充 [DetailPageShell.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/DetailPageShell.test.tsx)
  - 锁定 header 壳层仍存在
  - 锁定 `headerRight` 区域仍渲染
  - 锁定 `scrollEnabled={false}` 时继续渲染静态内容容器
  - 继续保留“使用屏幕高度而不是 bottom 锚定”的断言
- 新增 `AboutPage.test.tsx`
  - 锁定功能特性、技术栈、链接区渲染
  - 锁定点击链接会调用 `Linking.openURL`
- 新增 `HelpPage.test.tsx`
  - 锁定 FAQ 列表和联系卡片渲染
  - 锁定 FAQ item 点击后会展开答案
  - 锁定邮件按钮点击会调用 `Linking.openURL`
- 新增 `TagsPage.test.tsx`
  - 锁定空态渲染
  - 锁定有标签时渲染列表和数量
  - 锁定点击标签行会触发 `onClose`

第二层是守卫与全量验收：

- 迁移完成后，从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 删除：
  - `src/components/DetailPageShell.tsx`
  - `src/components/AboutPage.tsx`
  - `src/components/HelpPage.tsx`
  - `src/components/TagsPage.tsx`
- 跑第四批相关测试、`npm run lint`、`npm run typecheck` 和全量 `npm test -- --runInBand`

### 7. 风险与控制

这批最大的风险不是逻辑实现，而是“共享壳层迁移时把所有二级页视觉一起带偏”。对应控制方式如下：

- 先迁 `DetailPageShell`，把共享壳层稳定下来
- 页面只做原地迁移，不改信息顺序和结构
- 不新增页面私有 token
- 优先复用 `primary`、`neutral`、`copy.*`、`border.*`、`home.*`
- 若确实要精确保留现有视觉，优先使用 NativeWind arbitrary values，而不是回退到新的 `StyleSheet`

## 实现结果

- `DetailPageShell` 已完成共享壳层迁移，保留 `Modal`、`GestureHandlerRootView`、进出场动画、屏幕高度计算、safe area 和 `contentContainerStyle` / `scrollEnabled` 接口，并补充 `detail-page-shell`、`detail-page-header`、`detail-page-header-right` 测试锚点。
- `TagsPage` 已完成空态和列表态迁移，保留标签统计与点击关闭行为，并补充 `tags-page-root`、`tags-page-empty` 测试锚点。
- `AboutPage` 已完成静态信息区块迁移，保留功能特性、技术栈、更多信息和链接跳转行为，并补充 `about-page-root` 测试锚点。
- `HelpPage` 已完成 FAQ 与联系卡片迁移，保留 FAQ 展开逻辑和邮件跳转行为，并补充 `help-page-root` 测试锚点。
- `app/eslint/style-guard-allowlist.js` 已移除这 4 个目标文件，侧栏二级页共享链路本轮不再依赖 legacy 放行。

## 验证结果

- `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/DetailPageShell.test.tsx src/components/__tests__/TagsPage.test.tsx src/components/__tests__/AboutPage.test.tsx src/components/__tests__/HelpPage.test.tsx`：PASS
- `cd app && npm run lint`：PASS
- `cd app && npm run typecheck`：PASS
- `cd app && npm test -- --runInBand`：PASS

## 实现备注

- 本轮没有新增 Tailwind 语义 token。
- `DetailPageShell` 的内容容器迁移为 `ScrollView` 内层包裹 `View`，以保留 `contentContainerStyle` 透传和静态 `className` 壳层同时成立。
- `HelpPage` FAQ item 的分隔线沿用了最小 arbitrary border 色值，以避免视觉相对 `#EBEBEB` 漂移。

## 本地结构化 Review 结论

- 已对第四批范围、共享壳层边界、测试策略和 allowlist 收口方式做本地结构化 review
- 当前范围已按“失败测试 -> 最小实现 -> lint 收口 -> 提交”的节奏完成
- 未发现阻塞执行与验收的问题
