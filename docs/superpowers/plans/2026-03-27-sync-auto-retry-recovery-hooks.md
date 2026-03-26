# Sync Auto Retry Recovery Hooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在应用启动、回到前台、网络恢复时自动补跑待上传媒体和元数据同步，并避免重复触发。

**Architecture:** 在 `app/_layout.tsx` 抽一个统一的恢复入口，顺序执行 `flushPendingVoiceUploads()`、`flushPendingPhotoUploads()` 和条件性 `syncNow()`。恢复入口内部维护单次 in-flight promise，避免同一轮网络抖动或状态切换触发并发重复补跑。

**Tech Stack:** React Native + Expo Network + Jest

---

### Task 1: 为恢复入口写失败测试

**Files:**
- Modify: `app/app/__tests__/_layout.photo-upload.test.tsx`

- [ ] **Step 1: 写失败测试**
  - 覆盖网络恢复时也会执行 `syncNow()`
  - 覆盖前台恢复时会先 flush 队列再 `syncNow()`
  - 覆盖恢复流程进行中重复触发不会重复执行

- [ ] **Step 2: 运行测试确认失败**
  - Run: `npm test -- --runInBand --runTestsByPath app/__tests__/_layout.photo-upload.test.tsx`

### Task 2: 实现统一恢复入口

**Files:**
- Modify: `app/app/_layout.tsx`

- [ ] **Step 1: 最小实现**
  - 抽恢复 helper
  - 加 in-flight 防抖
  - 网络恢复时补 `syncNow()`

- [ ] **Step 2: 运行测试确认通过**
  - Run: `npm test -- --runInBand --runTestsByPath app/__tests__/_layout.photo-upload.test.tsx`

### Task 3: 回归验证

**Files:**
- Verify: `app/app/_layout.tsx`
- Verify: `app/src/services/__tests__/cloudSyncService.test.ts`

- [ ] **Step 1: 跑相关前端测试**
  - Run: `npm test -- --runInBand --runTestsByPath app/__tests__/_layout.photo-upload.test.tsx src/services/__tests__/cloudSyncService.test.ts`

- [ ] **Step 2: 跑类型检查**
  - Run: `npm run typecheck`
