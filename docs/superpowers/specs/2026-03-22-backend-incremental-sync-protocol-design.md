# 后端增量同步协议设计

## 状态

- 当前状态：已批准
- 用户确认日期：2026-03-22

## 评审记录

- 2026-03-22：用户要求查看最新 superpower 任务进度，并继续完成未闭环任务。
- 2026-03-22：确认当前应继续推进的大任务为“云同步在线模式（离线优先 + 轻量多端同步）”，但该任务范围过大，需要先拆分子任务。
- 2026-03-22：用户确认先推进子任务 1：后端增量同步协议。
- 2026-03-22：用户确认本次冲突策略为“服务端检测冲突并返回冲突信息，但不自动生成副本”。
- 2026-03-22：用户确认本次设计范围、请求响应模型与处理规则。
- 2026-03-22：spec 写入后，用户回复“继续”，视为通过本次 spec review gate，同意进入 plan 阶段。

## 背景

当前仓库已经出现增量同步相关实现草稿，包括：

- `entry_changes` 迁移
- `ChangeRepository`
- `POST /api/sync`
- `sync_v2` service / handler

但这部分仍缺少独立、收敛后的设计文档，导致以下问题：

- 实现目标与大任务 plan 混在一起，边界不清
- 前后端对协议字段、回执语义、冲突处理方式仍有漂移风险
- superpower 流程上缺少本子任务的 spec 留痕，无法算作严格完成

因此需要先把“后端增量同步协议”从大任务中拆出来，单独形成 spec，作为后续实现和验证的基准。

## 目标

- 定义可稳定对接的后端增量同步协议
- 明确 `POST /api/sync` 的请求、响应、冲突与回执语义
- 明确 `create / update / delete` 三类变更的服务端处理规则
- 明确 `entry_changes` 作为增量游标来源的职责
- 为后续前端本地优先同步服务提供清晰对接面

## 最终方案

### 1. 子任务范围

本次子任务只覆盖“后端增量同步协议”，不再把整个离线优先云同步大任务一次性做完。

本次范围内：

- 后端 `POST /api/sync` 协议
- `entry_changes` 变更流水模型
- 基于 `cursor` 的增量拉取语义
- `clientChanges` 的应用规则
- 冲突检测与冲突回传
- 每条客户端变更的处理回执

本次不在范围内：

- 前端冲突副本生成策略
- 媒体文件上传下载协议
- 照片/语音媒体缓存与后台上传队列
- 首次全量同步分页扩展（如 `hasMore` / `nextCursor`）
- 复杂字段级合并策略

### 2. 请求模型

接口：

- `POST /api/sync`

请求体结构：

```json
{
  "cursor": 12,
  "deviceId": "device-abc",
  "clientChanges": [
    {
      "changeId": "local-1",
      "op": "update",
      "baseUpdatedAt": "2026-03-22T08:00:00Z",
      "entry": {
        "id": "entry-1",
        "type": "text",
        "content": "new content",
        "tags": "[\"work\"]",
        "media": "[]",
        "recordingStatus": null,
        "recordingDuration": null,
        "syncStatus": "pending",
        "createdAt": "2026-03-20T10:00:00Z",
        "updatedAt": "2026-03-22T08:05:00Z"
      }
    }
  ]
}
```

字段约束：

- `cursor`
  - 表示客户端上次已消费的服务端 `change_id`
  - 首次同步传 `0`
- `deviceId`
  - 本次仅做透传和后续扩展预留
  - 不参与冲突裁决
- `clientChanges[].changeId`
  - 是客户端本地变更标识
  - 仅用于响应回执对齐
  - 不进入服务端主存储
- `clientChanges[].op`
  - 只允许 `create`、`update`、`delete`
- `clientChanges[].baseUpdatedAt`
  - `create` 可为空
  - `update` 必填，用于冲突检测
  - `delete` 可选，本次不作为删除冲突判断依据
- `clientChanges[].entry`
  - 始终上传完整 entry 快照，不使用 patch 语义
  - 这样可以与 `entry_changes.snapshot` 保持一致的模型

### 3. 响应模型

响应体结构：

```json
{
  "newCursor": 18,
  "results": [
    {
      "changeId": "local-1",
      "status": "applied",
      "entryId": "entry-1"
    }
  ],
  "serverChanges": [
    {
      "changeId": 13,
      "op": "update",
      "entry": {
        "id": "entry-1"
      },
      "changedAt": "2026-03-22T08:06:00Z"
    }
  ],
  "conflicts": [
    {
      "changeId": "local-2",
      "entryId": "entry-9",
      "reason": "server_newer_than_base",
      "serverEntry": {
        "id": "entry-9"
      },
      "clientEntry": {
        "id": "entry-9"
      }
    }
  ]
}
```

字段语义：

- `newCursor`
  - 是本次返回的 `serverChanges` 中最大 `changeId`
  - 如果本次没有新的服务端变更，则保持请求中的原 cursor
- `results[]`
  - 描述本次 `clientChanges[]` 每条变更的处理结果
  - 必须保留，不能让前端只靠 `conflicts[]` 推断
  - `status` 只允许：
    - `applied`
    - `conflicted`
    - `ignored`
- `serverChanges[]`
  - 表示服务端自 `cursor` 之后的增量变更流
  - 可以包含本次请求中刚成功写入服务端的变化
- `conflicts[]`
  - 只展开 `results.status = conflicted` 的详细内容
  - 用于前端后续自行决定如何处理冲突

### 4. 冲突策略

本次冲突策略固定为：

- 服务端检测冲突并返回冲突信息
- 服务端不自动生成副本
- 服务端不做复杂字段级合并

具体规则：

- 只对 `update` 做冲突检测
- 当服务端当前 `updatedAt > baseUpdatedAt` 时，视为服务端已有更新，返回冲突
- 冲突时：
  - 不应用本次更新
  - 不写入 `entries`
  - 不写入 `entry_changes`
  - `results.status = conflicted`
  - `conflicts[]` 中返回：
    - `changeId`
    - `entryId`
    - `reason = server_newer_than_base`
    - `serverEntry`
    - `clientEntry`

### 5. 服务端处理规则

#### `create`

- 当 `entry.id` 在服务端不存在时：
  - 按客户端快照创建 entry
  - 服务端补齐 `userId`
  - `createdAt` / `updatedAt` 为空时由服务端兜底写当前时间
  - 返回 `results.status = applied`
- 当 `entry.id` 已存在时：
  - 不报错
  - 不覆盖已有记录
  - 返回 `results.status = ignored`

#### `update`

- 先按 `entry.id + userId` 查询服务端当前记录
- 当服务端不存在该 entry 时：
  - 视为客户端补写
  - 按 `create` 语义直接创建
  - 返回 `results.status = applied`
- 当服务端存在该 entry 时：
  - 若 `baseUpdatedAt` 早于服务端当前 `updatedAt`：
    - 判定为冲突
    - 返回 `results.status = conflicted`
  - 否则：
    - 接受客户端版本
    - 以完整快照覆盖允许更新的字段
    - 服务端重写 `updatedAt = now`
    - 返回 `results.status = applied`

#### `delete`

- 当服务端不存在该 entry 时：
  - 不报错
  - 返回 `results.status = ignored`
- 当服务端存在该 entry 时：
  - 执行删除
  - 返回 `results.status = applied`

#### 顺序规则

- `clientChanges[]` 必须按数组顺序串行处理
- 同一个 `/api/sync` 请求内，不并发应用客户端变更

### 6. `entry_changes` 规则

`entry_changes` 是服务端增量同步的唯一游标来源。

写入规则：

- 只有真正改变了服务端状态时才追加 change log
- `ignored` 不写
- `conflicted` 不写

写入内容：

- `create` 成功后写入 `op=create`
- `update` 成功后写入 `op=update`
- `delete` 成功后写入 `op=delete`

快照规则：

- `snapshot` 保存服务端最终版本
- `delete` 的 snapshot 保存被删前最后版本，供其他客户端消费删除事件

这样可以保证：

- `serverChanges` 只反映真实生效的服务端变化
- `cursor` 始终对应可重放的服务端变更流

### 7. 首次同步语义

- `cursor=0` 表示客户端尚未消费任何服务端变更
- 服务端返回该用户当前已有的全部 change log 结果集
- 本次不额外定义：
  - `hasMore`
  - `nextCursor`
  - `limit` 协商分页

如果首次同步量过大，作为后续独立子任务再扩展分页协议，不在本 spec 内处理。

### 8. 一致性要求

单条客户端变更的主存储写入与 `entry_changes` 追加应视为同一成功单元。

要求：

- entry 已落库但 change log 没写入，属于不可接受的不一致状态
- 因此实现上应尽量把“写 entries + 写 entry_changes”放在同一事务中
- 本次 spec 先明确一致性要求，不强制要求顺带做大规模 repository 重构

## 架构与模块边界

### 1. Handler 层

涉及文件：

- `backend/internal/handlers/sync_v2.go`
- `backend/cmd/server/main.go`

职责：

- 暴露 `POST /api/sync`
- 校验请求结构
- 调用同步服务
- 返回统一成功/失败响应

### 2. Service 层

涉及文件：

- `backend/internal/service/sync_v2_service.go`

职责：

- 按顺序应用 `clientChanges`
- 执行冲突检测
- 生成 `results[]`
- 聚合 `conflicts[]`
- 拉取 `cursor` 之后的 `serverChanges[]`

### 3. Repository 层

涉及文件：

- `backend/internal/repository/entry_repo.go`
- `backend/internal/repository/change_repo.go`

职责：

- `EntryRepository` 负责 entry 查写删
- `ChangeRepository` 负责追加 change log 与按 cursor 拉取增量
- 为 service 提供事务一致性所需的底层能力

## 影响范围

- `POST /api/sync` 的接口协议与服务端实现
- `entry_changes` 的写入与消费语义
- 后续前端本地优先同步模块的对接方式
- 增量同步相关的后端测试设计

## 不在范围内

- 前端本地数据库 schema 扩展
- 前端 `cloudSyncService` 的实现细节
- 冲突副本在客户端如何生成与展示
- 媒体上传、媒体下载和缓存策略
- 语音/图片后台上传队列
- 首次同步分页与流控

## 验收标准

- `POST /api/sync` 请求与响应字段在文档中定义完整，前后端无需再靠猜测对齐
- `results[]` 可以明确区分 `applied / conflicted / ignored`
- `update` 的冲突判定规则明确且可测试
- `delete` 删除不存在的记录时返回 `ignored`，不报错
- 只有真实生效的服务端变更会写入 `entry_changes`
- `cursor=0` 的首次同步语义明确
- 文档明确要求 entry 写入与 change log 写入保持事务一致性

## 验证计划

实现阶段至少需要覆盖以下验证：

- 后端单元测试：
  - `create` 正常写入并追加 change log
  - `update` 正常写入并追加 change log
  - `update` 冲突时返回 `conflicted` 且不写 change log
  - `delete` 删除不存在记录时返回 `ignored`
  - `cursor=0` 返回当前已有服务端变更流
- handler / 集成测试：
  - `POST /api/sync` 请求校验
  - 响应字段完整性
- 手动验证：
  - 两个客户端交错更新同一 entry 时，较旧 `baseUpdatedAt` 的更新收到 conflict

## Spec Review 留痕

- 2026-03-22：已完成首轮人工一致性检查，确认本文与当前对话中已确认的范围、请求响应模型和处理规则一致。
- 2026-03-22：用户 review 通过，本文状态更新为 `已批准`，允许进入 plan 阶段。
