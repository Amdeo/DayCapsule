# Sync Retry Backoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为照片与语音上传队列增加定时退避重试，并与现有恢复入口协同工作。

**Architecture:** 在 `photoUploadQueue` 和 `voiceUploadQueue` 内部维护单个 retry timer 与失败计数，失败后按 `15s -> 30s -> 60s -> 120s` 调度下一次 `flushPending()`。外部显式 `flushPending()` 会清掉已有 timer 并立即补跑；任何成功上传都会重置失败计数。

**Tech Stack:** TypeScript + Jest fake timers

---

### Task 1: 为退避调度写失败测试

**Files:**
- Modify: `app/src/services/__tests__/photoUploadQueue.test.ts`
- Modify: `app/src/services/__tests__/voiceUploadQueue.test.ts`

- [ ] **Step 1: 写失败测试**
  - 首次失败后 15 秒自动再试
  - 外部 `flushPending()` 会取消旧定时器并立即重试
  - 成功后失败计数清零，下一次失败重新从 15 秒开始

- [ ] **Step 2: 运行测试确认失败**
  - Run: `npm test -- --runInBand --runTestsByPath src/services/__tests__/photoUploadQueue.test.ts src/services/__tests__/voiceUploadQueue.test.ts`

### Task 2: 实现照片/语音上传队列退避重试

**Files:**
- Modify: `app/src/services/photoUploadQueue.ts`
- Modify: `app/src/services/voiceUploadQueue.ts`

- [ ] **Step 1: 最小实现**
  - 队列内部维护 retry timer
  - 失败时指数退避调度
  - 成功时清零失败计数
  - 外部 `flushPending()` 取消旧 timer 并立即补跑

- [ ] **Step 2: 运行测试确认通过**
  - Run: `npm test -- --runInBand --runTestsByPath src/services/__tests__/photoUploadQueue.test.ts src/services/__tests__/voiceUploadQueue.test.ts`

### Task 3: 回归验证

**Files:**
- Verify: `app/src/services/photoUploadQueue.ts`
- Verify: `app/src/services/voiceUploadQueue.ts`
- Verify: `app/app/_layout.tsx`

- [ ] **Step 1: 跑相关测试**
  - Run: `npm test -- --runInBand --runTestsByPath src/services/__tests__/photoUploadQueue.test.ts src/services/__tests__/voiceUploadQueue.test.ts app/__tests__/_layout.photo-upload.test.tsx`

- [ ] **Step 2: 跑类型检查**
  - Run: `npm run typecheck`
