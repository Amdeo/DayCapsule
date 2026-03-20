# DayCapsule 后端 SQLite 迁移 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 DayCapsule 后端数据库从 PostgreSQL 迁移为 SQLite，并保持现有认证与云同步接口行为不变。

**Architecture:** 保留现有 `handler -> service -> repository` 分层和 `database/sql` 访问方式，只替换驱动、连接配置、SQLite 兼容 schema 与 repository SQL。UUID 和时间戳统一在 Go 层生成，避免依赖 PostgreSQL 默认值和 trigger。同步修复备份下载链路遗漏 `data_json` 的实现问题，并收口相关设计与计划文档状态。

**Tech Stack:** Go 1.23, Gin, database/sql, SQLite driver, JWT, bcrypt

---

## 关联文档

- Spec: `docs/superpowers/specs/2026-03-20-backend-sqlite-migration-design.md`

---

## 文件范围

### 主要改动文件

- Modify: `backend/go.mod`
- Modify: `backend/internal/config/config.go`
- Modify: `backend/internal/config/database.go`
- Modify: `backend/cmd/server/main.go`
- Modify: `backend/internal/repository/user_repo.go`
- Modify: `backend/internal/repository/backup_repo.go`
- Modify: `backend/internal/models/user.go`
- Modify: `backend/internal/models/backup.go`
- Modify: `backend/migrations/001_initial_schema.up.sql`
- Modify: `backend/migrations/001_initial_schema.down.sql`

### 新增测试文件

- Create: `backend/internal/service/auth_service_test.go`
- Create: `backend/internal/service/sync_service_test.go`

### 文档收口

- Modify: `docs/superpowers/specs/2026-03-20-backend-sqlite-migration-design.md`
- Modify: `docs/superpowers/plans/2026-03-20-backend-sqlite-migration.md`
- Modify: `docs/superpowers/specs/2026-03-16-backend-cloud-sync-design.md`
- Modify: `docs/superpowers/plans/2026-03-16-backend-cloud-sync.md`

---

## Chunk 1: SQLite 接入与配置切换

### Task 1: 替换数据库驱动与配置字段

**Files:**
- Modify: `backend/go.mod`
- Modify: `backend/internal/config/config.go`
- Modify: `backend/internal/config/database.go`
- Modify: `backend/cmd/server/main.go`

- [x] **Step 1: 写一个失败中的配置/连接测试或最小验证入口**

目标：
- 先定义 SQLite 配置期望：使用 `DATABASE_PATH`
- 启动逻辑不再要求 `DATABASE_URL`
- `NewDB` 能接受 SQLite 文件路径

建议方式：
- 优先在 `backend/internal/config/` 增加轻量测试；如果当前仓库没有测试基线，可在实现后通过 `go test ./...` 验证编译和行为

- [x] **Step 2: 运行验证，确认当前实现不满足 SQLite 方案**

Run: `cd backend && go test ./...`
Expected:
- 当前代码仍依赖 PostgreSQL 驱动和 `DATABASE_URL`
- 测试或编译验证不能证明 SQLite 配置已接入

- [x] **Step 3: 实现最小配置改造**

改动要求：
- `backend/go.mod` 替换 PostgreSQL 驱动为 SQLite 驱动
- `Config` 中新增或替换为 `DatabasePath`
- `Load()` 默认 SQLite 路径，例如 `./data/daycapsule.db`
- `NewDB()` 改为打开 SQLite
- `main.go` 改为校验 `DATABASE_PATH` 或默认路径，而不是 `DATABASE_URL`
- 建库前确保数据库目录存在

- [x] **Step 4: 运行验证**

Run: `cd backend && go test ./...`
Expected:
- 编译通过
- PostgreSQL 驱动依赖已移除
- 配置层和启动层均已切换到 SQLite 路径模式

- [x] **Step 5: 更新任务状态**

在本计划中将本 Task 对应项标记为完成，并记录验证结果摘要。

---

## Chunk 2: SQLite Schema 与 Repository 兼容

### Task 2: 重写 schema，去除 PostgreSQL 特性

**Files:**
- Modify: `backend/migrations/001_initial_schema.up.sql`
- Modify: `backend/migrations/001_initial_schema.down.sql`

- [x] **Step 1: 写一个失败中的 schema 兼容性测试思路**

目标：
- 当前 schema 中的 PostgreSQL 特性在 SQLite 下不可用
- 新 schema 需要能创建 `users`、`backups` 表和索引

建议方式：
- 若项目已有迁移执行器，则直接跑迁移
- 如果没有，可通过本地 SQLite 文件和初始化流程间接验证

- [x] **Step 2: 运行当前验证，确认旧 schema 不适用于 SQLite**

Run: `cd backend && go test ./...`
Expected:
- 当前测试无法覆盖 schema，或 SQLite 环境下旧 migration 不适用

- [x] **Step 3: 实现 SQLite schema**

改动要求：
- 删除 `uuid-ossp`
- 删除 PostgreSQL 专属时间类型和 `plpgsql trigger`
- 使用 SQLite 兼容字段定义
- 保留 `users` 与 `backups` 两张表及必要索引
- `down.sql` 使用 SQLite 兼容删除顺序

- [x] **Step 4: 运行验证**

Run: `cd backend && go test ./...`
Expected:
- 后端代码至少能在 SQLite 目标下编译通过
- schema 文件不再包含 PostgreSQL 专属语法

- [x] **Step 5: 更新任务状态**

在本计划中记录完成情况。

### Task 3: 调整 repository 写入与读取逻辑

**Files:**
- Modify: `backend/internal/repository/user_repo.go`
- Modify: `backend/internal/repository/backup_repo.go`
- Modify: `backend/internal/models/user.go`
- Modify: `backend/internal/models/backup.go`

- [x] **Step 1: 写失败中的行为测试**

Create: `backend/internal/service/sync_service_test.go`

测试目标：
- 上传后的备份可被下载
- 下载返回的数据包含上传时的 `data`
- 状态查询能返回 hash / entryCount / updatedAt

可使用方式：
- 以内存 SQLite 或临时 SQLite 文件初始化数据库
- 通过 repository + service 组合验证真实读写链路

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd backend && go test ./internal/service -run TestSync -v`
Expected:
- 当前实现因 `data_json` 未被查询或其他 SQLite 适配缺失而失败

- [x] **Step 3: 实现最小 repository 改造**

改动要求：
- 插入用户时由 Go 层生成 UUID、`created_at`、`updated_at`
- 插入或更新备份时由 Go 层或 SQLite 兼容 SQL 显式维护时间字段
- `GetByUserID()` 必须查询并填充 `data_json`
- `Upsert()` 使用 SQLite 支持的冲突更新语法
- 保持现有 models 对外 JSON 语义不变

- [x] **Step 4: 运行目标测试和全量后端测试**

Run: `cd backend && go test ./internal/service -run TestSync -v`
Expected:
- 目标测试通过

Run: `cd backend && go test ./...`
Expected:
- 全量后端测试通过

- [x] **Step 5: 更新任务状态**

在本计划中记录验证结果与修复点。

---

## Chunk 3: 认证链路回归与文档收口

### Task 4: 验证认证相关行为未回归

**Files:**
- Create: `backend/internal/service/auth_service_test.go`

- [x] **Step 1: 写失败中的认证测试**

测试目标：
- 注册成功后能返回用户和 token
- 重复邮箱注册失败
- 正确密码登录成功
- 错误密码登录失败
- refresh token 只能接受 refresh 类型 token

- [x] **Step 2: 运行目标测试，确认先失败**

Run: `cd backend && go test ./internal/service -run TestAuth -v`
Expected:
- 在实现认证测试前失败，或在 SQLite 迁移前无法通过真实链路验证

- [x] **Step 3: 补齐最小实现或适配**

改动要求：
- 如 repository / config 调整导致认证测试暴露问题，做最小必要修复
- 不在本任务引入与 SQLite 无关的认证增强

- [x] **Step 4: 运行验证**

Run: `cd backend && go test ./internal/service -run TestAuth -v`
Expected:
- 认证测试通过

Run: `cd backend && go test ./...`
Expected:
- 全量后端测试通过

- [x] **Step 5: 更新任务状态**

在本计划中记录测试结果。

### Task 5: 文档收口与状态同步

**Files:**
- Modify: `docs/superpowers/specs/2026-03-20-backend-sqlite-migration-design.md`
- Modify: `docs/superpowers/plans/2026-03-20-backend-sqlite-migration.md`
- Modify: `docs/superpowers/specs/2026-03-16-backend-cloud-sync-design.md`
- Modify: `docs/superpowers/plans/2026-03-16-backend-cloud-sync.md`

- [x] **Step 1: 同步设计文档状态**

要求：
- SQLite 迁移 spec 更新为 `已实现`
- 若最终实现与 spec 有轻微偏差，补充最终说明

- [x] **Step 2: 更新既有云同步文档**

要求：
- 将旧文档中写死 PostgreSQL 的描述修正为已过时或已被 SQLite 方案替代
- 保证文档与当前实现一致

- [x] **Step 3: 记录验证结果**

至少记录：
- `cd backend && go test ./...`
- 如有额外手动验证，也一并记录

- [x] **Step 4: 更新本计划状态**

要求：
- 各 Task 勾选完成
- 在计划末尾补充最终验证摘要

---

## 最终验证清单

- [x] `cd backend && go test ./...`
- [x] 手动确认配置改为 SQLite 路径模式
- [x] 手动确认 migration 不再包含 PostgreSQL 专属语法
- [x] 手动确认备份上传后可下载原始数据
- [x] 手动确认文档状态已收口

---

## 执行备注

- 优先做最小改造，不引入 ORM
- 优先保持 API 响应格式稳定
- 如果 SQLite 驱动选择会引入 CGO 约束，需要在实现时明确记录
- 如需更稳妥测试，可在测试中使用临时数据库文件替代共享数据库文件

---

## 最终验证摘要

- 初始失败验证：
  - `cd backend && go test ./internal/service -run 'Test(Auth|Sync)' -v`
  - 失败点为 `users.id` 未生成，以及 SQLite 下 `NOW()` 不可用
- 实现后验证：
  - `cd backend && go test ./internal/service -run 'Test(Auth|Sync)' -v` 通过
  - `cd backend && go test ./...` 通过
  - `docker build -t memorycapsule-backend-sqlite-test ./backend` 通过
  - `docker run -d --name memorycapsule-backend-sqlite-test -e JWT_SECRET=test-secret -p 38080:3000 memorycapsule-backend-sqlite-test` 后，`curl http://127.0.0.1:38080/health` 返回 `200 OK`
  - `docker compose config` 通过

## 最终实现说明

- 后端数据库已切换为 SQLite，默认使用 `DATABASE_PATH`
- UUID 与时间戳改为在 Go 层维护
- `backups` 下载链路已补齐 `data_json`
- 容器启动不再依赖外部 `migrate` 二进制，改为进程内 schema 初始化
- 根目录 `.env.example` 与 `docker-compose.yml` 已切换为 SQLite 部署方式
- 原 PostgreSQL 设计文档已标记为被 SQLite 迁移方案替代
