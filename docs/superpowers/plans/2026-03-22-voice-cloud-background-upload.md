# 云端语音后台上传 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让云端模式下的语音录制采用“本地先落卡片与 cache 文件，后台静默上传并自动重试”的链路，上传失败不丢卡片。

**Architecture:** 录音入口先走本地持久化，语音 entry 的 UI 状态由本地 `recordingStatus` 与 `syncStatus` 驱动；后台新增独立语音上传队列，负责扫描 `pending_upload` 语音、执行媒体上传与远端 entry 创建、以及在启动/前台/网络恢复时重试。播放始终优先走本地 `cache` 文件，云端只负责同步结果。

**Tech Stack:** Expo SDK 54, TypeScript, Expo Audio, Expo FileSystem, Zustand, SQLite, Expo Router

**Spec:** `docs/superpowers/specs/2026-03-22-voice-cloud-background-upload-design.md`

---

## 变更记录

- 2026-03-22：基于已批准 spec 创建实现计划，覆盖本地持久化、后台上传队列、UI 状态文案、自动重试与文档收口。
- 2026-03-22：已在主工作区完成实现；自动重试额外补入 `expo-network` 监听网络恢复，验证结果已落盘。

## 执行状态

| Task | 状态 | 说明 |
|------|------|------|
| Task 1 | 已完成 | 已补齐语音背景上传状态模型，并在 `EntryCard` 中显示 `待上传 / 上传中 / 已同步` |
| Task 2 | 已完成 | 已完成 SQLite `sync_status` / `remoteUri` 持久化；断言主要落在 `src/database/__tests__/operations.test.ts` |
| Task 3 | 已完成 | 已新增 `voiceUploadQueue` 串行上传队列，并改成懒加载单例，避免测试环境提前拉起原生依赖 |
| Task 4 | 已完成 | 已在 `_layout.tsx` 接入启动、回前台、网络恢复三类自动补传触发；网络恢复通过 `expo-network` 监听 |
| Task 5 | 已完成 | 已完成“开始即建本地卡、停止后写 cache 并入队上传”的首页录音链路 |
| Task 6 | 已完成 | 已收敛语音卡文案与交互，只保留录音中的停止操作 |
| Task 7 | 已完成 | 已实现删除待上传语音卡时取消任务并清理本地 cache 文件 |
| Task 8 | 已完成 | 已完成类型检查、目标测试、全量测试与文档收口 |

## 实际执行说明

- 本次未按 plan 中的 commit 步骤逐 task 提交：
  - 原因是主工作区已有大量未提交改动，按项目约束不适合在此过程中穿插独立 commit 并打断用户当前上下文
- Task 2 的测试位置有调整：
  - plan 示例写在 `src/database/__tests__/dataSource.test.ts`
  - 实际将 SQLite 底层持久化断言补在 `src/database/__tests__/operations.test.ts`
- Task 4 为满足“网络恢复自动重试”，实际新增了 `expo-network` 依赖，并执行了 Android 重编译安装

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `app/src/services/voiceUploadQueue.ts` | 维护语音上传任务队列，串行执行上传、状态流转、失败回退与触发入口 |
| `app/src/services/__tests__/voiceUploadQueue.test.ts` | 语音上传队列的单元测试 |

### Modified Files

| File | Change |
|------|--------|
| `app/src/types/entry.ts` | 收紧语音状态模型；补齐 `MediaInfo.remoteUri` 与新的 `syncStatus` 取值 |
| `app/src/database/operations.ts` | 持久化新的语音状态字段；补齐语音 entry 更新/查询辅助方法 |
| `app/src/database/dataSource.ts` | 让云端语音录制改成本地先写，再由队列异步同步 |
| `app/src/store/entryStore.ts` | 暴露语音本地创建、录音完成、同步状态更新、删除时清理文件/取消任务 |
| `app/app/(tabs)/index.tsx` | 改造录音交互：开始即建本地卡片，停止即保存 cache 并触发后台上传 |
| `app/src/components/EntryCard.tsx` | 语音卡状态文案与按钮逻辑改为“录音中/待上传/上传中/已同步” |
| `app/app/_layout.tsx` | 在应用启动与回到前台时触发语音上传队列 |
| `app/src/services/voiceService.ts` | 提供更稳定的 stop 结果，确保返回 cache 文件路径并兼容本地播放 |
| `app/src/services/apiClient.ts` | 复用上传错误归一化，便于队列区分媒体上传失败与 entry 创建失败 |
| `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts` | 主页录音云端模式链路测试 |
| `app/src/components/__tests__/EntryCard.test.tsx` | 语音卡状态与交互展示测试 |
| `app/src/database/__tests__/dataSource.test.ts` | 数据源与本地优先语音持久化测试 |
| `app/src/services/__tests__/voiceService.test.ts` | 录音 stop 后 cache 文件行为测试 |
| `docs/superpowers/specs/2026-03-22-voice-cloud-background-upload-design.md` | 实现后更新状态、偏差说明与最终验证 |
| `docs/superpowers/plans/2026-03-22-voice-cloud-background-upload.md` | 执行中勾选任务、补齐验证结果 |

## 执行约束

- 只处理语音卡片，不顺带扩展照片/文本后台重试。
- 不恢复暂停/继续录音。
- 上传失败时不弹错误提示，不删除本地卡片。
- 删除 `pending_upload` / `uploading` 语音卡时，必须同时删除本地 cache 文件并取消后续上传。
- 不回滚当前工作区已有改动；实现时只在本计划列出的文件内增量修改。

## Chunk 1: 本地状态模型与持久化

### Task 1: 收紧语音状态模型

**Files:**
- Modify: `app/src/types/entry.ts`
- Test: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定新状态文案映射**

在 `app/src/components/__tests__/EntryCard.test.tsx` 新增或补充语音卡测试，覆盖：

```tsx
it('shows 待上传 when syncStatus is pending_upload and recording completed', () => {
  renderEntryCard({
    type: 'voice',
    recordingStatus: 'completed',
    syncStatus: 'pending_upload',
  });
  expect(screen.getByText('待上传')).toBeTruthy();
});
```

- [ ] **Step 2: 运行单测确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/EntryCard.test.tsx`
Expected: FAIL，原因是类型或文案映射尚未支持 `pending_upload` / `uploading` / `synced`

- [ ] **Step 3: 最小修改 entry 类型**

在 `app/src/types/entry.ts` 调整语音相关字段：

```ts
recordingStatus?: 'recording' | 'completed';
syncStatus: 'pending' | 'pending_upload' | 'uploading' | 'synced' | 'failed';

export interface MediaInfo {
  uri: string;
  remoteUri?: string;
  ...
}
```

要求：
- 不移除现有非语音卡依赖的 `pending`
- `remoteUri` 作为语音远端媒体地址的持久化字段保留

- [ ] **Step 4: 再跑单测确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/EntryCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/types/entry.ts app/src/components/__tests__/EntryCard.test.tsx
git commit -m "refactor: define voice background upload states"
```

### Task 2: SQLite 持久化新的语音状态

**Files:**
- Modify: `app/src/database/operations.ts`
- Modify: `app/src/store/entryStore.ts`
- Test: `app/src/database/__tests__/dataSource.test.ts`

- [ ] **Step 1: 先写失败测试，锁定本地语音 entry 的持久化行为**

在 `app/src/database/__tests__/dataSource.test.ts` 增加测试：

```ts
it('persists completed voice entry with cache uri and pending_upload status', async () => {
  await localDataSource.addEntry({
    type: 'voice',
    content: '',
    media: [{ uri: 'file:///cache/test.m4a' }],
    recordingStatus: 'completed',
    syncStatus: 'pending_upload',
  });

  const entries = await localDataSource.getEntries({ type: 'voice' });
  expect(entries[0].media?.[0]?.uri).toBe('file:///cache/test.m4a');
  expect(entries[0].syncStatus).toBe('pending_upload');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/database/__tests__/dataSource.test.ts`
Expected: FAIL，原因是查询/插入逻辑仍把 `syncStatus` 归一成旧值，或缺少 `remoteUri`

- [ ] **Step 3: 最小修改 operations 与 store**

在 `app/src/database/operations.ts`：
- 保留语音 entry 的 `syncStatus`
- 读写 `media_json` 时携带 `remoteUri`
- 新增或补足按 id 更新语音同步状态的 helper

在 `app/src/store/entryStore.ts`：
- 增加仅用于语音链路的 helper：

```ts
createLocalVoiceEntry(...)
completeLocalVoiceEntry(...)
markVoiceEntryUploading(id)
markVoiceEntryPending(id)
markVoiceEntrySynced(id, remoteMedia)
```

- [ ] **Step 4: 重新跑测试确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/database/__tests__/dataSource.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/database/operations.ts app/src/store/entryStore.ts app/src/database/__tests__/dataSource.test.ts
git commit -m "feat: persist local voice upload states"
```

## Chunk 2: 语音上传队列

### Task 3: 新增语音后台上传队列

**Files:**
- Create: `app/src/services/voiceUploadQueue.ts`
- Create: `app/src/services/__tests__/voiceUploadQueue.test.ts`
- Modify: `app/src/database/dataSource.ts`
- Modify: `app/src/services/apiClient.ts`

- [ ] **Step 1: 先写失败测试，锁定队列状态流转**

创建 `app/src/services/__tests__/voiceUploadQueue.test.ts`，覆盖：

```ts
it('uploads pending voice entry and marks it synced', async () => { ... });
it('returns voice entry to pending_upload when media upload fails', async () => { ... });
it('skips deleted entries and cancels queued work', async () => { ... });
```

断言点：
- 开始处理前改成 `uploading`
- 媒体上传成功 + entry 创建成功后改成 `synced`
- 任一步失败后回退为 `pending_upload`
- 不删除本地 cache 文件

- [ ] **Step 2: 运行测试确认失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/services/__tests__/voiceUploadQueue.test.ts`
Expected: FAIL，原因是队列模块尚不存在

- [ ] **Step 3: 写最小实现**

在 `app/src/services/voiceUploadQueue.ts` 新建队列服务：

```ts
export function createVoiceUploadQueue(deps: VoiceUploadQueueDeps) {
  return {
    enqueue(entryId: string) {},
    cancel(entryId: string) {},
    flushPending() {},
  };
}
```

最小行为：
- 串行处理，避免同一时刻多个语音上传互相覆盖状态
- 通过 store / DB 读取 `pending_upload` 语音
- 调用 `apiClient.uploadFile('/media/upload', localUri, 'file')`
- 再调用 `apiClient.post('/entries', ...)`
- 成功后回写 `remoteUri`
- 失败后仅回退状态，不抛 UI 提示

同步更新 `app/src/database/dataSource.ts`，把旧的“停止录音即远端 addEntry”路径替换为“本地保存 + 队列上传”。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/services/__tests__/voiceUploadQueue.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/services/voiceUploadQueue.ts app/src/services/__tests__/voiceUploadQueue.test.ts app/src/database/dataSource.ts app/src/services/apiClient.ts
git commit -m "feat: add background voice upload queue"
```

### Task 4: 接入启动/前台/网络恢复自动重试

**Files:**
- Modify: `app/app/_layout.tsx`
- Modify: `app/src/services/voiceUploadQueue.ts`
- Test: `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts`

- [ ] **Step 1: 先写失败测试，锁定自动重试触发**

在 `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts` 增加测试：

```ts
it('retries pending voice uploads when app returns to foreground', async () => { ... });
```

如果现有测试环境更适合放在 `_layout` 相关测试里，也允许新建对应测试文件，但必须覆盖：
- App 启动时触发一次 `flushPending`
- 回到前台时触发一次 `flushPending`

- [ ] **Step 2: 运行测试确认失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath 'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts'`
Expected: FAIL，原因是当前没有自动触发队列 flush

- [ ] **Step 3: 写最小实现**

在 `app/app/_layout.tsx`：
- 启动完成后调用 `voiceUploadQueue.flushPending()`
- 监听 `AppState` 从 background/inactive -> active，再次触发 flush

在 `voiceUploadQueue.ts`：
- 暴露幂等 `flushPending`
- 避免重复并发 flush

网络恢复触发先复用现有网络能力；若项目已有 NetInfo 依赖则接入，没有则在计划执行时补一个最小监听，不扩展到全量离线框架。

- [ ] **Step 4: 再跑测试确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath 'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/app/_layout.tsx app/src/services/voiceUploadQueue.ts app/app/'(tabs)'/__tests__/index.voice-cloud-mode.test.ts
git commit -m "feat: retry pending voice uploads on app resume"
```

## Chunk 3: 首页录音链路与卡片展示

### Task 5: 录音开始即创建本地语音卡

**Files:**
- Modify: `app/app/(tabs)/index.tsx`
- Modify: `app/src/services/voiceService.ts`
- Test: `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts`
- Test: `app/src/services/__tests__/voiceService.test.ts`

- [ ] **Step 1: 先写失败测试，锁定录音开始/停止的本地优先行为**

在 `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts` 覆盖：

```ts
it('creates a local voice card immediately when recording starts in cloud mode', async () => { ... });
it('keeps the card and marks it pending_upload after stopRecording succeeds', async () => { ... });
```

在 `app/src/services/__tests__/voiceService.test.ts` 覆盖：

```ts
it('returns a cache file uri from stopRecording', async () => { ... });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath 'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts' src/services/__tests__/voiceService.test.ts`
Expected: FAIL，原因是当前链路仍带有旧的远端创建或临时卡状态

- [ ] **Step 3: 写最小实现**

在 `app/app/(tabs)/index.tsx`：
- 点击录音时立即调用 store 的 `createLocalVoiceEntry`
- 只保留“停止”操作，不再保留暂停/继续分支
- 停止录音后更新同一条 entry：
  - `recordingStatus = 'completed'`
  - `syncStatus = 'pending_upload'`
  - `media[0].uri = cacheUri`
- 然后调用 `voiceUploadQueue.enqueue(entryId)`

在 `app/src/services/voiceService.ts`：
- `stopRecording()` 明确返回稳定的 `cacheUri`
- 不因远端上传逻辑而删除本地文件

- [ ] **Step 4: 再跑测试确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath 'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts' src/services/__tests__/voiceService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/app/'(tabs)'/index.tsx app/src/services/voiceService.ts app/app/'(tabs)'/__tests__/index.voice-cloud-mode.test.ts app/src/services/__tests__/voiceService.test.ts
git commit -m "feat: create local voice cards before background upload"
```

### Task 6: 语音卡状态文案与播放规则

**Files:**
- Modify: `app/src/components/EntryCard.tsx`
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定语音卡展示规则**

在 `app/src/components/__tests__/EntryCard.test.tsx` 补齐测试：

```tsx
it('renders 录音中 with stop action only', () => { ... });
it('renders 待上传 and still allows play from local cache', () => { ... });
it('renders 上传中 when syncStatus is uploading', () => { ... });
it('renders 已同步 when syncStatus is synced', () => { ... });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/EntryCard.test.tsx`
Expected: FAIL，原因是当前文案、按钮或播放可用性仍沿用旧逻辑

- [ ] **Step 3: 写最小实现**

在 `app/src/components/EntryCard.tsx`：
- `recordingStatus === 'recording'` 时只显示“停止”
- `syncStatus === 'pending_upload'` 显示 `待上传`
- `syncStatus === 'uploading'` 显示 `上传中`
- `syncStatus === 'synced'` 显示 `已同步`
- 只要 `media[0].uri` 是本地 cache 文件，就允许播放，不要求远端已成功

- [ ] **Step 4: 再跑测试确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/EntryCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/components/EntryCard.tsx app/src/components/__tests__/EntryCard.test.tsx
git commit -m "feat: show local-first voice upload states in cards"
```

## Chunk 4: 删除清理、全量验证与文档收口

### Task 7: 删除未同步语音卡时清理本地文件并取消上传

**Files:**
- Modify: `app/src/store/entryStore.ts`
- Modify: `app/src/services/voiceUploadQueue.ts`
- Test: `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts`

- [ ] **Step 1: 先写失败测试，锁定删除语义**

在 `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts` 增加测试：

```ts
it('deletes local cache file and cancels queued upload when a pending voice card is removed', async () => { ... });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath 'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts'`
Expected: FAIL，原因是当前删除逻辑不会同时清理文件与队列

- [ ] **Step 3: 写最小实现**

在 `app/src/store/entryStore.ts` 的删除入口：
- 对 `voice + pending_upload/uploading` 先删除本地 `media[0].uri`
- 调 `voiceUploadQueue.cancel(id)`
- 再删除 entry

在 `app/src/services/voiceUploadQueue.ts`：
- `cancel(id)` 必须能移除未开始任务，并让正在处理的条目在下一阶段安全中止

- [ ] **Step 4: 再跑测试确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath 'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/store/entryStore.ts app/src/services/voiceUploadQueue.ts app/app/'(tabs)'/__tests__/index.voice-cloud-mode.test.ts
git commit -m "feat: clean local voice cache when pending cards are deleted"
```

### Task 8: 全量验证与文档收口

**Files:**
- Modify: `docs/superpowers/specs/2026-03-22-voice-cloud-background-upload-design.md`
- Modify: `docs/superpowers/plans/2026-03-22-voice-cloud-background-upload.md`

- [ ] **Step 1: 运行类型检查**

Run: `cd app && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 2: 运行目标测试**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/EntryCard.test.tsx src/database/__tests__/dataSource.test.ts src/services/__tests__/voiceService.test.ts src/services/__tests__/voiceUploadQueue.test.ts 'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts'`
Expected: PASS

- [ ] **Step 3: 运行全量测试**

Run: `cd app && npx jest --run-in-band`
Expected: PASS

- [ ] **Step 4: 记录手动验证**

手动验证至少记录：
- 云端模式下开始录音立即出现本地卡片
- 停止后卡片进入 `待上传`
- 断网时卡片仍可播放
- 恢复网络或重启 app 后自动同步为 `已同步`
- 删除 `待上传` 卡片后本地 cache 文件被删除

- [ ] **Step 5: 文档收口**

更新 `docs/superpowers/specs/2026-03-22-voice-cloud-background-upload-design.md`：
- 状态改为 `已实现`
- 若实际实现与 spec 有偏差，补充说明
- 写入最终验证结果

更新本计划：
- 勾选完成步骤
- 记录实际运行命令与结果

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-03-22-voice-cloud-background-upload-design.md docs/superpowers/plans/2026-03-22-voice-cloud-background-upload.md
git commit -m "docs: close out voice cloud background upload plan"
```

## 计划审查说明

- 本次 harness 未获用户授权使用 subagent，因此没有执行 plan-document-reviewer 子代理循环。
- 已按已批准 spec、本地 checklist、现有计划格式手工收敛任务粒度与验证项；执行前如需额外 reviewer，可在实现阶段单独发起代码/计划 review。

## 完成标准

- 计划中的每个 task 都有明确文件范围、测试入口和提交点
- 执行后能够满足 spec 中列出的全部验收标准
- 文档状态从 `已批准` 收口到 `已实现`

## 验证结果

- 类型检查：
  - `cd app && npx tsc --noEmit`
  - 结果：通过
- 目标测试：
  - `cd app && CI=1 npx jest --run-in-band --runTestsByPath src/components/__tests__/EntryCard.test.tsx`
  - `cd app && CI=1 npx jest --run-in-band --runTestsByPath src/database/__tests__/operations.test.ts`
  - `cd app && CI=1 npx jest --run-in-band --runTestsByPath src/database/__tests__/dataSource.test.ts`
  - `cd app && CI=1 npx jest --run-in-band --runTestsByPath src/services/__tests__/voiceService.test.ts`
  - `cd app && CI=1 npx jest --run-in-band --runTestsByPath src/services/__tests__/voiceUploadQueue.test.ts`
  - `cd app && CI=1 npx jest --run-in-band --runTestsByPath 'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts'`
  - 结果：全部通过
- 全量测试：
  - `cd app && CI=1 npx jest --run-in-band`
  - 结果：34 个测试套件，257 个测试全部通过
- 最小手动验证：
  - 已执行 `cd app && npm run android` 完成 Android 原生重编译安装
  - 模拟器已确认 app 可启动，不再出现 `Cannot find native module 'ExpoNetwork'`
  - 为避免再次影响现有模拟器数据，本轮未执行会写入用户数据的完整录音上传手测

Plan complete and saved to `docs/superpowers/plans/2026-03-22-voice-cloud-background-upload.md`. Ready to execute?
