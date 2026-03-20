# DayCapsule 后端 SQLite 迁移设计文档

**创建日期**: 2026-03-20
**状态**: 已实现
**版本**: 1.0

---

## 背景

当前 DayCapsule 后端云同步实现使用 PostgreSQL 作为服务端数据库，代码中包含 `lib/pq` 驱动、PostgreSQL 连接方式以及 PostgreSQL 方言的初始化 SQL。

对于当前项目的实际使用场景，这套方案存在明显超配：

- 项目为单用户、自托管场景
- 后端职责集中在认证和全量备份存取
- 数据模型简单，仅包含 `users` 与 `backups`
- 用户更在意部署简单、维护低成本，而不是横向扩展能力

因此，需要将后端数据库从 PostgreSQL 调整为 SQLite，以降低部署和运维复杂度，同时保持现有 API 语义和分层结构不变。

---

## 目标

- 将后端默认数据库从 PostgreSQL 切换为 SQLite
- 保持现有 API 路由、认证流程和同步接口行为不变
- 保持现有 `handler -> service -> repository` 分层结构不变
- 简化部署方式，使单用户自托管只需运行单个后端服务并挂载数据目录
- 修复当前备份下载链路中 `data_json` 未被正确读取的问题

---

## 最终方案

### 1. 数据库选型与运行方式

后端数据库改为 SQLite，作为单文件数据库运行。默认数据库文件路径采用类似 `./data/daycapsule.db` 的本地路径配置，启动时由后端进程直接打开。

不再要求用户单独部署 PostgreSQL 服务，也不再依赖独立数据库容器。

### 2. 代码结构策略

保留现有分层：

- `handlers` 继续负责 HTTP 入参和响应
- `service` 继续负责认证和备份业务逻辑
- `repository` 继续负责 SQL 访问

此次迁移只替换数据库接入方式和 SQL 方言，不重写业务层结构，不引入新的 ORM。

### 3. 数据库访问层改造

后端继续使用 Go 标准库 `database/sql`，但将 PostgreSQL 驱动替换为 SQLite 驱动。

配置层从以 `DATABASE_URL` 为中心的连接方式，调整为以本地数据库文件路径为中心的配置方式，例如 `DATABASE_PATH`。启动阶段需要：

- 校验数据库文件路径配置
- 确保父目录存在
- 打开 SQLite 数据库连接
- 执行必要的连接初始化

### 4. Schema 与数据字段策略

现有 PostgreSQL migration 依赖以下 PostgreSQL 特性：

- `uuid-ossp`
- `TIMESTAMP WITH TIME ZONE`
- `plpgsql trigger`

迁移到 SQLite 后，采用以下策略：

- 主键仍使用 UUID 字符串，但 UUID 由 Go 层生成，不依赖数据库默认值
- 时间字段统一由 Go 层生成和写入，避免依赖数据库触发器维护 `updated_at`
- 表结构改写为 SQLite 兼容 schema
- 仍保留 `users` 和 `backups` 两张核心表及必要索引

### 5. Repository 改造原则

Repository 层保持职责不变，仅做 SQLite 兼容调整：

- 插入记录前在 Go 层补齐 `id`、`created_at`、`updated_at`
- `upsert` 逻辑改为 SQLite 支持的 `INSERT ... ON CONFLICT DO UPDATE`
- 所有查询字段与模型字段保持一致
- 修复 `backups` 读取时遗漏 `data_json` 的问题，确保下载接口能正确反序列化备份内容

### 6. 部署与运维策略

部署目标从“API + PostgreSQL”简化为“单后端服务 + 数据目录”：

- Docker 部署不再需要 PostgreSQL 服务
- 环境变量示例、部署说明、架构说明同步改为 SQLite 方案
- 数据持久化通过挂载 SQLite 文件所在目录完成

### 7. 非目标约束

本次迁移不处理以下内容：

- 不设计 PostgreSQL 到 SQLite 的自动数据迁移脚本
- 不扩展为 PostgreSQL / SQLite 双数据库并存方案
- 不调整现有 API 响应结构
- 不新增多用户高并发支持
- 不改变客户端同步协议

---

## 影响范围

### 代码

- `backend/internal/config/`
- `backend/internal/repository/`
- `backend/cmd/server/main.go`
- `backend/go.mod`
- `backend/migrations/`

### 文档与部署说明

- SQLite 迁移设计文档
- 既有后端云同步 spec / plan 中关于 PostgreSQL 的描述
- 与部署有关的环境变量说明、容器说明和运行文档

### 兼容性

- HTTP API 对客户端保持兼容
- 数据库存储从服务端 PostgreSQL 文件/实例切换为本地 SQLite 文件
- 不保证旧 PostgreSQL 数据自动迁入 SQLite

---

## 不在范围内

- 后端多实例部署支持
- 大规模并发写入优化
- 文件媒体同步能力扩展
- refresh token 持久化与吊销机制增强
- 对后端业务逻辑做与数据库迁移无关的重构

---

## 验收标准

- 后端依赖中不再使用 PostgreSQL 驱动，改为 SQLite 驱动
- 启动配置不再依赖 `DATABASE_URL`，改为 SQLite 文件路径配置
- 服务能在本地创建并连接 SQLite 数据库文件
- `users` 和 `backups` 表能在 SQLite 中完成初始化
- 注册、登录、刷新 token、查询当前用户接口行为保持可用
- 同步状态、上传、下载、删除接口行为保持可用
- 下载接口能正确返回已上传的备份数据，修复 `data_json` 读取缺失问题
- 文档中关于数据库与部署架构的描述与实际实现一致

---

## 评审记录

### 2026-03-20 初版评审

- 结论：方案成立，适用于当前单用户、自托管、轻量备份场景
- 关注点 1：SQLite 不适合未来高并发、多实例部署，但不属于当前目标
- 关注点 2：需要显式处理 UUID 与时间戳生成，避免继续依赖 PostgreSQL 默认值和 trigger
- 关注点 3：迁移时应顺手修复现有 `backups` 查询未返回 `data_json` 的实现问题

---

## 用户 Review Gate

- 设计确认：已在对话中确认采用“纯 SQLite 单库方案”
- 用户审核结果：2026-03-20 已确认“可以”，进入 implementation plan

---

## 实现结果

### 2026-03-20 实现收口

- 已将后端驱动从 PostgreSQL 切换为 SQLite
- 配置已由 `DATABASE_URL` 改为 `DATABASE_PATH`，默认 `./data/daycapsule.db`
- repository 已改为在 Go 层生成 UUID、`created_at`、`updated_at`
- `backups` 查询已补齐 `data_json`，下载链路可正确反序列化备份内容
- migration 已替换为 SQLite 兼容 schema
- 根目录 `.env.example` 与 `docker-compose.yml` 已同步切换为 SQLite 部署配置

### 验证结果

- `cd backend && go test ./internal/service -run 'Test(Auth|Sync)' -v` 通过
- `cd backend && go test ./...` 通过
- `docker build -t memorycapsule-backend-sqlite-test ./backend` 通过
- `docker run -d --name memorycapsule-backend-sqlite-test -e JWT_SECRET=test-secret -p 38080:3000 memorycapsule-backend-sqlite-test` 后，`curl http://127.0.0.1:38080/health` 返回 `200 OK`
- `docker compose config` 通过，根目录 Compose 配置已不再引用 PostgreSQL 服务
