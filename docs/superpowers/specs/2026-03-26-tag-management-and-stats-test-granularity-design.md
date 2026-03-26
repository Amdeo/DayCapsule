# Tag Management And Stats Test Granularity Design

## 背景

上一轮前端测试细化已经补齐了首页、设置、编辑器和图片相关的核心覆盖，但标签相关能力仍然明显偏粗，主要集中在两个区域：

1. 预制标签管理页已有基础渲染、添加和拖拽排序测试，但删除确认、恢复默认、上限状态、输入行为、加载条件等细节仍未覆盖
2. 标签统计页目前只覆盖空态和基础计数展示，聚合规则、可见性控制、关闭行为一致性等页面语义还没有锁定
3. 设置页虽然已经验证可以打开标签管理弹窗，但入口稳定性与真实导航链路仍然只有轻量 smoke，缺少与细粒度组件测试的清晰分工

这批工作不是重新设计标签功能，而是把“标签相关 UI 自动化测试”的颗粒度拉细，并明确哪些行为应该由 `Jest` 承担，哪些只保留为 `Maestro` 的真实链路验证。

## 目标

- 为预制标签管理页补齐细粒度组件/控制器测试
- 为标签统计页补齐聚合和展示语义测试
- 保持设置页到标签管理页的真实导航回归，但不让 `Maestro` 承担低价值分支覆盖
- 明确标签相关测试的分层职责，避免 store、组件和 E2E 重复堆叠
- 为后续 implementation plan 提供可直接拆任务的场景列表和文件边界

## 非目标

- 不新增或修改标签产品能力
- 不重构 `commonTagsStore` 的持久化模型
- 不把“全部标签中心”或标签搜索等新能力纳入本次范围
- 不把标签页所有交互都搬到 `Maestro`
- 不为当前实现不存在的 tie-break 排序规则硬写脆弱断言

## 方案比较

### 方案 A：`Jest` 组件/控制器为主，`Maestro` 只保留关键链路

这是推荐方案。

做法：

- 预制标签管理和标签统计的细节行为主要在组件测试中补齐
- store 只在现有测试确实无法覆盖 UI 行为时才做最小补充
- `Maestro` 继续只负责“设置页进入标签管理并返回”这类真实导航链路

优点：

- 稳定性最高
- 能覆盖大量细粒度条件分支
- 执行速度快，回归成本低
- 与当前测试资产最一致

缺点：

- 系统 `Alert` 和真实拖拽体感主要依赖 mock 与控制器语义验证

### 方案 B：`store + component + Maestro` 三层同时扩张

做法：

- 在 store、组件和 `Maestro` 三层都加较多覆盖

优点：

- 表面覆盖面最大

缺点：

- `commonTagsStore` 已有不少逻辑测试，继续堆叠容易重复
- `Maestro` 扩张后维护成本明显上升
- 用户价值和新增覆盖不成比例

### 方案 C：偏 `Maestro` 的端到端扩张

做法：

- 让标签管理主链路尽量通过 Android flow 验证

优点：

- 真实度最高

缺点：

- 当前删除确认依赖系统 `Alert`，拖拽也更受设备时序影响
- 稳定性最差
- 不适合这轮“细颗粒度”目标

## 最终方案

采用方案 A。

标签相关测试固定拆成三层：

1. `Jest component/controller`
   负责绝大多数输入、禁用态、确认分支、聚合展示和拖拽边界语义
2. `Jest store`
   只保留状态迁移和持久化语义，避免与页面行为测试重复
3. `Maestro`
   只保留从设置页进入标签管理、返回设置页、再返回首页这类真实导航 smoke

分层原则：

- 能用 `Jest` 稳定验证的场景，不上 `Maestro`
- 页面级交互优先锁在组件测试
- store 不重复断言已经由页面测试覆盖的 UI 结果
- `Maestro` 每条 flow 只保留一条核心链路，不承载大量分支

## 范围拆分

### 1. 预制标签管理页

目标文件：

- `app/src/components/TagManagementPage.tsx`
- `app/src/components/tag-management-page/useTagManagementController.ts`
- `app/src/components/tag-management-page/TagManagementPageContent.tsx`
- `app/src/components/tag-management-page/TagManagementTagList.tsx`
- `app/src/components/tag-management-page/TagManagementTagRow.tsx`
- `app/src/components/__tests__/TagManagementPage.test.tsx`

本次重点验证这几个方面：

- 数据加载条件
- 输入与添加行为
- 上限状态下的禁用表现
- 删除确认与恢复默认确认
- 拖拽排序的边界行为

### 2. 设置页入口联动

目标文件：

- `app/src/components/settings-page/SettingsPageContent.tsx`
- `app/src/components/__tests__/SettingsPage.test.tsx`
- `app/.maestro/flows/smoke/settings-to-tag-management.yaml`

本次只验证：

- 设置页入口按钮稳定存在
- 设置页内点击入口能打开标签管理
- Android smoke 继续保证真实返回链路

不在这里扩展复杂标签操作。

### 3. 标签统计页

目标文件：

- `app/src/components/TagsPage.tsx`
- `app/src/components/tags-page/useTagsPageController.ts`
- `app/src/components/tags-page/TagsPageContent.tsx`
- `app/src/components/__tests__/TagsPage.test.tsx`

本次重点验证：

- 标签聚合结果
- 空态与非空态切换
- `visible` 对页面渲染的影响
- 标签行点击关闭的一致性

## 细粒度场景清单

### A. 预制标签管理页

#### `TM-01 visible=false 时不触发加载`

- 前置条件：`visible=false`，`isLoaded=false`
- 操作步骤：渲染页面
- 预期结果：不调用 `loadCommonTags`

#### `TM-02 visible=true 且未加载时触发一次加载`

- 前置条件：`visible=true`，`isLoaded=false`
- 操作步骤：渲染页面
- 预期结果：调用 `loadCommonTags`

#### `TM-03 已加载状态不重复触发加载`

- 前置条件：`visible=true`，`isLoaded=true`
- 操作步骤：渲染页面
- 预期结果：不调用 `loadCommonTags`

#### `TM-04 空输入不添加`

- 前置条件：输入框为空或仅空白字符
- 操作步骤：点击“添加”
- 预期结果：不调用 `addCommonTag`

#### `TM-05 输入值 trim 后再添加`

- 前置条件：输入 `"  灵感  "`
- 操作步骤：点击“添加”
- 预期结果：调用 `addCommonTag('灵感')`

#### `TM-06 提交成功后清空输入框`

- 前置条件：输入合法标签
- 操作步骤：点击“添加”
- 预期结果：store 调用成功后，输入框 value 变为空字符串

#### `TM-07 onSubmitEditing 触发添加`

- 前置条件：输入合法标签
- 操作步骤：触发 `TextInput` 的 `submitEditing`
- 预期结果：调用添加逻辑

#### `TM-08 达到上限时输入框与按钮禁用`

- 前置条件：标签数达到 `MAX_TAGS`
- 操作步骤：渲染页面
- 预期结果：输入框 `editable=false`，按钮 `disabled=true`

#### `TM-09 达到上限时 placeholder 与样式切换`

- 前置条件：标签数达到 `MAX_TAGS`
- 操作步骤：渲染页面
- 预期结果：placeholder 显示“最多 N 个预制标签”，并应用禁用态样式

#### `TM-10 上限状态下点击添加不会调用 store`

- 前置条件：标签数达到 `MAX_TAGS`
- 操作步骤：触发添加动作
- 预期结果：不调用 `addCommonTag`，并弹出上限提示

#### `TM-11 删除确认弹窗取消分支`

- 前置条件：存在目标标签
- 操作步骤：点击删除按钮，执行弹窗中的“取消”
- 预期结果：不调用 `removeCommonTag`

#### `TM-12 删除确认弹窗确认分支`

- 前置条件：存在目标标签
- 操作步骤：点击删除按钮，执行弹窗中的“删除”
- 预期结果：调用 `removeCommonTag(tag)`

#### `TM-13 恢复默认取消分支`

- 前置条件：当前标签已被修改
- 操作步骤：点击“恢复初始预制标签”，执行弹窗中的“取消”
- 预期结果：不调用 `resetToDefaults`

#### `TM-14 恢复默认确认分支`

- 前置条件：当前标签已被修改
- 操作步骤：点击“恢复初始预制标签”，执行弹窗中的“恢复”
- 预期结果：调用 `resetToDefaults`

#### `TM-15 长按后未跨行释放不触发 reorder`

- 前置条件：存在多行标签
- 操作步骤：长按拖拽句柄，但释放前未达到跨行阈值
- 预期结果：不调用 `reorderCommonTags`

#### `TM-16 长按跨行释放时触发 reorder`

- 前置条件：存在多行标签
- 操作步骤：长按句柄并拖动跨行后释放
- 预期结果：调用 `reorderCommonTags(fromIndex, toIndex)`

### B. 设置页入口联动

#### `ST-01 设置页保留预制标签管理入口`

- 前置条件：设置页正常渲染
- 操作步骤：读取“其他”分区
- 预期结果：存在标题、说明文案和 `settings-open-tag-management`

#### `ST-02 点击设置入口打开标签管理弹窗`

- 前置条件：设置页已打开
- 操作步骤：点击预制标签管理入口
- 预期结果：出现标签管理对话框或页面容器

#### `ST-03 Android smoke 保持进入与返回链路`

- 前置条件：Android dev build 已启动
- 操作步骤：首页进入设置，设置进入标签管理，再逐级返回
- 预期结果：回到设置页后还能回到首页

### C. 标签统计页

#### `TG-01 visible=false 时页面不渲染`

- 前置条件：存在任意 entry 数据
- 操作步骤：以 `visible=false` 渲染页面
- 预期结果：页面根节点不存在

#### `TG-02 无标签数据时显示空态`

- 前置条件：`entries=[]` 或所有记录都没有标签
- 操作步骤：渲染页面
- 预期结果：显示“还没有标签”空态

#### `TG-03 跨多条记录聚合同名标签`

- 前置条件：多条记录含同一标签
- 操作步骤：渲染页面
- 预期结果：相同标签合并计数，不重复渲染多个同名行

#### `TG-04 忽略 undefined 标签数组`

- 前置条件：部分记录 `tags` 为 `undefined`
- 操作步骤：渲染页面
- 预期结果：不抛错，且只统计存在的标签

#### `TG-05 按标签出现次数降序排序`

- 前置条件：至少三个标签，出现次数不同
- 操作步骤：渲染页面并读取行顺序
- 预期结果：高频标签排在前面

#### `TG-06 点击任意标签行都统一触发关闭`

- 前置条件：存在多个标签行
- 操作步骤：分别点击不同标签
- 预期结果：都调用同一个 `onClose`

## 测试文件策略

### `TagManagementPage.test.tsx`

继续作为标签管理页主测试文件，新增场景以“输入/上限/确认弹窗/拖拽边界/加载条件”分组组织。

如果测试体量继续增长，可以在 implementation plan 中进一步拆成：

- `TagManagementPage.behavior.test.tsx`
- `TagManagementPage.drag.test.tsx`

但本次设计阶段先不强制拆文件，只要求按场景分组、避免一个 `it` 覆盖多个语义。

### `SettingsPage.test.tsx`

继续只保留入口级测试，不把标签管理页内部行为写进设置页测试。

### `TagsPage.test.tsx`

补齐展示和控制器语义；如果后续统计规则继续变复杂，再考虑拆控制器测试。

### `commonTagsStore.test.ts`

本次默认不大幅扩充。只有当组件测试发现 store 语义缺口时，才做最小补充。

## Maestro 策略

`app/.maestro/flows/smoke/settings-to-tag-management.yaml` 继续保持轻量：

- 从首页进入设置
- 从设置进入标签管理
- 从标签管理返回设置
- 从设置返回首页

不把以下场景放入 smoke：

- 输入新增标签
- 删除系统弹窗确认分支
- 拖拽排序细节
- 上限状态展示

这些都应由 `Jest` 承担。

## 风险与约束

### 1. 删除按钮当前缺少稳定 testID

组件测试可以通过现有结构和 mock 驱动覆盖，但如果后续要把删除动作搬到 `Maestro`，需要先补更稳定的选择器。

### 2. 拖拽排序测试容易和视觉位移细节耦合

本次只锁“是否调用 reorder 以及调用参数”，不对动画中间帧做脆弱断言。

### 3. 标签统计当前只定义了“按 count 降序”

对于同频标签，不额外假设字母序或创建顺序，避免测试要求先于实现。

## 验收标准

- 预制标签管理页的关键输入、上限、确认弹窗、拖拽边界和加载条件都有自动化覆盖
- 设置页入口测试与 Android smoke 职责清晰，不再重复承载标签页内部行为
- 标签统计页的空态、聚合、排序和关闭行为都有自动化覆盖
- 新增测试遵循“小场景、单语义”原则，不通过一个大用例混测多个分支
- `Maestro` 仍然保持轻量且稳定

## 后续衔接

这份设计确认后，implementation plan 会按以下顺序拆任务：

1. 先补 `TagManagementPage` 的细粒度组件测试
2. 再补 `SettingsPage` 的入口级测试与必要 smoke 调整
3. 最后补 `TagsPage` 的聚合与展示测试
4. 完成后统一执行相关 `Jest` 与 `Maestro` 验证
