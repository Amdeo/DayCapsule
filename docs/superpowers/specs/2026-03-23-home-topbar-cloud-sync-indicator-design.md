# 首页顶部云同步状态指示器设计

## 状态

- 当前状态：已实现
- 设计确认日期：2026-03-23
- 实现完成日期：2026-03-23

## 评审记录

- 2026-03-23：已确认本轮目标是在首页顶部最右侧增加一个“云同步状态”图标，仅在开启云端模式时显示。
- 2026-03-23：已确认点击顶部图标后，直接复用现有“设置 -> 同步状态”弹窗，不新增页面或第二套交互。
- 2026-03-23：已确认状态表达采用标准四态：`同步中 / 已同步 / 待同步 / 失败`。
- 2026-03-23：已确认顶部右侧采用并列布局，保留现有“视图切换”按钮，并将同步图标放在其右侧。
- 2026-03-23：已确认动态图标语言采用“云朵呼吸 + 外环扫描”，并且只在 `同步中` 时播放主动画。
- 2026-03-23：已确认最终方向采用“静态云朵 + 状态点”作为基础表达：
  - `已同步`：绿点
  - `待同步`：橙点
  - `失败`：红点
  - `同步中`：云朵呼吸 + 外环扫描
- 2026-03-23：已完成本地结构化 review。由于本轮会话未显式获得子代理授权，spec review 先采用本地 review 留痕，不在本轮调用 subagent。
- 2026-03-23：用户 review 了 written spec 并回复 `ok`，批准进入 `writing-plans` 阶段。

## 背景

当前首页顶部使用自定义搜索栏，而不是系统导航栏：

- [SearchBar.tsx](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/SearchBar.tsx) 负责顶部一排按钮与搜索入口
- [Timeline.v2.tsx](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/Timeline.v2.tsx) 负责把 `SearchBar` 作为首页顶部区域渲染出来
- 右侧当前只有“视图切换”按钮，没有直接暴露同步状态入口

与此同时，云同步状态目前只存在于设置页的二级入口中：

- [SettingsPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/SettingsPage.tsx) 已有“同步状态”按钮
- 点击后可以看到：
  - 上次同步时间
  - 待同步条数
  - 失败条数
  - 冲突副本数
  - “立即同步”动作

这导致两个问题：

- 用户在首页无法快速知道当前是不是还有待同步数据、同步是否失败
- 已经有一套可用的同步状态弹窗，但缺少一个更高频、低成本的入口

当前云同步相关状态来源也比较分散：

- [syncStore.ts](/Users/cooper/Documents/code/MemoryCapsule/app/src/store/syncStore.ts) 持有 `lastSyncAt`、`lastSyncError` 等同步过程状态
- [cloudSyncService.ts](/Users/cooper/Documents/code/MemoryCapsule/app/src/services/cloudSyncService.ts) 负责 `syncNow()` 和同步摘要统计
- 图片 / 语音后台上传队列分别管理 `pending_upload`、`uploading` 等媒体状态
- 首页列表本身存在分页 / 过滤，不适合作为顶部状态的唯一判断口径

因此，本轮需要补一个“首页顶部同步状态指示器”，但不能把它做成只看当前列表的局部状态，也不能再复制一份和设置页不一致的同步详情逻辑。

## 目标

- 在首页顶部最右侧增加一个云同步状态按钮
- 仅在 `cloudMode === true` 时显示该按钮
- 让用户在首页一眼识别当前是：
  - `同步中`
  - `已同步`
  - `待同步`
  - `失败`
- 点击后直接复用现有同步状态弹窗和“立即同步”动作
- 动画只在真正同步时播放，避免顶部长期过于吵闹
- 使用完整本地同步状态作为判定依据，而不是依赖首页当前已加载的列表切片
- 不使用固定轮询

## 最终方案

### 1. 用户可见行为

首页顶部右侧按钮区调整为：

- 左侧：菜单按钮
- 中间：搜索入口
- 右侧：
  - 视图切换按钮
  - 云同步状态按钮

云同步状态按钮遵循以下显示规则：

- 仅在 `cloudMode === true` 且用户已登录时显示
- 离线模式、未登录、云端切换中时隐藏
- 按钮尺寸、底色、阴影、圆角与现有顶部按钮保持一致，继续采用 `48x48` 白底圆形按钮语言

点击行为：

- 点击后直接打开与设置页一致的“同步状态”弹窗
- 弹窗内容继续展示：
  - 上次同步
  - 待同步条数
  - 失败条数
  - 冲突副本
  - 立即同步
- 不新增页面，不新增二级菜单，不引入新的同步详情样式

### 2. 顶部结构与组件边界

本轮建议新增以下边界：

#### 2.1 `CloudSyncStatusButton`

新增一个独立顶部按钮组件，职责只负责：

- 根据传入的 `uiState` 渲染静态云朵 / 状态点 / 同步中动画
- 处理点击
- 暴露稳定的测试标识

不负责：

- 自己读数据库
- 自己决定云端模式是否开启
- 自己请求同步详情

这样可以避免把同步动画逻辑塞进 [SearchBar.tsx](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/SearchBar.tsx)。

#### 2.2 `SearchBar` 保持通用，通过“右侧动作区”组合按钮

[SearchBar.tsx](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/SearchBar.tsx) 不直接知道“同步状态”业务语义，而是扩展为可接收一个右侧动作区或额外 trailing action。

组合关系改为：

- `SearchBar` 负责布局
- `Timeline` / 首页负责把：
  - 现有视图切换按钮
  - 新的 `CloudSyncStatusButton`
  组合到右侧

这样能保持 `SearchBar` 作为通用顶部栏组件，不为同步业务硬编码过多专用 props。

#### 2.3 提取复用的同步状态弹窗入口

当前设置页里“同步状态”弹窗逻辑是内联在 [SettingsPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/SettingsPage.tsx) 里的。

本轮建议提取成一个可复用 helper，例如：

- `showCloudSyncStatusAlert()`

职责：

- 读取 `cloudSyncService.getStatus()`
- 组装统一弹窗文案
- 处理“立即同步”按钮
- 处理失败兜底提示

调用方：

- 设置页原有“同步状态”按钮
- 首页新的顶部同步按钮

这样可以保证两处入口永远展示同一套状态与文案，避免后续分叉。

### 3. 状态模型与优先级

顶部按钮只暴露以下 UI 状态：

- `hidden`
- `syncing`
- `synced`
- `pending`
- `failed`

#### 3.1 判定来源

判定不直接依赖首页当前渲染的 `entries` 列表，而是使用完整本地同步摘要：

- 同步过程状态：
  - `isSyncing`
  - `lastSyncError`
- 本地待处理状态：
  - `pending`
  - `pending_delete`
  - `pending_upload`
  - `uploading`
  - `failed`

为此，本轮建议新增一个专门的同步摘要读取层，例如：

- `getCloudSyncIndicatorSummary()`

职责：

- 从本地 DB 统计影响顶部图标的状态分布
- 返回顶部按钮所需的摘要字段

建议摘要字段至少包含：

- `pendingEntries`
- `pendingUploads`
- `uploadingEntries`
- `failedEntries`

#### 3.2 优先级规则

UI 状态优先级固定为：

1. `hidden`
   - 条件：未登录，或 `cloudMode !== true`
2. `syncing`
   - 条件：`isSyncing === true`，或存在 `uploading`
3. `failed`
   - 条件：存在 `lastSyncError`，或存在 `failed`
4. `pending`
   - 条件：存在 `pending / pending_delete / pending_upload`
5. `synced`
   - 条件：以上都不满足

设计意图：

- `uploading` 优先归为 `syncing`，因为用户看到的是“系统正在工作”
- `pending_upload` 归为 `pending`，避免“媒体还没上传完却显示已同步”
- 删除待同步 `pending_delete` 也归为 `pending`，与当前同步计数语义保持一致

### 4. 动效与视觉规则

基础视觉：

- 主图形统一为云朵
- 所有非同步中状态都保持按钮主体静态
- 状态差异通过右上小状态点表达

状态表现：

- `syncing`
  - 云朵轻呼吸
  - 外环扫描旋转
  - 不额外叠加红 / 橙 / 绿状态点
- `synced`
  - 静态云朵
  - 右上绿点
- `pending`
  - 静态云朵
  - 右上橙点
- `failed`
  - 静态云朵
  - 右上红点

动效约束：

- 只有 `syncing` 播放主动画
- `pending / failed / synced` 不播放主动画
- 不采用“云端模式一直轻微动效”的方案，避免顶部长期扰动
- 动效节奏偏稳，不做高频跳跃、闪烁或强脉冲

### 5. 状态刷新策略

本轮不使用固定轮询，而采用“显式刷新 + 生命周期刷新”的组合。

建议新增一个轻量同步指示器状态层，例如：

- `cloudSyncIndicatorStore`

职责：

- 缓存当前顶部按钮状态
- 提供 `refresh()` 方法
- 供顶部按钮直接消费

刷新触发点：

- App 启动完成后
- App 从后台回到前台后
- `syncNow()` 开始时与结束时
- 本地新增 / 编辑 / 删除记录后
- 图片 / 语音上传队列状态变化后
- 首页初次挂载时

这样可以满足：

- 不轮询
- 背景同步状态能及时反映到顶部
- 首页按钮状态不依赖当前列表是否正好加载到对应记录

### 6. 错误处理与一致性要求

- 如果顶部摘要刷新失败：
  - 保留上一次已知 UI 状态
  - 不做闪烁式回退
- 如果点击顶部按钮后拉取同步详情失败：
  - 继续复用当前设置页已有失败提示
- 如果已有 `inFlightSync`：
  - 顶部入口触发“立即同步”时继续复用现有 `inFlightSync` 语义
  - 不再创建第二次同步请求
- 设置页与首页顶部必须复用同一套同步详情 helper，确保文案、口径、按钮行为一致

## 影响范围

- [SearchBar.tsx](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/SearchBar.tsx)
- [Timeline.v2.tsx](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/Timeline.v2.tsx)
- [index.tsx](/Users/cooper/Documents/code/MemoryCapsule/app/app/(tabs)/index.tsx)
- [SettingsPage.tsx](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/SettingsPage.tsx)
- [syncStore.ts](/Users/cooper/Documents/code/MemoryCapsule/app/src/store/syncStore.ts)
- [cloudSyncService.ts](/Users/cooper/Documents/code/MemoryCapsule/app/src/services/cloudSyncService.ts)
- 图片 / 语音上传队列相关文件
- 本地 DB 操作文件（用于提供顶部同步摘要）
- 新增：
  - `CloudSyncStatusButton` 组件
  - 顶部同步摘要 store / helper
  - 同步状态弹窗复用 helper
  - 对应测试

## 不在范围内

- 新增独立“同步中心”页面
- 在首页顶部直接显示具体待同步数字
- 为 `pending_delete`、`pending_upload`、`uploading` 设计独立图标形态
- 引入固定轮询同步状态
- 修改现有同步协议、后端接口或同步数据结构
- 重做设置页同步状态弹窗的视觉样式

## 验收标准

- 云端模式开启且已登录时，首页顶部最右侧显示同步状态按钮；离线模式或未登录时隐藏
- 顶部右侧按钮顺序为“视图切换”在左，“同步状态”在右
- 按钮点击后打开与设置页一致的同步状态弹窗，并可执行“立即同步”
- `同步中 / 已同步 / 待同步 / 失败` 四态映射符合设计优先级
- `同步中` 时播放“云朵呼吸 + 外环扫描”，其它状态不播放主动画
- 删除一条已同步记录后，在同步真正完成前，顶部按钮显示 `待同步`
- 图片 / 语音媒体后台上传进行中时，顶部按钮显示 `同步中`
- 同步失败后，顶部按钮显示 `失败`
- 顶部状态不依赖当前列表是否刚好加载到相关记录，而以完整本地同步摘要为准

## 实现结果

- 已新增 `cloudSyncIndicatorStore`，将 `syncStore`、本地 DB 摘要、登录态与云端模式汇总为顶部 UI 四态。
- 已新增 `CloudSyncStatusButton`，在首页顶部右侧以“视图切换在左、同步状态在右”的顺序渲染。
- 已提取 `showCloudSyncStatusAlert()`，首页顶部按钮与设置页“同步状态”入口复用同一套弹窗与“立即同步”动作。
- 已在首页挂载、应用启动、前后台切换、网络恢复、entry 写操作、语音/照片上传队列状态变化后刷新顶部摘要。

## 实现偏差说明

- 计划外补充了两个首页 helper 测试文件的 mock 隔离：
  - `app/app/(tabs)/__tests__/index.photo.test.ts`
  - `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts`
- 原因是 `index.tsx` 新增对 `cloudSyncIndicatorStore` 的静态 import 后，这两组测试会误入真实 SQLite / 原生模块；本次仅补最小测试桩，不改业务实现。
- Android 模拟器手动验证覆盖了顶部按钮可见性、右侧位置、`synced` 绿点和弹窗复用；`pending / syncing / failed` 三种状态未在本轮手动重放，改由自动化测试兜底。

## 最终验证结果

- 自动化验证通过：
  - `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/CloudSyncStatusButton.test.tsx src/services/__tests__/showCloudSyncStatusAlert.test.ts src/store/__tests__/cloudSyncIndicatorStore.test.ts src/store/__tests__/syncStore.test.ts src/services/__tests__/cloudSyncService.test.ts src/database/__tests__/operations.test.ts src/store/__tests__/entryStore.test.ts src/services/__tests__/photoUploadQueue.test.ts src/services/__tests__/voiceUploadQueue.test.ts src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/SearchBar.safe-area.test.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx app/__tests__/_layout.photo-upload.test.tsx app/(tabs)/__tests__/index.photo.test.ts app/(tabs)/__tests__/index.voice-cloud-mode.test.ts`
  - 结果：`15` 个 test suite、`118` 个测试全部通过
- 类型与 diff 校验通过：
  - `cd app && npx tsc --noEmit`
  - `git diff --check`
- Android 模拟器手动验证通过：
  - 开启云端模式后，首页顶部最右侧显示同步状态按钮，位于视图切换按钮右侧
  - 当前已同步场景展示绿点
  - 点击顶部按钮后，弹出与设置页一致的“云同步状态”弹窗，包含上次同步、待同步条数、失败条数、冲突副本和“立即同步”
