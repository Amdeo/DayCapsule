# 2026-03-25 App Interface Drawio Context

## Task 0 结论
- 本文中的前端接口路径均为 `ApiClient` 调用时使用的相对 path（如 `/auth/refresh`、`/entries`、`/media/upload`、`/sync`）；`ApiClient` 会把这些 path 拼到 `/api` baseURL 下，对应真实 HTTP 路径分别是 `/api/auth/refresh`、`/api/entries`、`/api/media/upload`、`/api/sync`。Legacy Backup 段列出的是 `backend/cmd/server/main.go` 中注册的完整后端路由。
- 为确认 Auth、Media、Entries、Sync V2 与 Legacy 的真实前端入口、页面入口与路由挂载，补充取证了：`app/app/_layout.tsx`、`app/src/components/BackupPage.tsx`、`app/src/components/backup-page/useBackupPageController.ts`、`app/src/database/dataSource.ts`、`app/src/services/apiClient.ts`、`app/src/services/cloudSyncService.ts`、`app/src/services/photoUploadQueue.ts`、`app/src/services/voiceUploadQueue.ts`、`app/src/services/mediaCacheService.ts`、`app/src/services/showCloudSyncStatusAlert.ts`、`app/src/services/syncBootstrapService.ts`、`app/src/components/settings-page/useSettingsPageCloudMode.ts`、`app/src/store/authStore.ts`、`app/src/store/entryStore.ts`、`app/src/store/syncStore.ts`、`app/src/store/cloudSyncIndicatorStore.ts`、`backend/cmd/server/main.go`、`backend/internal/service/entry_service.go`、`backend/internal/service/sync_service.go`、`backend/internal/service/sync_v2_service.go`、`backend/internal/repository/backup_repo.go`、`backend/internal/repository/change_repo.go`

## Auth 页
### 已验证事实
- 路径口径：前端相对 path 为 `/auth/login`、`/auth/register`、`/auth/refresh`；对应后端完整路径为 `/api/auth/login`、`/api/auth/register`、`/api/auth/refresh`
- 已验证触发节点：应用启动时 `useAuthStore.loadAuth()` 做本地恢复；用户提交登录或注册；系统在请求返回 `401` 后触发刷新重试
- 前端参与者：`useAuthStore`（运行时网络入口是 `login` / `register`；`loadAuth` 负责本地恢复登录态）与 `ApiClient`
- 持久化位置：MMKV `Storage` scoped keys `auth:token`、`auth:refreshToken`、`auth:user`
- 本地恢复登录态：`useAuthStore.loadAuth()` 只从本地 `Storage` 读取上述 key 并恢复 Zustand 状态；当前取证范围内未见它发起网络请求
- 真实网络链路：
  - `useAuthStore.login()` -> `ApiClient.post('/auth/login')`
  - `useAuthStore.register()` -> `ApiClient.post('/auth/register')`
  - `ApiClient` 的 JSON 请求链路（`request` / `requestWithParams`）在收到 `401` 时会调用 `/auth/refresh`，刷新成功后重试原请求
- 后端层级：`AuthHandler` -> `AuthService`

### 边界
- `useAuthStore.refreshAuth()` 方法存在，但当前取证范围内未见它接入 `ApiClient` 的 `401` 自动刷新实现
- 未发现登录 / 注册 / refresh 这条业务链路上的独立业务中间层；`middleware.Auth` 只用于受保护路由鉴权，不属于这三条接口的业务处理层

## Media 页
### 已验证事实
- 路径口径：前端相对 path 为 `/media/upload`；对应后端完整路径为 `/api/media/upload`
- 已验证触发节点：
  - 主运行时链路：系统执行 `PhotoUploadQueue` / `VoiceUploadQueue` 队列任务时发起上传
  - 非主运行时链路：`createRemoteDataSource().addEntry()`、`createRemoteDataSource().restoreEntries()`、以及 `useSettingsPageCloudMode()` 的“本地 -> 云端”保留数据分支也会调用 `/media/upload`
- 真实上传参与者：
  - `PhotoUploadQueue`：调用 `ApiClient.uploadFile('/media/upload', ...)`；成功后回写远端媒体地址，再触发同步
  - `VoiceUploadQueue`：先调用 `ApiClient.uploadFile('/media/upload', ...)`，再 `POST /entries`，随后删除本地临时 entry
  - `ApiClient.uploadFile()`
- 本地媒体层：
  - 本地 DB 层（SQLite，经 `operations.ts` 访问）持久化本地 entry 的媒体数据与同步状态
  - `mediaCacheService.ts` 真实存在，职责是远端媒体下载与缓存
  - photo 与 voice 的上传后收敛路径不同：photo 回到待同步 entry，voice 继续直写远端 entry
- 后端层级：`MediaHandler` -> `MediaRepository`

### 边界
- `mediaCacheService.ts` 用于远端媒体下载与缓存；当前取证范围内未见它承担上传队列职责
- 后端未发现独立 `MediaService`

## Entries 页
### 已验证事实
- 路径口径：前端相对 path 为 `/entries`、`/entries/count`、`/entries/export`、`/entries/import`；对应后端完整路径为 `/api/entries`、`/api/entries/count`、`/api/entries/export`、`/api/entries/import`
- 已验证触发节点：系统在语音上传完成后执行 `VoiceUploadQueue.createRemoteEntry()`；系统执行 `createSyncBootstrapService()` bootstrap 拉取
- 当前取证范围内，主运行时前端入口：`entryStore.ts` 走本地数据访问层（`localDataSource`，底层为本地 DB 层），不是 `createRemoteDataSource()`
- 与远端 entries 相关的真实调用点：
  - `VoiceUploadQueue.createRemoteEntry()`：在媒体上传完成后直写 `POST /entries`
  - `createSyncBootstrapService()`：调用 `GET /entries/count` 与 `GET /entries/export`；当 `source = 'local'` 时只把本地记录标记为待同步，不直接逐条 `POST /entries`
- 模式切换 / 迁移路径（非 Entries 主运行时链路）：
  - `useSettingsPageCloudMode().disableCloudMode()` 会先调用 `GET /entries/count` 读取云端条目数，再决定是否进入保留数据分支
  - “云端 -> 本地”保留数据分支会调用 `GET /entries/export`
  - “本地 -> 云端”保留数据分支会先执行空载荷 `POST /entries/import`（对应后端 `/api/entries/import`；服务端语义是先清空云端 entries），然后上传媒体并逐条 `POST /entries`
- 本地 DB 层（SQLite，经 `operations.ts` 访问）：持久化本地 entry 的增删改查、恢复与待删除标记
- 后端层级：`EntryHandler` -> `EntryService`（内部再依赖 `EntryRepository`，`Create` / `toResponse` 还触达 `MediaRepository`）

### 边界
- `createRemoteDataSource()` 存在于 `dataSource.ts`，但当前取证范围内未见它接入 `entryStore` 的主运行时链路

## Sync V2 页
### 已验证事实
- 路径口径：前端相对 path 为 `/sync`；对应后端完整路径为 `/api/sync`；本节不含旧 `/api/sync/*` 备份接口
- 已验证触发节点：
  - 启动恢复云端模式后的首轮同步：`app/app/_layout.tsx` 中 `createCloudSyncService().syncNow()`
  - 应用回到前台时：`app/app/_layout.tsx` 中 `createCloudSyncService().syncNow()`
  - 启用云端模式完成后的首轮同步：`useSettingsPageCloudMode()` 中 `createCloudSyncService().syncNow()`
  - 用户在同步状态提示中手动重试：`showCloudSyncStatusAlert.ts` 中调用 `cloudSync.syncNow()`
  - photo 上传完成后的补推同步：`photoUploadQueue.ts` 中 `triggerSync -> createCloudSyncService().syncNow()`
- 真实前端参与者：`createCloudSyncService()` 与 `ApiClient.post('/sync')`
- 本地层：
  - `createCloudSyncService()` 负责同步编排：扫描待同步 entry、调用 `/sync`、应用服务端变更、收敛冲突副本
  - 本地 DB 层（SQLite，经 `operations.ts` 访问）提供待同步记录查询与变更持久化
  - `useSyncStore` 负责同步游标与同步时间/错误状态的持久化（MMKV `Storage`）
  - `useCloudSyncIndicatorStore` 负责同步相关前端状态展示
- 后端层级：`SyncV2Handler` -> `SyncV2Service` -> `EntryRepository` + `ChangeRepository`
- change log：`ChangeRepository` 负责 `entry_changes` 的追加与按 cursor 拉取

### 边界
- 未发现独立的 change log service

## 旧同步接口链路（Legacy Backup）
### 已验证事实
- 路径口径：本节仅确认后端完整路由 `GET /api/sync/status`、`POST /api/sync/upload`、`GET /api/sync/download`、`DELETE /api/sync/backup`；当前未确认对应前端相对 path
- 已验证相关页面入口：现有备份页面入口为 `BackupPage.tsx` 与 `useBackupPageController.ts`
- 后端真实层级：`SyncHandler` -> `SyncService` -> `BackupRepository`
- `backend/cmd/server/main.go` 中旧接口的完整注册路径：
  - `GET /api/sync/status`
  - `POST /api/sync/upload`
  - `GET /api/sync/download`
  - `DELETE /api/sync/backup`

### 边界
- `cloudSyncService` 不属于旧同步接口后端链路
- `BackupPage.tsx` 与 `useBackupPageController.ts` 是现有备份页面入口，但当前取证范围内未见它们直连上述旧 `/api/sync/*` 接口
- 旧 `/api/sync/*` 接口的前端调用方在当前取证范围内未确认

## 绘图约定：颜色语义映射
- 用户入口 / 触发：绿色 `fill #d5e8d4 / stroke #82b366`
- 前端 UI / Store：蓝色 `fill #dae8fc / stroke #6c8ebf`
- 本地数据层：紫色 `fill #f3e8ff / stroke #9673a6`
- 同步 / 上传服务：橙色 `fill #ffe6cc / stroke #d79b00`
- 后端接口层：青色 `fill #d9f0f7 / stroke #10739e`
- 旧链路：灰色虚线 `fill #f5f5f5 / stroke #999999 / dashed=1`
