# 后端访问日志与链路排障设计

## 状态

- 当前状态：待评审
- 设计确认日期：2026-03-22

## 评审记录

- 2026-03-22：已确认本轮目标是给后端增加可用于排障的访问日志，不扩展为完整 observability 平台建设。
- 2026-03-22：已确认日志默认档位为“全局基础访问日志 + `/api/sync` 与 `/api/media/upload` 业务摘要”。
- 2026-03-22：已确认访问日志仅在开发 / 测试环境开启，生产默认关闭。
- 2026-03-22：已确认 `/api/sync` 与 `/api/media/upload` 都需要被重点覆盖。
- 2026-03-22：已确认采用全局 `requestId`，并回写到响应头，便于前后端串联定位问题。
- 2026-03-22：已完成本地结构化 review。由于本轮会话未显式获得子代理授权，spec review 先采用本地 review 留痕，不在本轮调用 subagent。

## 背景

当前后端已经具备：

- 基于 `zap` 的基础日志初始化
- `ErrorHandler` 中间件输出异常日志
- `Auth`、`RateLimiter` 等通用中间件
- `/api/sync` 增量同步接口
- `/api/media/upload` 媒体上传接口

但目前缺少统一访问日志：

- 请求是否真正到达后端，不容易从现有日志直接判断
- `/api/sync` 当前只能看到失败结果，看不到本次请求携带了多少 `clientChanges`
- `/api/media/upload` 当前只能看到成功或失败，看不到上传文件的基础摘要
- 同一时刻多个请求并发时，缺少统一 `requestId`，很难把访问日志、错误日志、前端报错串成一条链路

这会直接增加云同步和媒体上传问题的定位成本，尤其是在 Android 模拟器、前后台切换、自动重试并发触发的场景下。

## 目标

- 给后端增加统一访问日志，便于确认请求是否到达、返回了什么状态、耗时多少
- 给每个请求分配或透传 `requestId`，用于串联访问日志、错误日志和前端请求
- 对 `/api/sync` 输出不含敏感正文的业务摘要，便于定位同步问题
- 对 `/api/media/upload` 输出不含原始文件内容的业务摘要，便于定位上传问题
- 保持现有 `zap` 日志体系，不额外引入新的日志框架
- 将访问日志默认限制在开发 / 测试环境，避免生产环境无控制扩增日志量

## 最终方案

### 1. 新增全局 `requestId` 中间件

新增一个独立中间件，职责只做请求关联标识：

- 请求进入时优先读取 `X-Request-Id`
- 若请求头不存在，则生成新的 `requestId`
- 将 `requestId` 写入 `gin.Context`
- 将 `requestId` 回写到响应头 `X-Request-Id`

这样后续的访问日志、错误日志、业务摘要日志都可以复用同一个请求标识，不要求 handler 自己生成或维护 ID。

### 2. 新增统一访问日志中间件

新增一个独立 `access log middleware`，请求结束时统一输出一条结构化日志。

全局基础字段固定包含：

- `requestId`
- `method`
- `path`
- `status`
- `latencyMs`
- `clientIP`
- `userID`
- `userAgent`
- `errorCount`

访问日志只负责记录请求总体情况，不负责打印错误栈，也不直接替代现有 `ErrorHandler`。

### 3. `/api/sync` 输出业务摘要

`/api/sync` 的 handler 在完成参数绑定和服务调用后，将以下摘要信息写入 `gin.Context`，由访问日志中间件统一输出：

- `sync.deviceId`
- `sync.hasCursor`
- `sync.clientChangeCount`
- `sync.clientOpCreateCount`
- `sync.clientOpUpdateCount`
- `sync.clientOpDeleteCount`
- `sync.resultCount`
- `sync.resultAppliedCount`
- `sync.resultConflictedCount`
- `sync.resultIgnoredCount`
- `sync.serverChangeCount`
- `sync.conflictCount`

设计约束：

- 不输出完整 `clientChanges`
- 不输出 entry 正文、媒体 URL 列表、标签明细等业务内容
- 只输出计数和分布，用于确认“请求携带了多少变更，服务端如何处理”

### 4. `/api/media/upload` 输出业务摘要

`/api/media/upload` 的 handler 在关键节点把上传摘要写入 `gin.Context`，由访问日志中间件统一输出：

- `upload.fieldName`
- `upload.mimeType`
- `upload.size`
- `upload.extension`
- `upload.mediaId`
- `upload.failedStage`

其中 `upload.failedStage` 用于快速定位失败位置，建议最少覆盖：

- `form_file`
- `mkdir`
- `create_file`
- `copy_file`
- `save_record`

设计约束：

- 不记录原始二进制内容
- 不直接记录完整磁盘绝对路径
- 若需要记录存储结果，最多记录相对文件名或 `mediaId`

### 5. 中间件挂载顺序

中间件顺序建议调整为：

1. `RequestID`
2. `AccessLog`
3. `gin.Recovery()`
4. `ErrorHandler`
5. `RateLimiter`
6. `Auth` 继续只挂在 authorized group

这样可以保证：

- `requestId` 在整个请求生命周期最早可用
- 访问日志可以拿到最终 `status`、`latency` 和摘要字段
- 授权前失败与授权后失败都能被统一访问日志覆盖

### 6. 环境开关

访问日志默认只在开发 / 测试环境开启。

建议规则：

- `ENV=production`：关闭访问日志
- 其它环境值：开启访问日志

这样可以满足当前本地调试、模拟器联调、测试环境排障的诉求，同时避免默认污染生产日志。

### 7. 与现有错误日志的关系

保留现有 `ErrorHandler`，但建议补齐以下关联字段：

- `requestId`
- `method`
- `path`
- `status`

日志职责拆分为：

- 访问日志：记录每个请求的统一摘要
- 错误日志：记录错误原因

同一个请求出错时，至少能通过 `requestId` 把两者串起来。

## 影响范围

- `backend/cmd/server/main.go`
- `backend/internal/middleware/`
- `backend/internal/handlers/sync_v2.go`
- `backend/internal/handlers/media.go`
- 如有必要：`backend/pkg/utils/logger.go`
- 相关中间件与 handler 测试

## 不在范围内

- 引入完整 tracing / metrics / APM 体系
- 生产环境默认开启访问日志
- 输出完整请求体或响应体
- 记录同步 entry 正文、媒体真实内容、token 等敏感信息
- 改造前端日志或网络层协议
- 为所有 handler 逐个新增定制业务日志

## 验收标准

- 开发 / 测试环境下，请求进入后端时会输出统一访问日志
- 每条访问日志都包含 `requestId`、`method`、`path`、`status`、`latencyMs`
- 响应头中可看到 `X-Request-Id`
- `/api/sync` 请求日志可看到 `clientChanges` 与处理结果的计数摘要
- `/api/media/upload` 请求日志可看到 `mimeType`、`size`、`mediaId` 或失败阶段
- 同一请求发生错误时，可通过 `requestId` 同时关联访问日志和错误日志
- 生产环境默认不会输出这套访问日志
