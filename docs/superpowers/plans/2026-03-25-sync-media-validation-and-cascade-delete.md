# Sync Media Validation And Cascade Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make cloud sync report metadata and media results separately, mark media download problems as partial success, and ensure deleting a synced entry also removes remote database rows and uploaded files.

**Architecture:** Keep the existing local-first entry sync flow intact and layer one new frontend media-validation service on top of the current cloud inbound paths. Persist the last media-validation summary in `syncStore`, expose it through the existing overview/status APIs, and add one shared backend cascade-delete helper so REST delete and `/api/sync` delete use the same entry/media/file cleanup path.

**Tech Stack:** React Native, TypeScript, Zustand, Expo FileSystem, Jest, Go, Gin, SQLite

---

## File Structure

- Create: `app/src/services/cloudMediaSyncService.ts`
  Purpose: validate downloaded cloud media, verify local file existence, and return one summary for the latest sync cycle.
- Create: `app/src/services/__tests__/cloudMediaSyncService.test.ts`
  Purpose: lock the success/missing/failed summary rules with focused Jest coverage.
- Modify: `app/src/store/syncStore.ts`
  Purpose: persist the latest media-validation summary beside existing sync cursor/error fields.
- Modify: `app/src/store/__tests__/syncStore.test.ts`
  Purpose: verify the new summary state loads, updates, and resets correctly.
- Modify: `app/src/services/cloudSyncService.ts`
  Purpose: run media validation after applying inbound server changes and surface the summary via sync status.
- Modify: `app/src/services/__tests__/cloudSyncService.test.ts`
  Purpose: verify media validation runs for inbound cloud changes and affects status output.
- Modify: `app/src/services/syncBootstrapService.ts`
  Purpose: run media validation after cloud restore finishes and before initial sync state becomes ready.
- Modify: `app/src/services/__tests__/syncBootstrapService.test.ts`
  Purpose: cover restore success with media validation and restore failure when validation fails.
- Modify: `app/src/services/cloudSyncOverviewService.ts`
  Purpose: include media-validation summary in the overview snapshot returned to the sync dialog.
- Modify: `app/src/services/__tests__/cloudSyncOverviewService.test.ts`
  Purpose: verify overview aggregation returns metadata + media sync details.
- Modify: `app/src/services/showCloudSyncStatusAlert.ts`
  Purpose: render `成功 / 部分成功 / 失败` using metadata + media summary and show media counters/errors.
- Modify: `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts`
  Purpose: lock the partial-success copy and media detail rows.
- Create: `backend/internal/service/entry_delete_service.go`
  Purpose: share cascade-delete logic for entry row, linked media rows, and uploaded files.
- Create: `backend/internal/service/entry_delete_service_test.go`
  Purpose: verify cascade delete removes media rows/files and fails loudly on file deletion errors.
- Modify: `backend/internal/repository/media_repo.go`
  Purpose: add any missing transaction-safe media delete helpers required by the shared delete service.
- Modify: `backend/internal/service/entry_service.go`
  Purpose: route direct REST deletes through the shared cascade-delete helper.
- Modify: `backend/internal/service/entry_service_test.go`
  Purpose: verify direct entry delete also deletes linked media state.
- Modify: `backend/internal/service/sync_v2_service.go`
  Purpose: route `/api/sync` delete operations through the same cascade-delete helper.
- Modify: `backend/internal/service/sync_v2_service_test.go`
  Purpose: verify sync delete cleans entry rows, media rows, and file paths consistently.

### Task 1: Persist Media Validation Summary In `syncStore`

**Files:**
- Modify: `app/src/store/syncStore.ts`
- Modify: `app/src/store/__tests__/syncStore.test.ts`
- Test: `app/src/store/__tests__/syncStore.test.ts`

- [ ] **Step 1: Write the failing store test**

```ts
it('loads and resets the last media validation summary', async () => {
  await useSyncStore.getState().setMediaValidationSummary({
    status: 'partial',
    total: 3,
    downloaded: 2,
    missing: 1,
    failed: 0,
    lastError: 'missing file',
    lastValidatedAt: 1234,
  });

  await useSyncStore.getState().load();

  expect(useSyncStore.getState().lastMediaValidationSummary).toEqual({
    status: 'partial',
    total: 3,
    downloaded: 2,
    missing: 1,
    failed: 0,
    lastError: 'missing file',
    lastValidatedAt: 1234,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --runInBand src/store/__tests__/syncStore.test.ts`
Expected: FAIL because the media summary state and persistence helpers do not exist.

- [ ] **Step 3: Implement the minimal store additions**

Add scoped storage keys and state for:

```ts
type MediaSyncValidationSummary = {
  status: 'idle' | 'running' | 'success' | 'partial' | 'failed';
  total: number;
  downloaded: number;
  missing: number;
  failed: number;
  lastError: string | null;
  lastValidatedAt: number | null;
};
```

Expose only the minimal store methods needed by callers:

- `setMediaValidationSummary(summary)`
- `markMediaValidationRunning(total)`
- `reset()` should clear the persisted summary too

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --runInBand src/store/__tests__/syncStore.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/store/syncStore.ts app/src/store/__tests__/syncStore.test.ts
git commit -m "feat: persist media validation summary in sync store"
```

### Task 2: Build The Frontend Media Validation Service

**Files:**
- Create: `app/src/services/cloudMediaSyncService.ts`
- Create: `app/src/services/__tests__/cloudMediaSyncService.test.ts`
- Test: `app/src/services/__tests__/cloudMediaSyncService.test.ts`

- [ ] **Step 1: Write the failing service tests**

```ts
it('returns success when hydrated media files exist locally', async () => {
  const summary = await createCloudMediaSyncService().validateEntries([entry]);
  expect(summary).toMatchObject({
    status: 'success',
    total: 2,
    downloaded: 2,
    missing: 0,
    failed: 0,
  });
});

it('returns partial when hydrate falls back to remote urls or files are missing', async () => {
  const summary = await createCloudMediaSyncService().validateEntries([entry]);
  expect(summary).toMatchObject({
    status: 'partial',
    total: 2,
    downloaded: 1,
    missing: 1,
    failed: 0,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --runInBand src/services/__tests__/cloudMediaSyncService.test.ts`
Expected: FAIL because the service does not exist.

- [ ] **Step 3: Write the minimal implementation**

Service shape:

```ts
export function createCloudMediaSyncService() {
  return {
    validateEntries: async (entries: Entry[]): Promise<MediaSyncValidationSummary> => { /* ... */ },
  };
}
```

Implementation rules:

- Only inspect media that came from cloud and has `remoteUri` or `remoteThumbnail`
- Reuse `MediaCacheService.hydrateEntries(entries)`
- After hydrate, verify any local `file://` or absolute path target with `FileSystem.getInfoAsync`
- Count a remote-url fallback with no local file as `missing`
- Count thrown hydrate/download errors as `failed`

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --runInBand src/services/__tests__/cloudMediaSyncService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/services/cloudMediaSyncService.ts app/src/services/__tests__/cloudMediaSyncService.test.ts
git commit -m "feat: add cloud media validation service"
```

### Task 3: Run Media Validation During Cloud Sync

**Files:**
- Modify: `app/src/services/cloudSyncService.ts`
- Modify: `app/src/services/__tests__/cloudSyncService.test.ts`
- Test: `app/src/services/__tests__/cloudSyncService.test.ts`

- [ ] **Step 1: Write the failing sync service test**

```ts
it('stores a partial media summary when inbound server media fails validation', async () => {
  mockPost.mockResolvedValueOnce({
    newCursor: 10,
    results: [],
    serverChanges: [photoServerChange],
    conflicts: [],
  });

  mockValidateEntries.mockResolvedValueOnce({
    status: 'partial',
    total: 1,
    downloaded: 0,
    missing: 1,
    failed: 0,
    lastError: 'missing file',
    lastValidatedAt: 1234,
  });

  await createCloudSyncService().syncNow();

  expect(useSyncStore.getState().lastMediaValidationSummary?.status).toBe('partial');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --runInBand src/services/__tests__/cloudSyncService.test.ts`
Expected: FAIL because `cloudSyncService` does not call the validation service or persist its result.

- [ ] **Step 3: Implement the minimal sync hook-up**

Wire `cloudSyncService.performSyncNow()` so it:

1. Applies `serverChanges`
2. Extracts create/update entries that contain remote media
3. Calls `markMediaValidationRunning(total)`
4. Calls `createCloudMediaSyncService().validateEntries(changedEntries)`
5. Persists the returned summary before `markSyncSuccess()`

Do not validate locally-created pending uploads here. This hook is only for cloud-to-local media.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --runInBand src/services/__tests__/cloudSyncService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/services/cloudSyncService.ts app/src/services/__tests__/cloudSyncService.test.ts
git commit -m "feat: validate inbound cloud media during sync"
```

### Task 4: Run Media Validation During Cloud Restore And Surface It In The Sync Dialog

**Files:**
- Modify: `app/src/services/syncBootstrapService.ts`
- Modify: `app/src/services/__tests__/syncBootstrapService.test.ts`
- Modify: `app/src/services/cloudSyncOverviewService.ts`
- Modify: `app/src/services/__tests__/cloudSyncOverviewService.test.ts`
- Modify: `app/src/services/showCloudSyncStatusAlert.ts`
- Modify: `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts`
- Test: `app/src/services/__tests__/syncBootstrapService.test.ts`
- Test: `app/src/services/__tests__/cloudSyncOverviewService.test.ts`
- Test: `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts`

- [ ] **Step 1: Write the failing restore/overview/dialog tests**

```ts
it('validates restored cloud media before setting initial sync state ready', async () => {
  await createSyncBootstrapService().runInitialFlow('cloud');
  expect(mockValidateEntries).toHaveBeenCalledWith(expect.any(Array));
});

it('includes media validation details in the sync overview snapshot', async () => {
  const snapshot = await createCloudSyncOverviewService().getSnapshot();
  expect(snapshot.mediaValidation?.status).toBe('partial');
  expect(snapshot.mediaValidation?.missing).toBe(1);
});

it('renders 部分成功 when metadata succeeded but media validation is partial', async () => {
  const feedback = buildCloudSyncStatusFeedback(snapshot, jest.fn());
  expect(feedback.title).toContain('部分');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npm test -- --runInBand src/services/__tests__/syncBootstrapService.test.ts src/services/__tests__/cloudSyncOverviewService.test.ts src/services/__tests__/showCloudSyncStatusAlert.test.ts`
Expected: FAIL because restore does not validate media and the overview/alert payload does not include media summary fields.

- [ ] **Step 3: Implement the minimal restore/overview/dialog changes**

Implementation notes:

- `syncBootstrapService.runInitialFlow('cloud')` should validate restored entries after `DB.restoreEntries(...)`
- `cloudSyncOverviewService.getSnapshot()` should merge `lastMediaValidationSummary`
- `showCloudSyncStatusAlert.ts` should render:
  - `媒体同步状态`
  - `需校验媒体数`
  - `已落地媒体数`
  - `缺失媒体数`
  - `下载失败媒体数`
  - `最近媒体错误`
- Derive overall status text with:
  - metadata failure => `云同步失败`
  - metadata success + media partial/failed => `云同步部分完成`
  - metadata success + media success => `云同步完成`

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npm test -- --runInBand src/services/__tests__/syncBootstrapService.test.ts src/services/__tests__/cloudSyncOverviewService.test.ts src/services/__tests__/showCloudSyncStatusAlert.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/services/syncBootstrapService.ts app/src/services/__tests__/syncBootstrapService.test.ts app/src/services/cloudSyncOverviewService.ts app/src/services/__tests__/cloudSyncOverviewService.test.ts app/src/services/showCloudSyncStatusAlert.ts app/src/services/__tests__/showCloudSyncStatusAlert.test.ts
git commit -m "feat: surface media validation in cloud sync status"
```

### Task 5: Add Shared Backend Cascade Delete For Direct Entry Deletes

**Files:**
- Create: `backend/internal/service/entry_delete_service.go`
- Create: `backend/internal/service/entry_delete_service_test.go`
- Modify: `backend/internal/repository/media_repo.go`
- Modify: `backend/internal/service/entry_service.go`
- Modify: `backend/internal/service/entry_service_test.go`
- Test: `backend/internal/service/entry_delete_service_test.go`
- Test: `backend/internal/service/entry_service_test.go`

- [ ] **Step 1: Write the failing cascade-delete tests**

```go
func TestEntryDeleteService_DeleteEntryCascade_RemovesEntryMediaRowsAndFiles(t *testing.T) {
    err := newEntryDeleteService(entryRepo, mediaRepo).DeleteEntryCascade(user.ID, entry.ID)
    require.NoError(t, err)
    require.Nil(t, mustGetEntry(t, entryRepo, user.ID, entry.ID))
    require.Empty(t, mustGetMediaByEntryID(t, mediaRepo, entry.ID))
    _, statErr := os.Stat(mediaPath)
    require.ErrorIs(t, statErr, os.ErrNotExist)
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && go test ./internal/service -run 'TestEntryDeleteService_DeleteEntryCascade|TestEntryServiceCRUD'`
Expected: FAIL because no shared cascade delete helper exists yet.

- [ ] **Step 3: Implement the shared delete helper**

Minimal shape:

```go
type EntryDeleteService struct {
    entryRepo *repository.EntryRepository
    mediaRepo *repository.MediaRepository
}
```

Implementation rules:

- Load the entry and linked `media_files`
- Delete file paths before reporting success; treat `os.IsNotExist` as already clean
- Delete linked media rows
- Delete the entry row
- Return an error immediately if any file delete or row delete fails

Route `EntryService.Delete()` through this helper instead of calling `entryRepo.Delete()` directly.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && go test ./internal/service -run 'TestEntryDeleteService_DeleteEntryCascade|TestEntryServiceCRUD'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/service/entry_delete_service.go backend/internal/service/entry_delete_service_test.go backend/internal/repository/media_repo.go backend/internal/service/entry_service.go backend/internal/service/entry_service_test.go
git commit -m "feat: add backend cascade delete for entries"
```

### Task 6: Reuse Cascade Delete In `/api/sync` And Run Full Verification

**Files:**
- Modify: `backend/internal/service/sync_v2_service.go`
- Modify: `backend/internal/service/sync_v2_service_test.go`
- Test: `backend/internal/service/sync_v2_service_test.go`

- [ ] **Step 1: Write the failing sync delete test**

```go
func TestSyncV2Service_DeleteAlsoRemovesLinkedMedia(t *testing.T) {
    resp, err := svc.Sync(ctx, user.ID, req)
    require.NoError(t, err)
    require.Equal(t, "applied", resp.Results[0].Status)
    require.Empty(t, mustGetMediaByEntryID(t, mediaRepo, "entry-delete-1"))
    _, statErr := os.Stat(mediaPath)
    require.ErrorIs(t, statErr, os.ErrNotExist)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/service -run TestSyncV2Service_DeleteAlsoRemovesLinkedMedia`
Expected: FAIL because `SyncV2Service.applyDeleteTx()` still deletes only the entry row.

- [ ] **Step 3: Implement the minimal sync integration**

Update `SyncV2Service.applyDeleteTx()` to call the same cascade-delete helper used by direct deletes. Keep the existing delete result semantics:

- missing entry => `ignored`
- full cascade success => `applied`
- any cascade failure => return error and do not report success

- [ ] **Step 4: Run targeted backend tests**

Run: `cd backend && go test ./internal/service -run 'TestSyncV2Service_DeleteAlsoRemovesLinkedMedia|TestSyncV2Service_ResultSemantics'`
Expected: PASS

- [ ] **Step 5: Run full frontend and backend verification**

Run: `cd app && npm test -- --runInBand`
Expected: PASS

Run: `cd backend && go test ./...`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/internal/service/sync_v2_service.go backend/internal/service/sync_v2_service_test.go
git commit -m "feat: reuse cascade delete in sync service"
```
