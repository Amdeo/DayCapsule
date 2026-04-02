# Docs And Rules Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the repository's current-entry documentation and rule references so they describe only the code and files that exist today.

**Architecture:** Treat documentation as a set of entry surfaces with distinct responsibilities: top-level onboarding, quick developer lookup, implementation overview, manual testing, and backend deployment. Update each surface against the current repository files instead of trying to rewrite historical design records into present-tense documentation.

**Tech Stack:** Markdown, git worktree, Expo/React Native app metadata from `app/package.json` and `app/app.json`, Docker Compose metadata from `docker-compose.yml`

---

## File Map

- Modify: `README.md` - top-level project onboarding, commands, capability summary, doc index
- Modify: `docs/QUICK_REFERENCE.md` - current developer quick lookup, scripts, directory map, testing entrypoints
- Modify: `docs/IMPLEMENTATION_SUMMARY.md` - current implementation overview instead of historical phase summary
- Modify: `docs/MANUAL_TEST_PLAN.md` - top-level manual-test overview that points to the current cloud-sync manuals
- Modify: `docs/BACKEND_DEPLOYMENT.md` - backend deployment guide aligned with real compose files and current file references
- Modify if needed: `docs/manual-test/README.md` - clarify how it relates to the top-level manual test plan

### Task 1: Refresh Top-Level Project Readme

**Files:**
- Modify: `README.md`
- Reference: `app/package.json`
- Reference: `app/app.json`
- Reference: `docs/QUICK_REFERENCE.md`
- Reference: `docs/IMPLEMENTATION_SUMMARY.md`
- Reference: `docs/MANUAL_TEST_PLAN.md`

- [ ] **Step 1: Review the current README against current app metadata**

Read and compare these files:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && sed -n '1,260p' README.md && sed -n '1,220p' app/package.json && sed -n '1,220p' app/app.json
```

Expected: You can list the mismatches in app naming, command paths, script names, and referenced docs before editing.

- [ ] **Step 2: Replace outdated onboarding and command sections with current facts**

Update `README.md` so it reflects:

```md
# MemoryCapsule

> 基于 Expo / React Native 的生活记录应用，支持文字、照片、语音、本地存储与云同步。

## 快速开始

### 前置条件

| 工具 | 版本要求 |
| --- | --- |
| Node.js | 20+ |
| pnpm | 10+ |
| iOS 开发 | Xcode 15+（仅 macOS） |
| Android 开发 | Android Studio + JDK 17 |

### 安装依赖

```bash
pnpm install
cd app && pnpm install
```

### 启动应用开发环境

```bash
cd app
pnpm start
```

### 常用命令

```bash
cd app
pnpm run ios
pnpm run android
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run verify
pnpm run test:frontend:home
pnpm run test:frontend:settings
pnpm run test:frontend:auth
pnpm run test:frontend:tags
pnpm run test:frontend:editor-image
pnpm run test:maestro:app-core
```
```

Also rewrite the project-structure section so the root and `app/` responsibilities are clearly separated.

- [ ] **Step 3: Rewrite the capability and doc-index sections around current entry docs**

Make sure `README.md` includes only current features and current docs, for example:

```md
## 核心能力

- 文字、照片、语音记录
- 本地 SQLite + MMKV 数据存储
- 全文搜索与筛选
- 照片/语音上传队列与恢复
- 云同步、冲突恢复、同步状态提示
- Jest 分场景测试与 Maestro 冒烟测试

## 文档索引

- `docs/QUICK_REFERENCE.md`
- `docs/IMPLEMENTATION_SUMMARY.md`
- `docs/MANUAL_TEST_PLAN.md`
- `docs/manual-test/README.md`
- `docs/BACKEND_DEPLOYMENT.md`
```

Remove references to docs that are no longer present or are no longer top-level entrypoints.

- [ ] **Step 4: Verify the README references only real files and scripts**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && rg -n "docs/|pnpm run|eas |expo run" README.md
```

Expected: Every referenced file exists in the repository and every command matches `app/package.json` or known Expo commands.

- [ ] **Step 5: Commit the README refresh**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && git add README.md && git commit -m "docs: refresh top-level project readme"
```

### Task 2: Rewrite Quick Reference As Current Developer Entry

**Files:**
- Modify: `docs/QUICK_REFERENCE.md`
- Reference: `app/package.json`
- Reference: `docs/manual-test/README.md`
- Reference: `docker-compose.yml`

- [ ] **Step 1: Review the existing quick reference for stale API excerpts**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && sed -n '1,320p' docs/QUICK_REFERENCE.md
```

Expected: You can identify which sections are obsolete because they describe the older entry store shape, old migration APIs, or old architecture snapshots.

- [ ] **Step 2: Replace the command section with the current script matrix**

Make the command section match `app/package.json`, for example:

```md
## 开发命令

```bash
cd app
pnpm start
pnpm run ios
pnpm run android
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run verify
pnpm run test:frontend:home
pnpm run test:frontend:settings
pnpm run test:frontend:auth
pnpm run test:frontend:tags
pnpm run test:frontend:editor-image
pnpm run test:maestro:app-core
```
```

- [ ] **Step 3: Replace stale low-level API listings with current navigation sections**

Rewrite the body into concise sections such as:

```md
## 代码入口

- `app/app/`：Expo Router 页面与路由入口
- `app/src/components/`：页面组件与复用 UI
- `app/src/services/`：同步、上传、恢复、环境切换、备份等服务
- `app/src/store/`：业务状态与 UI 状态 store
- `app/src/database/`：本地数据访问与迁移

## 测试入口

- Jest：见 `app/package.json` 中各 `test:*` 脚本
- Maestro：`app/.maestro/` 与 `pnpm run test:maestro:app-core`
- 手测：`docs/MANUAL_TEST_PLAN.md` 与 `docs/manual-test/README.md`

## 部署入口

- App 构建配置：`app/app.json`
- 后端部署：`docs/BACKEND_DEPLOYMENT.md`
- Compose 编排：`docker-compose.yml`
```

Do not keep old inline TypeScript APIs unless they were re-verified against current code.

- [ ] **Step 4: Verify the new quick reference points only to current files**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && rg -n "app/|docs/|docker-compose|test:" docs/QUICK_REFERENCE.md
```

Expected: Each path exists and the quick reference contains no dead file references.

- [ ] **Step 5: Commit the quick reference rewrite**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && git add docs/QUICK_REFERENCE.md && git commit -m "docs: rewrite quick reference for current codebase"
```

### Task 3: Replace Historical Implementation Summary With Current Overview

**Files:**
- Modify: `docs/IMPLEMENTATION_SUMMARY.md`
- Reference: `app/src/services/`
- Reference: `app/src/store/`
- Reference: `app/package.json`
- Reference: `docker-compose.yml`

- [ ] **Step 1: Review current code areas that should define the summary**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && ls app/src && ls app/src/services && ls app/src/store
```

Expected: You can describe the current implementation in terms of existing modules instead of the old "Phase 1 / Phase 2 / Phase 3" narrative.

- [ ] **Step 2: Replace the existing document with a present-tense implementation overview**

Rewrite `docs/IMPLEMENTATION_SUMMARY.md` around sections like these:

```md
# 当前实现概览

## 应用侧

- Expo Router 页面结构位于 `app/app/`
- 业务逻辑集中在 `app/src/services/`
- 业务状态与 UI 状态拆分在 `app/src/store/`
- 本地数据、迁移与查询位于 `app/src/database/`

## 主要能力

- 本地记录管理：文字、照片、语音
- 搜索与筛选：包含当前全文搜索能力
- 媒体处理：照片准备、语音准备、缓存与修复
- 云同步：同步状态、上传队列、恢复、冲突相关流程
- 错误反馈与设置页能力

## 测试与验证

- Jest 单测按领域拆分执行
- Maestro 提供 App 核心冒烟验证
- 云同步专项手测文档位于 `docs/manual-test/`

## 后端侧

- `backend/` 为 Go + Gin 服务
- `docker-compose.yml` 提供 API + nginx 编排
- 上传文件和 SQLite 数据落在 `backend/data/`
```

Do not keep obsolete test counts or historical phase labels unless they are explicitly marked as historical context.

- [ ] **Step 3: Verify the summary contains only current modules and capabilities**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && rg -n "Phase|35 个测试|AsyncStorage|tags 规范化" docs/IMPLEMENTATION_SUMMARY.md
```

Expected: No stale phase-oriented wording remains unless intentionally preserved with explicit historical framing.

- [ ] **Step 4: Commit the implementation summary rewrite**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && git add docs/IMPLEMENTATION_SUMMARY.md && git commit -m "docs: update implementation summary to current overview"
```

### Task 4: Reframe Manual Testing Docs Around Current Entry Points

**Files:**
- Modify: `docs/MANUAL_TEST_PLAN.md`
- Modify if needed: `docs/manual-test/README.md`
- Reference: `docs/manual-test/cloud-sync-checklist.md`
- Reference: `docs/manual-test/cloud-sync-test-cases.md`
- Reference: `docs/manual-test/cloud-sync-conflict-test-cases.md`
- Reference: `docs/manual-test/cloud-sync-media-test-cases.md`
- Reference: `docs/manual-test/cloud-sync-recommended-order.md`

- [ ] **Step 1: Review top-level and cloud-sync manual-test docs together**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && sed -n '1,260p' docs/MANUAL_TEST_PLAN.md && sed -n '1,220p' docs/manual-test/README.md
```

Expected: You can explain the overlap and decide how the top-level manual-test plan should hand off to the detailed cloud-sync suite.

- [ ] **Step 2: Rewrite `docs/MANUAL_TEST_PLAN.md` as a top-level manual-test guide**

Replace the old 28-case storage-era checklist with a present-tense overview such as:

```md
# 手动测试计划

## 目标

这份文档提供当前仓库的手测入口，而不是穷举所有旧阶段验收用例。

## 推荐测试层次

1. App 基础功能冒烟：记录创建、浏览、编辑、删除、搜索、设置页
2. 云同步主链路：参见 `docs/manual-test/cloud-sync-checklist.md`
3. 云同步正式提测：参见 `docs/manual-test/cloud-sync-test-cases.md`
4. 冲突专项：参见 `docs/manual-test/cloud-sync-conflict-test-cases.md`
5. 媒体专项：参见 `docs/manual-test/cloud-sync-media-test-cases.md`

## 执行建议

先读 `docs/manual-test/cloud-sync-recommended-order.md`，再按测试目的选择快速版或正式表格版。
```

- [ ] **Step 3: Update `docs/manual-test/README.md` only if cross-links need clarification**

If the top-level plan now references `docs/manual-test/README.md`, ensure that file explicitly states it is the cloud-sync manual-test index. Add or refine wording like this only if needed:

```md
这个目录用于集中管理当前仓库中云同步相关的手动测试文档。
顶层手测入口见 `docs/MANUAL_TEST_PLAN.md`，这里提供云同步专项的详细执行材料。
```

- [ ] **Step 4: Verify top-level and subdirectory manual-test docs point to each other correctly**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && rg -n "MANUAL_TEST_PLAN|docs/manual-test|cloud-sync" docs/MANUAL_TEST_PLAN.md docs/manual-test/README.md
```

Expected: The relationship between the top-level manual-test plan and the cloud-sync manuals is explicit and non-duplicative.

- [ ] **Step 5: Commit the manual-test docs refresh**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && git add docs/MANUAL_TEST_PLAN.md docs/manual-test/README.md && git commit -m "docs: align manual testing entrypoints"
```

### Task 5: Correct Backend Deployment Guide Against Current Compose Files

**Files:**
- Modify: `docs/BACKEND_DEPLOYMENT.md`
- Reference: `docker-compose.yml`
- Reference: `deploy/backend/README.template.md`
- Reference: `deploy/backend/docker-compose.template.yml`
- Reference: `backend/internal/config/config.go`

- [ ] **Step 1: Review deployment inputs and current compose references**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && sed -n '1,260p' docs/BACKEND_DEPLOYMENT.md && sed -n '1,220p' docker-compose.yml && sed -n '1,220p' deploy/backend/README.template.md && sed -n '1,220p' deploy/backend/docker-compose.template.yml
```

Expected: You can identify exactly which deployment statements are still valid and which `nginx.conf` references or packaging assumptions must change.

- [ ] **Step 2: Rewrite backend deployment instructions around current repository facts**

Update `docs/BACKEND_DEPLOYMENT.md` so it clearly states:

```md
## 当前仓库部署事实

- 根目录 `docker-compose.yml` 当前编排 `api` 与 `nginx` 两个服务
- `api` 基于 `backend/Dockerfile` 构建
- 数据与上传文件挂载到 `backend/data`
- 日志挂载到 `logs`

## 需要核对的文件

- `docker-compose.yml`
- `deploy/backend/docker-compose.template.yml`
- `deploy/backend/README.template.md`
```

If `nginx.conf` no longer exists in the worktree, remove hard assertions that it is present as a reusable deployment artifact and instead describe only the files that actually exist at edit time.

- [ ] **Step 3: Verify deployment doc references only real files**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && rg -n "nginx\.conf|docker-compose|deploy/backend|backend/data|logs" docs/BACKEND_DEPLOYMENT.md
```

Expected: Every referenced file exists in the repository, and any mention of nginx config accurately reflects the current state.

- [ ] **Step 4: Commit the backend deployment corrections**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && git add docs/BACKEND_DEPLOYMENT.md && git commit -m "docs: correct backend deployment guide"
```

### Task 6: Final Cross-Doc Consistency Pass

**Files:**
- Modify: `README.md`
- Modify: `docs/QUICK_REFERENCE.md`
- Modify: `docs/IMPLEMENTATION_SUMMARY.md`
- Modify: `docs/MANUAL_TEST_PLAN.md`
- Modify: `docs/BACKEND_DEPLOYMENT.md`
- Modify if changed: `docs/manual-test/README.md`

- [ ] **Step 1: Run a repository-wide reference scan on the updated docs**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && rg -n "SENTRY_SETUP|DEPLOYMENT\.md|nginx\.conf|35 个测试|三阶段重构|docs/manual-test|test:maestro:app-core|docs/BACKEND_DEPLOYMENT.md" README.md docs/QUICK_REFERENCE.md docs/IMPLEMENTATION_SUMMARY.md docs/MANUAL_TEST_PLAN.md docs/BACKEND_DEPLOYMENT.md docs/manual-test/README.md
```

Expected: Only intentional current references remain; dead references and stale historical claims are gone.

- [ ] **Step 2: Inspect the full diff for wording consistency and accidental regressions**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && git diff -- README.md docs/QUICK_REFERENCE.md docs/IMPLEMENTATION_SUMMARY.md docs/MANUAL_TEST_PLAN.md docs/BACKEND_DEPLOYMENT.md docs/manual-test/README.md
```

Expected: The diff shows present-tense current-state documentation only, with no speculative roadmap language.

- [ ] **Step 3: Verify worktree status before final handoff**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && git status --short
```

Expected: Only the intended documentation files are modified in this worktree.

- [ ] **Step 4: Commit the final consistency pass**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/docs-sync-current-rules && git add README.md docs/QUICK_REFERENCE.md docs/IMPLEMENTATION_SUMMARY.md docs/MANUAL_TEST_PLAN.md docs/BACKEND_DEPLOYMENT.md docs/manual-test/README.md && git commit -m "docs: align current documentation surfaces"
```

---

## Self-Review

### Spec Coverage

- `README.md` current naming, commands, structure, capability summary, and doc index are covered by Task 1.
- `docs/QUICK_REFERENCE.md` current developer entry role is covered by Task 2.
- `docs/IMPLEMENTATION_SUMMARY.md` conversion from stale historical summary to current overview is covered by Task 3.
- `docs/MANUAL_TEST_PLAN.md` and `docs/manual-test/README.md` relationship is covered by Task 4.
- `docs/BACKEND_DEPLOYMENT.md` correction against current compose and deploy templates is covered by Task 5.
- Cross-doc dead references and wording consistency are covered by Task 6.

### Placeholder Scan

- No `TBD`, `TODO`, or deferred-implementation placeholders remain.
- Every task includes exact file paths and exact verification commands.

### Type And Naming Consistency

- All paths use the same repository root and worktree path.
- Script names are taken from `app/package.json` and reused consistently across tasks.
- Manual-test paths consistently point to `docs/manual-test/*.md`.
