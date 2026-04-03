# 2026-04-03 同步状态重设计

## 状态

- 当前状态：已确认设计，待进入实现计划
- 用户确认日期：2026-04-03

## 评审记录

- 2026-04-03：用户明确指出当前同步状态设计“太麻烦”，希望重新设计成一眼能看懂当前同步状态的结构。
- 2026-04-03：确认重设计的第一目标不是展示更多统计，而是先回答“现在要不要处理”。
- 2026-04-03：用户要求增加上传列表，直接显示当前正在上传的数据与文件，而不是只看汇总数字。
- 2026-04-03：用户选择以“时间线流程”为主叙事，而不是继续使用统计大表或纯队列面板。
- 2026-04-03：确认弹窗需要实时刷新，而不是一次性快照。
- 2026-04-03：确认本地 / 云端总数、媒体大小等统计信息只保留少量关键项，降级为辅助信息。
- 2026-04-03：确认同步完成后再次打开时，应显示“完成摘要”，而不是清空或保留旧过程列表。
- 2026-04-03：确认数据库阶段也要支持真实 `1/10` 级别进度，而不是“共 10 条，提交中”的伪进度文案。

## 背景

当前“同步状态”来自 `app/src/services/showCloudSyncStatusAlert.ts`，最终通过通用 `ErrorFeedbackModal` 以 `label/value` 长列表形式展示：

- 上次同步
- 待同步条数
- 待上传媒体
- 上传中
- 失败条数
- 冲突副本
- 媒体校验摘要
- 本地统计
- 云端统计

这套方案能提供信息，但不能快速回答用户最关心的问题：

1. 现在到底有没有在同步
2. 现在同步走到哪一步
3. 卡在数据库还是卡在某个文件
4. 这一轮结束后，再次打开应该看到什么

同时，现有方案的技术边界也很明确：

- `ErrorFeedbackModal` 适合短消息与明细列表，不适合承载实时进度、时间线与队列列表
- 现有 overview 只暴露汇总计数，没有“当前项”“当前阶段”“运行中的队列视图”
- 数据库同步当前是整包 `POST /sync`，默认无法显示真实逐条进度
- 照片 / 语音上传队列已经具备逐项事件回调，是最接近真实队列视图的现有能力

因此，这一轮不是简单调布局，而是要把同步状态从“统计说明弹窗”重构成“同步监视器”。

## 目标

- 让用户在打开同步状态后，先看到当前结论，再看到过程，不再被统计长表淹没。
- 用固定 4 步时间线解释同步流程：准备本地数据、上传数据库、上传媒体文件、校验完整性。
- 在同步进行中实时显示当前阶段、当前项、阶段进度与队列摘要。
- 在同步结束后保留“最近结果摘要”，避免再次打开时看到旧过程残留或空白状态。
- 支持数据库阶段真实 `1/10` 级别进度。
- 保留少量关键统计作为辅助信息，而不是主要内容。

## 非目标

- 不做完整的历史同步记录页面。
- 不保存每一轮成功同步的完整文件级历史明细。
- 不引入服务端推送式实时进度流。
- 不在这一轮扩展成后台通知中心或系统级通知。
- 不重做现有顶部同步指示器的交互形态，只重做“点击后看到的同步状态界面”和它依赖的运行态模型。

## 用户确认的关键决定

### 1. 主叙事选择：时间线流程

最终采用“时间线流程”而不是继续展示大表统计，也不是纯队列面板。

原因：

- 用户首先要知道同步走到哪一步
- 过程比总数更重要
- 时间线比“当前状态卡片 + 统计”更符合“数据库 1/10、文件当前处理到哪”的心智模型

### 2. 统计降级为辅助信息

本地 / 云端记录数、媒体大小等统计不再作为主视图内容，只保留少量关键项，放在页面下方辅助区。

### 3. 成功后再次打开显示完成摘要

用户明确确认：同步成功后再次打开时，应该看到“最近一次同步已完成”的摘要，而不是：

- 空白页面
- 旧文件队列仍停留在界面上

### 4. 数据库阶段必须是真进度

用户明确拒绝“共 10 条，提交中”这类伪进度，要求数据库阶段也能像媒体阶段一样显示真实 `1/10`。

## 最终方案

### 1. 交互形态：独立的同步监视器弹窗

不再沿用 `showCloudSyncStatusAlert -> ErrorFeedbackModal` 这套长表链路承载主界面。

改为新增一个专用的 `CloudSyncMonitorModal`，负责展示：

- 头部结论
- 时间线
- 当前阶段详情
- 队列摘要
- 辅助统计
- 操作区

现有 `FeedbackHost` / `ConfirmDialogHost` 已经作为全局 host 挂在 `app/app/_layout.tsx`。本轮应新增一套平行的同步监视器 host，而不是继续往 `ErrorFeedbackModal` 里堆特殊 UI。

### 2. 信息结构：固定五段布局

新弹窗固定为五个视觉区块：

1. 头部结论
2. 时间线
3. 当前阶段详情
4. 少量统计
5. 操作区

这样无论空闲、进行中、完成、失败，用户都能稳定地按相同顺序阅读。

### 3. 固定 4 步时间线

时间线固定为以下四步：

1. `准备本地数据`
2. `上传数据库`
3. `上传媒体文件`
4. `校验完整性`

每一步只允许以下状态：

- `已完成`
- `进行中`
- `未开始`
- `失败`

不再用“部分成功”“状态待确认”之类抽象状态作为主要可视表达。抽象结果词只保留在摘要层。

## 页面状态设计

### 1. 空闲态

触发条件：

- 当前没有正在运行的同步
- 没有待展示的失败摘要
- 没有待处理任务

显示：

- 标题：`当前已同步`
- 副标题：`现在没有待处理任务`
- 时间线弱化显示，无进行中的步骤
- 当前阶段详情区域改成一句提示：`有新内容产生后，会在这里显示同步进度`
- 少量统计：本地记录数、云端记录数、上次成功同步时间、异常媒体数
- 操作区：`关闭`、`立即同步`

### 2. 进行中

触发条件：

- 当前存在 active run

显示：

- 标题：`正在同步`
- 副标题：`第 N / 4 阶段`
- 时间线高亮当前阶段
- 当前阶段详情展示：
  - 当前项
  - 当前阶段进度
  - 后续待处理项
  - 失败项
- 少量统计仍保留，但视觉权重降低
- 操作区：`关闭`、`后台继续`

数据库阶段与媒体阶段的内容表现不同：

- `上传数据库`：显示当前记录与 `1/10` 进度
- `上传媒体文件`：显示当前文件名、待上传项、失败项

### 3. 完成摘要态

触发条件：

- 当前没有 active run
- 最近一次结果为成功

显示：

- 标题：`最近一次同步已完成`
- 副标题：`完成时间`
- 时间线四步全部显示为完成
- 当前阶段详情区域改成摘要卡：
  - 本次数据库处理条数
  - 本次媒体处理数量
  - 是否发现异常媒体
- 少量统计：本地记录数、云端记录数、异常媒体数、上次成功同步时间
- 操作区：`关闭`、`再次同步`

重要规则：

- 完成后再次打开不显示旧文件列表
- 不保留上一轮成功过程中的逐项队列

### 4. 失败 / 部分成功态

触发条件：

- 当前没有 active run
- 最近一次结果为失败或部分成功

显示：

- 标题：`上次同步未完成`
- 副标题：`卡在 <阶段名称>`
- 时间线显示失败阶段
- 当前阶段详情区域展示：
  - 失败项数量
  - 最近错误
  - 失败项精简列表
  - 可重试 / 可修复信息
- 少量统计：本地记录数、云端记录数、异常媒体数
- 操作区：`关闭`、`立即重试`
- 若存在可修复媒体问题，增加 `修复异常媒体`

## 状态模型设计

### 1. 新增独立 `syncMonitorStore`

当前 `syncStore` 负责持久化同步结果，例如：

- `lastSyncAt`
- `lastSyncError`
- `initialSyncState`
- `lastMediaValidationSummary`

它不适合承载“这一轮同步如何推进”的过程态。因此本轮应新增独立的 `syncMonitorStore`，专门负责运行中的同步监视模型。

### 2. `activeRun`：运行态

`activeRun` 只在一轮同步进行中存在，用于驱动进行中页面。

建议结构：

```ts
type SyncMonitorPhase =
  | 'prepare'
  | 'sync-entries'
  | 'upload-media'
  | 'validate-media'
  | 'done';

type SyncMonitorQueueItem = {
  id: string;
  kind: 'entry' | 'photo' | 'voice';
  title: string;
  status: 'pending' | 'running' | 'failed';
  detail?: string;
};

type ActiveSyncRun = {
  runId: string;
  startedAt: number;
  phase: SyncMonitorPhase;
  phaseIndex: 1 | 2 | 3 | 4;
  totalPhases: 4;
  entryProgress: {
    completed: number;
    total: number;
    currentItemTitle: string | null;
  };
  mediaProgress: {
    completed: number;
    total: number;
    currentItemTitle: string | null;
  };
  queue: SyncMonitorQueueItem[];
};
```

职责：

- 驱动时间线高亮
- 显示数据库与媒体阶段的实时进度
- 提供当前项与失败项列表

### 3. `lastRunSummary`：最近结果态

`lastRunSummary` 用于同步结束后再次打开弹窗时显示摘要，不表示当前仍在运行。

建议结构：

```ts
type SyncRunResultStatus = 'success' | 'partial' | 'failed';

type LastSyncRunSummary = {
  runId: string;
  status: SyncRunResultStatus;
  startedAt: number;
  finishedAt: number;
  failedPhase: SyncMonitorPhase | null;
  entryProcessed: number;
  mediaProcessed: number;
  failedItems: Array<{
    id: string;
    title: string;
    detail?: string;
  }>;
};
```

职责：

- 支持成功后的完成摘要态
- 支持失败后的失败摘要态
- 避免再次打开时看到旧过程残留

## 生命周期与重置规则

### 1. 打开 / 关闭弹窗不重置数据

用户打开或关闭弹窗只是查看，不应影响同步过程，也不应清空最近结果。

### 2. 开始新一轮同步时重建 `activeRun`

开始新一轮同步时：

- 新建 `runId`
- 清空上一轮运行态队列
- 重置阶段状态
- 从 `prepare` 开始

### 3. 一轮结束时把 `activeRun` 收口成 `lastRunSummary`

结束时：

- 写入 `finishedAt`
- 汇总数据库处理数量
- 汇总媒体处理数量
- 根据结果写入 `success / partial / failed`

之后：

- `activeRun = null`
- `lastRunSummary = 本轮摘要`

### 4. 成功与失败的保留策略不同

成功：

- 只保留摘要
- 不保留逐文件成功队列

失败 / 部分成功：

- 保留失败摘要
- 保留失败项精简列表
- 下一轮开始时再被新 run 覆盖

这保证再次打开时：

- 不会把旧文件列表误显示成“还在上传”
- 也不会空白到无法判断刚刚是否成功

## 实时刷新策略

### 1. 过程态：事件驱动

进行中的时间线和队列不依赖轮询，而是依赖本地事件更新：

- `cloudSyncService` 负责切换阶段与数据库进度
- `photoUploadQueue` / `voiceUploadQueue` 负责媒体队列事件
- 媒体校验阶段由 `lastMediaValidationSummary` 进度和结果驱动

### 2. 统计态：按时机刷新

统计快照继续由 `cloudSyncOverviewService.getSnapshot()` 提供，但只在以下时机刷新：

- 打开弹窗时
- 一轮同步结束时
- 用户再次同步并完成时

不做持续轮询。

这样可以兼顾：

- 运行中的实时感
- 统计信息的新鲜度
- 网络与渲染成本

## 数据来源与现有能力复用

### 1. 继续复用的能力

本轮不推倒现有同步系统，应尽量复用：

- `cloudSyncService.getStatus()`：汇总级状态
- `cloudSyncOverviewService.getSnapshot()`：本地 / 云端统计
- `syncStore.lastMediaValidationSummary`：媒体校验结果
- `photoUploadQueue` / `voiceUploadQueue`：媒体逐项上传事件
- `useCloudSyncIndicatorStore`：顶部状态按钮

### 2. 需要补充的新运行态事件

虽然媒体队列已有逐项事件，但数据库同步目前没有“运行中的进度事件”。本轮必须为数据库阶段补上过程态更新能力。

## 数据库阶段的真实 `1/10` 方案

### 1. 当前限制

当前数据库同步在 `app/src/services/cloudSyncService.ts` 中会先收集全部 `clientChanges`，再一次性 `POST /sync`。这一实现只能得到“整包完成”，不能得到真实 `1/10`。

### 2. 最终选择：前端顺序批处理，继续复用现有 `POST /sync`

为了支持真实进度，但又避免新增服务端流式接口，本轮设计采用：

- 前端将待同步数据库变更拆成稳定顺序列表
- 按顺序、按批次调用现有 `POST /sync`
- 每处理完一批，就更新一次 `entryProgress.completed`

由于用户明确要求真实 `1/10`，第一版应把数据库同步批次定义为单条，即：

- `chunk size = 1`

这样 UI 能显示真正的：

- `数据库 1/10`
- `数据库 2/10`
- `数据库 3/10`

而不是估算或伪进度。

### 3. 为什么不新增新的 `/sync-progress` 接口

不推荐这轮引入新的服务端推送式进度接口，原因：

- 当前 `/sync` 已经具备 `clientChanges[]` 输入和 `results[]` 输出
- 数据库真实进度完全可以由客户端分批执行模型得出
- 新增服务端实时进度流会把范围扩成更大一轮架构改造

### 4. 分批同步的关键约束

#### `cursor` 必须随批次推进

每一批 `/sync` 返回的 `newCursor` 必须作为下一批请求的 `cursor`。否则：

- 后续 `serverChanges` 会错位
- 增量游标无法保持正确

#### `serverChanges` 仍要逐批应用

每一批都可能带回 `serverChanges` 与 `conflicts`。即使拆成单条调用，也不能跳过现有 apply 流程。

#### `conflicted` / `ignored` 也属于“已处理”

对于 UI 进度而言，一条记录只要已完成服务端处理回执，无论结果是：

- `applied`
- `conflicted`
- `ignored`

都应推进数据库进度。

失败摘要层再区分是否需要用户处理。

## 媒体阶段设计

### 1. 复用现有上传队列回调

照片与语音上传队列已具备：

- `onEntryUploading`
- `onEntryPendingUpload` / `onEntryPending`
- `onEntryPendingSync`

这些回调已经足以驱动：

- 当前文件名
- 待上传项
- 失败项

### 2. 媒体队列展示规则

进行中页面只展示有限个最相关项，例如：

- 当前运行项
- 接下来的 2-3 个待处理项
- 失败项

不展示整轮已成功上传过的完整历史清单。

## 校验阶段设计

媒体校验阶段继续复用 `lastMediaValidationSummary`，但展示方式改成过程导向：

- 正在校验的数量
- 缺失媒体数
- 异常媒体数
- 可修复媒体数
- 最近错误

如果存在 repairable issue，保持和现有修复入口兼容，可继续触发 `showPhotoRepairPrompt()`。

## 入口与宿主整合

### 1. 入口继续复用现有按钮位置

当前设置页与时间线按钮都通过 `showCloudSyncStatusAlert()` 打开同步状态：

- `app/src/components/SettingsPage.tsx`
- `app/src/components/timeline-v2/TimelineCloudSyncStatusAction.tsx`

本轮应保持“点击同步状态入口”的用户路径不变，但改成打开新的同步监视器。

### 2. 迁移策略

建议新增新的打开服务，例如：

- `showCloudSyncMonitor()`

并新增对应的 host，例如：

- `CloudSyncMonitorHost`

然后：

- 设置页入口改调 `showCloudSyncMonitor()`
- 时间线同步按钮改调 `showCloudSyncMonitor()`

旧的 `showCloudSyncStatusAlert()` 与 `ErrorFeedbackModal` 不再承载新的主同步界面。

## 文件边界建议

本轮设计对应的核心边界建议如下：

- `app/src/components/CloudSyncMonitorModal.tsx`
  - 专用同步监视器 UI
- `app/src/components/CloudSyncMonitorHost.tsx`
  - 全局宿主，平行于 `FeedbackHost`
- `app/src/store/cloudSyncMonitorStore.ts`
  - `activeRun` / `lastRunSummary` 的状态容器
- `app/src/services/showCloudSyncMonitor.ts`
  - 打开同步监视器的入口服务
- `app/src/services/cloudSyncService.ts`
  - 增加数据库阶段分批执行与运行态事件上报
- `app/src/services/photoUploadQueue.ts`
  - 接入监视器所需的媒体事件上报
- `app/src/services/voiceUploadQueue.ts`
  - 接入监视器所需的媒体事件上报
- `app/src/services/cloudSyncOverviewService.ts`
  - 继续提供统计快照，不负责过程态
- `app/app/_layout.tsx`
  - 挂载 `CloudSyncMonitorHost`
- `app/src/components/SettingsPage.tsx`
  - 入口改为打开新监视器
- `app/src/components/timeline-v2/TimelineCloudSyncStatusAction.tsx`
  - 入口改为打开新监视器

## 风险与缓解

### 风险 1：数据库分批同步增加请求次数

影响：

- 弱网下总耗时可能增加

缓解：

- 第一版优先满足真实 `1/10`
- 后续如有性能问题，可把实现保留为可配置批次，但产品语义不变化

### 风险 2：分批同步导致 cursor / serverChanges 处理复杂度上升

影响：

- 若游标推进和每批 apply 流程处理不当，可能引入同步漂移

缓解：

- 保持现有 `/sync` 结果处理逻辑不变
- 只把“一次整包”改成“外层顺序循环”
- 测试覆盖每批 newCursor、results、serverChanges 的连续语义

### 风险 3：运行态与摘要态职责混淆

影响：

- 再次打开时可能显示错误状态

缓解：

- 明确 `activeRun` 与 `lastRunSummary` 的职责边界
- 打开 / 关闭弹窗不得重置状态
- 只在新 run 开始时重建运行态

### 风险 4：继续复用旧弹窗导致 UI 结构扭曲

影响：

- 时间线、列表、摘要混杂在 `label/value` 架构里，会很快变不可维护

缓解：

- 明确采用独立 modal + host
- 不在 `ErrorFeedbackModal` 上继续叠加同步专用布局

## 测试策略

实现必须遵循 TDD。

最少需要证明：

1. 新监视器在 4 种页面状态下的 UI 渲染正确：
   - 空闲
   - 进行中
   - 完成摘要
   - 失败摘要
2. 数据库分批同步会真实推进 `1/10`
3. 媒体队列事件能驱动当前文件 / 失败项更新
4. 同步完成后再次打开只显示摘要，不保留旧过程列表
5. 设置页与时间线入口都能打开新监视器
6. 原有统计快照能力与顶部同步按钮状态不回归

## 成功标准

当以下条件全部满足时，本轮设计目标才算实现：

- 用户打开同步状态后，能先看到“现在是否在同步、同步到哪一步、当前卡在哪”。
- 同步进行中能实时看到数据库阶段和媒体阶段的真实进度。
- 数据库阶段显示真实 `1/10`，而不是伪进度文案。
- 同步完成后再次打开显示完成摘要，而不是旧过程列表或空白。
- 同步失败后再次打开显示失败摘要与失败项，而不是丢失失败上下文。
- 统计信息仍可见，但不再压过主过程视图。
- 新设计建立在独立的同步监视器与运行态模型之上，而不是继续扩展通用错误弹窗。
