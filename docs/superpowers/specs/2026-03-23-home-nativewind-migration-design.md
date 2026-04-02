# 首页 NativeWind 迁移与样式守卫设计

## 状态

- 当前状态：已实现并验证
- 设计确认日期：2026-03-23
- 实现完成日期：2026-03-23

## 评审记录

- 2026-03-23：已确认本轮不是首页视觉重设计，而是把现有前端样式体系迁到 `NativeWind`。
- 2026-03-23：已确认后续新增界面必须使用 `NativeWind`。
- 2026-03-23：已确认现有页面采用渐进迁移策略，而不是一次性全量替换。
- 2026-03-23：已确认第一批优先迁移首页 Timeline / 卡片流相关页面。
- 2026-03-23：已确认本轮交付同时包含“迁移策略”和“首页第一批改造方案”，但以首页改造为主。
- 2026-03-23：已确认迁移时接受把现有颜色、圆角、间距等常量收敛进 [tailwind.config.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/tailwind.config.js) 作为统一 token。
- 2026-03-23：已确认规则采用高约束模式：能转成 `NativeWind` 的都转，只有明确做不到的场景才保留 `style`。
- 2026-03-23：已确认需要自动化守卫，而不是只靠文档或人工约束。
- 2026-03-23：已确认自动化守卫采用 `ESLint` 方案。
- 2026-03-23：已确认首页保持现有视觉、结构和交互，不借迁移之名重新设计页面。
- 2026-03-23：已完成本地结构化 review，未发现阻塞进入 planning 的问题。由于本轮会话未显式获得子代理授权，spec review 先采用本地 review 留痕。
- 2026-03-23：实现已完成，首页第一批目标文件均已从样式守卫 allowlist 中移除。

## 实现结果

- 已落地 `ESLint + style guard + allowlist baseline`，并用本地规则守住新增 `StyleSheet.create` 与静态内联样式。
- 已完成首页壳层迁移：`SearchBar`、`Timeline.v2`、`app/(tabs)/index.tsx` 已改为 `NativeWind` 驱动静态视觉，`TimelineSectionHeader` 与 `TimelineEmptyState` 已拆出为纯展示组件。
- 已完成 `EntryCard` 迁移：新增 [entryCardVariants.ts](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/entryCardVariants.ts)，统一 text/photo/voice 三类卡片的壳层与按下态映射。
- 已完成 `FABMenu` 与 `Sidebar` 迁移：主 FAB、选项气泡、抽屉壳层、菜单项和 footer 已迁到 `className`，动态位移与安全区 padding 保留在 `style`。
- 已补齐首页迁移相关测试：新增 [TimelineSectionHeader.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/TimelineSectionHeader.test.tsx)、[TimelineEmptyState.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/TimelineEmptyState.test.tsx)、[entryCardVariants.test.ts](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/entryCardVariants.test.ts)、[Sidebar.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/Sidebar.test.tsx)、[index.render.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/(tabs)/__tests__/index.render.test.tsx)。

## 验证结果

- `cd app && npx jest --run-in-band --runTestsByPath eslint-rules/__tests__/style-guardrails.test.ts`：通过
- `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/SearchBar.safe-area.test.tsx src/components/__tests__/TimelineSectionHeader.test.tsx src/components/__tests__/TimelineEmptyState.test.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx 'app/(tabs)/__tests__/index.render.test.tsx'`：通过
- `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/entryCardVariants.test.ts src/components/__tests__/EntryCard.test.tsx src/components/__tests__/EntryCard.border-radius.test.tsx src/components/__tests__/EntryCard.missing-media.test.tsx`：通过
- `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/FABMenu.peek-hide.test.tsx src/components/__tests__/Sidebar.test.tsx`：通过
- `cd app && npx jest --run-in-band --runTestsByPath src/__tests__/runtime-regressions.test.ts`：通过
- `cd app && pnpm run lint`：通过
- `cd app && pnpm run typecheck`：通过
- `cd app && pnpm test --runInBand`：通过

## 偏差与已知问题

- 原计划建议在 [index.photo.test.ts](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/(tabs)/__tests__/index.photo.test.ts) 或 [index.voice-cloud-mode.test.ts](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts) 上补首页根容器断言；实际实现中新增了独立的 [index.render.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/(tabs)/__tests__/index.render.test.tsx)，避免把 helper-only 测试环境和 UI 渲染断言耦合在一起。
- 当前 Jest 环境不会把 `className` 自动解析进断言样式，因此少量尺寸/颜色回归点保留了最小 `style` 常量用于测试可见性；这不改变运行时的 `NativeWind` 迁移方向。
- 收口阶段一并修复了 [runtime-regressions.test.ts](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/__tests__/runtime-regressions.test.ts) 的过时字符串守卫，使其与当前 `displayedDuration` 去重逻辑一致。

## 背景

当前应用已经接入 `nativewind`，并且仓库文档也写明“样式规范使用 NativeWind `className`，避免 `StyleSheet`”。但首页及多数存量组件仍然主要依赖 `StyleSheet.create`、内联 `style` 和分散的十六进制颜色常量：

- [app/(tabs)/index.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/(tabs)/index.tsx) 首页容器仍有明显静态容器样式
- [Timeline.v2.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/Timeline.v2.tsx) 同时承载时间轴布局、空态、分组头、筛选区和大量内联样式
- [EntryCard.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/EntryCard.tsx) 使用多组硬编码颜色函数来控制不同类型卡片的视觉
- [FABMenu.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/FABMenu.tsx) 和 [Sidebar.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/Sidebar.tsx) 也仍以 `StyleSheet` 为主

这带来 4 个直接问题：

- 新页面和旧页面的样式表达方式不统一，维护成本高
- 首页视觉常量分散在组件内部，后续微调容易出现“不同时改全”
- 仓库没有真正阻止新增 `StyleSheet` 或静态内联 `style` 的门禁
- 继续在现状上叠加功能，会让后续迁移越来越难

同时，这次需求不是重新设计首页视觉语言。用户已经明确要求“直接转”，即：

- 不重做首页气质
- 不改变主要交互
- 不引入新的卡片样式方向
- 重点是把现有视觉稳定地迁到 `NativeWind`

因此，本轮设计的重点不是“做出更好看的首页”，而是“在不改变结果的前提下，把首页迁到统一样式体系，并建立长期守卫”。

## 目标

- 所有新增前端界面默认使用 `NativeWind`
- 把首页作为第一批迁移目标，优先覆盖 Timeline / EntryCard / FAB / Sidebar
- 在不主动改变视觉结果的前提下，把静态样式从 `StyleSheet` / 静态内联对象迁到 `className`
- 把首页常用颜色、圆角、阴影、间距等视觉常量收敛进 Tailwind token
- 建立 `ESLint` 自动守卫，阻止新增 `StyleSheet.create` 和可静态化的大块内联样式
- 允许必要的动态样式例外，但边界必须明确

## 非目标

- 不做首页视觉重设计
- 不在本轮把全仓所有页面一次性迁完
- 不引入完整设计系统工程或大规模 UI primitive 改造
- 不修改首页已有业务流程、录音逻辑、上传逻辑或分页逻辑
- 不为迁移专门调整信息架构或新增交互

## 最终方案

### 1. 总体迁移原则

迁移采用“原地渐进”策略：

- 视觉不变，只改变样式表达方式
- 首页优先，其他页面随后渐进跟进
- 静态视觉样式优先转成 `className`
- 动态、动画、第三方限制场景可保留 `style`
- 一旦某个文件迁移完成，就纳入严格守卫，不允许回退到旧写法

这意味着本轮不会把首页重新组织成新布局，也不会先做一层完整组件库再回头改首页，而是直接在现有首页结构上做低风险迁移。

### 2. 迁移范围与优先级

第一批迁移文件固定为：

- [app/(tabs)/index.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/(tabs)/index.tsx)
- [Timeline.v2.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/Timeline.v2.tsx)
- [EntryCard.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/EntryCard.tsx)
- [FABMenu.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/FABMenu.tsx)
- [Sidebar.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/Sidebar.tsx)

迁移顺序建议固定为：

1. 先补齐 [tailwind.config.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/tailwind.config.js) token
2. 迁移首页最外层容器 [app/(tabs)/index.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/(tabs)/index.tsx)
3. 迁移 [Timeline.v2.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/Timeline.v2.tsx) 的壳层、空态、分组头、顶部控制区域
4. 迁移 [EntryCard.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/EntryCard.tsx) 的静态视觉主体
5. 迁移 [FABMenu.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/FABMenu.tsx) 与 [Sidebar.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/Sidebar.tsx)

原因：

- 先改外层和时间轴壳层，能尽快建立首页整体结构的 `NativeWind` 基线
- `EntryCard` 逻辑最复杂，放在中段更稳妥
- `FAB` 和 `Sidebar` 交互、定位、动画更动态，放到最后更适合

### 3. 文件边界与拆分策略

本轮只允许“为迁移服务的小拆分”，不做大规模架构重构。

#### 3.1 首页容器 `index.tsx`

[app/(tabs)/index.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/app/(tabs)/index.tsx) 保留：

- 页面状态
- 录音与媒体选择逻辑
- 上传队列回调
- 抽屉开关动画
- 少量容器级动态样式

不再继续承载大块静态视觉样式。换句话说，这个文件的样式职责应该被压缩到“动态外壳”，而不是“页面视觉实现”。

#### 3.2 时间轴容器 `Timeline.v2.tsx`

[Timeline.v2.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/Timeline.v2.tsx) 继续负责：

- 条目分组
- 列表切换
- 顶部搜索/筛选区域组合
- SectionList 编排

为了让迁移更清晰，允许把纯展示块抽成小组件，例如：

- `ViewModeToggle`
- `TimelineSectionHeader`
- `TimelineEmptyState`
- `TimelineEntryMeta`

这些小组件的共同特征是：

- 没有业务副作用
- 不直接读 store
- 更适合用 `className` 表达纯展示结构

#### 3.3 卡片主体 `EntryCard.tsx`

[EntryCard.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/EntryCard.tsx) 不做业务重写，但要把“样式变体”从散落的函数里收口成统一配置。

当前类似下面这些风格映射是分散的：

- `getBorderColor()`
- `getCardBgColor()`
- `getCardPressedColor()`

迁移后建议改成“条目类型 -> 样式变体”映射表，由 token 驱动。这样可以避免继续在文件内部散落硬编码颜色，同时更符合 `NativeWind` 的组织方式。

#### 3.4 FAB 与 Sidebar

[FABMenu.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/FABMenu.tsx) 与 [Sidebar.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/Sidebar.tsx) 保持现有交互和布局，只迁静态视觉样式，不借机调整动画或菜单结构。

### 4. Token 收敛策略

[tailwind.config.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/tailwind.config.js) 已经定义了一批颜色，但当前首页实际使用的视觉常量仍有不少散落在组件里。

本轮要求把首页真正用到的常量收敛成语义 token，而不是继续写硬编码十六进制值。建议至少补齐以下类别：

- 页面背景
- 卡片表面
- 时间轴辅助线
- 文本 / 照片 / 语音三类条目色
- 边框弱分隔色
- 卡片圆角等级
- 卡片阴影等级
- 首页常用横向 / 纵向间距

命名原则：

- 用语义名，不用页面名或具体颜色名
- 能表达用途，不表达实现细节

例如可以是：

- `surface`
- `surface-card`
- `timeline-line`
- `entry-text`
- `entry-photo`
- `entry-voice`
- `border-subtle`
- `radius-card`
- `shadow-card`

本轮不要求把全仓 token 一次性抽完整，但首页迁移中不允许继续新增散落硬编码值。

### 5. `NativeWind` 与 `style` 的边界

本轮采用高约束模式：能转的都转。

默认必须使用 `className` 的场景：

- 颜色
- 字号
- 字重
- 圆角
- 阴影
- 边框
- 静态的 `padding` / `margin`
- 静态布局
- 静态定位
- 静态宽高

允许保留 `style` 的例外场景：

- `Reanimated` 的 animated style
- 依赖运行时尺寸计算的宽高、位移、定位
- `Dimensions` / `SafeAreaInsets` / 数据驱动的动态值
- 手势中间态样式
- 第三方组件明确只接受 `style`
- 使用 `NativeWind` 会显著降低可读性，且确有动态依赖的场景

禁止的情况：

- 因为习惯问题继续写静态 `style={{ ... }}`
- 为了省事继续保留 `StyleSheet.create`
- 明明只是静态颜色 / 圆角 / 间距，却仍写成内联对象

### 6. `ESLint` 自动守卫

当前 `app/` 工作区没有现成 ESLint 基建，因此本轮自动守卫应正式补齐 `ESLint`，并把它作为质量门禁之一。

建议目标：

- 新增 `pnpm run lint`
- 在 CI 中接入 lint
- 规则以样式迁移守卫为中心，而不是先追求全量代码风格治理

核心规则：

#### 6.1 禁止新增 `StyleSheet.create`

对以下对象直接报错：

- 所有新文件
- 已完成迁移的文件

对尚未迁移的历史文件，可临时通过显式 allowlist 放行，但必须可追踪。

#### 6.2 限制静态内联样式

对以下模式报错：

- 静态 `style={{ backgroundColor: '#fff', padding: 12 }}`
- 本可完全用 `className` 替代的大块样式对象

对以下模式放行：

- `style={[animatedStyle]}`
- `style={{ width: dynamicWidth }}`
- 依赖 `insets`、动画值、手势位移的动态对象

#### 6.3 迁移白名单机制

为了避免历史债务阻塞迁移，本轮允许采用显式 allowlist：

- 尚未迁移的存量文件暂时列入 allowlist
- 某个文件迁移完成后，从 allowlist 删除
- 删除后再次引入旧写法将被 lint 拦截

这样可以实现“新增严格禁止，存量逐步收紧”。

### 7. 验证策略

每轮迁移验收至少包含：

1. `pnpm run lint`
2. `pnpm run typecheck`
3. 首页相关测试
4. 全量测试回归

首页相关测试至少覆盖：

- Timeline 相关测试
- EntryCard 相关测试
- 首页 tab 测试

另外，本 worktree 基线校验时已经发现 1 个既有失败：

- [`runtime-regressions.test.ts`](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/__tests__/runtime-regressions.test.ts) 仍在断言旧的录音时长实现，当前与实际源码不一致

该失败应在实现阶段单独标记为“基线失败”，不能与本次 `NativeWind` 迁移引入的问题混为一谈。

### 8. 风险与控制

主要风险有 4 类：

#### 8.1 迁移时顺手改了视觉结果

控制方式：

- 设计上明确不重设计
- token 抽取只收敛现有值，不借机换新风格
- 迁移按组件分批进行，便于发现偏差

#### 8.2 `EntryCard` 迁移引入行为回归

控制方式：

- 不动核心业务逻辑
- 只调整视觉表达与样式变体组织方式
- 保留已有测试并补齐必要的快照/交互断言

#### 8.3 `NativeWind` 与动态样式边界不清

控制方式：

- 在文档中先固定例外范围
- lint 规则只拦截明确可静态化的场景
- 遇到动态场景优先保留 `style`，而不是硬凑 `className`

#### 8.4 守卫规则过早一刀切

控制方式：

- 用 allowlist 管理历史文件
- 先守新增与已迁移文件
- 随迁移推进逐步收紧

## 交付物

本轮设计对应的交付物固定为：

1. 首页第一批组件的 `NativeWind` 迁移方案
2. 首页常用视觉 token 收敛方案
3. `ESLint` 样式守卫方案
4. 迁移白名单与收紧机制
5. 验证与回归策略

## 结论

本轮最终方向是：

- 不重做首页视觉
- 新增界面强制 `NativeWind`
- 首页作为第一批优先迁移
- 能转的都转，动态样式保留必要例外
- 用 `ESLint` 作为自动化守卫
- 按“原地渐进”方式推进，而不是一次性大重构

该 spec 可以直接进入 `writing-plans` 阶段，产出具体实施计划。
