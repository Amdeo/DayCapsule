# 云端照片后台上传设计

## 状态

- 当前状态：已实现
- 用户确认日期：2026-03-22
- 实现完成日期：2026-03-22

## 评审记录

- 2026-03-22：已确认这次子任务先聚焦“照片先落本地 `cache`、后台上传、失败保留卡片并自动重试”，不把远端图片下载展示一起纳入。
- 2026-03-22：已确认照片上传失败语义与语音保持一致：
  - 本地卡片保留
  - 本地图片可继续预览
  - 状态回退到 `待上传`
  - 后续自动重试
- 2026-03-22：已确认本轮不回到“大一统媒体方案”，采用独立 `photoUploadQueue`，不强行重构已稳定的 `voiceUploadQueue`。
- 2026-03-22：已确认照片上传后的 entry 元数据不走旧的直写 `/entries` 路径，而是继续由 `cloudSyncService` 通过 `/api/sync` 同步。
- 2026-03-22：已完成本轮自查，确认以下边界：
  - `photoUploadQueue` 只负责媒体上传，不直接创建远端 entry
  - `cloudSyncService` 继续负责 entry 元数据同步
  - `voiceUploadQueue` 的历史直写路径记为已知技术债，不在本轮顺带清理
- 2026-03-22：用户 review 了 spec 并回复 `ok`，批准进入 `writing-plans` 阶段。
- 2026-03-22：实现完成并收口文档；最终代码沿用 `PhotoSelectDeps.savePhotoToStorage` 这一依赖命名，但云端模式实际注入 `PhotoService.savePhotoToCache`，不影响本地 `cache` 优先语义。

## 背景

当前前端已经完成两条关键子任务：

- `frontend-local-first-sync-core`
- `voice-cloud-background-upload`

这意味着“云端模式”已经不再以 `RemoteDataSource` 为真实数据源，而是：

- 本地 SQLite 为单一真实数据源
- `cloudSyncService` 负责 entry 元数据同步
- 语音媒体通过独立后台上传队列处理

但照片链路还停在中间态：

- `HomeScreen` 在云端模式下已经开始调用 `PhotoService.savePhotoToCache`
- 但照片后续仍是“直接 `addEntry`”
- 没有独立的照片媒体上传队列
- 失败时只具备局部文件清理语义，没有完整的后台上传与重试模型

如果继续把照片塞回旧的 `RemoteDataSource` 直连方案，会再次与已经落地的“本地优先 + `/api/sync`”模型冲突。

## 目标

- 云端模式下选图后立即创建本地照片卡片
- 原图和本地缩略图先保存到本地 `cache`
- 媒体上传失败不丢卡片，用户仍可预览本地图片
- 用独立 `photoUploadQueue` 负责照片媒体后台上传
- 照片媒体上传成功后，再由 `cloudSyncService` 通过 `/api/sync` 同步 entry 元数据
- 删除待上传照片时，清理本地 `cache` 文件并取消后续上传

## 最终方案

### 1. 用户可见行为

- 云端模式下选择照片后：
  - 立即创建本地照片卡片
  - 原图和本地缩略图保存在 `cache`
  - 卡片状态显示 `待上传`
- 后台开始上传图片时：
  - 卡片状态显示 `上传中`
- 某张图片上传失败时：
  - 不删除卡片
  - 不删除本地 `cache`
  - 状态回退为 `待上传`
  - 用户仍可本地预览
- 全部图片上传成功且 entry 元数据同步成功后：
  - 状态显示 `已同步`

### 2. 状态模型

本轮照片卡片状态只使用现有 `syncStatus` 体系，不新增新的顶层状态：

- `pending_upload`
  - 本地照片文件已保存
  - 照片媒体尚未全部上传完成
- `uploading`
  - `photoUploadQueue` 正在上传该卡片对应的图片
- `pending`
  - 图片媒体已全部上传成功，`remoteUri` 已回写到本地 entry
  - 等待 `cloudSyncService` 把 entry 元数据通过 `/api/sync` 推到服务端
- `failed`
  - 只用于 entry 元数据同步失败
  - 不用于媒体上传失败
- `synced`
  - 媒体和 entry 元数据都已同步完成

媒体上传失败时统一回退到 `pending_upload`，不单独暴露“媒体上传失败”状态。

### 3. 架构边界

#### 3.1 `PhotoService`

职责：

- 提供 `savePhotoToCache`
- 负责原图压缩、缩略图生成、本地 `cache` 文件落盘

不负责：

- 远端媒体上传
- entry 元数据同步

#### 3.2 `photoUploadQueue`

职责：

- 扫描 `type=photo && syncStatus in ('pending_upload', 'uploading')` 的本地照片卡片
- 串行或受控并发上传图片媒体
- 在本地 entry 上回写 `remoteUri`
- 在媒体全部上传成功后把 entry 推进到 `pending`
- 触发一次 `cloudSyncService.syncNow()`

不负责：

- 直接创建远端 entry
- 直接调用旧 `/entries` 写入元数据

#### 3.3 `cloudSyncService`

职责保持不变：

- 只同步 entry 元数据
- 当照片 entry 已具备 `media[].remoteUri` 且 `syncStatus='pending'` 时，通过 `/api/sync` 上传 entry 快照

#### 3.4 `voiceUploadQueue`

本轮不重构 `voiceUploadQueue`。

已知情况：

- 语音链路当前仍带有一条历史直写 `/entries` 的路径
- 这是已有技术债，不在本轮照片任务内顺带清理

本轮目标是避免把同样的债务再复制到照片链路上。

### 4. 数据流

#### 4.1 创建本地照片卡片

云端模式下选图后：

1. 调 `PhotoService.savePhotoToCache`
2. 生成：
   - 原图本地 `cache` 路径
   - 本地缩略图路径
3. 调 `addLocalEntry`
4. 创建本地 photo entry：
   - `media[].uri = <local cache original>`
   - `media[].thumbnail = <local cache thumbnail>`
   - `media[].remoteUri` 为空
   - `syncStatus = 'pending_upload'`

#### 4.2 后台上传照片媒体

`photoUploadQueue` 处理每条待上传照片 entry：

1. 将 entry 置为 `uploading`
2. 逐张上传 `media[].uri`
3. 每张上传成功后回写：
   - `media[].remoteUri = <uploaded url>`
4. 所有图片都成功后：
   - 保留本地 `uri` / `thumbnail`
   - 将 entry 改为 `pending`
   - 保持 `syncOp` 处于可被 `cloudSyncService` 推送的状态
5. 调一次 `cloudSyncService.syncNow()`

#### 4.3 通过 `/api/sync` 同步 entry 元数据

当照片 entry 进入 `pending` 后：

1. `cloudSyncService` 收集该 entry
2. 通过 `/api/sync` 推送完整快照
3. 快照内的 `media` 使用已回写的 `remoteUri`
4. 服务端接受后，entry 进入 `synced`

#### 4.4 失败回退

任意一张图片上传失败：

- entry 从 `uploading` 回退到 `pending_upload`
- 本地文件保留
- 本地卡片保留
- 不把 entry 推进到 `pending`

如果媒体上传已经成功，但 `/api/sync` 失败：

- entry 从 `pending` 进入 `failed`
- 已上传的 `remoteUri` 保留
- 本地图片仍可预览

### 5. 删除规则

#### 5.1 `pending_upload / uploading`

- 立即删除本地 entry
- 删除本次保存在 `cache` 的原图和缩略图
- 从 `photoUploadQueue` 取消任务
- 不与服务端交互

#### 5.2 `pending / failed`

- 按现有本地优先删除语义删除 entry
- 删除本地 `cache` 原图和缩略图
- 如果已有 `remoteUri`，本轮不额外删除服务端媒体文件

#### 5.3 `synced`

- 按现有本地优先删除语义处理 entry
- 本地 `cache` 文件一并删除
- entry 删除通过同步协议传到服务端

### 6. 触发时机

`photoUploadQueue` 与语音保持相同的最小触发集合：

- App 启动后 `flushPendingPhotoUploads()`
- App 回到前台时触发
- 网络恢复时触发
- 用户刚完成一次照片创建时，立即 `enqueue`

本轮不增加固定间隔轮询。

### 7. 缩略图与跨设备边界

本轮只上传照片原图媒体，不单独上传缩略图文件。

这意味着：

- 当前设备继续使用本地 `thumbnail`
- `media[].remoteUri` 用于后续 entry 元数据同步
- 其他设备上的缩略图策略不在本轮解决

### 8. 已知边界

- 不处理“媒体已上传但 entry 元数据尚未同步时”的孤儿媒体回收
- 不重构 `voiceUploadQueue`
- 不解决远端图片下载到本地 `cache` 供展示的策略
- 不为照片引入新的系统级后台任务调度

## 影响范围

- `HomeScreen` 照片创建链路
- `PhotoService` 的本地 `cache` 落盘路径
- 新的 `photoUploadQueue`
- `entryStore` / 本地 DB 上的照片状态流转
- App 启动 / 前台 / 网络恢复时的照片补传触发

## 不在范围内

- 远端图片下载到本地 `cache` 供展示
- 通用 `mediaUploadQueue` 抽象
- `voiceUploadQueue` 重构
- 孤儿媒体清理
- 独立缩略图上传与服务端缩略图模型
- `.gitignore`、`app/metro.config.js` 等不明确关联项

## 实际执行说明

- `PhotoService.savePhotoToCache` 与 `resolvePhotoUri` 的主体实现已在本任务开始前存在于工作区；本轮没有重写这部分逻辑，而是通过测试锁定 `cache` 路径契约，并把首页创建、后台上传队列、SQLite / store、应用生命周期触发全部接上。
- `photoUploadQueue` 默认实例最终使用 `getPhotoEntriesBySyncStatus(['pending_upload', 'uploading'])`，不再依赖通用状态查询后再本地过滤。

## 最终验证

- `cd app && npx jest --run-in-band --runTestsByPath 'app/(tabs)/__tests__/index.photo.test.ts' app/__tests__/_layout.photo-upload.test.tsx src/services/__tests__/photoService.test.ts src/services/__tests__/photoUploadQueue.test.ts src/database/__tests__/operations.test.ts src/store/__tests__/entryStore.test.ts`
  - 结果：PASS
- `cd app && npx tsc --noEmit`
  - 结果：PASS

## 验收标准

- 云端模式下选图后，照片先保存到本地 `cache`，本地卡片立即出现
- 新照片卡片在媒体未上传完成前显示 `待上传 / 上传中`
- 任意一张图片上传失败时，卡片不消失，本地图片仍可预览，状态回到 `待上传`
- 所有图片上传成功后，entry 转入 `pending`，再由 `cloudSyncService` 继续同步元数据
- `/api/sync` 成功后，最终状态为 `已同步`
- 删除 `pending_upload / uploading` 照片卡时，会清理本地 `cache` 文件并取消队列任务
- 本轮提交不包含远端图片下载展示、通用媒体队列抽象、孤儿媒体清理
