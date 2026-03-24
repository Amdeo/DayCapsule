# 同步状态完整概览设计

## 背景

当前“同步状态”对话框只展示：

- 上次同步
- 待同步条数
- 待上传媒体
- 上传中
- 失败条数
- 冲突副本
- 最近错误

这解决了“所有数字都显示 0”时缺少失败上下文的问题，但仍然无法回答用户最关心的问题：

- 云端现在到底有多少记录
- 云端有多少图片、多少音频
- 云端媒体占了多大空间
- 本地和云端是否一致

另外，用户在“清空数据后重新加载”场景下，会先通过云端导出恢复本地数据库，再从本地数据源渲染列表，因此同步状态不能只依赖本地 pending 状态，必须单独拉取云端概览。

## 目标

在“同步状态”对话框中显示一份实时概览，至少包含：

- 本地记录总数、图片数、音频数、媒体总大小
- 云端记录总数、图片数、音频数、媒体总大小
- 现有同步队列状态和最近错误

打开对话框时实时请求云端概览；点击“立即同步”成功后再刷新一次概览。

## 非目标

- 不做首页常驻实时统计
- 不做后台轮询
- 不做云端媒体逐条明细列表
- 不在这一轮处理同步冲突详情页

## 方案选择

### 方案 A：打开对话框实时拉取本地 + 云端概览

优点：

- 数据最新
- 最符合“起码告诉我云端有多少数据”的诉求
- 容易理解，不会出现缓存过期造成的误导

缺点：

- 打开对话框时会多一次后端请求

### 方案 B：显示缓存概览，手动同步后刷新

优点：

- 打开快

缺点：

- 容易继续显示旧数据
- 不能解决“为什么明明云端有数据，对话框还是 0”的核心问题

### 方案 C：按钮和对话框共享常驻后台状态

优点：

- 体验最完整

缺点：

- 改动面大
- 会引入额外状态同步复杂度

## 选型

采用方案 A。

## 设计

### 1. 后端新增同步概览接口

新增一个受鉴权保护的接口，例如：

- `GET /api/sync/overview`

返回结构：

```json
{
  "entryCount": 12,
  "photoCount": 7,
  "voiceCount": 3,
  "mediaCount": 10,
  "mediaBytes": 12345678
}
```

统计口径：

- `entryCount`：当前用户未删除记录总数
- `photoCount`：`type = photo` 的记录数
- `voiceCount`：`type = voice` 的记录数
- `mediaCount`：媒体文件总数
- `mediaBytes`：媒体文件总大小

这样前端不需要通过 `/entries/export` 拉全量数据再本地统计，避免开销和副作用。

### 2. 前端新增“同步概览”聚合服务

新增一个前端服务，例如：

- `app/src/services/cloudSyncOverviewService.ts`

职责：

- 读取本地概览
- 拉取云端概览
- 读取当前同步状态
- 聚合成一个展示模型供对话框使用

返回结构建议：

```ts
type SyncOverview = {
  lastSyncAt: number | null;
  lastSyncError: string | null;
  pendingEntries: number;
  pendingUploads: number;
  uploadingEntries: number;
  failedEntries: number;
  conflictCopies: number;
  local: {
    entryCount: number;
    photoCount: number;
    voiceCount: number;
    mediaBytes: number;
  };
  cloud: {
    entryCount: number;
    photoCount: number;
    voiceCount: number;
    mediaBytes: number;
  } | null;
  cloudError: string | null;
};
```

### 3. 本地概览计算

本地概览优先使用已有本地数据能力完成，避免大改 schema：

- `entryCount`：基于 SQLite 查询
- `photoCount` / `voiceCount`：基于 SQLite 查询
- `mediaBytes`：遍历本地记录的 `media.uri` / `thumbnail`，汇总存在文件的大小

这里允许本地媒体总大小是近似展示值，但不能因为单个文件缺失就整体失败。

### 4. 状态对话框展示模型

“同步状态”对话框分成三块：

#### 同步状态

- 上次同步
- 待同步条数
- 待上传媒体
- 上传中
- 失败条数
- 冲突副本
- 最近错误

#### 本地数据

- 本地记录总数
- 本地图片数
- 本地音频数
- 本地媒体总大小

#### 云端数据

- 云端记录总数
- 云端图片数
- 云端音频数
- 云端媒体总大小

如果云端获取失败：

- 这一块显示“获取失败”
- 仍然保留错误原因
- 不影响“同步状态”和“本地数据”展示

### 5. 加载与错误处理

打开“同步状态”时：

1. 先显示“正在获取同步状态”
2. 并行拉取：
   - 当前同步状态
   - 本地概览
   - 云端概览
3. 汇总后展示

点击“立即同步”时：

1. 执行现有 `syncNow()`
2. 成功后重新拉取概览
3. 失败时仍显示“云同步失败”，并保留上次概览

### 6. 与当前问题链路的关系

这个设计能直接解决：

- “同步状态所有数据都为 0”
- “起码告诉我云端有多少数据”
- “还有媒体数据”

但它不替代媒体下载调试链路。媒体列表恢复、图片显示、音频播放仍然走各自的数据流。

## 影响文件

后端：

- `backend/cmd/server/main.go`
- `backend/internal/handlers/...`
- `backend/internal/service/...`
- `backend/internal/repository/...`
- `backend/.../__tests__/...`

前端：

- `app/src/services/cloudSyncService.ts`
- `app/src/services/showCloudSyncStatusAlert.ts`
- `app/src/services/cloudSyncOverviewService.ts`（新）
- `app/src/database/operations.ts`
- `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts`
- `app/src/services/__tests__/cloudSyncService.test.ts`
- `app/src/services/__tests__/cloudSyncOverviewService.test.ts`（新）

## 测试策略

后端：

- 概览接口返回空数据
- 概览接口返回混合文本/图片/音频数据
- 只统计未删除数据
- 媒体总大小统计正确

前端：

- 打开状态对话框时会请求本地 + 云端概览
- 云端成功时显示完整概览
- 云端失败时仍显示本地和同步状态
- “立即同步”成功后刷新概览
- “立即同步”失败时显示失败反馈且不丢失已有概览

## 风险

- 本地媒体总大小统计如果直接遍历大量文件，可能变慢
  处理方式：只在打开对话框时计算一次，并允许缺失文件跳过

- 云端概览接口需要明确是否包含已删除但未清理数据
  处理方式：按“当前有效数据”统计，不把逻辑删除的数据算进去

- 前后端统计口径不一致会让对比失真
  处理方式：明确都按“记录数 / 图片记录数 / 音频记录数 / 媒体总大小”统一定义

## 决策

本轮实现以“对话框实时概览”为目标，不扩展到首页按钮或后台轮询。
