# 弹窗与提示体系收敛设计（保守方案）

- 日期：2026-04-03
- 范围：DayCapsule 移动端全局弹窗 / 全局提示体系
- 目标：在不大规模重构页面级弹层的前提下，统一全局弹窗的挂载规则、触发规则和测试规则，降低“点击无反应、切页后才显示、关闭不彻底、页面间串状态”等问题。

## 1. 背景

当前应用中的“弹窗类 UI”并不完全是同一种东西：

- 一部分属于**全局弹窗**，可以从任意页面触发，理论上应由根布局统一承载。
- 一部分属于**页面级弹层**，本质是某个页面或 Detail shell 的组成部分，不适合硬并入全局体系。

近期已确认的一个具体问题是：首页同步按钮点击后，状态已经写入 store，但对应宿主没有挂在根层，导致在首页不显示；进入设置页后宿主挂载，弹窗才延迟显示。这说明当前体系存在“触发层、宿主层、显示层不一致”的结构性问题。

## 2. 本次目标

本次采用**保守收敛方案**，只统一真正的“全局弹窗 / 全局提示”，不一次性重写所有 overlay。

达成目标后，应满足：

1. 所有全局弹窗都由根布局统一承载。
2. 页面组件不再偷偷挂载全局 host。
3. 全局弹窗一律通过 service 触发，而不是在页面中散落地直接控制 store/UI。
4. 从首页、设置页、后台恢复等任意入口触发时，行为一致。
5. 与“全局确认 / 全局错误反馈”语义一致的原生 Alert 逐步迁移为自定义实现。
6. 通过回归测试防止未来再次把 host 放错层级。

## 3. 明确边界

### 3.1 纳入本次统一的对象

以下对象属于全局弹窗语义，应进入统一规范：

- `FeedbackHost` / `ErrorFeedbackModal`
- `ConfirmDialogHost` / `ConfirmDialogModal`
- `CloudSyncMonitorHost` / `CloudSyncMonitorModal`
- 通过 `showErrorFeedback`、`showConfirmDialog`、`showCloudSyncMonitor` 触发的入口
- 语义上属于“全局确认 / 全局错误提示 / 全局流程监视”的原生 `Alert.alert`
- 依赖 confirm / feedback 的派生提示，例如 photo repair prompt 这类全局决策入口

### 3.2 不纳入本次统一的对象

以下对象先保持页面级或局部 overlay 身份，不强行纳入统一体系：

- `LoginPage`
- `HelpPage`
- `AboutPage`
- `TagManagementPage`
- `DetailPageShell`
- 其他本质上属于页面详情、页面编辑或整页承载的弹层

原因：这些对象虽然视觉上“像弹窗”，但从职责上更接近页面导航或详情页，不属于纯粹的全局 confirm / feedback / monitor。一次性迁移它们会显著放大回归风险。

## 4. 统一后的结构规则

### 4.1 分层模型

每种全局弹窗固定拆成 4 层：

1. **service**
   - 对外暴露触发入口
   - 例如：`showErrorFeedback`、`showConfirmDialog`、`showCloudSyncMonitor`
   - 职责：统一触发方式，不负责 UI

2. **store**
   - 保存当前弹窗状态
   - 例如：当前 request、是否可见、summary 等
   - 职责：承载显示状态与最小交互状态

3. **host**
   - 订阅 store，决定是否渲染 UI
   - 职责：桥接状态与 Modal 组件
   - 规则：只能挂在根布局

4. **modal component**
   - 只负责 UI 呈现和回调透传
   - 不直接知道业务来源

### 4.2 根布局规则

全局 host 统一挂在：

- `app/app/_layout.tsx`

根布局内允许存在的全局 host 列表应被显式维护，并通过测试守住：

- `FeedbackHost`
- `ConfirmDialogHost`
- `CloudSyncMonitorHost`

未来新增全局弹窗时，也只能通过根布局接入。

### 4.3 页面规则

页面组件、页面内容组件、设置页对话框容器等位置：

- 不再挂载全局 host
- 只允许调用 service 触发全局弹窗
- 不允许为“全局弹窗”单独在页面里做隐藏渲染入口

### 4.4 触发规则

所有全局弹窗统一遵守：

- 页面 / service / store 只能调用 `showXxx()`
- 不直接在页面中 render host
- 不直接在业务组件里临时拼 `Modal`
- 原生 `Alert.alert` 仅保留在明确属于页面局部、且本次不纳入迁移边界的场景

## 5. 收敛策略

### 5.1 第一步：清单化盘点

先建立完整清单，将所有“弹窗 / 提示 / alert / modal host / show service”标注为以下类别之一：

- `global-overlay`：应由根布局承载
- `page-local-overlay`：应由页面局部承载
- `native-alert-to-migrate`：语义上属于全局提示，应迁移
- `native-alert-keep`：暂时保留，不在本次变更范围
- `unclear`：需要人工判断

这一步只做梳理，不急于大改。

### 5.2 第二步：修正 host 挂载层级

优先修正结构性错误：

- 把所有全局 host 提到根布局
- 从页面级容器移除重复挂载
- 确保全局弹窗从任意页面触发时都能显示

这是本次最重要、收益最高、风险可控的一步。

### 5.3 第三步：统一触发入口

对所有全局弹窗入口做收口：

- 页面侧统一调用 service
- 避免直接操作 store 的散点入口继续扩散
- 新增规则：若某类弹窗是全局语义，必须先有 `showXxx` service，后有业务接入点

### 5.4 第四步：分批替换原生 Alert

仅迁移“明显属于全局 confirm / feedback”的原生 `Alert.alert`：

- 一次迁一小类
- 每迁一类补回归测试
- 不把页面级提醒强行塞进全局体系

## 6. 测试策略

### 6.1 根布局存在性测试

新增或补强根布局回归测试，验证：

- 根布局总是渲染 `FeedbackHost`
- 根布局总是渲染 `ConfirmDialogHost`
- 根布局总是渲染 `CloudSyncMonitorHost`

目的：防止未来再次把 host 放回页面里。

### 6.2 Host 行为测试

每个 host 至少验证：

- hidden 时不渲染
- show 后渲染
- dismiss 后关闭
- action 抛错时 host 不崩溃

### 6.3 触发链回归测试

针对关键入口，验证“触发 -> 根层显示”：

- 首页同步按钮
- 设置页同步入口
- photo repair prompt
- error feedback 的典型入口
- confirm dialog 的典型入口

### 6.4 Alert 迁移测试

对于每一类迁移掉的原生 Alert，补对应的 service / host / UI 测试，确保不会出现：

- 触发后不显示
- 多次显示互相覆盖异常
- dismiss 后状态残留

## 7. 风险控制原则

为了满足“别引入问题”的目标，本次必须遵守：

1. 不做“大一统 overlay store”重构。
2. 不把页面级详情层强行改造成全局弹窗。
3. 不顺手重构视觉样式或交互文案。
4. 每修一类结构问题，必须补对应回归测试。
5. 先修挂载层级，再做入口收口，再做 Alert 迁移。
6. 任何无法明确归类的弹层，先标记为 `unclear`，不要贸然迁移。

## 8. 交付结果预期

完成本次收敛后，应得到：

- 一份完整的全局弹窗 / 页面级弹层清单
- 一套明确的全局 host 挂载规则
- 一套统一的全局弹窗触发规则
- 一批优先级最高的原生 Alert 迁移结果
- 一组保护根布局和触发链路的回归测试

## 9. 实施顺序建议

推荐按以下顺序执行：

1. 盘点所有全局弹窗、全局提示、原生 Alert
2. 修正所有全局 host 的挂载层级
3. 收口触发入口到 service
4. 分批迁移全局语义的原生 Alert
5. 补测试并逐项验证

## 10. 本次设计不做的事

明确不做：

- 合并所有 store 为单一 overlay 总线
- 重写所有 modal UI 风格
- 重做页面级详情/登录/帮助类 overlay
- 借机进行 unrelated UI 重构

这份设计的目标是“先把真正不稳定的全局弹窗体系收紧”，而不是把所有弹层都一次性推倒重来。
