# Sync Status Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time sync status dialog that shows local and cloud record/media counts, media size totals, queue state, and recent sync errors.

**Architecture:** Add one authenticated backend overview endpoint for cloud totals, add one frontend overview aggregator for local + cloud stats, and update the existing sync status feedback builder to render the richer model. Keep the existing sync queue state in `cloudSyncService` and layer the overview fetch beside it instead of rewriting sync flow.

**Tech Stack:** Go, Gin, SQLite, React Native, TypeScript, Jest, Zustand, Expo FileSystem

---

## File Structure

- Create: `backend/internal/service/sync_overview_service.go`
  Purpose: calculate cloud-side record/media aggregate totals for one user.
- Create: `backend/internal/service/sync_overview_service_test.go`
  Purpose: verify empty, mixed, and size aggregation cases.
- Modify: `backend/internal/repository/entry_repo.go`
  Purpose: add user-scoped aggregate queries for entry totals by type.
- Modify: `backend/internal/repository/media_repo.go`
  Purpose: add user-scoped aggregate queries for media totals and bytes.
- Modify: `backend/internal/handlers/sync.go`
  Purpose: expose `GET /api/sync/overview`.
- Modify: `backend/cmd/server/main.go`
  Purpose: wire overview service/handler into the authenticated router.
- Modify: `app/src/database/operations.ts`
  Purpose: add local aggregate queries for counts by type.
- Modify: `app/src/utils/fileSystem.ts`
  Purpose: expose or reuse byte-formatting / file size helpers for media totals.
- Create: `app/src/services/cloudSyncOverviewService.ts`
  Purpose: fetch cloud overview, build local overview, merge with current queue state.
- Create: `app/src/services/__tests__/cloudSyncOverviewService.test.ts`
  Purpose: verify success, partial-failure, and refresh behavior.
- Modify: `app/src/services/cloudSyncService.ts`
  Purpose: keep queue state API aligned with overview consumers if needed.
- Modify: `app/src/services/showCloudSyncStatusAlert.ts`
  Purpose: request the richer overview and render local/cloud detail blocks.
- Modify: `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts`
  Purpose: lock dialog details, loading, refresh, and cloud-error fallback.
- Modify: `app/src/services/__tests__/cloudSyncService.test.ts`
  Purpose: keep queue status expectations aligned.
- Modify: `app/src/database/__tests__/operations.test.ts`
  Purpose: cover local aggregate queries.

### Task 1: Cloud Overview Endpoint

**Files:**
- Create: `backend/internal/service/sync_overview_service.go`
- Create: `backend/internal/service/sync_overview_service_test.go`
- Modify: `backend/internal/repository/entry_repo.go`
- Modify: `backend/internal/repository/media_repo.go`
- Modify: `backend/internal/handlers/sync.go`
- Modify: `backend/cmd/server/main.go`
- Test: `backend/internal/service/sync_overview_service_test.go`

- [ ] **Step 1: Write the failing service test**

```go
func TestSyncOverviewService_Overview(t *testing.T) {
    svc := NewSyncOverviewService(entryRepo, mediaRepo)
    overview, err := svc.Overview(userID)
    require.NoError(t, err)
    require.Equal(t, 6, overview.EntryCount)
    require.Equal(t, 2, overview.PhotoCount)
    require.Equal(t, 1, overview.VoiceCount)
    require.Equal(t, 3, overview.MediaCount)
    require.Equal(t, int64(4096), overview.MediaBytes)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/service -run TestSyncOverviewService_Overview`
Expected: FAIL because overview service/query methods do not exist yet.

- [ ] **Step 3: Implement repository aggregates and overview service**

```go
type SyncOverview struct {
    EntryCount int   `json:"entryCount"`
    PhotoCount int   `json:"photoCount"`
    VoiceCount int   `json:"voiceCount"`
    MediaCount int   `json:"mediaCount"`
    MediaBytes int64 `json:"mediaBytes"`
}
```

Add user-scoped aggregate queries:

- `EntryRepository.CountByType(userID string) (photoCount int, voiceCount int, err error)`
- `MediaRepository.Overview(userID string) (count int, bytes int64, err error)`

- [ ] **Step 4: Add authenticated handler and route**

```go
authorized.GET("/sync/overview", syncHandler.Overview)
```

Return payload:

```json
{
  "success": true,
  "data": {
    "entryCount": 6,
    "photoCount": 2,
    "voiceCount": 1,
    "mediaCount": 3,
    "mediaBytes": 4096
  }
}
```

- [ ] **Step 5: Run backend tests**

Run: `cd backend && go test ./...`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/internal/service/sync_overview_service.go backend/internal/service/sync_overview_service_test.go backend/internal/repository/entry_repo.go backend/internal/repository/media_repo.go backend/internal/handlers/sync.go backend/cmd/server/main.go
git commit -m "feat: add sync overview endpoint"
```

### Task 2: Local Overview Aggregation

**Files:**
- Modify: `app/src/database/operations.ts`
- Modify: `app/src/database/__tests__/operations.test.ts`
- Modify: `app/src/utils/fileSystem.ts`
- Test: `app/src/database/__tests__/operations.test.ts`

- [ ] **Step 1: Write the failing local aggregate test**

```ts
it('returns entry totals by type for sync overview', async () => {
  const summary = await getLocalSyncOverviewCounts();
  expect(summary).toEqual({
    entryCount: 6,
    photoCount: 2,
    voiceCount: 1,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && pnpm test --runInBand src/database/__tests__/operations.test.ts`
Expected: FAIL because the local overview query does not exist.

- [ ] **Step 3: Implement local aggregate query**

Add a focused query helper:

```ts
export interface LocalSyncOverviewCounts {
  entryCount: number;
  photoCount: number;
  voiceCount: number;
}
```

Use one SQL aggregate query over `entries`, excluding logically deleted rows if the schema tracks them.

- [ ] **Step 4: Reuse file helpers for byte totals**

Prefer existing `getFileInfo()` rather than introducing a new FS abstraction. The later overview service can dedupe `uri` and `thumbnail` values before summing bytes.

- [ ] **Step 5: Run targeted tests**

Run: `cd app && pnpm test --runInBand src/database/__tests__/operations.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/src/database/operations.ts app/src/database/__tests__/operations.test.ts app/src/utils/fileSystem.ts
git commit -m "feat: add local sync overview counts"
```

### Task 3: Frontend Overview Service

**Files:**
- Create: `app/src/services/cloudSyncOverviewService.ts`
- Create: `app/src/services/__tests__/cloudSyncOverviewService.test.ts`
- Modify: `app/src/services/cloudSyncService.ts`
- Test: `app/src/services/__tests__/cloudSyncOverviewService.test.ts`

- [ ] **Step 1: Write the failing overview service test**

```ts
it('merges cloud totals, local totals, and queue status into one overview', async () => {
  const overview = await createCloudSyncOverviewService().getOverview();
  expect(overview.local.entryCount).toBe(6);
  expect(overview.cloud?.mediaBytes).toBe(4096);
  expect(overview.pendingUploads).toBe(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && pnpm test --runInBand src/services/__tests__/cloudSyncOverviewService.test.ts`
Expected: FAIL because the overview service does not exist yet.

- [ ] **Step 3: Implement `cloudSyncOverviewService`**

Shape:

```ts
export interface SyncOverviewSnapshot {
  lastSyncAt: number | null;
  lastSyncError: string | null;
  pendingEntries: number;
  pendingUploads: number;
  uploadingEntries: number;
  failedEntries: number;
  conflictCopies: number;
  local: { entryCount: number; photoCount: number; voiceCount: number; mediaBytes: number };
  cloud: { entryCount: number; photoCount: number; voiceCount: number; mediaCount: number; mediaBytes: number } | null;
  cloudError: string | null;
}
```

Implementation notes:

- Read queue state from `createCloudSyncService().getStatus()`
- Read local counts from `DB.getLocalSyncOverviewCounts()`
- Read local bytes by iterating current local entries and summing unique local file paths
- Fetch cloud counts from `GET /sync/overview`
- If cloud fetch fails, keep `cloud: null` and set `cloudError`

- [ ] **Step 4: Keep `cloudSyncService.getStatus()` narrow**

Do not move local/cloud total logic into `cloudSyncService`. Keep it focused on queue state so the new overview service owns the composition.

- [ ] **Step 5: Run targeted tests**

Run: `cd app && pnpm test --runInBand src/services/__tests__/cloudSyncOverviewService.test.ts src/services/__tests__/cloudSyncService.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/src/services/cloudSyncOverviewService.ts app/src/services/__tests__/cloudSyncOverviewService.test.ts app/src/services/cloudSyncService.ts app/src/services/__tests__/cloudSyncService.test.ts
git commit -m "feat: add sync overview aggregation service"
```

### Task 4: Sync Dialog Rendering And Refresh

**Files:**
- Modify: `app/src/services/showCloudSyncStatusAlert.ts`
- Modify: `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts`
- Test: `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts`

- [ ] **Step 1: Write the failing dialog test**

```ts
it('shows local and cloud overview sections in sync status feedback', async () => {
  await showCloudSyncStatusAlert();
  expect(showErrorFeedback).toHaveBeenCalledWith(
    expect.objectContaining({
      details: expect.arrayContaining([
        expect.objectContaining({ label: '本地记录总数', value: '6' }),
        expect.objectContaining({ label: '云端记录总数', value: '8' }),
        expect.objectContaining({ label: '云端媒体总大小', value: '4.0 KB' }),
      ]),
    }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && pnpm test --runInBand src/services/__tests__/showCloudSyncStatusAlert.test.ts`
Expected: FAIL because the dialog still renders only queue fields.

- [ ] **Step 3: Implement richer feedback builder**

Render details in this order:

1. Sync queue state
2. Local totals
3. Cloud totals
4. Cloud fetch error if present

Formatting rules:

- Byte totals should be human readable, for example `4.0 KB`, `12.3 MB`
- If cloud overview failed, render `云端数据：获取失败`
- Keep the existing `立即同步` action

- [ ] **Step 4: Refresh overview after manual sync**

After `syncNow()` succeeds:

- fetch a fresh overview snapshot
- show updated counts in the follow-up dialog

If `syncNow()` fails:

- keep the existing failed feedback path

- [ ] **Step 5: Run UI-facing tests**

Run: `cd app && pnpm test --runInBand src/services/__tests__/showCloudSyncStatusAlert.test.ts src/store/__tests__/cloudSyncIndicatorStore.test.ts`
Expected: PASS

- [ ] **Step 6: Run final verification**

Run: `cd backend && go test ./...`
Expected: PASS

Run: `cd app && pnpm run typecheck`
Expected: PASS

Run: `cd app && pnpm test --runInBand`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/src/services/showCloudSyncStatusAlert.ts app/src/services/__tests__/showCloudSyncStatusAlert.test.ts
git commit -m "feat: show sync overview in status dialog"
```
