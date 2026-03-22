# 后端增量同步协议 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让后端 `POST /api/sync` 具备稳定的增量同步协议语义，支持 `results[]` 回执、`conflicts[]` 冲突返回、以及基于 `entry_changes` 的 cursor 增量拉取。

**Architecture:** 以 `sync_v2_service` 作为协议语义中心，按顺序应用 `clientChanges[]`，把 `create / update / delete` 的结果映射到 `results[]`，把冲突映射到 `conflicts[]`，再通过 `ChangeRepository` 拉取 `cursor` 之后的服务端变更流。仓储层只负责 entry 和 change log 的读写能力，handler 负责请求校验和响应封装。

**Tech Stack:** Go, Gin, SQLite, table-driven tests

**Spec:** `docs/superpowers/specs/2026-03-22-backend-incremental-sync-protocol-design.md`

---

## 变更记录

- 2026-03-22：基于已批准 spec 创建实现计划，范围仅覆盖后端增量同步协议，不扩展到前端冲突副本或媒体同步。

## 执行状态

| Task | 状态 | 说明 |
|------|------|------|
| Task 1 | 已完成 | 已补齐 `changeId` / `results[]` / `conflicts[]` 语义，并修复 update 快照一致性与非法变更 `ignored` 回执 |
| Task 2 | 已完成 | 已补上 cursor 语义测试，锁定 `cursor=0` 全量返回、`newCursor` 取最大 `changeId`、无新变更时保持原 cursor |
| Task 3 | 已完成 | 已用回归测试锁定 `ignored / conflicted` 不写 `entry_changes`，以及 `applied create / update / delete` 才写 change log |
| Task 4 | 已完成 | 已同步文档收口：当前版本锁定协议语义，但未实现 `entry` 与 `change log` 的单事务原子性 |
| Task 5 | 已完成 | 已完成 handler 合同测试，锁定 `400 / 500 / success` envelope、最小请求校验和空数组归一化 |
| Task 6 | 已完成 | 已完成目标测试、后端全量测试与 spec / plan 收口 |

> 说明：本轮按用户要求不执行任何 `git commit`，因此各 Task 的 `Step 5: Commit` 保持未勾选；其余已实际完成的实现与验证步骤已同步勾选。

## 实际执行说明

- Task 2 与 Task 3 的业务逻辑在现有实现中已基本满足要求，本轮主要以新增回归测试的方式把行为锁住。
- Task 4 明确记录了当前未事务化边界，但没有实现单事务原子性；这是已知后续项，不属于本轮遗漏。
- Task 5 为了让 handler 测试脱离真实 DB / service，最小引入了 `syncV2Service` 接口，`SyncV2Handler` 现在依赖该接口而不是具体 `*service.SyncV2Service`。

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `backend/internal/service/sync_v2_service_test.go` | 覆盖 `POST /api/sync` 的核心协议语义，包括 `applied / conflicted / ignored`、首次同步与 cursor 增量 |
| `backend/internal/handlers/sync_v2_test.go` | 覆盖 handler 的请求校验、成功响应和错误响应 |

### Modified Files

| File | Change |
|------|--------|
| `backend/internal/service/sync_v2_service.go` | 补齐 `clientChanges[].changeId`、`results[]`、冲突结构与 `ignored` 语义；统一 service 层处理顺序 |
| `backend/internal/models/change.go` | 如有必要，补充与协议对齐的字段注释，明确 snapshot 与 `change_id` 语义 |
| `backend/internal/repository/change_repo.go` | 维持 `AppendChange` / `ListSinceCursor` 语义稳定，必要时补充辅助能力或注释 |
| `backend/internal/repository/entry_repo.go` | 配合 `sync_v2_service` 的 create / update / delete 路径，必要时补充返回值或事务友好的 helper |
| `backend/internal/handlers/sync_v2.go` | 让响应结构与 spec 一致；必要时对缺失字段返回 `400` |
| `docs/superpowers/specs/2026-03-22-backend-incremental-sync-protocol-design.md` | 实现后更新状态、偏差说明与验证结果 |
| `docs/superpowers/plans/2026-03-22-backend-incremental-sync-protocol.md` | 执行过程中勾选任务、补齐验证结果 |

## 执行约束

- 只处理 entry 元数据同步，不顺带设计前端冲突副本生成。
- 不把媒体上传下载协议揉进本次 `/api/sync`。
- `clientChanges[]` 必须按顺序串行处理，不在单次请求内并发。
- 只有真实生效的服务端变更才允许写入 `entry_changes`。
- 如果实现中发现需要事务封装，优先做最小改动，不顺手大规模重构 repository。
- 不回滚当前工作区已有改动；只在本计划列出的文件中增量修改。

## Chunk 1: 协议模型与 Service 语义

### Task 1: 锁定 `results[]` / `conflicts[]` / `ignored` 语义

**Files:**
- Create: `backend/internal/service/sync_v2_service_test.go`
- Modify: `backend/internal/service/sync_v2_service.go`

- [x] **Step 1: 先写失败测试，覆盖协议核心结果模型**

在 `backend/internal/service/sync_v2_service_test.go` 新增 table-driven tests，至少覆盖：

```go
func TestSyncV2Service_ReturnsAppliedResultForCreate(t *testing.T) {}
func TestSyncV2Service_ReturnsConflictForUpdateWhenServerIsNewer(t *testing.T) {}
func TestSyncV2Service_ReturnsIgnoredResultForDeleteWhenEntryMissing(t *testing.T) {}
```

断言点：

- 响应里有 `results[]`
- `create` 成功返回 `applied`
- `update` 冲突时返回 `conflicted`，并在 `conflicts[]` 中带回 `serverEntry` 与 `clientEntry`
- `delete` 删除不存在 entry 时返回 `ignored`

- [x] **Step 2: 运行测试确认当前实现失败**

Run: `cd backend && go test ./internal/service -run TestSyncV2Service -count=1`
Expected: FAIL，原因是当前 `SyncResponse` 还没有 `results[]`，冲突和忽略语义也未完整对齐 spec

- [x] **Step 3: 最小修改 service 协议模型**

在 `backend/internal/service/sync_v2_service.go`：

- 为 `ClientChange` 增加 `ChangeID string \`json:"changeId"\``
- 新增：

```go
type SyncResult struct {
    ChangeID string `json:"changeId"`
    Status   string `json:"status"`
    EntryID  string `json:"entryId"`
}
```

- 扩展 `SyncResponse`：

```go
type SyncResponse struct {
    NewCursor     int64          `json:"newCursor"`
    Results       []SyncResult   `json:"results"`
    ServerChanges []ServerChange `json:"serverChanges"`
    Conflicts     []Conflict     `json:"conflicts"`
}
```

- 将 `create / update / delete` 三条路径收敛为：
  - 成功写入：追加 `results.status = "applied"`
  - 冲突：追加 `results.status = "conflicted"`，同时写 `conflicts[]`
  - 无需报错的空操作：追加 `results.status = "ignored"`

- [x] **Step 4: 重新运行 service 测试确认通过**

Run: `cd backend && go test ./internal/service -run TestSyncV2Service -count=1`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/service/sync_v2_service.go backend/internal/service/sync_v2_service_test.go
git commit -m "feat: align sync v2 results with protocol spec"
```

### Task 2: 锁定首次同步与 cursor 增量行为

**Files:**
- Modify: `backend/internal/service/sync_v2_service_test.go`
- Modify: `backend/internal/service/sync_v2_service.go`
- Modify: `backend/internal/repository/change_repo.go`

- [x] **Step 1: 先写失败测试，覆盖 cursor 语义**

在 `backend/internal/service/sync_v2_service_test.go` 增加测试：

```go
func TestSyncV2Service_ReturnsAllChangesWhenCursorIsZero(t *testing.T) {}
func TestSyncV2Service_AdvancesNewCursorToLargestReturnedChangeID(t *testing.T) {}
```

断言点：

- `cursor=0` 时返回当前用户已有的全部 change log
- `newCursor` 等于本次返回的最大 `changeId`
- 没有新 change 时 `newCursor` 保持请求中的 cursor

- [x] **Step 2: 运行测试确认失败**

Run: `cd backend && go test ./internal/service -run 'TestSyncV2Service_(ReturnsAllChangesWhenCursorIsZero|AdvancesNewCursorToLargestReturnedChangeID)' -count=1`
Expected: FAIL，原因是当前实现对回执结构和 cursor 边界还未完全被测试锁住

- [x] **Step 3: 最小修改 service / repository**

在 `backend/internal/service/sync_v2_service.go`：

- 明确 `maxCursor` 初始化为请求 cursor
- 遍历 `ListSinceCursor` 返回结果时，仅按 `change_id` 更新 `newCursor`

在 `backend/internal/repository/change_repo.go`：

- 保持 `ORDER BY change_id ASC`
- 若测试暴露问题，只做最小必要修正，不重写仓储接口

- [x] **Step 4: 重新运行 service 测试确认通过**

Run: `cd backend && go test ./internal/service -run TestSyncV2Service -count=1`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/service/sync_v2_service.go backend/internal/service/sync_v2_service_test.go backend/internal/repository/change_repo.go
git commit -m "test: lock sync v2 cursor semantics"
```

## Chunk 2: Repository 行为与一致性边界

### Task 3: 锁定 `ignored / conflicted` 不写 `entry_changes`

**Files:**
- Modify: `backend/internal/service/sync_v2_service_test.go`
- Modify: `backend/internal/service/sync_v2_service.go`
- Modify: `backend/internal/repository/entry_repo.go`
- Modify: `backend/internal/repository/change_repo.go`

- [x] **Step 1: 先写失败测试，覆盖 change log 写入边界**

在 `backend/internal/service/sync_v2_service_test.go` 增加测试：

```go
func TestSyncV2Service_DoesNotAppendChangeForIgnoredDelete(t *testing.T) {}
func TestSyncV2Service_DoesNotAppendChangeForConflictedUpdate(t *testing.T) {}
```

断言点：

- `ignored` 不追加 change log
- `conflicted` 不追加 change log
- `applied` 才追加 change log

- [x] **Step 2: 运行测试确认失败**

Run: `cd backend && go test ./internal/service -run 'TestSyncV2Service_(DoesNotAppendChangeForIgnoredDelete|DoesNotAppendChangeForConflictedUpdate)' -count=1`
Expected: FAIL，原因是当前逻辑虽然大体接近，但还没有测试确保后续不会回归

- [x] **Step 3: 最小修改 service / repository**

在 `backend/internal/service/sync_v2_service.go`：

- 只在真实写入 `entries` 成功后调用 `AppendChange`
- `delete` 缺记录时只写 `ignored` 回执，不调用 `AppendChange`
- `update` 冲突时只写 `conflicted` 回执，不调用 `AppendChange`

在 `backend/internal/repository/entry_repo.go`：

- 若测试需要，补充最小返回值检查，确保 `UpdateFromSync` / `Delete` 可以区分是否真的改动了服务端状态

- [x] **Step 4: 重新运行 service 测试确认通过**

Run: `cd backend && go test ./internal/service -run TestSyncV2Service -count=1`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/service/sync_v2_service.go backend/internal/service/sync_v2_service_test.go backend/internal/repository/entry_repo.go backend/internal/repository/change_repo.go
git commit -m "fix: only append applied sync changes"
```

### Task 4: 补充事务一致性落点说明

**Files:**
- Modify: `backend/internal/service/sync_v2_service.go`
- Modify: `docs/superpowers/specs/2026-03-22-backend-incremental-sync-protocol-design.md`
- Modify: `docs/superpowers/plans/2026-03-22-backend-incremental-sync-protocol.md`

- [x] **Step 1: 先写一个失败测试或 TODO 断言，明确当前边界**

已在 `backend/internal/service/sync_v2_service.go` 补充最小注释，明确当前仍是分步 repository 调用，事务原子性未在本轮实现。

- [x] **Step 2: 做最小文档收口**

在实现没有真正引入事务前：

- 不虚构“已完成事务一致性”
- 在 spec / plan 中补充实际实现偏差说明
- 明确当前版本只保证语义正确，不保证 entry 写入与 change log 追加的数据库事务原子性

如果实际实现时已经补上事务，则改为记录：

- 事务入口在哪个 repository / service helper
- 已增加的验证覆盖

- [x] **Step 3: 运行相关测试确认没有回归**

Run: `cd backend && go test ./internal/service -run TestSyncV2Service -count=1`
Expected: PASS

已按要求只做文档收口，不创建 commit。

## Chunk 3: Handler 层与最终验证

### Task 5: 锁定 `POST /api/sync` 的请求校验与响应结构

**Files:**
- Create: `backend/internal/handlers/sync_v2_test.go`
- Modify: `backend/internal/handlers/sync_v2.go`

- [x] **Step 1: 先写失败测试，覆盖 handler 协议出口**

在 `backend/internal/handlers/sync_v2_test.go` 新增测试：

```go
func TestSyncV2Handler_ReturnsBadRequestForInvalidJSON(t *testing.T) {}
func TestSyncV2Handler_ReturnsSyncResponseDataOnSuccess(t *testing.T) {}
```

断言点：

- 非法 JSON 返回 `400`
- 成功时返回 `success=true`
- `data` 中带有 `newCursor`、`results`、`serverChanges`、`conflicts`

- [x] **Step 2: 运行测试确认失败**

Run: `cd backend && go test ./internal/handlers -run TestSyncV2Handler -count=1`
Expected: FAIL，原因是当前 handler 测试文件尚不存在，或响应结构尚未被测试锁定

- [x] **Step 3: 最小修改 handler**

在 `backend/internal/handlers/sync_v2.go`：

- 保持 `ShouldBindJSON` 的 `400` 分支
- 如测试暴露字段缺失，则以最小改动让成功响应严格对齐 spec

- [x] **Step 4: 重新运行 handler 测试确认通过**

Run: `cd backend && go test ./internal/handlers -run TestSyncV2Handler -count=1`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/handlers/sync_v2.go backend/internal/handlers/sync_v2_test.go
git commit -m "test: cover sync v2 handler contract"
```

### Task 6: 全量验证与文档收口

**Files:**
- Modify: `docs/superpowers/specs/2026-03-22-backend-incremental-sync-protocol-design.md`
- Modify: `docs/superpowers/plans/2026-03-22-backend-incremental-sync-protocol.md`

- [x] **Step 1: 运行目标测试**

Run:

```bash
cd backend && go test ./internal/service -run TestSyncV2Service -count=1
cd backend && go test ./internal/handlers -run TestSyncV2Handler -count=1
```

Expected: PASS

- [x] **Step 2: 运行后端全量测试**

Run: `cd backend && go test ./...`
Expected: PASS

- [x] **Step 3: 更新 spec / plan 状态**

在 spec 中：

- 更新状态为 `已实现` 或保留 `已批准` 并注明未实现项
- 补充实现偏差说明
- 记录最终验证结果

在 plan 中：

- 勾选已完成步骤
- 更新执行状态表
- 记录实际运行命令与结果

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-03-22-backend-incremental-sync-protocol-design.md docs/superpowers/plans/2026-03-22-backend-incremental-sync-protocol.md
git commit -m "docs: close backend incremental sync protocol task"
```

## 最终验证结果

- `cd backend && go test ./internal/service -run TestSyncV2Service -count=1`
  - 结果：通过
- `cd backend && go test ./internal/handlers -run TestSyncV2Handler -count=1`
  - 结果：通过
- `cd backend && go test ./...`
  - 结果：通过
