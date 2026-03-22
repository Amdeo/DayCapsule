# update 冲突判定原子化设计

## 状态

- 当前状态：已批准
- 用户确认日期：2026-03-22

## 评审记录

- 2026-03-22：在“后端增量同步协议”实现完成后，最终验收发现 `update` 的冲突判定仍是分步 `GetByID -> UpdateFromSync -> AppendChange`，并发下两个基于同一 `baseUpdatedAt` 的请求仍可能都返回 `applied`。
- 2026-03-22：用户确认继续推进下一子任务，并同意本次只收 `update` 冲突判定原子化，不把 `create/delete + change log` 一起拉进事务重构。
- 2026-03-22：已讨论 3 个实现方向：
  - 条件更新方案
  - service 层事务方案
  - repository 封装方案
- 2026-03-22：用户确认采用“条件更新”为本次推荐方案。
- 2026-03-22：用户确认本次设计的 3 个部分：
  - 原子化策略
  - 仓储接口与 service 状态流转
  - 测试与验收标准

## 背景

当前仓库中的后端增量同步协议已经完成以下能力：

- `/api/sync` 请求/响应结构
- `results[] / conflicts[] / serverChanges[]`
- `ignored / conflicted / applied` 语义
- `entry_changes` 游标流
- `update` 缺失 `baseUpdatedAt` 时返回 `400`

但 `update` 的核心冲突判定仍然不是原子的：

- service 先 `GetByID`
- 根据当前 `updatedAt` 与 `baseUpdatedAt` 判断是否冲突
- 再独立调用 `UpdateFromSync`

这样会留下一个竞态窗口：

- 两个请求读取到同一旧版本
- 两者都认为自己可以更新
- 两者依次写入成功
- 最后只有后写覆盖前写，但双方都返回 `applied`

这与本项目对 `baseUpdatedAt` 的冲突语义预期不一致，也会让前端基于协议做冲突处理时得到错误结论。

## 目标

- 让 `update` 的成功与冲突判定不再依赖“先读后比”的非原子路径
- 保证同一条 entry 上，基于同一 `baseUpdatedAt` 的两个更新请求，最多只有一个返回 `applied`
- 让失败的一方稳定返回 `conflicted`，并带当前服务端版本
- 不改变现有 `/api/sync` 的请求/响应结构
- 不顺手扩展到 `create/delete + change log` 的完整事务化重构

## 最终方案

### 1. 子任务范围

本次子任务只覆盖 `update` 冲突判定原子化。

本次范围内：

- `update` 路径的版本匹配条件更新
- `baseUpdatedAt` 驱动的原子成功/冲突判定
- `SyncV2Service` 的 `update` 状态流转调整
- 对应 repository / service 测试补齐
- 文档中对“仍未完成的事务边界”继续保持诚实描述

本次不在范围内：

- `create/delete` 的单事务改造
- `entry` 写入与 `change log` 追加的一体化事务
- `/api/sync` 的协议字段调整
- handler 新增更多请求字段级校验
- `hasMore / nextCursor` 之类分页协议

### 2. 方案选择

本次在 3 个方向中选定“条件更新方案”：

#### 方案 A：条件更新方案（最终采用）

在 repository 新增一个带版本条件的更新 helper，语义为：

- 只有 `id + user_id` 命中
- 且当前 `updated_at == baseUpdatedAt`
- 才允许本次 `update` 成功

优点：

- 改动面最小
- 可以直接消除“两个并发 update 都返回 applied”的核心竞态
- 测试边界清晰

限制：

- 只原子化 `update` 本身
- `AppendChange` 仍不与 entry 更新处于同一数据库事务

#### 方案 B：service 层显式事务

在 service 层把“读取当前版本、判断、更新 entry、写 change log”整体包进事务。

优点：

- 语义最完整

缺点：

- 会把本次子任务扩成 repository 接口整体调整
- 范围明显超出“只收 `update` 原子化”

#### 方案 C：repository 大封装

在 repository 提供更重的同步更新入口，把判断、更新、回读甚至 change log 都集中进去。

优点：

- service 层更薄

缺点：

- 一旦顺手把 change log 也揉进去，就会变成完整事务重构

### 3. 原子化策略

本次原子化只收 `update` 路径。

核心变化：

- 保留“先判断 entry 是否存在”的语义
- 但一旦进入“记录存在”的 `update` 分支，不再依赖独立的“先读版本，再写更新”来决定成功与否
- 改为一次带版本条件的 SQL 更新

目标语义：

- 当 `updated_at == baseUpdatedAt` 时：
  - 更新成功
  - 返回 `applied`
- 当 `updated_at != baseUpdatedAt` 时：
  - 不更新
  - 返回 `conflicted`
  - 并回传当前服务端版本

这样可以保证：

- 同一 `baseUpdatedAt` 下，并发的两个更新请求不会都返回 `applied`
- 冲突判定由数据库条件更新控制，而不是只靠 service 侧的时间比较

### 4. Repository 接口

建议在 [`entry_repo.go`](/Users/cooper/Documents/code/MemoryCapsule/backend/internal/repository/entry_repo.go) 新增一个原子更新 helper。

示意接口：

```go
func (r *EntryRepository) UpdateFromSyncIfVersionMatches(
    userID string,
    entry *models.Entry,
    baseUpdatedAt time.Time,
) (result UpdateFromSyncMatchResult, err error)
```

语义约束：

- `result = updated`
  - 说明本次条件更新成功
- `result = version_mismatch`
  - 说明记录仍存在，但 `updated_at != baseUpdatedAt`
- `result = missing`
  - 说明条件更新失败后再次确认，记录已不存在

SQL 语义：

```sql
UPDATE entries
SET
  content = ?,
  tags = ?,
  media = ?,
  recording_status = ?,
  recording_duration = ?,
  sync_status = ?,
  updated_at = ?
WHERE id = ? AND user_id = ? AND updated_at = ?
```

这里的关键不是先查再比较，而是：

- 直接把 `baseUpdatedAt` 放进 `WHERE`
- 让数据库一次决定本次更新是否成立

补充约束：

- `baseUpdatedAt` 与 `entries.updated_at` 的比较必须使用相同的 UTC / 精度规范
- repository helper 应复用当前 SQLite 的时间编码路径，避免因为格式或精度差异把本应成功的更新误判为冲突

### 5. Service 状态流转

`SyncV2Service` 的 `update` 路径改为：

#### Step 1：保留存在性检查

仍先 `GetByID(userID, entry.ID)`。

目的：

- 区分“记录不存在”这个协议语义
- 保持现有行为：
  - `update` 命中不存在 entry 时，仍视作 `create`

#### Step 2：调用条件更新 helper

当 entry 存在时：

- 生成本次写入的 `updatedAt = now`
- 调用 `UpdateFromSyncIfVersionMatches(...)`

结果分三类：

- `result = updated`
  - 返回 `applied`
  - 再读回持久化后的 entry
  - 用持久化后的最终版本写 `entry_changes`
- `result = version_mismatch`
  - 重新读一次当前服务端 entry
  - 返回 `conflicted`
  - `conflicts[].serverEntry` 使用这次重读到的最新版本
- `result = missing`
  - 返回 `ignored`
  - 不写 `entry_changes`
  - 表示服务端删除在这次 update 的窗口期内赢了这次竞争

这样做的原因是：

- 冲突失败后，前面第一次 `GetByID` 拿到的版本可能已经过时
- 重新读取，才能把真正的当前服务端版本回给客户端
- 如果窗口期内记录已被并发删除，则当前服务端已没有可回传的版本；这时不再伪造 `conflicted + serverEntry`，而是把它视作“服务端删除生效”的 `ignored`

#### Step 3：处理后续回读与 change log 失败

本次子任务不把“entry 更新成功 + change log 追加”包进同一事务。

因此如果出现以下任一情况：

- 条件更新已成功，但回读持久化 entry 失败
- 条件更新已成功，但 `AppendChange` 失败

当前版本沿用现状：

- service 返回 error
- handler 返回 `500 INTERNAL_ERROR`
- 不做补偿回滚

这属于本次仍保留的已知边界，不在本子任务内解决。

### 6. 不变的协议语义

本次不会改变以下已有行为：

- `update` 命中不存在 entry 时，仍视作 `create`
- 成功 `update` 后仍写入 `entry_changes`
- `/api/sync` 的请求与响应 JSON 结构保持不变
- `results.status` 仍只允许：
  - `applied`
  - `conflicted`
  - `ignored`

### 7. 测试策略

本次至少补 3 类测试：

#### 1. Repository 条件更新测试

目标：

- 证明 `UpdateFromSyncIfVersionMatches` 只会在 `updated_at == baseUpdatedAt` 时成功

至少覆盖：

- base 匹配时更新成功
- base 不匹配时返回 `version_mismatch`
- 记录不存在时返回 `missing`

#### 2. Service 冲突语义测试

目标：

- 锁住“同一 `baseUpdatedAt` 的两个更新，不会都返回 `applied`”

最小测试方式可以不是 goroutine 真并发，而是顺序模拟：

- 先用某个 `baseUpdatedAt` 更新成功一次
- 再用同一个旧 `baseUpdatedAt` 更新第二次
- 第二次必须返回 `conflicted`
- `conflicts[].serverEntry` 应是第一次成功更新后的服务端版本

额外补一条边界测试：

- Step 1 读到 entry 存在，但在条件更新前被并发删除时
- service 返回 `ignored`
- 不伪造 `conflicts[].serverEntry`

#### 3. 回归测试

目标：

- 证明本次只收原子化，不顺手改坏既有语义

至少覆盖：

- entry 不存在时，`update` 仍视作 `create`
- 成功 `update` 仍会写 `entry_changes`
- `result = missing` 的 update 不写 `entry_changes`
- handler 不需要新增协议字段

## 架构与模块边界

### 1. Repository 层

涉及文件：

- `backend/internal/repository/entry_repo.go`

职责：

- 提供基于 `baseUpdatedAt` 的条件更新能力
- 通过数据库条件更新决定本次 `update` 是否成立

### 2. Service 层

涉及文件：

- `backend/internal/service/sync_v2_service.go`

职责：

- 保持 `/api/sync` 协议语义
- 在 `update` 路径中消费 repository 的原子更新结果
- 负责把失败映射为 `conflicted`
- 负责在成功后读取最终持久化版本并写 change log

### 3. 测试层

涉及文件：

- `backend/internal/service/sync_v2_service_test.go`
- 若需要：`backend/internal/repository/*_test.go`

职责：

- 锁住原子更新 helper 的数据库行为
- 锁住 `SyncV2Service` 在原子化后的协议语义

## 影响范围

- `/api/sync` 的 `update` 成功/冲突判定
- `baseUpdatedAt` 的实际语义强度
- 后端并发更新下的冲突行为稳定性
- service 与 repository 的测试覆盖

## 不在范围内

- `create/delete` 的原子事务改造
- `entry_changes` 与 entry 更新的一体化事务
- SQLite 迁移变更
- handler 新增更多字段校验
- 前端 `cloudSyncService` 实现

## 验收标准

- `update` 不再依赖“先读后比”的非原子判定来决定是否成功
- 同一条 entry 上，两个基于同一 `baseUpdatedAt` 的更新请求，最多只有一个返回 `applied`
- 失败的一方返回 `conflicted`
- `conflicts[].serverEntry` 返回当前服务端版本
- 如果 entry 在 update 窗口期被服务端删除，则返回 `ignored`
- entry 不存在时，`update` 仍按现有语义视作 `create`
- 不改变 `/api/sync` 的请求/响应结构

## 已知边界

- 本次只原子化 `update` 的版本匹配判定
- `entry` 更新成功与 `entry_changes` 追加写入仍不在同一数据库事务
- 如果条件更新成功，但回读或 `AppendChange` 失败，当前版本仍按 `500 INTERNAL_ERROR + 部分成功` 处理
- 因此本次不是“完整事务化”，而是“先收掉最核心的并发冲突误判”

## Spec Review 留痕

- 2026-03-22：已完成设计定稿，进入首轮 spec review。
- 2026-03-22：spec review 要求补清两类边界：
  - 条件更新失败后的 `version_mismatch / missing` 区分
  - 条件更新成功但后续回读或 `AppendChange` 失败时的当前语义
- 2026-03-22：已补充上述边界，并明确 `baseUpdatedAt` 的 UTC / 精度匹配约束，待重新 review。
- 2026-03-22：第二轮 spec review 已完成。结论：通过，可进入用户 review gate。确认点：
  - `updated / version_mismatch / missing` 三态语义完整
  - 成功更新后回读或 `AppendChange` 失败的当前行为已明示为已知边界
  - `baseUpdatedAt` 与 SQLite `updated_at` 的 UTC / 精度约束足够支持后续实现
- 2026-03-22：用户在 spec review 通过后回复“继续”，视为完成本次 user review gate，同意进入 `writing-plans` 阶段。
