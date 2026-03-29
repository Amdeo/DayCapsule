# 卡片即时出现与本地补全 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 让文本、照片、语音三类卡片都先出现在列表中，再异步补全本地内容；补全失败时删除卡片并清理本地文件。

**Architecture:** 在 entry 顶层新增独立于 `syncStatus` 的 `localReadyState`，统一表示“本地展示是否已准备完成”。文本卡片直接写成 `ready`，照片与语音先以 `processing` 入库并立即显示，再分别通过独立的本地补全 service 回写正式媒体数据；应用启动时清扫残留 `processing` entry，上传队列只接手 `ready` 的媒体卡片。

**Tech Stack:** Expo SDK 54, React Native, Expo Router, TypeScript, Expo Image Picker, Expo Image Manipulator, Expo FileSystem, expo-audio, Zustand, SQLite, Jest

**Spec:** `docs/superpowers/specs/2026-03-29-instant-card-local-ready-design.md`

---

## File Structure

### New Files

| File | Responsibility |
| --- | --- |
| `app/src/services/photoEntryPreparationService.ts` | 照片 entry 的本地补全：正式落盘、缩略图、完整性元数据、失败清理 |
| `app/src/services/__tests__/photoEntryPreparationService.test.ts` | 照片本地补全 service 的单元测试 |
| `app/src/services/voiceEntryPreparationService.ts` | 语音 entry 的本地补全：本地保存、媒体回写、失败清理 |
| `app/src/services/__tests__/voiceEntryPreparationService.test.ts` | 语音本地补全 service 的单元测试 |
| `app/src/services/localEntryRecoveryService.ts` | 启动时清扫残留 `processing` entry，并删除其关联本地文件 |
| `app/src/services/__tests__/localEntryRecoveryService.test.ts` | 本地未完成卡片清扫测试 |
| `app/app/__tests__/_layout.local-ready-cleanup.test.tsx` | 根布局启动时触发 `processing` 清扫与补传的测试 |

### Modified Files

| File | Change |
| --- | --- |
| `app/src/types/entry.ts` | 新增 `localReadyState` 类型并扩展 `Entry` |
| `app/src/database/sqlite.ts` | 在基础 schema 中加入 `local_ready_state` 列 |
| `app/src/database/migration.ts` | 新增 `local_ready_state` 迁移 |
| `app/src/database/operations.ts` | 读写 `local_ready_state`，并新增按本地准备状态查询 helper |
| `app/src/database/__tests__/sqlite.test.ts` | 锁定 schema 包含 `local_ready_state` |
| `app/src/database/__tests__/migration.test.ts` | 锁定迁移逻辑 |
| `app/src/database/__tests__/operations.test.ts` | 锁定 entry 读写与查询保留 `localReadyState` |
| `app/src/store/entryStore.ts` | 支持 `localReadyState` 的本地创建、更新、删除与启动清扫配合 |
| `app/src/store/__tests__/entryStore.test.ts` | 锁定 `processing -> ready` 更新与删除 |
| `app/app/(tabs)/index.tsx` | 文本/照片/语音入口改为“先入库，再本地补全” |
| `app/app/(tabs)/__tests__/index.photo.test.ts` | 锁定照片即时插卡、补全成功更新、失败删除 |
| `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts` | 锁定语音即时插卡、补全成功更新、失败删除 |
| `app/src/services/photoService.ts` | 如有必要，补充支持临时预览 URI 与正式落盘返回值的契约 |
| `app/src/services/__tests__/photoService.test.ts` | 锁定照片正式落盘返回契约 |
| `app/src/services/photoUploadQueue.ts` | 忽略 `localReadyState !== 'ready'` 的 entry |
| `app/src/services/__tests__/photoUploadQueue.test.ts` | 锁定 queue 不会处理 `processing` entry |
| `app/src/services/voiceUploadQueue.ts` | 忽略 `localReadyState !== 'ready'` 的 entry |
| `app/src/services/__tests__/voiceUploadQueue.test.ts` | 锁定 queue 不会处理 `processing` entry |
| `app/app/_layout.tsx` | 启动时先清扫残留 `processing` entry，再执行现有补传/同步恢复 |
| `app/src/components/EntryCard.tsx` | 为 `processing` 卡片透传展示状态 |
| `app/src/components/entry-card/EntryCardDefaultContent.tsx` | 文本/照片默认卡片的 `processing` 展示 |
| `app/src/components/entry-card/EntryCardDefaultVoiceContent.tsx` | 语音默认卡片的 `processing` 展示 |
| `app/src/components/entry-card/EntryCardCalendarPhotoSection.tsx` | 日历照片卡片的 `processing` 展示 |
| `app/src/components/entry-card/EntryCardCalendarVoiceSection.tsx` | 日历语音卡片的 `processing` 展示 |
| `app/src/components/__tests__/EntryCard.test.tsx` | 锁定照片/语音 processing UI |
| `docs/superpowers/specs/2026-03-29-instant-card-local-ready-design.md` | 实现后更新状态、偏差说明与最终验证 |
| `docs/superpowers/plans/2026-03-29-instant-card-local-ready.md` | 执行时勾选步骤并补充最终验证 |

## 执行约束

- 不引入新的本地 job 表、通用任务中心或失败重试 UI。
- 不把 `localReadyState` 复用到后端同步协议中，它只服务前端本地展示。
- 不允许上传队列处理 `localReadyState = 'processing'` 的 entry。
- 同一 `entryId` 的本地补全过程必须串行，不允许并发写正式媒体或并发回滚删除。
- 失败时必须删除 entry，而不是保留失败卡片。
- 启动时对残留 `processing` entry 采用清扫，不做自动恢复续跑。

## Chunk 1: 持久化 `localReadyState`

### Task 1: 让 `localReadyState` 贯穿类型、SQLite schema、迁移和 CRUD

**Files:**
- Modify: `app/src/types/entry.ts`
- Modify: `app/src/database/sqlite.ts`
- Modify: `app/src/database/migration.ts`
- Modify: `app/src/database/operations.ts`
- Test: `app/src/database/__tests__/sqlite.test.ts`
- Test: `app/src/database/__tests__/migration.test.ts`
- Test: `app/src/database/__tests__/operations.test.ts`

- [x] **Step 1: 先写失败测试，锁定 schema 与 CRUD 需要保留 `localReadyState`**

在 `app/src/database/__tests__/sqlite.test.ts` 增加：

```ts
it('creates entries table with local_ready_state in the base schema', async () => {
  await initDatabase();
  const db = openDatabase() as { execAsync: jest.Mock };
  const createEntriesSql = db.execAsync.mock.calls[0][0] as string;
  expect(createEntriesSql).toContain('local_ready_state TEXT DEFAULT \'ready\'');
});
```

在 `app/src/database/__tests__/migration.test.ts` 增加迁移测试：

```ts
it('adds local_ready_state column when missing', async () => {
  mockGetAllAsync.mockResolvedValueOnce([{ name: 'id' }, { name: 'sync_status' }]);
  await migrateLocalReadyStateColumn();
  expect(mockRunAsync).toHaveBeenCalledWith(
    `ALTER TABLE entries ADD COLUMN local_ready_state TEXT DEFAULT 'ready'`
  );
});
```

在 `app/src/database/__tests__/operations.test.ts` 增加：

```ts
it('reads localReadyState from rows and persists it on add/update', async () => {});
it('returns entries by localReadyState', async () => {});
```

- [x] **Step 2: 运行定向测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/database/__tests__/sqlite.test.ts src/database/__tests__/migration.test.ts src/database/__tests__/operations.test.ts`

Expected: FAIL，原因是当前 schema、迁移和 row mapping 都没有 `local_ready_state`。

- [x] **Step 3: 最小实现 `localReadyState` 的持久化**

实现要求：

- 在 `Entry` 顶层新增：

```ts
localReadyState?: 'processing' | 'ready';
```

- `sqlite.ts` 的 `entries` 基础 schema 新增：

```sql
local_ready_state TEXT DEFAULT 'ready'
```

- `migration.ts` 新增 `migrateLocalReadyStateColumn()`，按现有 migration 风格幂等加列，并执行：

```sql
UPDATE entries SET local_ready_state = 'ready' WHERE local_ready_state IS NULL
```

- `operations.ts`：
  - `rowToEntry()` 读取 `row.local_ready_state ?? 'ready'`
  - `addEntry()` / `updateEntry()` 写入 `local_ready_state`
  - 新增 helper：

```ts
export const getEntriesByLocalReadyState = async (
  states: Array<NonNullable<Entry['localReadyState']>>
): Promise<Entry[]> => {}
```

- [x] **Step 4: 回跑定向测试，确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/database/__tests__/sqlite.test.ts src/database/__tests__/migration.test.ts src/database/__tests__/operations.test.ts`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/src/types/entry.ts app/src/database/sqlite.ts app/src/database/migration.ts app/src/database/operations.ts app/src/database/__tests__/sqlite.test.ts app/src/database/__tests__/migration.test.ts app/src/database/__tests__/operations.test.ts
git commit -m "feat: persist local ready state for entries"
```

## Chunk 2: 启动清扫与队列防误处理

### Task 2: 清扫残留 `processing` entry，并阻止上传队列提前处理

**Files:**
- Create: `app/src/services/localEntryRecoveryService.ts`
- Create: `app/src/services/__tests__/localEntryRecoveryService.test.ts`
- Modify: `app/app/_layout.tsx`
- Create: `app/app/__tests__/_layout.local-ready-cleanup.test.tsx`
- Modify: `app/src/services/photoUploadQueue.ts`
- Modify: `app/src/services/__tests__/photoUploadQueue.test.ts`
- Modify: `app/src/services/voiceUploadQueue.ts`
- Modify: `app/src/services/__tests__/voiceUploadQueue.test.ts`

- [x] **Step 1: 先写失败测试，锁定启动清扫与 queue gating**

在 `app/src/services/__tests__/localEntryRecoveryService.test.ts` 增加：

```ts
it('deletes processing entries and their local files on startup cleanup', async () => {});
```

关键断言：

- 查询 `localReadyState = 'processing'`
- 对每条 entry 删除本地 `media.uri` / `thumbnail`
- 然后删除 entry

在 `app/src/services/__tests__/photoUploadQueue.test.ts` 与 `voiceUploadQueue.test.ts` 增加：

```ts
it('skips entries whose localReadyState is processing', async () => {});
```

在 `app/app/__tests__/_layout.local-ready-cleanup.test.tsx` 增加：

```ts
it('runs processing entry cleanup before flushing pending uploads', async () => {});
```

- [x] **Step 2: 运行定向测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/services/__tests__/localEntryRecoveryService.test.ts src/services/__tests__/photoUploadQueue.test.ts src/services/__tests__/voiceUploadQueue.test.ts app/__tests__/_layout.local-ready-cleanup.test.tsx`

Expected: FAIL，原因是 recovery service 不存在，队列也不会检查 `localReadyState`。

- [x] **Step 3: 实现 recovery service 与 queue guard**

在 `app/src/services/localEntryRecoveryService.ts` 新建：

```ts
export async function cleanupIncompleteLocalEntries(deps = defaultDeps): Promise<void> {
  const entries = await deps.getEntriesByLocalReadyState(['processing']);
  for (const entry of entries) {
    for (const uri of collectLocalMediaUris(entry)) {
      await deps.deleteLocalFile(uri).catch(() => {});
    }
    await deps.deleteEntry(entry.id);
  }
}
```

在 `_layout.tsx` 初始化流程中：

- 在 `migrateLocalReadyStateColumn()` 之后调用 `cleanupIncompleteLocalEntries()`
- 完成清扫后再触发 `flushPendingVoiceUploads()` / `flushPendingPhotoUploads()`

在 `photoUploadQueue.ts` / `voiceUploadQueue.ts`：

- `isUploadable*Entry()` 必须额外要求：

```ts
entry.localReadyState !== 'processing'
```

- [x] **Step 4: 回跑定向测试，确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/services/__tests__/localEntryRecoveryService.test.ts src/services/__tests__/photoUploadQueue.test.ts src/services/__tests__/voiceUploadQueue.test.ts app/__tests__/_layout.local-ready-cleanup.test.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/src/services/localEntryRecoveryService.ts app/src/services/__tests__/localEntryRecoveryService.test.ts app/app/_layout.tsx app/app/__tests__/_layout.local-ready-cleanup.test.tsx app/src/services/photoUploadQueue.ts app/src/services/__tests__/photoUploadQueue.test.ts app/src/services/voiceUploadQueue.ts app/src/services/__tests__/voiceUploadQueue.test.ts
git commit -m "feat: clean up incomplete local entries on startup"
```

## Chunk 3: 照片卡片先出现，再本地补全

### Task 3: 照片创建改为“先插卡，再异步准备正式媒体”

**Files:**
- Create: `app/src/services/photoEntryPreparationService.ts`
- Create: `app/src/services/__tests__/photoEntryPreparationService.test.ts`
- Modify: `app/app/(tabs)/index.tsx`
- Modify: `app/app/(tabs)/__tests__/index.photo.test.ts`
- Modify: `app/src/services/photoService.ts`
- Modify: `app/src/services/__tests__/photoService.test.ts`

- [x] **Step 1: 先写失败测试，锁定照片即时插卡与失败回滚**

在 `app/app/(tabs)/__tests__/index.photo.test.ts` 增加：

```ts
it('creates the photo entry immediately with processing localReadyState before local media preparation finishes', async () => {});
it('updates the same photo entry to ready when preparation succeeds', async () => {});
it('deletes the photo entry and new files when preparation fails', async () => {});
```

关键断言：

- `addLocalEntry()` 先收到临时预览 URI + `localReadyState: 'processing'`
- `savePhotoToStorage()` 不再阻塞卡片插入
- 成功后使用 `updateLocalEntry(entryId, { media, localReadyState: 'ready' })`
- 失败后调用 `deleteEntry(entryId)` 与 `deleteLocalFile()`

在 `app/src/services/__tests__/photoEntryPreparationService.test.ts` 锁定 service：

```ts
it('serializes preparation per entryId and writes ready media once', async () => {});
it('returns created files for rollback when saving succeeds', async () => {});
```

- [x] **Step 2: 运行定向测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath 'app/(tabs)/__tests__/index.photo.test.ts' src/services/__tests__/photoEntryPreparationService.test.ts src/services/__tests__/photoService.test.ts`

Expected: FAIL，原因是当前首页照片链路仍会等正式保存完成后才创建 entry。

- [x] **Step 3: 实现照片补全 service 与首页编排改造**

在 `photoEntryPreparationService.ts` 新建最小接口：

```ts
export interface PreparePhotoEntryDeps {
  savePhotoToStorage: typeof PhotoService.savePhotoToStorage;
}

export async function preparePhotoEntryMedia(
  entryId: string,
  results: PhotoResult[],
  deps: PreparePhotoEntryDeps
): Promise<{ media: MediaInfo[]; createdFiles: string[] }> {}
```

实现约束：

- 对同一 `entryId` 串行执行
- 返回正式 `media[]` 与 `createdFiles`
- 不直接碰 store/UI

在 `index.tsx`：

- 先用临时预览 URI 构造最小 `media[]`
- 调 `addLocalEntry({ type: 'photo', localReadyState: 'processing', ... })`
- 再异步调用 `preparePhotoEntryMedia()`
- 成功后 `updateLocalEntry(entry.id, { media, localReadyState: 'ready' })`
- 在线/云端模式下，只有在 `ready` 后才入 `enqueuePhotoUpload`
- 失败后删除 entry，并清理 `createdFiles`

如果 `photoService.ts` 需要补契约，保持 `savePhotoToStorage()` 返回：

```ts
{
  originalUri,
  thumbnailUri,
  width,
  height,
  aspectRatio,
  persistedFingerprint
}
```

- [x] **Step 4: 回跑定向测试，确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath 'app/(tabs)/__tests__/index.photo.test.ts' src/services/__tests__/photoEntryPreparationService.test.ts src/services/__tests__/photoService.test.ts`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/src/services/photoEntryPreparationService.ts app/src/services/__tests__/photoEntryPreparationService.test.ts app/app/'(tabs)'/index.tsx app/app/'(tabs)'/__tests__/index.photo.test.ts app/src/services/photoService.ts app/src/services/__tests__/photoService.test.ts
git commit -m "feat: show photo cards before local media preparation"
```

## Chunk 4: 语音卡片先出现，再本地补全

### Task 4: 语音停止后立即保留卡片，并用本地补全取代“失败回到 recording”

**Files:**
- Create: `app/src/services/voiceEntryPreparationService.ts`
- Create: `app/src/services/__tests__/voiceEntryPreparationService.test.ts`
- Modify: `app/app/(tabs)/index.tsx`
- Modify: `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts`
- Modify: `app/src/store/entryStore.ts`
- Modify: `app/src/store/__tests__/entryStore.test.ts`

- [x] **Step 1: 先写失败测试，锁定语音卡片即时保留与失败删除**

在 `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts` 增加：

```ts
it('keeps the same voice entry in processing while local voice preparation runs', async () => {});
it('marks the voice entry ready after saveVoiceToCache succeeds', async () => {});
it('deletes the voice entry instead of restoring recording when local preparation fails', async () => {});
```

关键断言：

- 停止录音后 entry 保留在列表中
- `recordingStatus` 不再在失败时回退到 `recording`
- 失败时删除 entry

在 `voiceEntryPreparationService.test.ts` 增加：

```ts
it('prepares voice media once per entryId and returns created files for rollback', async () => {});
```

- [x] **Step 2: 运行定向测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath 'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts' src/services/__tests__/voiceEntryPreparationService.test.ts src/store/__tests__/entryStore.test.ts`

Expected: FAIL，原因是当前 stop 失败会把语音 entry 改回 `recording`，没有 `localReadyState` 驱动的删除回滚。

- [x] **Step 3: 用独立 service 改写语音本地补全**

在 `voiceEntryPreparationService.ts` 新建：

```ts
export async function prepareVoiceEntryMedia(
  entryId: string,
  audioFile: AudioFile,
  deps: { saveVoiceToCache: ... }
): Promise<{ media: MediaInfo[]; createdFiles: string[] }> {}
```

在 `index.tsx`：

- 录音开始创建的临时语音 entry 增加 `localReadyState: 'processing'`
- `finalizeCloudVoiceRecordingForTest()` 改为：
  - stop 成功后保留 entry
  - 调 `prepareVoiceEntryMedia()`
  - 成功时更新为：

```ts
{
  recordingStatus: 'completed',
  localReadyState: 'ready',
  media: [...],
  syncStatus: 'pending_upload'
}
```

  - 失败时删除 entry，不再回退到 `recording`

在 `entryStore.ts` 如有必要补一条工具能力，保证“删除正在 processing 的语音卡”只做本地删除和文件清理。

- [x] **Step 4: 回跑定向测试，确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath 'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts' src/services/__tests__/voiceEntryPreparationService.test.ts src/store/__tests__/entryStore.test.ts`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/src/services/voiceEntryPreparationService.ts app/src/services/__tests__/voiceEntryPreparationService.test.ts app/app/'(tabs)'/index.tsx app/app/'(tabs)'/__tests__/index.voice-cloud-mode.test.ts app/src/store/entryStore.ts app/src/store/__tests__/entryStore.test.ts
git commit -m "feat: keep voice cards visible during local preparation"
```

## Chunk 5: 处理中的卡片 UI

### Task 5: 为默认卡片和日历卡片增加 `processing` 半成品态

**Files:**
- Modify: `app/src/components/EntryCard.tsx`
- Modify: `app/src/components/entry-card/EntryCardDefaultContent.tsx`
- Modify: `app/src/components/entry-card/EntryCardDefaultVoiceContent.tsx`
- Modify: `app/src/components/entry-card/EntryCardCalendarPhotoSection.tsx`
- Modify: `app/src/components/entry-card/EntryCardCalendarVoiceSection.tsx`
- Test: `app/src/components/__tests__/EntryCard.test.tsx`

- [x] **Step 1: 先写失败测试，锁定 processing UI**

在 `app/src/components/__tests__/EntryCard.test.tsx` 增加：

```tsx
it('shows a photo preview with preparing hint when localReadyState is processing', () => {});
it('shows voice duration and disabled playback placeholder when localReadyState is processing', () => {});
it('keeps text cards rendering normally when localReadyState is ready', () => {});
```

关键断言：

- 照片卡片仍显示图片预览，不是空白
- 语音卡片显示“准备中”，播放按钮不可点击
- 不把 `processing` 文案写进 sync badge

- [x] **Step 2: 运行定向测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/EntryCard.test.tsx`

Expected: FAIL，原因是当前 UI 只认 `recordingStatus` / `syncStatus`，没有 `localReadyState`。

- [x] **Step 3: 最小实现 processing 半成品态**

实现要求：

- `EntryCard.tsx` 将 `entry.localReadyState` 透传给默认与日历内容组件
- 照片：
  - 默认卡与日历卡都优先渲染现有 `media.uri`
  - 叠加轻量“准备中”文案或遮罩
- 语音：
  - 使用已有 `recordingDuration` 或媒体时长
  - 播放按钮禁用
  - 文案显示“准备中”
- 文本：
  - `ready` 下保持现有行为

- [x] **Step 4: 回跑定向测试，确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/EntryCard.test.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/src/components/EntryCard.tsx app/src/components/entry-card/EntryCardDefaultContent.tsx app/src/components/entry-card/EntryCardDefaultVoiceContent.tsx app/src/components/entry-card/EntryCardCalendarPhotoSection.tsx app/src/components/entry-card/EntryCardCalendarVoiceSection.tsx app/src/components/__tests__/EntryCard.test.tsx
git commit -m "feat: render processing state for local media cards"
```

## Chunk 6: 集成验证与文档收口

### Task 6: 跑集成验证并更新文档状态

**Files:**
- Modify: `docs/superpowers/specs/2026-03-29-instant-card-local-ready-design.md`
- Modify: `docs/superpowers/plans/2026-03-29-instant-card-local-ready.md`

- [x] **Step 1: 运行目标测试集**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath \
  src/database/__tests__/sqlite.test.ts \
  src/database/__tests__/migration.test.ts \
  src/database/__tests__/operations.test.ts \
  src/services/__tests__/localEntryRecoveryService.test.ts \
  src/services/__tests__/photoEntryPreparationService.test.ts \
  src/services/__tests__/voiceEntryPreparationService.test.ts \
  src/services/__tests__/photoUploadQueue.test.ts \
  src/services/__tests__/voiceUploadQueue.test.ts \
  'app/(tabs)/__tests__/index.photo.test.ts' \
  'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts' \
  app/__tests__/_layout.local-ready-cleanup.test.tsx \
  src/components/__tests__/EntryCard.test.tsx
```

Expected: PASS

- [x] **Step 2: 运行类型检查**

Run: `cd app && npx tsc --noEmit`

Expected: PASS

- [x] **Step 3: 更新 spec / plan 的实现结果与验证记录**

在 spec 中补：

- 实现完成日期
- 实现偏差说明
- 最终验证结果

在 plan 中补：

- 已完成状态
- 最终执行说明
- 验证命令与结果

- [x] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-03-29-instant-card-local-ready-design.md docs/superpowers/plans/2026-03-29-instant-card-local-ready.md
git commit -m "docs: finalize instant card local ready rollout"
```

## 最终执行说明

- 已完成 Chunk 1 到 Chunk 6 的全部步骤，所有计划项均已落地。
- 实现提交顺序：
  - `1d04e34 feat: persist local ready state for entries`
  - `0269045 fix: always backfill local ready state during migration`
  - `523812b fix: run local ready state migration during app initialization`
  - `68b2678 feat: clean up incomplete local entries on startup`
  - `f08181e test: strengthen local ready cleanup order assertion`
  - `48ad4db feat: show photo cards before local media preparation`
  - `da99ac8 fix: clean up prepared photo files on ready failure`
  - `7dc5288 fix: harden photo preparation error handling`
  - `e1f0235 feat: keep voice cards visible during local preparation`
  - `b2fef05 feat: render processing state for local media cards`

## 验证命令与结果

- `cd app && npx jest --run-in-band --runTestsByPath src/database/__tests__/sqlite.test.ts src/database/__tests__/migration.test.ts src/database/__tests__/operations.test.ts src/services/__tests__/localEntryRecoveryService.test.ts src/services/__tests__/photoEntryPreparationService.test.ts src/services/__tests__/voiceEntryPreparationService.test.ts src/services/__tests__/photoUploadQueue.test.ts src/services/__tests__/voiceUploadQueue.test.ts 'app/(tabs)/__tests__/index.photo.test.ts' 'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts' app/__tests__/_layout.local-ready-cleanup.test.tsx src/components/__tests__/EntryCard.test.tsx`：通过。存在既有 `act(...)` console warning 与 Jest open handles 提示，但所有断言通过。
- `cd app && npx tsc --noEmit`：通过。
