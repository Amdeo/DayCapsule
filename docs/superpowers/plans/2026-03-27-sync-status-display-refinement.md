# Sync Status Display Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让顶部同步指示器和状态弹窗更准确反映媒体校验结果，不新增持久化字段。

**Architecture:** 复用 `useSyncStore.lastMediaValidationSummary`，把媒体校验 `running` 收口为顶部 `syncing`，把媒体校验 `partial/failed` 收口为顶部 `failed`。状态弹窗继续沿用现有结构，只调整语义判定，不重做布局。

**Tech Stack:** Zustand + React Native + Jest

---

### Task 1: 为顶部状态判定写失败测试

**Files:**
- Modify: `app/src/store/__tests__/cloudSyncIndicatorStore.test.ts`

- [ ] **Step 1: 写失败测试**
  - 媒体校验中时顶部状态应为 `syncing`
  - 媒体部分成功时顶部状态应为 `failed`

- [ ] **Step 2: 运行测试确认失败**
  - Run: `npm test -- --runInBand --runTestsByPath src/store/__tests__/cloudSyncIndicatorStore.test.ts`

### Task 2: 最小实现

**Files:**
- Modify: `app/src/store/cloudSyncIndicatorStore.ts`

- [ ] **Step 1: 最小实现**
  - `resolveUiState` 纳入 `lastMediaValidationSummary`

- [ ] **Step 2: 运行测试确认通过**
  - Run: `npm test -- --runInBand --runTestsByPath src/store/__tests__/cloudSyncIndicatorStore.test.ts`

### Task 3: 回归验证

**Files:**
- Verify: `app/src/store/cloudSyncIndicatorStore.ts`
- Verify: `app/src/services/showCloudSyncStatusAlert.ts`

- [ ] **Step 1: 跑相关测试**
  - Run: `npm test -- --runInBand --runTestsByPath src/store/__tests__/cloudSyncIndicatorStore.test.ts src/services/__tests__/showCloudSyncStatusAlert.test.ts`

- [ ] **Step 2: 跑类型检查**
  - Run: `npm run typecheck`
