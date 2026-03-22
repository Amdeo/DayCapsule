# 后端访问日志与链路排障 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给后端补齐开发 / 测试环境可用的访问日志、`requestId` 关联能力，以及 `/api/sync` 与 `/api/media/upload` 的业务摘要日志，降低云同步和媒体上传问题的排障成本。

**Architecture:** 在 Gin 全局中间件层新增 `RequestID` 和 `AccessLog` 两个职责清晰的中间件，统一输出基础访问日志；handler 只负责把各自链路的业务摘要写入 `gin.Context`，由访问日志中间件在请求结束时统一收口。继续沿用现有 `zap` 日志体系，并让 `ErrorHandler` 补充 `requestId` 等关联字段，而不是另起一套日志框架。

**Tech Stack:** Go, Gin, Zap, SQLite, httptest, table-driven tests

**Spec:** `docs/superpowers/specs/2026-03-22-backend-access-log-debug-design.md`

---

## 变更记录

- 2026-03-22：基于已批准 spec 创建实现计划，范围只覆盖后端访问日志、`requestId` 和 `sync/upload` 业务摘要，不扩展到 tracing、metrics 或生产日志策略重构。
- 2026-03-23：已按计划完成实现、验证和文档收口；本轮在 `.worktrees/backend-access-log-debug` 隔离工作区执行，避免污染主工作区未提交改动。

## 执行状态

| Task | 状态 | 说明 |
|------|------|------|
| Task 1 | 已完成 | 已新增 `requestId` 中间件，并锁定 header 透传 / 生成 / 响应回写行为 |
| Task 2 | 已完成 | 已新增统一访问日志中间件，`ErrorHandler` 已补齐请求关联字段，`main.go` 已按设计挂载 |
| Task 3 | 已完成 | `/api/sync` 已输出 `sync.*` 摘要，并补齐成功 / 400 路径回归测试 |
| Task 4 | 已完成 | `/api/media/upload` 已输出 `upload.*` 摘要和失败阶段，并补齐成功 / 失败路径回归测试 |
| Task 5 | 已完成 | 已完成目标测试、后端全量测试、手动验证、spec / plan 收口和文档提交 |

## 实际执行说明

- 本轮遵循 TDD：先写失败测试，确认红灯后再补最小实现。
- 为避免在 `main` 和已有未提交改动上直接施工，实际实现放在 `.worktrees/backend-access-log-debug` 分支工作区中完成。
- `MediaHandler` 最终改为依赖最小 `mediaStore` 接口，而不是具体 `*repository.MediaRepository`，以便用 stub 精确验证 `upload.failedStage` 等日志字段。
- 手动验证采用临时端口 `39000`、临时 SQLite 文件和临时 upload 目录，避免本机现有端口 / 数据冲突。

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `backend/internal/middleware/request_id.go` | 生成 / 透传 `X-Request-Id`，并提供 `gin.Context` 读写 helper |
| `backend/internal/middleware/request_id_test.go` | 锁定 `requestId` header 透传、生成和响应回写行为 |
| `backend/internal/middleware/access_log.go` | 统一访问日志中间件、开发 / 测试环境开关 helper、业务摘要字段收集 helper |
| `backend/internal/middleware/access_log_test.go` | 锁定基础字段输出、业务摘要透传和环境开关行为 |
| `backend/internal/middleware/error_test.go` | 锁定错误日志包含 `requestId`、`method`、`path`、`status` |
| `backend/internal/handlers/media_test.go` | 锁定媒体上传成功 / 失败时的业务摘要字段与失败阶段 |

### Modified Files

| File | Change |
|------|--------|
| `backend/cmd/server/main.go` | 按 spec 要求挂载 `RequestID`、`AccessLog`、`Recovery`、`ErrorHandler`、`RateLimiter` |
| `backend/internal/middleware/error.go` | 错误日志补齐 `requestId`、`method`、`path`、`status` |
| `backend/internal/handlers/sync_v2.go` | 统计 `clientChanges`、`results`、`conflicts` 并写入访问日志上下文 |
| `backend/internal/handlers/sync_v2_test.go` | 新增摘要字段回归测试 |
| `backend/internal/handlers/media.go` | 写入上传摘要字段、失败阶段；必要时抽接口以便单测 |
| `docs/superpowers/specs/2026-03-22-backend-access-log-debug-design.md` | 实现完成后更新状态、偏差说明和验证结果 |
| `docs/superpowers/plans/2026-03-22-backend-access-log-debug.md` | 执行过程中逐项勾选并补齐验证记录 |

## 执行约束

- 不引入新的日志框架，统一复用现有 `zap`。
- 不记录请求体全文、响应体全文、token、entry 正文、二进制文件内容或完整磁盘绝对路径。
- 访问日志只在开发 / 测试环境开启；生产环境默认保持关闭。
- `requestId` 必须在访问日志和错误日志之间复用同一值。
- `/api/sync` 只记录计数摘要，不记录 `clientChanges` 详细内容。
- `/api/media/upload` 只记录文件摘要和失败阶段，不记录媒体原始内容。
- 不回滚当前工作区已有改动；只增量修改本计划列出的文件。

## Chunk 1: 全局请求关联与访问日志

### Task 1: 新增 `requestId` 中间件并锁定 header 行为

**Files:**
- Create: `backend/internal/middleware/request_id.go`
- Create: `backend/internal/middleware/request_id_test.go`

- [x] **Step 1: 先写失败测试，锁定 `requestId` 透传与生成**

在 `backend/internal/middleware/request_id_test.go` 新增至少两个测试：

```go
func TestRequestIDMiddleware_PreservesIncomingHeader(t *testing.T) {}
func TestRequestIDMiddleware_GeneratesAndEchoesHeaderWhenMissing(t *testing.T) {}
```

断言点：

- 传入 `X-Request-Id` 时，context 里能读到同样的值
- 没传 header 时会生成非空 `requestId`
- 响应头始终包含 `X-Request-Id`

- [x] **Step 2: 运行测试，确认当前实现失败**

Run: `cd backend && go test ./internal/middleware -run TestRequestIDMiddleware -count=1`
Expected: FAIL，原因是当前还没有 `RequestID` 中间件和对应 helper。

- [x] **Step 3: 最小实现 `requestId` 中间件**

在 `backend/internal/middleware/request_id.go`：

- 新增 `const RequestIDHeader = "X-Request-Id"`
- 定义 context key
- 新增：

```go
func RequestID() gin.HandlerFunc
func GetRequestID(c *gin.Context) string
```

实现要求：

- 优先使用传入的 `X-Request-Id`
- 缺失时生成新的随机 ID
- 同时写入 `gin.Context` 和响应头

- [x] **Step 4: 回跑 middleware 测试**

Run: `cd backend && go test ./internal/middleware -run TestRequestIDMiddleware -count=1`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add backend/internal/middleware/request_id.go backend/internal/middleware/request_id_test.go
git commit -m "feat: add request id middleware"
```

### Task 2: 新增统一访问日志中间件，并补齐错误日志关联字段

**Files:**
- Create: `backend/internal/middleware/access_log.go`
- Create: `backend/internal/middleware/access_log_test.go`
- Create: `backend/internal/middleware/error_test.go`
- Modify: `backend/internal/middleware/error.go`
- Modify: `backend/cmd/server/main.go`

- [x] **Step 1: 先写失败测试，锁定访问日志与错误日志字段**

在 `backend/internal/middleware/access_log_test.go` 新增测试：

```go
func TestAccessLogMiddleware_LogsBaseFieldsAndSummary(t *testing.T) {}
func TestShouldEnableAccessLog_DisablesOnlyInProduction(t *testing.T) {}
```

在 `backend/internal/middleware/error_test.go` 新增测试：

```go
func TestErrorHandler_LogsRequestMetadata(t *testing.T) {}
```

断言点：

- 访问日志包含 `requestId`、`method`、`path`、`status`、`latencyMs`、`clientIP`
- 通过 context 写入的业务摘要字段会一并出现在日志里
- `ENV=production` 时访问日志关闭，其它环境开启
- 错误日志包含 `requestId`、`method`、`path`、`status`

- [x] **Step 2: 运行测试，确认当前实现失败**

Run: `cd backend && go test ./internal/middleware -run 'Test(AccessLogMiddleware|ShouldEnableAccessLog|ErrorHandler)' -count=1`
Expected: FAIL，原因是当前还没有统一访问日志中间件和环境开关 helper，`ErrorHandler` 也未输出 `requestId` 等字段。

- [x] **Step 3: 最小实现访问日志与错误日志增强**

在 `backend/internal/middleware/access_log.go`：

- 新增：

```go
func AccessLog(logger *zap.Logger) gin.HandlerFunc
func ShouldEnableAccessLog(env string) bool
func SetAccessLogField(c *gin.Context, key string, value any)
func GetAccessLogField(c *gin.Context, key string) (any, bool)
```

- 用 `time.Now()` 计算 `latencyMs`
- 请求结束后统一输出一条 `logger.Info("access log", ...)`
- 从 context 中读取业务摘要字段，一并写入访问日志

在 `backend/internal/middleware/error.go`：

- 继续复用现有错误处理流程
- 增加 `requestId`、`method`、`path`、`status` 字段

在 `backend/cmd/server/main.go`：

- 按 spec 调整中间件顺序：
  1. `RequestID`
  2. `AccessLog`（仅 `ShouldEnableAccessLog(os.Getenv("ENV"))` 为 `true` 时挂载）
  3. `gin.Recovery()`
  4. `ErrorHandler`
  5. `RateLimiter`

- [x] **Step 4: 回跑 middleware 测试**

Run: `cd backend && go test ./internal/middleware -run 'Test(AccessLogMiddleware|ShouldEnableAccessLog|ErrorHandler)' -count=1`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add backend/internal/middleware/access_log.go backend/internal/middleware/access_log_test.go backend/internal/middleware/error.go backend/internal/middleware/error_test.go backend/cmd/server/main.go
git commit -m "feat: add backend access logging middleware"
```

## Chunk 2: `sync` 与 `upload` 业务摘要日志

### Task 3: 给 `/api/sync` 增加摘要字段并锁定计数行为

**Files:**
- Modify: `backend/internal/handlers/sync_v2.go`
- Modify: `backend/internal/handlers/sync_v2_test.go`

- [x] **Step 1: 先写失败测试，锁定 `sync` 摘要字段**

在 `backend/internal/handlers/sync_v2_test.go` 增加测试：

```go
func TestSyncV2Handler_AttachesAccessLogSummaryOnSuccess(t *testing.T) {}
func TestSyncV2Handler_AttachesRequestSummaryBeforeReturning400(t *testing.T) {}
```

断言点：

- `deviceId`、`hasCursor`、`clientChangeCount` 正确
- `create / update / delete` 三类操作计数正确
- 成功响应时 `resultCount / serverChangeCount / conflictCount` 正确
- 参数校验失败时，至少请求摘要部分仍可用于访问日志

提示：

- 现有 `performSyncV2Request` helper 可以扩展为返回 `*gin.Context`，便于测试读取 `middleware.GetAccessLogField(...)`

- [x] **Step 2: 运行测试，确认当前实现失败**

Run: `cd backend && go test ./internal/handlers -run TestSyncV2Handler -count=1`
Expected: FAIL，原因是当前 handler 还没有把 `sync.*` 摘要写入访问日志上下文。

- [x] **Step 3: 最小实现 `sync` 摘要写入**

在 `backend/internal/handlers/sync_v2.go`：

- 在成功 `ShouldBindJSON` 后立即统计：
  - `sync.deviceId`
  - `sync.hasCursor`
  - `sync.clientChangeCount`
  - `sync.clientOpCreateCount`
  - `sync.clientOpUpdateCount`
  - `sync.clientOpDeleteCount`
- 在拿到 `resp` 后补充：
  - `sync.resultCount`
  - `sync.resultAppliedCount`
  - `sync.resultConflictedCount`
  - `sync.resultIgnoredCount`
  - `sync.serverChangeCount`
  - `sync.conflictCount`

实现要求：

- 只记录计数和布尔值，不写入正文内容
- 摘要字段统一通过 `middleware.SetAccessLogField(...)` 写入

- [x] **Step 4: 回跑 `sync` handler 测试**

Run: `cd backend && go test ./internal/handlers -run TestSyncV2Handler -count=1`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add backend/internal/handlers/sync_v2.go backend/internal/handlers/sync_v2_test.go
git commit -m "feat: add sync access log summaries"
```

### Task 4: 给 `/api/media/upload` 增加上传摘要与失败阶段

**Files:**
- Create: `backend/internal/handlers/media_test.go`
- Modify: `backend/internal/handlers/media.go`

- [x] **Step 1: 先写失败测试，锁定上传摘要字段和失败阶段**

在 `backend/internal/handlers/media_test.go` 新增测试：

```go
func TestMediaHandlerUpload_AttachesAccessLogSummaryOnSuccess(t *testing.T) {}
func TestMediaHandlerUpload_SetsFailedStageWhenFileFieldMissing(t *testing.T) {}
func TestMediaHandlerUpload_SetsFailedStageWhenRepositoryCreateFails(t *testing.T) {}
```

断言点：

- 成功上传时能读到：
  - `upload.fieldName`
  - `upload.mimeType`
  - `upload.size`
  - `upload.extension`
  - `upload.mediaId`
- 失败时能读到正确的 `upload.failedStage`

提示：

- 为避免强依赖真实 SQLite，可先把 `MediaHandler` 依赖从具体 `*repository.MediaRepository` 抽成最小接口，再用 stub repo 测试
- 使用 `multipart.NewWriter` 构造测试请求，文件内容可直接用小字符串

- [x] **Step 2: 运行测试，确认当前实现失败**

Run: `cd backend && go test ./internal/handlers -run TestMediaHandlerUpload -count=1`
Expected: FAIL，原因是当前没有 `media_test.go`，`MediaHandler` 也没有写入上传摘要或失败阶段。

- [x] **Step 3: 最小实现上传摘要写入**

在 `backend/internal/handlers/media.go`：

- 需要时先提取最小 repository 接口：

```go
type mediaStore interface {
    Create(userID, filename, mimeType, storagePath string, size int64) (*models.MediaFile, error)
    GetByID(mediaID string) (*models.MediaFile, error)
    Delete(userID, mediaID string) error
}
```

- 在成功读取 `FormFile("file")` 后写入：
  - `upload.fieldName = "file"`
  - `upload.mimeType`
  - `upload.size`
  - `upload.extension`
- 在各失败路径设置：
  - `form_file`
  - `mkdir`
  - `create_file`
  - `copy_file`
  - `save_record`
- 成功创建媒体记录后补 `upload.mediaId`

实现要求：

- 不记录原始文件内容
- 不记录完整绝对路径
- 成功 / 失败都统一通过 `middleware.SetAccessLogField(...)` 交给访问日志中间件收口

- [x] **Step 4: 回跑 `media` handler 测试**

Run: `cd backend && go test ./internal/handlers -run TestMediaHandlerUpload -count=1`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add backend/internal/handlers/media.go backend/internal/handlers/media_test.go
git commit -m "feat: add media upload access log summaries"
```

## Chunk 3: 验证与文档收口

### Task 5: 完成验证并更新 spec / plan

**Files:**
- Modify: `docs/superpowers/specs/2026-03-22-backend-access-log-debug-design.md`
- Modify: `docs/superpowers/plans/2026-03-22-backend-access-log-debug.md`

- [x] **Step 1: 跑目标测试**

Run:

```bash
cd backend && go test ./internal/middleware ./internal/handlers -count=1
```

Expected: PASS

- [x] **Step 2: 跑后端全量测试**

Run:

```bash
cd backend && go test ./... -count=1
```

Expected: PASS

- [x] **Step 3: 做最小手动验证**

建议顺序：

```bash
cd backend && JWT_SECRET=test-secret ENV=development PORT=3000 BASE_URL=http://localhost:3000 go run ./cmd/server
```

另开终端执行：

```bash
curl -i -H 'X-Request-Id: debug-health-1' http://127.0.0.1:3000/health
```

注册并拿 token：

```bash
curl -s http://127.0.0.1:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"debug@example.com","password":"123456"}'
```

再验证 `sync`：

```bash
curl -i http://127.0.0.1:3000/api/sync \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -H 'X-Request-Id: debug-sync-1' \
  -d '{"cursor":0,"deviceId":"debug-device","clientChanges":[]}'
```

再验证 `media/upload`：

```bash
curl -i http://127.0.0.1:3000/api/media/upload \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'X-Request-Id: debug-upload-1' \
  -F 'file=@go.mod'
```

手测断言：

- 响应头包含 `X-Request-Id`
- 访问日志里能看到基础字段
- `/api/sync` 日志里能看到 `sync.*` 摘要
- `/api/media/upload` 日志里能看到 `upload.*` 摘要
- 若故意构造失败请求，错误日志和访问日志能通过同一个 `requestId` 串起来

- [x] **Step 4: 更新文档状态与验证结果**

更新 `docs/superpowers/specs/2026-03-22-backend-access-log-debug-design.md`：

- 状态改为 `已实现`
- 补充实现结果
- 记录最终验证结果
- 若实现和设计有偏差，记录偏差说明

更新 `docs/superpowers/plans/2026-03-22-backend-access-log-debug.md`：

- 勾选已完成步骤
- 补充实际执行命令和结果
- 记录是否有实现偏差，例如：
  - 是否把环境开关下沉到 middleware helper
  - `media` handler 是否为测试引入最小接口

- [x] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-03-22-backend-access-log-debug-design.md docs/superpowers/plans/2026-03-22-backend-access-log-debug.md
git commit -m "docs: close out backend access log debug work"
```

## 最终验证记录

- 目标测试：
  - `cd backend && go test ./internal/middleware ./internal/handlers -count=1`
  - 结果：通过
- 后端全量测试：
  - `cd backend && go test ./... -count=1`
  - 结果：通过
- diff 检查：
  - `git diff --check`
  - 结果：通过
- 手动验证：
  - 启动命令：
    - `JWT_SECRET=test-secret ENV=development PORT=39000 BASE_URL=http://localhost:39000 DATABASE_PATH=/tmp/backend-access-log-debug-17261.db UPLOAD_DIR=/tmp/backend-access-log-debug-uploads-17261 go run ./cmd/server`
  - 请求与结果：
    - `curl -i -H 'X-Request-Id: debug-health-1' http://127.0.0.1:39000/health`：`200 OK`，响应头带 `X-Request-Id`
    - `curl -i http://127.0.0.1:39000/api/sync -H 'Authorization: Bearer <TOKEN>' -H 'Content-Type: application/json' -H 'X-Request-Id: debug-sync-1' -d '{"cursor":0,"deviceId":"debug-device","clientChanges":[]}'`：`200 OK`，服务端日志带 `sync.*` 摘要
    - `curl -i http://127.0.0.1:39000/api/media/upload -H 'Authorization: Bearer <TOKEN>' -H 'X-Request-Id: debug-upload-1' -F 'file=@go.mod;type=text/plain'`：`201 Created`，服务端日志带 `upload.*` 摘要
- 自动化补充验证：
  - `TestErrorHandler_LogsRequestMetadata` 已验证错误日志包含 `requestId`、`method`、`path`、`status`

## 实现偏差说明

- `MediaHandler` 的依赖由具体 `*repository.MediaRepository` 收敛为最小 `mediaStore` 接口，以便隔离真实 DB 做摘要日志测试；这是为可测性做的最小结构调整。
- 手动验证没有沿用计划示例的 `3000` 端口，而是改用临时 `39000` 端口和临时数据目录，以规避本机现有环境冲突。
