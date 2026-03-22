# 云端照片后台上传 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让云端模式下的照片创建采用“本地 cache 先落卡片、后台上传媒体、再由 `/api/sync` 同步 entry 元数据”的链路，上传失败不丢卡片。

**Architecture:** 首页选图入口先把原图和本地缩略图写入 `cache`，然后创建 `pending_upload` 的本地 photo entry 并立即入队；新增独立 `photoUploadQueue` 只负责上传图片媒体、回写 `remoteUri`、把 entry 推进到 `pending` 并触发 `cloudSyncService.syncNow()`。`entryStore` / SQLite 负责待上传照片的查询、删除时清理本地文件和取消队列，应用启动、回前台、网络恢复时复用现有触发点执行补传。

**Tech Stack:** Expo SDK 54, TypeScript, Expo Image Picker, Expo Image Manipulator, Expo FileSystem, Zustand, SQLite, Expo Router, expo-network

**Spec:** `docs/superpowers/specs/2026-03-22-photo-cloud-background-upload-design.md`

---

## 变更记录

- 2026-03-22：基于已批准 spec 创建实现计划，覆盖本地 cache 创建、照片后台上传队列、store/DB 集成、生命周期补传触发与文档收口。

## 执行状态

| Task | 状态 | 说明 |
|------|------|------|
| Task 1 | 待执行 | 把照片创建链路切到本地 `cache` + `pending_upload`，并在创建成功后立即入队 |
| Task 2 | 待执行 | 新增独立 `photoUploadQueue`，只负责媒体上传、回写 `remoteUri`、推进到 `pending` |
| Task 3 | 待执行 | 补齐 SQLite / `entryStore` 对待上传照片的查询、列表加载和删除清理 |
| Task 4 | 待执行 | 在启动、回前台、网络恢复时接入照片补传触发 |
| Task 5 | 待执行 | 跑验证、更新文档状态并准备 scoped commit |

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `app/src/services/photoUploadQueue.ts` | 维护照片媒体上传队列，负责扫描待上传照片、上传媒体、回写 `remoteUri`、触发 entry 同步 |
| `app/src/services/__tests__/photoUploadQueue.test.ts` | 照片上传队列的单元测试 |
| `app/app/__tests__/_layout.photo-upload.test.tsx` | 验证根布局在启动、回前台、网络恢复时触发照片补传 |

### Modified Files

| File | Change |
|------|--------|
| `app/app/(tabs)/index.tsx` | 调整照片创建入口，改为本地 `cache` 落盘 + `pending_upload` 本地卡片 + 立即入队 |
| `app/app/(tabs)/__tests__/index.photo.test.ts` | 首页照片云端模式链路测试 |
| `app/src/services/photoService.ts` | 固化 `savePhotoToCache` 契约，明确原图和缩略图的 `cache` 路径落点 |
| `app/src/services/__tests__/photoService.test.ts` | `savePhotoToCache` 的路径与清理行为测试 |
| `app/src/database/operations.ts` | 增加按照片类型查询待上传状态的 helper，支撑队列与列表合并 |
| `app/src/database/__tests__/operations.test.ts` | SQLite 照片待上传查询与媒体字段回写测试 |
| `app/src/store/entryStore.ts` | 合并待上传照片到列表；删除待上传照片时清理文件并取消队列 |
| `app/src/store/__tests__/entryStore.test.ts` | 照片待上传删除与列表加载测试 |
| `app/app/_layout.tsx` | 在应用启动、前台恢复、网络恢复时触发照片补传 |
| `docs/superpowers/specs/2026-03-22-photo-cloud-background-upload-design.md` | 实现后更新状态、偏差说明与最终验证 |
| `docs/superpowers/plans/2026-03-22-photo-cloud-background-upload.md` | 执行中勾选任务、补齐验证结果 |

## 执行约束

- 不重构 `voiceUploadQueue`，不把语音旧链路的技术债顺手带进本轮。
- 不把“远端图片下载到本地 `cache` 展示”并入本轮。
- 不动 `.gitignore`、`app/metro.config.js`、`.debug/` 和 `docs/superpowers/plans/2026-03-22-cloud-sync-offline-first.md`。
- 媒体上传失败时，照片卡片必须保留，本地 `cache` 原图与缩略图必须保留，状态回退到 `pending_upload`。
- 媒体上传成功后，只把 entry 推进到 `pending`；entry 元数据仍由 `cloudSyncService` 通过 `/api/sync` 处理。

## Chunk 1: 本地创建链路与照片队列

### Task 1: 照片创建改为本地 cache + `pending_upload`

**Files:**
- Modify: `app/app/(tabs)/index.tsx`
- Modify: `app/app/(tabs)/__tests__/index.photo.test.ts`
- Modify: `app/src/services/photoService.ts`
- Test: `app/src/services/__tests__/photoService.test.ts`

- [ ] **Step 1: 先写失败测试，锁定照片创建的本地优先语义**

在 `app/app/(tabs)/__tests__/index.photo.test.ts` 补测试，覆盖：

```ts
it('cloud mode photo entry is created as pending_upload and enqueued once', async () => {
  const deps = makeDeps({
    addLocalEntry: jest.fn().mockResolvedValue({ id: 'photo-local-1' }),
    enqueueUpload: jest.fn(),
  });

  await handlePhotoSelectForTest([PHOTO_RESULT], deps);

  expect(deps.addLocalEntry).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'photo',
      syncStatus: 'pending_upload',
    })
  );
  expect(deps.enqueueUpload).toHaveBeenCalledWith('photo-local-1');
});
```

同时在 `app/src/services/__tests__/photoService.test.ts` 增加 `savePhotoToCache` 测试，断言原图和缩略图分别写到照片 `cache` 目录，而不是长期存储目录。

- [ ] **Step 2: 运行测试确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath 'app/(tabs)/__tests__/index.photo.test.ts' src/services/__tests__/photoService.test.ts`
Expected: FAIL，原因是首页照片链路仍调用 `addEntry` 且状态是 `pending`，`savePhotoToCache` 契约也还没有被测试锁定。

- [ ] **Step 3: 最小修改首页照片创建链路**

在 `app/app/(tabs)/index.tsx`：

- 把 `PhotoSelectDeps.addEntry` 改成 `addLocalEntry`
- 把 `savePhotoToStorage` 的依赖命名改为不区分存储介质的本地保存语义，例如：

```ts
type PhotoSelectDeps = {
  savePhotoLocally: (...args) => Promise<SavedPhotoResult>;
  addLocalEntry: (entry: Omit<Entry, 'id' | 'timestamp'>) => Promise<Entry>;
  enqueueUpload?: (entryId: string) => void;
  deleteLocalFile?: (uri: string) => Promise<void>;
};
```

- 创建 photo entry 时设置：

```ts
await deps.addLocalEntry({
  type: 'photo',
  content: '',
  syncStatus: 'pending_upload',
  media: mediaList,
});
```

- 本地创建成功后调用 `enqueueUpload(entry.id)`；如果入队失败，仅记录日志，不回滚已创建的本地卡片。
- `addLocalEntry` 失败时继续删除本次新建的原图和缩略图。

在 `app/src/services/photoService.ts`：

- 保持 `savePhotoToCache` 走 `MEDIA_PATHS.photoDisplay` / `MEDIA_PATHS.photoThumbnail`
- 补齐必要注释，明确这是云端照片创建的本地 `cache` 落盘入口

- [ ] **Step 4: 重新运行测试确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath 'app/(tabs)/__tests__/index.photo.test.ts' src/services/__tests__/photoService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/app/'(tabs)'/index.tsx app/app/'(tabs)'/__tests__/index.photo.test.ts app/src/services/photoService.ts app/src/services/__tests__/photoService.test.ts
git commit -m "feat: cache photo entries before background upload"
```

### Task 2: 新增独立 `photoUploadQueue`

**Files:**
- Create: `app/src/services/photoUploadQueue.ts`
- Create: `app/src/services/__tests__/photoUploadQueue.test.ts`

- [ ] **Step 1: 先写失败测试，锁定媒体上传与状态流转**

创建 `app/src/services/__tests__/photoUploadQueue.test.ts`，至少覆盖：

```ts
it('uploads pending photo media, writes remoteUri, then marks entry pending', async () => {});
it('returns photo entry to pending_upload when any media upload fails', async () => {});
it('does not process canceled photo entries', async () => {});
```

关键断言：

- 处理开始前把 entry 设为 `uploading`
- 上传成功后保留本地 `uri` / `thumbnail`，只补 `remoteUri`
- 所有媒体都成功后把 entry 设为 `pending`
- 成功后触发一次 `cloudSyncService.syncNow()`
- 失败时回退到 `pending_upload`

- [ ] **Step 2: 运行测试确认失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/services/__tests__/photoUploadQueue.test.ts`
Expected: FAIL，原因是 `photoUploadQueue` 尚不存在。

- [ ] **Step 3: 写最小实现**

在 `app/src/services/photoUploadQueue.ts` 新建队列：

```ts
export interface PhotoUploadQueueDeps {
  getPendingEntries: () => Promise<Entry[]>;
  getEntryById: (id: string) => Promise<Entry | null>;
  markUploading: (id: string) => Promise<void>;
  markPendingUpload: (id: string) => Promise<void>;
  markPendingSync: (id: string, media: MediaInfo[]) => Promise<void>;
  uploadMedia: (localUri: string) => Promise<{ id: string; url: string }>;
  triggerSync: () => Promise<void>;
}
```

最小行为：

- 串行处理，避免同一照片重复上传
- 只处理 `type === 'photo'`
- 逐张上传 `media[].uri`
- 构造带 `remoteUri` 的新 `media` 数组
- 成功后调用 `markPendingSync(id, mediaWithRemoteUri)`，再触发 `triggerSync()`
- `triggerSync()` 抛错时只记录日志，让 entry 保持 `pending`
- 任意媒体上传失败时调用 `markPendingUpload(id)`

同时导出默认队列入口：

```ts
enqueuePhotoUpload(entryId: string)
flushPendingPhotoUploads()
cancelPhotoUpload(entryId: string)
waitForPhotoUploadQueueIdle()
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/services/__tests__/photoUploadQueue.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/services/photoUploadQueue.ts app/src/services/__tests__/photoUploadQueue.test.ts
git commit -m "feat: add photo background upload queue"
```

## Chunk 2: SQLite / Store 集成

### Task 3: 补齐待上传照片的查询、列表加载和删除清理

**Files:**
- Modify: `app/src/database/operations.ts`
- Modify: `app/src/store/entryStore.ts`
- Test: `app/src/database/__tests__/operations.test.ts`
- Test: `app/src/store/__tests__/entryStore.test.ts`

- [ ] **Step 1: 先写失败测试，锁定 store 与 DB 的照片语义**

在 `app/src/database/__tests__/operations.test.ts` 增加测试：

```ts
it('returns only photo entries for pending_upload photo query', async () => {
  const entries = await DB.getPhotoEntriesBySyncStatus(['pending_upload', 'uploading']);
  expect(entries.every((entry) => entry.type === 'photo')).toBe(true);
});
```

在 `app/src/store/__tests__/entryStore.test.ts` 增加测试：

```ts
it('merges pending photo entries into the first page load', async () => {});
it('deletes local photo cache files and cancels upload when deleting pending_upload photo entry', async () => {});
```

删除测试需要断言：

- 调用了 `cancelPhotoUpload(id)`
- 删除了 `media[].uri` 和 `media[].thumbnail`
- 没有触发软删除同步路径

- [ ] **Step 2: 运行测试确认失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/database/__tests__/operations.test.ts src/store/__tests__/entryStore.test.ts`
Expected: FAIL，原因是目前只有语音待上传查询与删除逻辑，照片不会被队列扫描或在删除时清理文件。

- [ ] **Step 3: 最小修改 SQLite 与 store**

在 `app/src/database/operations.ts` 新增：

```ts
export const getPhotoEntriesBySyncStatus = async (
  statuses: Array<Entry['syncStatus']>
): Promise<Entry[]> => {
  ...
};
```

在 `app/src/store/entryStore.ts`：

- 首屏加载时额外合并 `pendingPhotoEntries`
- 删除逻辑扩展到：

```ts
existingEntry?.type === 'photo' &&
(existingEntry.syncStatus === 'pending_upload' || existingEntry.syncStatus === 'uploading')
```

- 删除本地文件时同时清理：
  - `media[].uri`
  - `media[].thumbnail`
- 调用 `cancelPhotoUpload(id)`

如果同一文件路径重复出现，先去重再删，避免重复 I/O。

- [ ] **Step 4: 重新运行测试确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/database/__tests__/operations.test.ts src/store/__tests__/entryStore.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/database/operations.ts app/src/database/__tests__/operations.test.ts app/src/store/entryStore.ts app/src/store/__tests__/entryStore.test.ts
git commit -m "feat: support pending photo uploads in store"
```

## Chunk 3: 生命周期触发与收口

### Task 4: 在根布局接入照片补传触发

**Files:**
- Modify: `app/app/_layout.tsx`
- Create: `app/app/__tests__/_layout.photo-upload.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定触发入口**

新建 `app/app/__tests__/_layout.photo-upload.test.tsx`，mock：

- `flushPendingPhotoUploads`
- `flushPendingVoiceUploads`
- `expo-network`
- `AppState`

至少覆盖：

```tsx
it('flushes pending photo uploads on app bootstrap', async () => {});
it('flushes pending photo uploads when app becomes active', async () => {});
it('flushes pending photo uploads when network becomes reachable again', async () => {});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath app/__tests__/_layout.photo-upload.test.tsx`
Expected: FAIL，原因是 `_layout.tsx` 目前只触发语音补传。

- [ ] **Step 3: 最小接入照片补传**

在 `app/app/_layout.tsx`：

- 引入 `flushPendingPhotoUploads`
- 在以下三个位置并列调用照片补传：
  - 应用初始化完成后
  - App 从后台回到前台时
  - 网络从不可达变为可达时

保持调用顺序简单直接，例如：

```ts
await flushPendingPhotoUploads().catch((error) => {
  logger.warn('⚠️ 启动时补传待上传照片失败:', error);
});
```

不要把照片补传揉进 `cloudSyncService`，也不要在这里新增轮询。

- [ ] **Step 4: 重新运行测试确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath app/__tests__/_layout.photo-upload.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/app/_layout.tsx app/app/__tests__/_layout.photo-upload.test.tsx
git commit -m "feat: trigger pending photo uploads on app lifecycle"
```

### Task 5: 验证、文档收口与 scoped commit

**Files:**
- Modify: `docs/superpowers/specs/2026-03-22-photo-cloud-background-upload-design.md`
- Modify: `docs/superpowers/plans/2026-03-22-photo-cloud-background-upload.md`

- [ ] **Step 1: 运行目标测试**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath \
  'app/(tabs)/__tests__/index.photo.test.ts' \
  app/__tests__/_layout.photo-upload.test.tsx \
  src/services/__tests__/photoService.test.ts \
  src/services/__tests__/photoUploadQueue.test.ts \
  src/database/__tests__/operations.test.ts \
  src/store/__tests__/entryStore.test.ts
```

Expected: PASS

- [ ] **Step 2: 运行类型检查与 scoped diff 检查**

Run:

```bash
cd app && npx tsc --noEmit
git diff --check -- \
  app/app/'(tabs)'/index.tsx \
  app/app/'(tabs)'/__tests__/index.photo.test.ts \
  app/app/_layout.tsx \
  app/app/__tests__/_layout.photo-upload.test.tsx \
  app/src/services/photoService.ts \
  app/src/services/__tests__/photoService.test.ts \
  app/src/services/photoUploadQueue.ts \
  app/src/services/__tests__/photoUploadQueue.test.ts \
  app/src/database/operations.ts \
  app/src/database/__tests__/operations.test.ts \
  app/src/store/entryStore.ts \
  app/src/store/__tests__/entryStore.test.ts \
  docs/superpowers/specs/2026-03-22-photo-cloud-background-upload-design.md \
  docs/superpowers/plans/2026-03-22-photo-cloud-background-upload.md
```

Expected:

- `tsc` PASS
- `git diff --check` 无输出

- [ ] **Step 3: 更新文档状态**

在 spec 中补齐：

- `当前状态：已实现`
- `实现完成日期：<实际日期>`
- 最终验证命令与结果
- 如果实现和设计有偏差，补 `实际执行说明`

在 plan 中：

- 把执行状态更新为 `已完成`
- 勾选已完成步骤
- 补齐最终验证结果

- [ ] **Step 4: Commit**

```bash
git add \
  app/app/'(tabs)'/index.tsx \
  app/app/'(tabs)'/__tests__/index.photo.test.ts \
  app/app/_layout.tsx \
  app/app/__tests__/_layout.photo-upload.test.tsx \
  app/src/services/photoService.ts \
  app/src/services/__tests__/photoService.test.ts \
  app/src/services/photoUploadQueue.ts \
  app/src/services/__tests__/photoUploadQueue.test.ts \
  app/src/database/operations.ts \
  app/src/database/__tests__/operations.test.ts \
  app/src/store/entryStore.ts \
  app/src/store/__tests__/entryStore.test.ts \
  docs/superpowers/specs/2026-03-22-photo-cloud-background-upload-design.md \
  docs/superpowers/plans/2026-03-22-photo-cloud-background-upload.md
git commit -m "feat: add cloud photo background upload flow"
```
