# update 冲突判定原子化 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让后端 `/api/sync` 的 `update` 路径使用数据库条件更新完成原子冲突判定，保证同一 `baseUpdatedAt` 下最多只有一个请求返回 `applied`，并把失败结果稳定映射为 `conflicted` 或 `ignored`。

**Architecture:** 在 `EntryRepository` 增加一个带版本条件的更新 helper，把 `updated_at = baseUpdatedAt` 作为 SQL `WHERE` 条件，让数据库直接决定本次更新是否成立。`SyncV2Service` 保留“先检查记录是否存在”的协议语义，但改为消费 repository 返回的 `updated / version_mismatch / missing` 三态结果，并在成功后回读持久化快照、在冲突后回读最新服务端版本。

**Tech Stack:** Go, Gin, SQLite, table-driven tests

**Spec:** `docs/superpowers/specs/2026-03-22-update-conflict-atomicity-design.md`

---

## 变更记录

- 2026-03-22：基于已批准 spec 创建实现计划，范围只覆盖 `update` 冲突判定原子化，不扩展到 `create/delete` 或 `entry_changes` 的完整事务化改造。
- 2026-03-22：已按计划完成实现与验证；由于当前工作区存在大量无关未提交改动，且本轮未使用隔离 worktree，计划中的分任务 `Commit` 步骤未执行，改为仅收口文档与验证结果。

## 执行状态

| Task | 状态 | 说明 |
|------|------|------|
| Task 1 | 已完成 | 已新增条件更新 helper 和 repository 级三态测试，锁定 `updated / version_mismatch / missing` |
| Task 2 | 已完成 | 已让 `SyncV2Service` 消费三态 helper，并补齐 `version_mismatch / missing` 原子化语义测试 |
| Task 3 | 已完成 | 已新增真实 DB 回归测试，确认 `update` 命中缺失 entry 时仍按 `create` 处理并写入 `create` change log |
| Task 4 | 已完成 | 已完成目标测试、回归测试、handler 测试和后端全量测试，并同步收口 spec / plan |

## 实际执行说明

- 实现中新增了 `backend/internal/service/sync_v2_service_atomicity_test.go`，用最小 fake store 锁定 service 层对 `version_mismatch / missing` 的映射；这是为了覆盖真实 DB 很难稳定构造的窗口期分支。
- `SyncV2Service` 内部增加了最小 store 接口和 `newSyncV2Service(...)` 测试构造函数，外部仍通过 `NewSyncV2Service(...)` 注入真实 repository。
- repository helper 继续使用现有 `time.Time` 参数绑定路径，没有引入新的 SQLite 时间字符串编码。
- 本轮没有执行计划中的分任务 commit 步骤；原因是当前工作区存在大量无关未提交改动，且没有隔离分支/worktree，不适合按 task 粒度直接提交到 `main`。

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `backend/internal/repository/entry_repo_test.go` | 使用真实 SQLite DB 锁定 `UpdateFromSyncIfVersionMatches` 的三态行为，避免 helper 语义回归 |
| `backend/internal/service/sync_v2_service_atomicity_test.go` | 使用最小 fake repository 聚焦测试 `SyncV2Service` 对 `updated / version_mismatch / missing` 的映射，不把更多集成细节塞进现有大测试文件 |

### Modified Files

| File | Change |
|------|--------|
| `backend/internal/repository/entry_repo.go` | 新增 `UpdateFromSyncMatchResult` 与 `UpdateFromSyncIfVersionMatches`，把 `baseUpdatedAt` 放进 `WHERE` 条件 |
| `backend/internal/service/sync_v2_service.go` | 为 `update` 路径接入 repository 条件更新 helper，并在需要时引入最小测试 seam，不改变 handler 使用方式 |
| `backend/internal/service/sync_v2_service_test.go` | 补一条真实 DB 回归测试，锁定“entry 不存在时 update 仍视作 create”的既有协议语义 |
| `docs/superpowers/specs/2026-03-22-update-conflict-atomicity-design.md` | 实现后更新状态、验证结果与最终说明 |
| `docs/superpowers/plans/2026-03-22-update-conflict-atomicity.md` | 执行过程中勾选任务、补齐验证结果与偏差说明 |

## 执行约束

- 只改 `update` 路径，不顺手改 `create/delete` 或 `AppendChange` 事务边界。
- `/api/sync` 的请求/响应 JSON 结构保持不变，handler 不新增协议字段。
- `missing` 表示窗口期内服务端删除赢了竞争，返回 `ignored`，不伪造 `conflicted + serverEntry`。
- 条件更新里的 `baseUpdatedAt` 必须走现有 SQLite `time.Time` 绑定路径，避免自定义字符串格式带来的精度漂移。
- 当前工作区已有大量未提交改动，执行时只增量修改本计划列出的文件，不回滚无关变更。

## Chunk 1: Repository 条件更新 Helper

### Task 1: 锁定 `updated / version_mismatch / missing` 三态

**Files:**
- Create: `backend/internal/repository/entry_repo_test.go`
- Modify: `backend/internal/repository/entry_repo.go`

- [x] **Step 1: 先写失败测试，覆盖 helper 的三态结果**

在 `backend/internal/repository/entry_repo_test.go` 新增真实 SQLite 测试，至少覆盖：

```go
func TestEntryRepository_UpdateFromSyncIfVersionMatches_UpdatesWhenBaseMatches(t *testing.T) {}
func TestEntryRepository_UpdateFromSyncIfVersionMatches_ReturnsVersionMismatchWhenBaseDiffers(t *testing.T) {}
func TestEntryRepository_UpdateFromSyncIfVersionMatches_ReturnsMissingWhenEntryIsGone(t *testing.T) {}
```

断言点：

- `updated` 时数据库内容被实际更新，`updated_at` 被刷新
- `version_mismatch` 时不覆盖现有服务端版本
- `missing` 时不更新任何记录，也不把结果误判成 `version_mismatch`

- [x] **Step 2: 运行 repository 测试，确认当前实现失败**

Run: `cd backend && go test ./internal/repository -run TestEntryRepository_UpdateFromSyncIfVersionMatches -count=1`
Expected: FAIL，原因是当前仓库还没有 `UpdateFromSyncMatchResult` 和 `UpdateFromSyncIfVersionMatches`

- [x] **Step 3: 以最小改动实现条件更新 helper**

在 `backend/internal/repository/entry_repo.go`：

- 新增结果类型：

```go
type UpdateFromSyncMatchResult string

const (
    UpdateFromSyncUpdated         UpdateFromSyncMatchResult = "updated"
    UpdateFromSyncVersionMismatch UpdateFromSyncMatchResult = "version_mismatch"
    UpdateFromSyncMissing         UpdateFromSyncMatchResult = "missing"
)
```

- 新增方法：

```go
func (r *EntryRepository) UpdateFromSyncIfVersionMatches(
    userID string,
    entry *models.Entry,
    baseUpdatedAt time.Time,
) (UpdateFromSyncMatchResult, error)
```

实现要求：

- SQL `WHERE` 必须带 `id = ? AND user_id = ? AND updated_at = ?`
- `RowsAffected() == 1` 时返回 `UpdateFromSyncUpdated`
- `RowsAffected() == 0` 时再调用一次 `GetByID(...)`
- 重读为空时返回 `UpdateFromSyncMissing`
- 重读仍存在时返回 `UpdateFromSyncVersionMismatch`
- 继续沿用现有 `time.Time` 参数绑定，不引入手写时间字符串格式

- [x] **Step 4: 重新运行 repository 测试，确认通过**

Run: `cd backend && go test ./internal/repository -run TestEntryRepository_UpdateFromSyncIfVersionMatches -count=1`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/repository/entry_repo.go backend/internal/repository/entry_repo_test.go
git commit -m "feat: add atomic sync update repository helper"
```

## Chunk 2: Service 原子化状态流转

### Task 2: 把 `update` 映射到三态 helper 结果

**Files:**
- Create: `backend/internal/service/sync_v2_service_atomicity_test.go`
- Modify: `backend/internal/service/sync_v2_service.go`

- [x] **Step 1: 先写失败测试，锁定 service 的结果映射**

在 `backend/internal/service/sync_v2_service_atomicity_test.go` 新增最小 fake repository / change repository 测试，至少覆盖：

```go
func TestSyncV2Service_UpdateReturnsConflictedWithFreshServerEntryAfterVersionMismatch(t *testing.T) {}
func TestSyncV2Service_UpdateReturnsIgnoredWhenConditionalUpdateReportsMissing(t *testing.T) {}
```

断言点：

- `version_mismatch` 时：
  - `results[0].status == "conflicted"`
  - `conflicts[0].serverEntry` 使用第二次读取到的最新服务端版本
  - 不调用 `AppendChange`
- `missing` 时：
  - `results[0].status == "ignored"`
  - 不生成 `conflicts[]`
  - 不调用 `AppendChange`

- [x] **Step 2: 运行 service 测试，确认当前实现失败**

Run: `cd backend && go test ./internal/service -run 'TestSyncV2Service_Update(ReturnsConflictedWithFreshServerEntryAfterVersionMismatch|ReturnsIgnoredWhenConditionalUpdateReportsMissing)' -count=1`
Expected: FAIL，原因是当前 `SyncV2Service` 仍直接依赖具体 repository，且 `update` 路径还没有接入三态 helper

- [x] **Step 3: 最小修改 `SyncV2Service`，消费条件更新 helper**

在 `backend/internal/service/sync_v2_service.go`：

- 为 service 引入最小依赖接口，至少覆盖：

```go
type syncV2EntryStore interface {
    GetByID(userID, entryID string) (*models.Entry, error)
    InsertFromSync(userID string, entry *models.Entry) (*models.Entry, error)
    UpdateFromSyncIfVersionMatches(userID string, entry *models.Entry, baseUpdatedAt time.Time) (repository.UpdateFromSyncMatchResult, error)
    Delete(userID, entryID string) error
}

type syncV2ChangeStore interface {
    AppendChange(ctx context.Context, userID string, op string, entry *models.Entry) (int64, error)
    ListSinceCursor(ctx context.Context, userID string, cursor int64, limit int) ([]*models.EntryChange, error)
}
```

- 保留 `NewSyncV2Service(...)` 的外部用法不变；必要时新增一个仅供测试使用的内部构造函数
- `update` 分支改为：
  - `existing == nil` 时仍走 `insertEntry(...)`
  - `existing != nil` 时调用 `UpdateFromSyncIfVersionMatches(...)`
  - `updated`：回读持久化 entry，追加 change log，返回 `applied`
  - `version_mismatch`：重读当前服务端 entry，返回 `conflicted`
  - `missing`：返回 `ignored`，不写 change log，不生成 conflict

- [x] **Step 4: 重新运行 atomicity service 测试，确认通过**

Run: `cd backend && go test ./internal/service -run 'TestSyncV2Service_Update(ReturnsConflictedWithFreshServerEntryAfterVersionMismatch|ReturnsIgnoredWhenConditionalUpdateReportsMissing)' -count=1`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/service/sync_v2_service.go backend/internal/service/sync_v2_service_atomicity_test.go
git commit -m "fix: make sync v2 update conflict check atomic"
```

### Task 3: 锁住未变更的协议语义

**Files:**
- Modify: `backend/internal/service/sync_v2_service_test.go`

- [x] **Step 1: 增加真实 DB 回归测试，防止原子化改坏旧语义**

在 `backend/internal/service/sync_v2_service_test.go` 新增：

```go
func TestSyncV2Service_UpdateCreatesEntryWhenServerRowIsMissing(t *testing.T) {}
```

断言点：

- 服务端不存在该 entry 时，`update` 仍返回 `applied`
- entry 被实际创建
- `entry_changes` 仍追加一条 `create`

- [x] **Step 2: 运行回归测试，确认当前实现基线成立**

Run: `cd backend && go test ./internal/service -run TestSyncV2Service_UpdateCreatesEntryWhenServerRowIsMissing -count=1`
Expected: PASS，原因是当前实现本来就要求 `update` 命中缺失 entry 时退化为 `create`

- [x] **Step 3: 在原子化实现完成后重新运行相关 service 测试**

Run: `cd backend && go test ./internal/service -run 'TestSyncV2Service_(UpdateCreatesEntryWhenServerRowIsMissing|UpdateSuccessUsesPersistedSnapshot|DoesNotAppendChangeLogForConflictedUpdate)' -count=1`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/internal/service/sync_v2_service_test.go
git commit -m "test: lock sync v2 update regression semantics"
```

## Chunk 3: 文档收口与验证

### Task 4: 更新文档状态并完成最终验证

**Files:**
- Modify: `docs/superpowers/specs/2026-03-22-update-conflict-atomicity-design.md`
- Modify: `docs/superpowers/plans/2026-03-22-update-conflict-atomicity.md`

- [x] **Step 1: 运行目标测试**

Run: `cd backend && go test ./internal/repository -run TestEntryRepository_UpdateFromSyncIfVersionMatches -count=1`
Expected: PASS

Run: `cd backend && go test ./internal/service -run 'TestSyncV2Service_(UpdateReturnsConflictedWithFreshServerEntryAfterVersionMismatch|UpdateReturnsIgnoredWhenConditionalUpdateReportsMissing|UpdateCreatesEntryWhenServerRowIsMissing)' -count=1`
Expected: PASS

- [x] **Step 2: 运行回归与 handler 测试**

Run: `cd backend && go test ./internal/service -run TestSyncV2Service -count=1`
Expected: PASS

Run: `cd backend && go test ./internal/handlers -run TestSyncV2Handler -count=1`
Expected: PASS

- [x] **Step 3: 运行后端全量测试**

Run: `cd backend && go test ./...`
Expected: PASS

- [x] **Step 4: 收口 spec / plan**

在 `docs/superpowers/specs/2026-03-22-update-conflict-atomicity-design.md`：

- 更新状态为 `已实现`
- 补充实际验证命令与结果
- 如实现与设计有细微偏差，补一段最终说明

在 `docs/superpowers/plans/2026-03-22-update-conflict-atomicity.md`：

- 勾选已完成步骤
- 更新任务状态表
- 记录实际执行中对测试或文件边界的调整

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-03-22-update-conflict-atomicity-design.md docs/superpowers/plans/2026-03-22-update-conflict-atomicity.md
git commit -m "docs: close update conflict atomicity task"
```
