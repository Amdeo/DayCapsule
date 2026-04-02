# 前端本地优先同步内核设计

## 状态

- 当前状态：已实现
- 用户确认日期：2026-03-22

## 评审记录

- 2026-03-22：在“云同步在线模式（离线优先 + 轻量多端同步）”总任务下，确认需要把前端同步内核单独拆成子任务，避免继续在总 plan 中混合后端协议、前端数据模型、媒体上传和 UI 收口。
- 2026-03-22：用户确认本次子任务范围只覆盖 `entry` 元数据同步内核，不包含照片 / 语音媒体上传队列。
- 2026-03-22：用户确认云端模式下 `entry` 的新增 / 编辑 / 删除统一改为“先写本地 SQLite，再由后台同步 push”，不再保留直写远端 entry API 的入口。
- 2026-03-22：用户确认冲突策略为“原 entry 用服务端版本覆盖，同时自动保留本地改动为冲突副本”。
- 2026-03-22：用户确认自动同步触发范围先收敛为：
  - App 启动
  - 回到前台
  - 手动触发
- 2026-03-22：用户确认首次同步 UX 分支：
  - 本地空、云端有：阻塞式恢复
  - 本地有、云端空：非阻塞式备份
  - 本地和云端都有：一次性二选一引导

## 背景

当前仓库中的前端云端模式实现仍保留明显的“远端数据源”思路：

- [`dataSource.ts`](/Users/cooper/Documents/code/MemoryCapsule/app/src/database/dataSource.ts) 中存在 `RemoteDataSource`
- [`entryStore.ts`](/Users/cooper/Documents/code/MemoryCapsule/app/src/store/entryStore.ts) 仍通过 `activeDataSource` 决定读写落点
- [`cloudSyncService.ts`](/Users/cooper/Documents/code/MemoryCapsule/app/src/services/cloudSyncService.ts) 已出现同步草稿，但与 store / dataSource 的职责边界尚未收拢

这会带来 3 个直接问题：

- UI 和 store 无法稳定地以“本地 DB 是真实单一数据源”为前提
- 首次启用云同步时，本地与云端的初始化对齐策略不明确，容易出现空白页、静默覆盖或状态跳变
- 冲突处理、失败重试、同步状态展示还没有形成一套前后一致的语义

后端增量同步协议和 `update` 冲突判定原子化已经完成，因此现在可以把前端的“本地优先同步内核”单独收口为一条明确子任务。

## 目标

- 让云端模式下的 `entry` 新增 / 编辑 / 删除统一变为“先写本地 SQLite，再后台同步”
- 让 UI 永远从本地 DB 读取，不再依赖远端 entry API 作为主数据源
- 建立 `cloudSyncService` 作为唯一同步协调器，负责 push / pull / 冲突副本 / `syncCursor`
- 明确首次启用云同步时的 3 条 UX 分支
- 在不引入媒体上传队列的前提下，先闭环 `entry` 元数据同步

## 最终方案

### 1. 子任务范围

本次子任务只覆盖“前端本地优先同步内核”。

本次范围内：

- `entryStore` 改为只面向本地 SQLite
- `cloudSyncService` 负责后台 push / pull / 冲突处理 / `syncCursor`
- 本地 `Entry` 同步字段收敛
- 首次启用云同步的 bootstrap 状态机
- 设置页 / 首屏的最小同步状态展示

本次不在范围内：

- 照片 / 语音媒体上传队列
- 媒体缓存预热与后台下载
- 网络恢复自动触发同步
- 固定间隔轮询同步
- 多账号切换完整收口

### 2. 总体架构

前端同步内核拆成 4 个明确单元：

#### `entryStore`

职责：

- 读写本地 SQLite
- 暴露 UI 所需的列表、详情、筛选、编辑结果
- 在云端模式下把本地写操作标记为 `pending`

明确不负责：

- 直接请求远端 entry API
- 自己处理冲突
- 自己推进 `syncCursor`

#### `cloudSyncService`

职责：

- 扫描本地待同步 entry
- 组装 `clientChanges[]`
- 调用 `POST /api/sync`
- 应用 `serverChanges[]`
- 处理 `conflicts[]`
- 维护 `syncCursor`、`lastSyncAt`、`lastSyncError`

明确不负责：

- 直接驱动页面状态
- 处理媒体上传

#### `sync bootstrap`

职责：

- 在首次启用云同步时判断“本地 / 云端”的初始状态
- 按 3 条 UX 分支决定初始化策略

明确不负责：

- 后续常态化同步调度

#### `sync status UI`

职责：

- 展示同步中 / 失败 / 上次同步时间 / 首次恢复态
- 提供手动重试入口

明确不负责：

- 决定同步策略

### 3. 日常数据流

#### 写入流

云端模式下，新增 / 编辑 / 删除 `entry` 时统一走：

1. `entryStore` 先写本地 SQLite
2. 本地 entry 标记 `syncState = pending`
3. `cloudSyncService` 在触发时扫描 pending entries
4. 组装 `clientChanges[]` 调用 `/api/sync`
5. 服务端返回后按结果更新本地

结果映射规则：

- `applied`
  - 把本地 entry 更新为 `synced`
  - 用服务端最终版本回填 `updatedAt` / `baseUpdatedAt`
- `conflicted`
  - 原 entry 用 `serverEntry` 覆盖
  - 本地改动另存为冲突副本
  - 冲突副本标记 `syncState = conflict-local-copy`
- `ignored`
  - 按最终服务端状态收敛本地记录
  - 不保留无意义的 pending 状态

#### 拉取流

1. `cloudSyncService` 读取本地 `syncCursor`
2. 调用 `/api/sync`
3. 逐条应用 `serverChanges[]` 到本地 DB
4. 全部应用成功后再持久化 `newCursor`

约束：

- 不能先推进 `syncCursor` 再落本地 DB
- 如果本地应用中途失败，则整轮同步失败，`syncCursor` 保持原值

### 4. 冲突副本策略

本次冲突策略固定为：

- 原 entry 用服务端版本覆盖
- 本地改动另存为一条冲突副本
- 不要求这次就提供复杂的冲突合并 UI

冲突副本要求：

- `conflictedCopyOf = 原 entry.id`
- `syncState = conflict-local-copy`
- 保留用户本地编辑内容
- 不在本轮自动继续 push，避免形成无限冲突回路

这样做的目的：

- 不丢用户本地内容
- 让列表主 entry 回到与服务端一致的稳定状态
- 后续可以把“冲突副本怎么处理”单独做成另一条子任务

### 5. 首次启用云同步状态机

首次启用云同步时，需要先判断“本地 / 云端”两边的数据存在性，再决定初始化路径。

#### 场景 A：本地空、云端有

体验目标：

- 不让用户先看到空白列表
- 把体验定义为“恢复我的数据”

处理方式：

- 进入阻塞式恢复态
- 首屏展示“正在同步你的记录”
- 第一批数据写入本地后进入首页
- 余下变更继续后台完成

#### 场景 B：本地有、云端空

体验目标：

- 不打断当前本地使用
- 把体验定义为“开始备份”

处理方式：

- 直接进入首页
- 展示轻量同步提示，如“正在备份到云端”
- 后台把本地待同步记录 push 上去

#### 场景 C：本地和云端都有

体验目标：

- 不静默替用户做决策
- 不在首次启用时尝试复杂自动合并

处理方式：

- 弹一次性二选一引导
- 选项固定为：
  - `以云端为准下载到本机`
  - `以本机为准上传到云端`

分支语义：

- `以云端为准`
  - 清空本地后全量恢复云端
- `以本机为准`
  - 将本地记录标记为待同步并 push 到云端

初始化完成后：

- 进入常态化的“本地优先 + 后台同步”模型

### 6. 自动同步触发

本次自动同步触发范围只收敛为：

- App 启动
- App 从后台回到前台
- 用户手动点击同步

本次不做：

- 网络恢复自动同步
- 固定间隔轮询

原因：

- 先把同步内核做稳
- 避免本轮顺带引入网络监听、节流、重复触发和退避策略

### 7. 本地数据模型

#### Entry 级同步字段

本次建议收敛为：

- `updatedAt`
- `deleted`
- `syncState`
- `baseUpdatedAt`
- `conflictedCopyOf`
- `userId`

`syncState` 只保留：

- `pending`
- `synced`
- `failed`
- `conflict-local-copy`

说明：

- 这次前端同步内核只收 entry 元数据同步，不把媒体上传状态揉进同一个枚举
- 现有与媒体上传强耦合的状态应在后续媒体任务中单独调整

#### 实现约束（兼容现有媒体状态）

- 当前代码中的 `pending_upload`、`uploading`、`pending_delete` 已被语音上传和删除流程复用，本次实现不能破坏这些既有路径。
- 本轮不在 `syncStatus` 枚举层面强制完成媒体状态解耦；旧值需要继续可读、可写，避免把媒体上传队列拖进本次子任务。
- 本次新增或重写的 entry 元数据同步主路径，应默认生成 `pending`、`synced`、`failed`、`conflict-local-copy` 这组语义；删除场景允许继续通过 `syncOp = delete` 与 `pending_delete` 兼容落地。
- 媒体状态与 entry 元数据状态的彻底拆分，留给后续媒体子任务单独收口。

#### 全局同步元数据

不放进 entry 表，单独放在 sync store 或设置存储：

- `syncCursor`
- `lastSyncAt`
- `lastSyncError`
- `initialSyncState`

`initialSyncState` 建议值：

- `idle`
- `checking`
- `restoring`
- `backing-up`
- `needs-decision`
- `ready`

### 8. 影响范围

涉及文件主要包括：

- [`app/src/store/entryStore.ts`](/Users/cooper/Documents/code/MemoryCapsule/app/src/store/entryStore.ts)
- [`app/src/database/dataSource.ts`](/Users/cooper/Documents/code/MemoryCapsule/app/src/database/dataSource.ts)
- [`app/src/services/cloudSyncService.ts`](/Users/cooper/Documents/code/MemoryCapsule/app/src/services/cloudSyncService.ts)
- [`app/src/types/entry.ts`](/Users/cooper/Documents/code/MemoryCapsule/app/src/types/entry.ts)
- [`app/src/database/migration.ts`](/Users/cooper/Documents/code/MemoryCapsule/app/src/database/migration.ts)
- 设置页与启动逻辑相关文件

### 9. 验收标准

- 云端模式下，新增 / 编辑 / 删除 entry 不直接写远端 entry API，只先写本地 SQLite
- UI 始终从本地 DB 读取，不依赖远端直读
- `cloudSyncService` 能正确 push 本地 pending 变更并应用 `serverChanges[]`
- `conflicted` 时，原 entry 用服务端版本覆盖，同时自动生成一条本地冲突副本
- 首次启用云同步时，3 种首次场景都按约定 UX 分支处理
- 同步失败不丢本地数据，不错误推进 `syncCursor`

### 10. 已知边界

- 本次不处理媒体上传 / 下载
- 本次不提供复杂冲突解决 UI
- 本次不做网络恢复自动同步与轮询调度
- 本次不处理多账号切换的完整数据隔离

### 11. 实现结果

- `entryStore` 的主读写路径已经切回本地 SQLite；`add / update / delete` 不再通过 `RemoteDataSource` 直写远端。
- `syncStore`、`cloudSyncService`、`syncBootstrapService` 已落地，前端已对接后端 `results[] / serverChanges[] / conflicts[]` 协议，并把冲突副本收口为 `conflict-local-copy`。
- `_layout` 启动流程已接入 `migrateCloudSyncCoreColumns()`、同步状态恢复和 bootstrap 初始化；回到前台会触发 entry 同步，网络恢复监听仍只处理语音补传。
- `SettingsPage` 启用云同步时已改走 `syncBootstrapService`，不再切换 `RemoteDataSource`。

### 12. 最终说明

- 为避免把媒体任务再次拖入本轮，`pending_upload`、`uploading`、`pending_delete` 仍保持兼容；`entry` 元数据同步主路径默认只主动生成 `pending`、`synced`、`failed`、`conflict-local-copy`。
- `dataSource.ts` 中的 `RemoteDataSource` 兼容导出仍然保留，但 `entryStore`、`SettingsPage`、`_layout` 已不再依赖它作为主流程。

## 验证结果

- 2026-03-22：已运行 `cd app && pnpm test --runInBand app/src/database/__tests__/operations.test.ts app/src/store/__tests__/syncStore.test.ts app/src/services/__tests__/cloudSyncService.test.ts app/src/store/__tests__/entryStore.test.ts app/src/database/__tests__/dataSource.test.ts app/src/services/__tests__/syncBootstrapService.test.ts app/src/components/__tests__/SettingsPage.test.tsx`
  - 结果：PASS（7 个 test suite，80 个测试全部通过）
- 2026-03-22：已运行 `cd app && pnpm run typecheck`
  - 结果：PASS

## Spec Review 留痕

- 2026-03-22：已基于当前前端草稿和用户确认的设计结论完成 spec 初稿。
- 2026-03-22：当前会话未授权使用子代理 review，本轮改为本地 spec review。检查点：
  - 范围已收敛到“entry 元数据同步内核”，未混入媒体队列
  - 首次同步 UX 三分支已明确定义
  - `entryStore / cloudSyncService / bootstrap / UI` 职责边界已拆清
  - 验收标准与用户确认的冲突副本策略一致

## 用户 Review Gate

- 2026-03-22：spec 写入后，用户回复“ok”，确认本次设计并同意进入 `writing-plans` 阶段。
