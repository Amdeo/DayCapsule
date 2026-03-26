# Sync Conflict LWW Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把同步冲突策略改成“后修改覆盖前修改”，取消前端冲突副本落地。

**Architecture:** 后端在 `update` 同步路径上比较客户端提交的 `updatedAt` 与服务器当前 `updatedAt`，客户端时间更晚则直接覆盖，否则忽略客户端更新。前端继续发送 `baseUpdatedAt` 以兼容现有协议，但不再为 `conflicted` 结果生成 `conflict-local-copy`，并把后端返回的新语义收口为本地 `synced` / `ignored`。

**Tech Stack:** React Native + Zustand + Jest；Go + SQLite + Go test

---

### Task 1: 后端 LWW 更新判定

**Files:**
- Modify: `backend/internal/service/sync_v2_service.go`
- Test: `backend/internal/service/sync_v2_service_test.go`

- [ ] **Step 1: 写失败测试**
  - 新增“客户端 `updatedAt` 晚于服务器时覆盖成功”
  - 新增“客户端 `updatedAt` 早于服务器时忽略更新且不产生命中冲突副本语义”

- [ ] **Step 2: 运行后端测试确认失败**
  - Run: `go test ./internal/service -run SyncV2Service`

- [ ] **Step 3: 最小实现**
  - 在 `applyUpdateTx` / 非事务路径里改成 LWW 判定
  - 移除 `server_newer_than_base` 冲突返回

- [ ] **Step 4: 运行后端测试确认通过**
  - Run: `go test ./internal/service -run SyncV2Service`

### Task 2: 前端取消冲突副本

**Files:**
- Modify: `app/src/services/cloudSyncService.ts`
- Test: `app/src/services/__tests__/cloudSyncService.test.ts`

- [ ] **Step 1: 写失败测试**
  - 把现有“生成 `conflict-local-copy`”测试改成新语义
  - 新增“服务器返回较新版本时前端直接应用服务器快照，不创建冲突副本”

- [ ] **Step 2: 运行前端测试确认失败**
  - Run: `npm test -- --runInBand --runTestsByPath src/services/__tests__/cloudSyncService.test.ts`

- [ ] **Step 3: 最小实现**
  - 去掉 `createConflictCopy` 路径
  - 调整 `settleResults` 和冲突统计

- [ ] **Step 4: 运行前端测试确认通过**
  - Run: `npm test -- --runInBand --runTestsByPath src/services/__tests__/cloudSyncService.test.ts`

### Task 3: 回归验证

**Files:**
- Verify: `backend/internal/service/sync_v2_service_test.go`
- Verify: `app/src/services/__tests__/cloudSyncService.test.ts`
- Verify: `app/src/store/__tests__/entryStore.test.ts`

- [ ] **Step 1: 跑相关前后端测试**
  - Run: `go test ./internal/service -run SyncV2Service`
  - Run: `npm test -- --runInBand --runTestsByPath src/services/__tests__/cloudSyncService.test.ts src/store/__tests__/entryStore.test.ts`

- [ ] **Step 2: 跑类型检查**
  - Run: `npm run typecheck`

- [ ] **Step 3: 检查 diff 与状态**
  - Run: `git diff --stat`
  - Run: `git status --short`
