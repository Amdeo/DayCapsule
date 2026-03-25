# 云同步媒体校验与级联删除设计

**日期**: 2026-03-25
**状态**: 已批准
**阶段**: 云同步可靠性修复

## 目标

修复两条当前会误导用户或造成远端残留的同步链路：

1. 云端同步完成后，不能只看 `/api/sync` 接口成功，就把同步状态标记为完成；还需要校验媒体是否真的下载并落地到当前设备。
2. 本地删除已同步记录后，后端也必须同步删除数据库记录和已上传的媒体文件，不能只删本地或只删 `entries` 表。

修复后：

1. 同步状态会同时展示“元数据同步结果”和“媒体同步结果”。
2. 元数据成功但媒体存在下载失败或文件缺失时，整体状态显示为“部分成功”。
3. 本地删除已同步记录时，前端会立即隐藏该记录，但远端删除必须级联清理 `entries`、`media_files` 和物理文件。
4. 远端删除失败时，本地保留 `pending_delete` 墓碑并持续重试，不把记录重新显示出来。

## 用户确认

- 2026-03-25：当接口同步成功但媒体下载失败或文件缺失时，整体状态显示为“部分成功”。
- 2026-03-25：本地删除已同步记录时，采用“本地先隐藏，远端异步重试直到数据库和文件都删干净”的语义。

## 背景

当前前端同步状态主要来自 `cloudSyncService.getStatus()` 与 `getCloudSyncIndicatorSummary()`，统计口径集中在：

- `pending`
- `pending_delete`
- `pending_upload`
- `uploading`
- `failed`

这只能说明本地 entry 元数据的推送状态，不能回答两个关键问题：

1. 云端下发的媒体是否已经成功下载到当前设备
2. 下载返回成功后，本地目标文件是否真的存在

与此同时，当前删除链路也存在明显缺口：

- 前端 `entryStore.deleteEntry()` 对已同步记录只会写本地 `pending_delete`
- 后端 `EntryService.Delete()` 和 `SyncV2Service.applyDeleteTx()` 当前只删除 `entries`
- `media_files` 表和上传目录中的物理文件没有被统一级联删除

结果是：

- 同步状态可能在媒体仍不可用时显示“完成”
- 本地删除后，远端数据库或媒体文件可能残留

## 非目标

- 不在本轮把每个媒体项都扩展成长期持久化的独立同步状态机
- 不在本轮新增首页常驻媒体同步面板
- 不在本轮重构现有 `MediaCacheService` 的缓存策略
- 不在本轮处理历史残留孤儿媒体的离线批量清理脚本

## 方案选择

### 方案 A：补前端媒体校验摘要 + 后端删除级联

做法：

- 前端保留当前 entry 级同步状态
- 新增“最近一轮媒体校验摘要”
- 在云端增量同步和云端恢复之后执行媒体落地校验
- 后端为 entry 删除补齐媒体表和物理文件的级联清理

优点：

- 直接覆盖当前两个用户痛点
- 改动集中，兼容现有本地优先同步模型
- 不需要扩大 SQLite schema 改造面

缺点：

- 媒体状态是“最近一轮校验摘要”，不是每条媒体的长期状态机

### 方案 B：为每条媒体建立独立同步状态机

做法：

- 给媒体新增 `pending_download`、`downloaded`、`missing`、`failed` 等状态
- DB、查询、概览、UI 全部改成双层状态模型

优点：

- 状态最精确

缺点：

- 范围显著扩大
- 会牵涉 schema、迁移、聚合查询和更多 UI 改造

### 方案 C：完全依赖后端返回媒体同步结果

做法：

- 让后端 `/api/sync` 或恢复接口直接返回媒体同步是否完成

优点：

- 前端状态模型更轻

缺点：

- 后端并不知道当前设备是否真的完成下载和落盘
- 无法解决“接口成功但本地文件不存在”的核心问题

## 选型

采用方案 A。

原因：

- 媒体是否真正落地只能由前端本机校验
- 远端级联删除必须由后端统一负责
- 这正好与当前系统的前后端职责边界一致

## 设计

### 1. 同步状态拆成“元数据结果 + 媒体结果”

保留现有元数据状态字段：

- `lastSyncAt`
- `lastSyncError`
- `pendingEntries`
- `pendingUploads`
- `uploadingEntries`
- `failedEntries`
- `conflictCopies`

新增一份“最近一轮媒体校验摘要”，建议持久化到 `syncStore`，按服务端环境作用域隔离，结构类似：

```ts
type MediaSyncValidationSummary = {
  status: 'idle' | 'running' | 'success' | 'partial' | 'failed';
  total: number;
  downloaded: number;
  missing: number;
  failed: number;
  lastError: string | null;
  lastValidatedAt: number | null;
};
```

整体同步状态判定规则固定为：

- 元数据成功 + 媒体成功 = `success`
- 元数据成功 + 媒体存在 `missing` 或 `failed` = `partial`
- 元数据失败 = `failed`

### 2. 媒体校验只看“最近一轮从云端进入本地的数据”

新增一个前端服务，例如：

- `app/src/services/cloudMediaSyncService.ts`

职责：

1. 接收一批刚从云端落本地的 entries
2. 找出其中带 `remoteUri` / `remoteThumbnail` 的媒体
3. 复用 `MediaCacheService.hydrateEntries()` 执行下载或缓存命中
4. 在 hydrate 完成后，再检查结果中的本地 `uri` / `thumbnail` 是否真的存在
5. 汇总并返回本轮媒体校验摘要

这里必须做“下载后存在性校验”，而不是只看 `downloadAsync` 是否没抛错，因为用户要解决的是：

- 接口同步完成
- 但媒体并没有真的出现在设备上

### 3. 媒体校验接入点

只接到两条已经存在的云端入站链路：

#### 3.1 增量同步

在 `cloudSyncService.performSyncNow()` 中：

1. 先执行现有 `/sync`
2. 先应用 `serverChanges`
3. 对本轮 create/update 且包含远端媒体的 entries 执行媒体校验
4. 再写入媒体校验摘要
5. 最后写 `lastSyncAt`

这样 `/sync` 接口成功不再自动等于“同步全部完成”。

#### 3.2 首次云端恢复

在 `syncBootstrapService.runInitialFlow('cloud')` 中：

1. 拉取 `/entries/export`
2. 清空并恢复本地 entries
3. 对恢复得到的 entries 执行媒体校验
4. 根据结果写入媒体校验摘要
5. 再把 `initialSyncState` 切到 `ready`

这样“首次恢复完成”也必须包含媒体落地结果，而不只是 entry 入库完成。

### 4. 同步状态展示

同步状态对话框保留现有结构，并新增“媒体同步”一组字段：

- `媒体同步状态`
- `需校验媒体数`
- `已落地媒体数`
- `缺失媒体数`
- `下载失败媒体数`
- `最近媒体错误`

整体标题状态显示规则：

- `云同步完成`
- `云同步部分完成`
- `云同步失败`

其中“部分完成”用于：

- 元数据已成功
- 但本轮媒体校验出现 `missing > 0` 或 `failed > 0`

### 5. 本地删除语义

前端删除已同步 entry 时维持“本地先隐藏，远端异步重试”的模型：

1. `entryStore.deleteEntry(id)` 对已同步记录继续写 `pending_delete`
2. 同时把 `deleted = 1`
3. 列表查询继续过滤 `deleted = 1`，因此用户会立即看不到该记录
4. 后台 `syncNow()` 继续向 `/api/sync` 发送 delete
5. 只有当后端确认级联删除完成，前端才真正 `DB.deleteEntry(id)` 删除本地墓碑
6. 如果远端删除失败，本地继续保留 `pending_delete`，但不重新显示记录

这保证：

- 交互上删除立即生效
- 一致性上删除不会半途而废

### 6. 后端级联删除

后端需要把“删除 entry”定义成一次完整级联，而不是只删一行记录。

建议新增统一服务层入口，例如：

- `deleteEntryCascade(userID, entryID string) error`

供以下两条链路共用：

- `EntryService.Delete()`
- `SyncV2Service.applyDeleteTx()`

级联步骤固定为：

1. 查出 entry 是否存在
2. 查出该 entry 关联的 `media_files`
3. 删除 `media_files` 表记录
4. 删除上传目录中的物理文件
5. 删除 `entries` 表记录
6. 记录 delete change

一致性要求：

- 任何一步失败，都视为远端删除未完成
- `SyncV2Service.applyDeleteTx()` 仍保持事务边界，避免“变更日志已追加但 entry 还没删干净”
- 如果数据库删除成功但物理文件删除失败，也必须向上返回失败，不能把前端这次删除标成成功

### 7. 实现边界

本次只处理：

- 同步状态增加媒体校验摘要
- 云端恢复与增量同步后的媒体落地校验
- 已同步 entry 的远端级联删除

本次不处理：

- 历史孤儿媒体扫描页
- 单条媒体重试 UI
- media 下载后台调度器重构

## 测试策略

### 前端

#### 媒体校验服务

覆盖：

- 下载成功且文件存在时记为 `downloaded`
- hydrate 返回 remote URL 但本地文件不存在时记为 `missing`
- 下载抛错时记为 `failed`
- 混合结果时摘要状态记为 `partial`

#### 同步状态聚合

覆盖：

- 元数据成功 + 媒体成功 => 整体成功
- 元数据成功 + 媒体失败/缺失 => 整体部分成功
- 元数据失败 => 整体失败

#### 删除语义

覆盖：

- 已同步记录删除后立即从列表消失
- 远端删除失败时，本地仍保留 `pending_delete`
- 远端删除成功后，本地墓碑被真正删除

### 后端

#### 直连删除

覆盖：

- 删除 entry 时会一并删除关联 `media_files`
- 对应物理文件也被删除

#### 同步删除

覆盖：

- `/api/sync` 的 delete 也走同一套级联逻辑
- 任一步失败时返回失败，不把结果写成 `applied`

## 验收标准

满足以下条件即可认为本次设计达成目标：

1. 同步状态不再把“元数据同步成功”误报成“全部完成”
2. 当媒体下载失败或文件缺失时，状态明确显示“部分成功”
3. 首次云端恢复后，媒体是否真的落地可以在状态面板中看见
4. 本地删除已同步记录后，远端 `entries`、`media_files` 和物理文件都会被级联删除
5. 远端删除失败时，本地记录不会重新出现，但会保留待删状态并支持后续重试
