# 本地首轮上云照片媒体修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复启用云模式时，本地照片首轮上云把 `file://` 媒体路径直接同步到服务端，导致其他设备恢复后图片失效的问题。

**Architecture:** 保持现有本地优先同步协议不变，只在 `syncBootstrapService.runInitialFlow('local')` 增加一个“媒体预上传”步骤。该步骤只为缺少 `remoteUri` 的本地媒体上传文件并回填本地记录，然后继续现有 `pending -> syncNow()` 流程。

**Tech Stack:** React Native, TypeScript, Expo, Jest

---

### Task 1: 先写回归测试复现首轮上云缺 remoteUri

**Files:**
- Modify: `app/src/services/__tests__/syncBootstrapService.test.ts`

- [ ] **Step 1: 增加本地照片首轮上云测试**

断言：

- `runInitialFlow('local')` 会对缺少 `remoteUri` 的本地照片调用 `uploadFile('/media/upload', localUri, 'file')`
- 上传后会调用 `DB.updateEntry()` 回填 `media[0].remoteUri`
- 回填后再把记录标记为 `pending`

- [ ] **Step 2: 增加“已有 remoteUri 不重复上传”测试**

断言：

- 本地媒体已带 `remoteUri` 时，不会再次调用 `uploadFile`

- [ ] **Step 3: 运行单测并确认先失败**

Run:

```bash
cd app && pnpm test -- src/services/__tests__/syncBootstrapService.test.ts --runInBand
```

Expected: 新增断言失败，说明当前实现还没有做预上传。

### Task 2: 实现首轮上云前的媒体预上传

**Files:**
- Modify: `app/src/services/syncBootstrapService.ts`

- [ ] **Step 1: 为 `runInitialFlow('local')` 增加媒体预上传辅助函数**

要求：

- 遍历本地 entries
- 只处理 `uri` 为本地路径且 `remoteUri` 为空的媒体
- 调用 `client.uploadFile('/media/upload', localUri, 'file')`
- 将返回 URL 回填到 `media.remoteUri`

- [ ] **Step 2: 在标记 `pending` 前先落库回填后的媒体**

要求：

- 仅当媒体发生变化时才调用 `DB.updateEntry(id, { media })`
- 然后再进入现有的 `syncStatus` / `syncOp` 更新逻辑

- [ ] **Step 3: 运行单测并确认变绿**

Run:

```bash
cd app && pnpm test -- src/services/__tests__/syncBootstrapService.test.ts --runInBand
```

### Task 3: 回归验证

**Files:**
- Modify: `docs/superpowers/specs/2026-03-25-cloud-bootstrap-photo-media-design.md`
- Modify: `docs/superpowers/plans/2026-03-25-cloud-bootstrap-photo-media.md`
- Modify: `app/src/services/syncBootstrapService.ts`
- Modify: `app/src/services/__tests__/syncBootstrapService.test.ts`

- [ ] **Step 1: 运行相关测试**

Run:

```bash
cd app && pnpm test -- src/services/__tests__/syncBootstrapService.test.ts --runInBand
cd app && pnpm test -- src/services/__tests__/cloudSyncService.test.ts --runInBand
cd app && pnpm run typecheck
```

- [ ] **Step 2: 提交**

```bash
git add docs/superpowers/specs/2026-03-25-cloud-bootstrap-photo-media-design.md \
  docs/superpowers/plans/2026-03-25-cloud-bootstrap-photo-media.md \
  app/src/services/syncBootstrapService.ts \
  app/src/services/__tests__/syncBootstrapService.test.ts
git commit -m "fix(sync): upload local media before cloud bootstrap"
```
