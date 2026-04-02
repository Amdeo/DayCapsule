# 前端本地优先同步内核 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让云端模式下的 `entry` 读写完全回到本地 SQLite，再通过 `cloudSyncService + syncStore + syncBootstrapService` 完成常态同步、首次同步分支和冲突副本收口。

**Architecture:** 保留 SQLite 作为 UI 唯一真实数据源，`entryStore` 与列表查询都只读写本地数据库。`cloudSyncService` 负责 `/api/sync` 协议对接和本地状态流转，`syncBootstrapService` 负责首次启用云同步的三分支初始化，`syncStore` 独立持久化 `syncCursor / lastSyncAt / lastSyncError / initialSyncState`；本轮对现有媒体上传相关 `syncStatus` 保持兼容，不顺手做状态枚举解耦。

**Tech Stack:** React Native, Expo Router, Zustand, Expo SQLite, MMKV/Storage, Jest, Testing Library

**Spec:** `docs/superpowers/specs/2026-03-22-frontend-local-first-sync-core-design.md`

---

## 变更记录

- 2026-03-22：基于已批准 spec 创建实现计划，范围只覆盖前端本地优先同步内核，不扩展到媒体上传队列。
- 2026-03-22：当前会话未授权使用子代理 review，本轮改为本地 plan review，并在文档中保留检查点。

## 执行状态

| Task | 状态 | 说明 |
|------|------|------|
| Task 1 | 已完成 | 已补齐 `base_updated_at / user_id / deleted` 字段读写，并用 `operations.test.ts` 锁定 round-trip 与 `pending_delete` 兼容 |
| Task 2 | 已完成 | 已新增 `syncStore`，并让 `cloudSyncService` 对接 `results[] / serverChanges[] / conflicts[]` 与新冲突副本语义 |
| Task 3 | 已完成 | `entryStore` 主读写路径已切回本地 DB；云端模式下的新增 / 编辑 / 删除只落本地，并保留语音上传状态兼容 |
| Task 4 | 已完成 | 已新增 `syncBootstrapService`，接入 `SettingsPage` / `_layout`，并完成 targeted tests 与 `typecheck` |

## 实际执行说明

- Task 1 到 Task 4 已按 TDD 执行：先补失败测试，再补最小实现，最后跑绿目标测试。
- 本轮保留了 `pending_upload`、`uploading`、`pending_delete` 的兼容语义，没有顺手拆媒体状态枚举；这是刻意控制范围，不是遗漏。
- `RemoteDataSource` 兼容导出仍保留在 `dataSource.ts`，但 `entryStore`、`SettingsPage`、`_layout` 已不再依赖它作为主流程。
- 当前工作区存在大量用户已有的前端草稿与其他改动，本轮没有按 task 粒度单独提交代码；计划中的 `Commit` 步骤保持未执行。

## 验证结果

- 2026-03-22：已运行 `cd app && pnpm test --runInBand app/src/database/__tests__/operations.test.ts app/src/store/__tests__/syncStore.test.ts app/src/services/__tests__/cloudSyncService.test.ts app/src/store/__tests__/entryStore.test.ts app/src/database/__tests__/dataSource.test.ts app/src/services/__tests__/syncBootstrapService.test.ts app/src/components/__tests__/SettingsPage.test.tsx`
  - 结果：PASS（7 个 test suite，80 个测试全部通过）
- 2026-03-22：已运行 `cd app && pnpm run typecheck`
  - 结果：PASS

## File Structure

### New Files

| File | Responsibility |
|------|----------------|
| `app/src/store/syncStore.ts` | 持久化并暴露 `syncCursor`、`lastSyncAt`、`lastSyncError`、`initialSyncState` |
| `app/src/store/__tests__/syncStore.test.ts` | 锁定 `syncStore` 的加载、持久化和错误状态清理语义 |
| `app/src/services/syncBootstrapService.ts` | 负责首次启用云同步时的本地/云端探测、分支决策和初始化执行 |
| `app/src/services/__tests__/syncBootstrapService.test.ts` | 锁定首次同步三分支和恢复/备份决策 |

### Modified Files

| File | Change |
|------|--------|
| `app/src/types/entry.ts` | 补齐本地优先同步内核所需字段，并把 `conflict-local-copy` 加入 `syncStatus`，同时保留现有媒体状态 |
| `app/src/database/sqlite.ts` | 为新安装用户的 `entries` 表补齐 `base_updated_at`、`user_id`、`deleted` 等列 |
| `app/src/database/migration.ts` | 增加幂等迁移，给旧库补齐本轮需要的同步列并刷新 column cache |
| `app/src/database/operations.ts` | 让 `rowToEntry`、`addEntry`、`updateEntry`、`restoreEntries`、`markEntryPendingDelete` 正确往返同步字段 |
| `app/src/database/__tests__/operations.test.ts` | 锁定新字段 round-trip、`pending_delete` 兼容和 server snapshot 回填语义 |
| `app/src/services/cloudSyncService.ts` | 对接新的后端 `/api/sync` 响应结构，应用 `results[] / serverChanges[] / conflicts[]`，并通过 `syncStore` 管理状态 |
| `app/src/services/__tests__/cloudSyncService.test.ts` | 锁定 `applied / conflicted / ignored` 映射、冲突副本生成和 cursor 持久化顺序 |
| `app/src/database/dataSource.ts` | 让主流程不再依赖 `activeDataSource` 切换；必要时保留兼容导出，直到 UI 接口迁移完成 |
| `app/src/database/__tests__/dataSource.test.ts` | 收口 `localDataSource` 的职责；在调用方迁移完成后删除/调整远端主写路径相关断言 |
| `app/src/store/entryStore.ts` | 所有主读写路径只走本地 DB，并在 cloud mode 下生成待同步状态而不是直写远端 |
| `app/src/store/__tests__/entryStore.test.ts` | 锁定云端模式下的本地写入、`pending`/`pending_delete` 标记和语音状态兼容 |
| `app/app/_layout.tsx` | 启动时执行同步 bootstrap / 首轮同步；前台恢复时触发同步；不在网络恢复时触发 entry 同步 |
| `app/src/components/SettingsPage.tsx` | 使用 `syncBootstrapService` 处理首次启用云同步与模式切换，不再切换 `RemoteDataSource` |
| `app/src/components/__tests__/SettingsPage.test.tsx` | 锁定首次同步选择、手动同步入口和同步状态展示 |
| `docs/superpowers/specs/2026-03-22-frontend-local-first-sync-core-design.md` | 实现后更新状态、偏差说明与验证结果 |
| `docs/superpowers/plans/2026-03-22-frontend-local-first-sync-core.md` | 执行过程中勾选任务、补齐验证结果与文档收口 |

## 执行约束

- 本轮不解耦媒体上传状态枚举；`pending_upload`、`uploading`、`pending_delete` 必须保持兼容，避免破坏语音上传队列。
- 新的 entry 元数据同步主路径默认只主动生成 `pending`、`synced`、`failed`、`conflict-local-copy`；删除场景允许继续通过 `syncOp = 'delete'` 与 `pending_delete` 兼容落地。
- UI 与 store 始终只从本地 SQLite 读取，不再把远端 entry API 当成主数据源。
- `syncCursor` 只能在 `serverChanges[]` 与 `conflicts[]` 全部成功应用后推进。
- 自动同步只覆盖 App 启动、回到前台、手动触发；网络恢复监听继续只服务于语音补传，不为 entry 同步新增自动触发。
- 不回滚当前工作区已有前端草稿；只在本计划列出的文件中增量修改，并显式说明任何偏离 spec 的兼容处理。

## Chunk 1: 本地数据模型与 SQLite 兼容读写

### Task 1: 扩展同步字段并锁定 DB round-trip

**Files:**
- Modify: `app/src/types/entry.ts`
- Modify: `app/src/database/sqlite.ts`
- Modify: `app/src/database/migration.ts`
- Modify: `app/src/database/operations.ts`
- Test: `app/src/database/__tests__/operations.test.ts`

- [ ] **Step 1: 先写失败测试，锁定本地同步字段和旧媒体状态兼容**

在 `app/src/database/__tests__/operations.test.ts` 增加至少 3 组断言：

```ts
it('round-trips baseUpdatedAt userId deleted and conflictedCopyOf through addEntry/getEntryById', async () => {})
it('preserves legacy media sync statuses when rows are read back from SQLite', async () => {})
it('markEntryPendingDelete keeps the row and marks sync_op=delete for cloud mode', async () => {})
```

断言点：

- `rowToEntry` 能读出 `baseUpdatedAt`、`userId`、`deleted`、`conflictedCopyOf`
- `addEntry` / `updateEntry` / `restoreEntries` 会写入这些字段
- 现有 `pending_upload` / `uploading` / `pending_delete` 仍能被读取，不会被新逻辑改写丢失

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && pnpm test --runInBand app/src/database/__tests__/operations.test.ts`

Expected: FAIL，原因是当前 schema 与 `rowToEntry` 还没有完整持久化 `base_updated_at` / `user_id` / `deleted` 等字段。

- [ ] **Step 3: 最小修改 schema / migration / operations**

在 `app/src/types/entry.ts`：

- 给 `Entry` 增加 `userId?: string`、`deleted?: boolean`
- 把 `syncStatus` 扩展为：

```ts
'pending' | 'pending_upload' | 'uploading' | 'synced' | 'failed' | 'pending_delete' | 'conflict-local-copy'
```

在 `app/src/database/sqlite.ts`：

- 为新库的 `entries` 表补齐：

```sql
base_updated_at INTEGER,
user_id TEXT,
deleted INTEGER DEFAULT 0
```

在 `app/src/database/migration.ts`：

- 新增一个幂等迁移函数，例如 `migrateCloudSyncCoreColumns()`
- 对旧库执行 `ALTER TABLE` 补列
- 用 `invalidateColumnCache()` 刷新缓存
- 为历史数据回填 `deleted = 0`

在 `app/src/database/operations.ts`：

- `rowToEntry` 读取 `base_updated_at`、`user_id`、`deleted`
- `addEntry` / `updateEntry` / `restoreEntries` 写入这些列
- `markEntryPendingDelete` 在兼容 `pending_delete` 的同时设置 `sync_op = 'delete'`，必要时同步 `deleted = 1`

- [ ] **Step 4: 重新运行 DB 测试，确认通过**

Run: `cd app && pnpm test --runInBand app/src/database/__tests__/operations.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/types/entry.ts app/src/database/sqlite.ts app/src/database/migration.ts app/src/database/operations.ts app/src/database/__tests__/operations.test.ts
git commit -m "feat: persist local-first sync metadata"
```

## Chunk 2: 同步状态存储与云同步核心语义

### Task 2: 收口 `syncStore` 和 `cloudSyncService`

**Files:**
- Create: `app/src/store/syncStore.ts`
- Test: `app/src/store/__tests__/syncStore.test.ts`
- Modify: `app/src/services/cloudSyncService.ts`
- Test: `app/src/services/__tests__/cloudSyncService.test.ts`

- [ ] **Step 1: 先写失败测试，锁定状态持久化和 `/api/sync` 结果映射**

在 `app/src/store/__tests__/syncStore.test.ts` 增加：

```ts
it('loads persisted sync cursor and initial sync state from storage', async () => {})
it('clears lastSyncError after a successful sync status update', async () => {})
```

在 `app/src/services/__tests__/cloudSyncService.test.ts` 增加：

```ts
it('maps applied results to synced entries and advances cursor only after local apply succeeds', async () => {})
it('replaces the main entry with serverEntry and creates a conflict-local-copy for conflicted results', async () => {})
it('marks ignored delete results as locally settled without recreating pending rows', async () => {})
```

断言点：

- `syncStore` 正确持久化 `syncCursor`、`lastSyncAt`、`lastSyncError`、`initialSyncState`
- `cloudSyncService` 使用后端新协议 `results[] / serverChanges[] / conflicts[]`
- 冲突时主 entry 被服务端版本覆盖，副本使用 `syncStatus = 'conflict-local-copy'`
- 只有本地应用成功后才写回 `syncCursor`

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && pnpm test --runInBand app/src/store/__tests__/syncStore.test.ts app/src/services/__tests__/cloudSyncService.test.ts`

Expected: FAIL，原因是当前还没有 `syncStore`，且 `cloudSyncService` 仍使用旧 conflict shape 与裸 `Storage` 键。

- [ ] **Step 3: 最小实现 `syncStore` 与新的同步服务语义**

在 `app/src/store/syncStore.ts`：

- 用 Zustand + `Storage` 封装：
  - `syncCursor`
  - `lastSyncAt`
  - `lastSyncError`
  - `initialSyncState`
- 提供 `load()`, `setCursor()`, `markSyncSuccess()`, `markSyncFailure()`, `setInitialSyncState()` 等最小 action

在 `app/src/services/cloudSyncService.ts`：

- 改成通过 `syncStore` 读写 cursor / lastSyncAt / lastSyncError
- `collectPendingChanges()` 继续只扫描 entry 元数据待同步集合，兼容保留 `pending_delete`
- 发送 `clientChanges[].changeId`
- 按后端协议应用：
  - `results.status = applied`
  - `results.status = conflicted`
  - `results.status = ignored`
- `conflicts[]` 改用 `serverEntry / clientEntry` shape，而不是旧的 `keptVersion / yourVersion`
- 冲突副本写成 `syncStatus = 'conflict-local-copy'`
- `getStatus()` 返回 `lastSyncAt`、`lastSyncError`、`pendingEntries`、`failedEntries`、`conflictCopies`、`initialSyncState`
- 增加最小并发保护，避免一次启动里多次重叠 `syncNow()`

- [ ] **Step 4: 重新运行状态与 service 测试，确认通过**

Run: `cd app && pnpm test --runInBand app/src/store/__tests__/syncStore.test.ts app/src/services/__tests__/cloudSyncService.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/store/syncStore.ts app/src/store/__tests__/syncStore.test.ts app/src/services/cloudSyncService.ts app/src/services/__tests__/cloudSyncService.test.ts
git commit -m "feat: add local-first cloud sync service core"
```

## Chunk 3: `entryStore` / `dataSource` 主路径本地优先化

### Task 3: 让主读写路径退出 `RemoteDataSource`

**Files:**
- Modify: `app/src/database/dataSource.ts`
- Test: `app/src/database/__tests__/dataSource.test.ts`
- Modify: `app/src/store/entryStore.ts`
- Test: `app/src/store/__tests__/entryStore.test.ts`

- [ ] **Step 1: 先写失败测试，锁定云端模式下也只写本地 DB**

在 `app/src/store/__tests__/entryStore.test.ts` 增加至少 3 组断言：

```ts
it('adds entries through DB.addEntry even when cloudMode is enabled', async () => {})
it('updates entries through DB.updateEntry and preserves voice upload statuses', async () => {})
it('marks synced entries pending delete locally instead of calling remote delete', async () => {})
```

在 `app/src/database/__tests__/dataSource.test.ts` 调整或新增断言：

```ts
it('keeps localDataSource as the only mainline datasource used by entryStore', async () => {})
```

断言点：

- `entryStore.loadEntries` / `loadMore` / `addEntry` / `updateEntry` / `deleteEntry` 不再依赖 `getActiveDataSource()`
- 云端模式写入只落本地 DB，并打上待同步状态
- `pending_upload` / `uploading` 的语音记录仍按原有本地删除和补传逻辑处理

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && pnpm test --runInBand app/src/store/__tests__/entryStore.test.ts app/src/database/__tests__/dataSource.test.ts`

Expected: FAIL，原因是当前 `entryStore` 仍通过 `getActiveDataSource()` 与 `switchDataSource()` 控制主读写路径。

- [ ] **Step 3: 最小修改 store / datasource，切掉远端主写入口**

在 `app/src/store/entryStore.ts`：

- 把 `loadEntries` / `loadMore` / `getAllTags` / `restoreEntries` 收敛到本地 DB 或 `localDataSource`
- `addEntry` / `updateEntry` / `deleteEntry` 在 cloud mode 下只写本地并生成待同步状态
- 保留 `pending_upload` / `uploading` / `pending_delete` 的现有兼容分支

在 `app/src/database/dataSource.ts`：

- 让 `localDataSource` 成为唯一主线实现
- 在 Task 4 迁完 UI 调用点前，可以暂时保留 `switchDataSource()` / `createRemoteDataSource()` 兼容导出，但要标记为 deprecated 并停止被 `entryStore` 使用

- [ ] **Step 4: 重新运行 store / datasource 测试，确认通过**

Run: `cd app && pnpm test --runInBand app/src/store/__tests__/entryStore.test.ts app/src/database/__tests__/dataSource.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/store/entryStore.ts app/src/store/__tests__/entryStore.test.ts app/src/database/dataSource.ts app/src/database/__tests__/dataSource.test.ts
git commit -m "refactor: make entry store local-first in cloud mode"
```

## Chunk 4: 首次同步 Bootstrap、UI 接入与验证收口

### Task 4: 接入 `syncBootstrapService`、启动同步和设置页流程

**Files:**
- Create: `app/src/services/syncBootstrapService.ts`
- Test: `app/src/services/__tests__/syncBootstrapService.test.ts`
- Modify: `app/app/_layout.tsx`
- Modify: `app/src/components/SettingsPage.tsx`
- Test: `app/src/components/__tests__/SettingsPage.test.tsx`
- Modify: `app/src/database/dataSource.ts`
- Modify: `docs/superpowers/specs/2026-03-22-frontend-local-first-sync-core-design.md`
- Modify: `docs/superpowers/plans/2026-03-22-frontend-local-first-sync-core.md`

- [ ] **Step 1: 先写失败测试，锁定首次同步三分支与设置页交互**

在 `app/src/services/__tests__/syncBootstrapService.test.ts` 增加：

```ts
it('returns restore flow when local is empty and cloud has data', async () => {})
it('returns backup flow when local has data and cloud is empty', async () => {})
it('returns needs-decision when both local and cloud have data', async () => {})
```

在 `app/src/components/__tests__/SettingsPage.test.tsx` 增加或重写断言：

```ts
it('uses syncBootstrapService when enabling cloud mode instead of switching datasource', async () => {})
it('shows sync status from syncStore-backed cloudSyncService', async () => {})
it('triggers manual sync without replacing the local datasource', async () => {})
```

断言点：

- 首次同步场景 A/B/C 的决策结果与 spec 一致
- `SettingsPage` 不再调用 `switchDataSource(createRemoteDataSource())`
- 手动同步仍可从设置页触发

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && pnpm test --runInBand app/src/services/__tests__/syncBootstrapService.test.ts app/src/components/__tests__/SettingsPage.test.tsx`

Expected: FAIL，原因是当前没有 `syncBootstrapService`，`SettingsPage` 仍在切换 `RemoteDataSource` 并直接做远端导入导出。

- [ ] **Step 3: 最小实现 bootstrap 与 UI 集成**

在 `app/src/services/syncBootstrapService.ts`：

- 提供 3 类能力：
  - `inspectInitialState()`：读取本地条数和云端条数
  - `buildInitialFlow()`：返回 `restoring / backing-up / needs-decision`
  - `runInitialFlow()`：执行“恢复云端 / 备份本地 / 等待用户选择”

在 `app/app/_layout.tsx`：

- 启动时执行数据库迁移后，调用新的 `migrateCloudSyncCoreColumns()`
- 如果 `cloudMode = true` 且已登录：
  - 通过 `syncStore.load()` 恢复同步元数据
  - 通过 `syncBootstrapService` 判断是否需要首次初始化
  - 初始化完成后再调用 `cloudSyncService.syncNow()`
- App 回到前台时触发 `cloudSyncService.syncNow()`
- 保留网络恢复监听给 `flushPendingVoiceUploads()`，但不要在该监听里触发 entry 同步

在 `app/src/components/SettingsPage.tsx`：

- 启用云同步时，走 `syncBootstrapService` 的场景判断与执行，而不是 `switchDataSource(...)`
- 关闭云同步时，只切回“本地优先 + 不再自动同步”的模式，不再切换 datasource
- 使用 `cloudSyncService.getStatus()` / `syncStore` 展示同步状态、失败信息与手动重试入口

在 `app/src/database/dataSource.ts`：

- 当 `_layout` / `SettingsPage` 不再引用 `switchDataSource()` / `createRemoteDataSource()` 后，删除这些主流程已废弃的导出和对应死代码

- [ ] **Step 4: 运行目标测试、类型检查与必要的手动验证**

Run: `cd app && pnpm test --runInBand app/src/services/__tests__/syncBootstrapService.test.ts app/src/components/__tests__/SettingsPage.test.tsx app/src/store/__tests__/syncStore.test.ts app/src/store/__tests__/entryStore.test.ts app/src/services/__tests__/cloudSyncService.test.ts app/src/database/__tests__/operations.test.ts app/src/database/__tests__/dataSource.test.ts`

Expected: PASS

Run: `cd app && pnpm run typecheck`

Expected: PASS

手动验证：

- 已登录且 `cloudMode = true` 时冷启动，确认不会先出现空白列表再跳数据
- 本地空 / 云端有、本地有 / 云端空、双端都有数据三种首次同步路径都能按 spec 展示
- 回到前台会触发一次 entry 同步，网络恢复只触发语音补传，不触发 entry 同步

- [ ] **Step 5: 更新文档收口**

在实现完成后：

- 把 `docs/superpowers/specs/2026-03-22-frontend-local-first-sync-core-design.md` 更新为 `已实现`
- 在本计划中勾选已完成步骤并写入实际验证结果
- 如果最终保留了 `pending_delete` 兼容语义或推迟了 `deleted` 的完全落地，在 spec / plan 里明确写出最终偏差说明

- [ ] **Step 6: Commit**

```bash
git add app/src/services/syncBootstrapService.ts app/src/services/__tests__/syncBootstrapService.test.ts app/app/_layout.tsx app/src/components/SettingsPage.tsx app/src/components/__tests__/SettingsPage.test.tsx app/src/database/dataSource.ts docs/superpowers/specs/2026-03-22-frontend-local-first-sync-core-design.md docs/superpowers/plans/2026-03-22-frontend-local-first-sync-core.md
git commit -m "feat: add frontend local-first sync bootstrap"
```

## Plan Review 留痕

- 2026-03-22：当前会话未授权使用子代理 review，本轮改为本地 plan review。检查点：
  - 任务拆分已收敛为 DB 字段、同步核心、store/dataSource、本次 UI/bootstrap 四块，没有重新膨胀回总任务
  - `pending_upload` / `uploading` / `pending_delete` 兼容约束已显式写进 spec 与 plan
  - `RemoteDataSource` 退出主写路径被拆成两步：Task 3 先让 `entryStore` 停止依赖，Task 4 再迁 UI 调用点并删除死代码
  - 验证项覆盖了 targeted tests、类型检查和首次同步手动路径，不只停留在口头说明
