# Photo Media Integrity And Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the photo pipeline log and verify integrity end-to-end, detect bad cloud media after sync, and let users confirm a repair that re-uploads the healthy local original and replaces the bad cloud file.

**Architecture:** Add one focused frontend integrity helper for hashing and file validation, thread its metadata through local photo creation, upload, sync restore, and repair flows, and persist an expanded validation summary in `syncStore`. On the backend, extend `media_files` with validation metadata, verify every uploaded file after disk write, return integrity fields in upload/list/export responses, and make sync-driven media replacement clean up orphaned remote files only after the new file is safely linked.

**Tech Stack:** React Native, TypeScript, Expo FileSystem, Expo Crypto, Jest, Zustand, Go, Gin, SQLite

---

## File Structure

- Modify: `app/package.json`
  Purpose: add `expo-crypto` so the client can compute SHA-256 fingerprints for persisted media and downloaded files.
- Modify: `app/package-lock.json`
  Purpose: lock the new frontend dependency.
- Modify: `app/src/types/entry.ts`
  Purpose: extend `MediaInfo.metadata` with integrity and repair fields shared across photo creation, upload, sync, and repair flows.
- Create: `app/src/services/photoIntegrityService.ts`
  Purpose: compute file fingerprints, read image dimensions, build integrity metadata, and expose common structured-log payload helpers.
- Create: `app/src/services/__tests__/photoIntegrityService.test.ts`
  Purpose: lock hashing, file validation, and repairability rules before wiring them into the rest of the app.
- Modify: `app/src/services/photoService.ts`
  Purpose: log `photo.capture.received`, `photo.persist.saved`, and reuse the new integrity helper while saving photos.
- Modify: `app/app/(tabs)/index.tsx`
  Purpose: stamp `localMediaId`, `sourceHash`, `persistedHash`, `integrityStatus`, and repair metadata into new photo entries in `handlePhotoSelectForTest`.
- Modify: `app/app/(tabs)/__tests__/index.photo.test.ts`
  Purpose: verify local photo creation writes the new integrity metadata and logs the expected structured payload.
- Modify: `app/src/services/__tests__/photoService.test.ts`
  Purpose: cover the new file snapshot and log calls introduced during photo persistence.
- Modify: `app/src/services/apiClient.ts`
  Purpose: let photo uploads send an integrity envelope beside the multipart file without breaking voice uploads.
- Modify: `app/src/services/__tests__/apiClient.test.ts`
  Purpose: verify multipart uploads include the new metadata fields only when supplied.
- Modify: `app/src/services/photoUploadQueue.ts`
  Purpose: send integrity metadata on every background photo upload and log upload start/finish payloads.
- Modify: `app/src/services/__tests__/photoUploadQueue.test.ts`
  Purpose: prove the queue forwards integrity metadata and preserves `remoteHash`/validation fields on success.
- Modify: `app/src/database/dataSource.ts`
  Purpose: make direct photo uploads from remote data source paths use the same integrity envelope and return server validation metadata.
- Modify: `app/src/services/syncBootstrapService.ts`
  Purpose: make local-to-cloud bootstrap uploads use the same photo integrity envelope and preserve repair metadata when entries are rewritten.
- Modify: `app/src/services/__tests__/syncBootstrapService.test.ts`
  Purpose: lock bootstrap upload payloads and repaired-media state transitions.
- Modify: `app/src/components/settings-page/useSettingsPageCloudMode.ts`
  Purpose: update the settings-triggered cloud restore/backup path to use the new upload signature and log fields.
- Modify: `app/src/store/syncStore.ts`
  Purpose: persist an expanded photo integrity summary including suspect and repairable counts.
- Modify: `app/src/store/__tests__/syncStore.test.ts`
  Purpose: verify the new summary shape loads, updates, and resets correctly.
- Create: `app/src/store/mediaRepairStore.ts`
  Purpose: keep the latest repairable photo issues available to the prompt service and sync status UI without tightly coupling those callers.
- Create: `app/src/store/__tests__/mediaRepairStore.test.ts`
  Purpose: verify repairable issues can be replaced, cleared, and queried by the prompt/UI services.
- Modify: `app/src/services/cloudMediaSyncService.ts`
  Purpose: verify downloaded cloud photo files by hash and dimensions, return both summary counters and repairable issues, and log every validation result.
- Modify: `app/src/services/__tests__/cloudMediaSyncService.test.ts`
  Purpose: cover healthy, missing, download mismatch, cloud-content-suspect, and repairable cases.
- Create: `app/src/services/photoRepairService.ts`
  Purpose: perform the user-confirmed repair: revalidate local source, re-upload photo, update local entry media, and trigger sync.
- Create: `app/src/services/__tests__/photoRepairService.test.ts`
  Purpose: lock repair success/failure and ensure repair only proceeds when a healthy local source still exists.
- Create: `app/src/services/showPhotoRepairPrompt.ts`
  Purpose: present one confirmation prompt for repairable issues and dispatch `photoRepairService` when the user confirms.
- Create: `app/src/services/__tests__/showPhotoRepairPrompt.test.ts`
  Purpose: verify prompt copy, confirm/cancel behavior, and duplicate-prompt guards.
- Modify: `app/src/services/cloudSyncService.ts`
  Purpose: run the expanded validation after inbound sync, persist the new summary, and trigger the repair prompt for repairable issues.
- Modify: `app/src/services/__tests__/cloudSyncService.test.ts`
  Purpose: verify sync persists suspect counts and prompts only when repairable issues exist.
- Modify: `app/src/services/showCloudSyncStatusAlert.ts`
  Purpose: show suspect/repairable counts and expose a “修复异常媒体” action when repairable issues exist.
- Modify: `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts`
  Purpose: lock the updated copy and action rows.
- Create: `backend/migrations/004_media_integrity.up.sql`
  Purpose: add integrity columns to `media_files`.
- Create: `backend/migrations/004_media_integrity.down.sql`
  Purpose: roll back the media integrity columns.
- Modify: `backend/internal/config/schema.go`
  Purpose: apply the new migration on startup and in test fixtures that rely on `EnsureSchema`.
- Modify: `backend/internal/models/entry.go`
  Purpose: extend media DTOs with validation fields returned to the client and accepted from multipart uploads.
- Create: `backend/internal/service/media_validation_service.go`
  Purpose: hash persisted uploads, sniff MIME, read image dimensions, compare against client-declared metadata, and emit a normalized validation result.
- Create: `backend/internal/service/media_validation_service_test.go`
  Purpose: lock success, malformed image, size mismatch, and hash mismatch rules.
- Modify: `backend/internal/repository/media_repo.go`
  Purpose: persist integrity columns, expose create/update helpers for validation metadata, and support cleanup of orphaned replaced media.
- Modify: `backend/internal/handlers/media.go`
  Purpose: read upload metadata from multipart fields, validate uploaded files after disk write, save integrity fields, and return `remoteHash` plus validation status.
- Modify: `backend/internal/handlers/media_test.go`
  Purpose: verify upload handler stores metadata, surfaces validation failures, and logs failed stages.
- Modify: `backend/internal/service/entry_service.go`
  Purpose: include remote integrity metadata in `EntryResponse.Media` so `/entries` and `/entries/export` can hydrate repaired media correctly.
- Modify: `backend/internal/service/entry_service_test.go`
  Purpose: verify exported/listed media items include `remoteHash`, validation status, and fallback metadata.
- Modify: `backend/internal/service/sync_v2_service.go`
  Purpose: clean up replaced remote media during sync-driven update flows once the new media IDs are linked successfully.
- Modify: `backend/internal/service/sync_v2_service_test.go`
  Purpose: verify sync-driven media replacement deletes orphaned old uploads only after successful relink.
- Modify: `backend/internal/repository/entry_repo_test.go`
  Purpose: apply the new migration in repository test setup.
- Modify: `backend/internal/service/sync_overview_service_test.go`
  Purpose: apply the new migration in overview test setup.

### Task 1: Add Frontend Photo Integrity Primitives

**Files:**
- Modify: `app/package.json`
- Modify: `app/package-lock.json`
- Modify: `app/src/types/entry.ts`
- Create: `app/src/services/photoIntegrityService.ts`
- Create: `app/src/services/__tests__/photoIntegrityService.test.ts`
- Test: `app/src/services/__tests__/photoIntegrityService.test.ts`

- [ ] **Step 1: Write the failing integrity helper tests**

```ts
it('builds a healthy persisted photo fingerprint', async () => {
  mockReadAsStringAsync.mockResolvedValueOnce('base64-photo');
  mockGetInfoAsync.mockResolvedValueOnce({ exists: true, size: 2048 });
  mockManipulateAsync.mockResolvedValueOnce({ uri: 'file:///persisted.jpg', width: 1200, height: 900 });
  mockDigestStringAsync.mockResolvedValueOnce('sha256-persisted');

  const result = await fingerprintPhotoFile('file:///persisted.jpg');

  expect(result).toEqual(expect.objectContaining({
    sha256: 'sha256-persisted',
    size: 2048,
    width: 1200,
    height: 900,
  }));
});

it('marks a cloud mismatch as repairable only when a healthy local source exists', () => {
  expect(buildIntegrityDecision({
    persistedHash: 'local-good',
    remoteHash: 'remote-bad',
    localSourceExists: true,
  })).toEqual(expect.objectContaining({
    integrityStatus: 'cloud_content_suspect',
    repairable: true,
    repairSource: 'local-original',
  }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --runInBand src/services/__tests__/photoIntegrityService.test.ts`
Expected: FAIL because the helper and new metadata fields do not exist yet.

- [ ] **Step 3: Add the minimal dependency and helper implementation**

Install the hashing dependency first:

```bash
cd app
npx expo install expo-crypto
```

Create a focused helper API:

```ts
export type MediaIntegrityStatus =
  | 'healthy'
  | 'missing'
  | 'upload_mismatch'
  | 'download_mismatch'
  | 'cloud_content_suspect'
  | 'repair_prompt_required'
  | 'repair_pending'
  | 'repair_failed';

export type PhotoFileFingerprint = {
  uri: string;
  sha256: string;
  size: number;
  width: number;
  height: number;
  mimeType: 'image/jpeg';
};

export async function fingerprintPhotoFile(uri: string): Promise<PhotoFileFingerprint> { /* ... */ }
export function buildIntegrityDecision(input: IntegrityDecisionInput): IntegrityDecision { /* ... */ }
export function buildPhotoLogPayload(input: BuildPhotoLogPayloadInput): Record<string, unknown> { /* ... */ }
```

Also extend `MediaInfo.metadata` with:

```ts
localMediaId?: string;
sourceHash?: string;
persistedHash?: string;
remoteHash?: string;
downloadedHash?: string;
integrityStatus?: MediaIntegrityStatus;
integrityReason?: string;
lastVerifiedAt?: number;
repairable?: boolean;
repairSource?: 'local-original';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --runInBand src/services/__tests__/photoIntegrityService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/package.json app/package-lock.json app/src/types/entry.ts app/src/services/photoIntegrityService.ts app/src/services/__tests__/photoIntegrityService.test.ts
git commit -m "feat: add photo integrity helper and metadata types"
```

### Task 2: Stamp Integrity Metadata During Local Photo Creation

**Files:**
- Modify: `app/src/services/photoService.ts`
- Modify: `app/app/(tabs)/index.tsx`
- Modify: `app/app/(tabs)/__tests__/index.photo.test.ts`
- Modify: `app/src/services/__tests__/photoService.test.ts`
- Test: `app/app/(tabs)/__tests__/index.photo.test.ts`

- [ ] **Step 1: Write the failing photo creation tests**

```ts
it('stores source and persisted hashes on the new photo entry', async () => {
  mockFingerprintPhotoFile
    .mockResolvedValueOnce({ sha256: 'source-hash', size: 8000, width: 3024, height: 4032, uri: PHOTO_RESULT.uri, mimeType: 'image/jpeg' })
    .mockResolvedValueOnce({ sha256: 'persisted-hash', size: 2048, width: 1200, height: 900, uri: CACHE_URI, mimeType: 'image/jpeg' });

  await handlePhotoSelectForTest([PHOTO_RESULT], deps);

  expect(deps.addLocalEntry).toHaveBeenCalledWith(expect.objectContaining({
    media: [expect.objectContaining({
      metadata: expect.objectContaining({
        sourceHash: 'source-hash',
        persistedHash: 'persisted-hash',
        integrityStatus: 'healthy',
      }),
    })],
  }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --runInBand 'app/(tabs)/__tests__/index.photo.test.ts'`
Expected: FAIL because `handlePhotoSelectForTest` does not build integrity metadata yet.

- [ ] **Step 3: Add the minimal local-persist wiring**

Update `photoService.ts` and `index.tsx` to:

```ts
logger.log('photo.capture.received', buildPhotoLogPayload({
  entryId: fileId,
  localMediaId: fileId,
  sourceUri: result.uri,
  sourceHash: sourceFingerprint.sha256,
  size: sourceFingerprint.size,
  width: sourceFingerprint.width,
  height: sourceFingerprint.height,
}));

const mediaItem = {
  uri: savedPhoto.originalUri,
  thumbnail: savedPhoto.thumbnailUri,
  mimeType: 'image/jpeg',
  size: persistedFingerprint.size,
  metadata: {
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    width: savedPhoto.width,
    height: savedPhoto.height,
    aspectRatio: savedPhoto.aspectRatio,
    localMediaId: fileId,
    sourceHash: sourceFingerprint.sha256,
    persistedHash: persistedFingerprint.sha256,
    integrityStatus: 'healthy',
    integrityReason: null,
    repairable: false,
  },
};
```

Emit:

- `photo.capture.received`
- `photo.persist.saved`
- `photo.db.entry_saved`

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --runInBand 'app/(tabs)/__tests__/index.photo.test.ts'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/services/photoService.ts 'app/app/(tabs)/index.tsx' 'app/app/(tabs)/__tests__/index.photo.test.ts' app/src/services/__tests__/photoService.test.ts
git commit -m "feat: persist local photo integrity metadata and logs"
```

### Task 3: Send The Integrity Envelope On Every Photo Upload Path

**Files:**
- Modify: `app/src/services/apiClient.ts`
- Modify: `app/src/services/__tests__/apiClient.test.ts`
- Modify: `app/src/services/photoUploadQueue.ts`
- Modify: `app/src/services/__tests__/photoUploadQueue.test.ts`
- Modify: `app/src/database/dataSource.ts`
- Modify: `app/src/services/syncBootstrapService.ts`
- Modify: `app/src/services/__tests__/syncBootstrapService.test.ts`
- Modify: `app/src/components/settings-page/useSettingsPageCloudMode.ts`
- Test: `app/src/services/__tests__/photoUploadQueue.test.ts`

- [ ] **Step 1: Write the failing upload tests**

```ts
it('sends photo integrity metadata with multipart uploads', async () => {
  await client.uploadFile('/media/upload', 'file:///photo.jpg', 'file', {
    metadata: {
      traceId: 'trace-1',
      localMediaId: 'local-1',
      persistedHash: 'persisted-hash',
      size: 2048,
      width: 1200,
      height: 900,
    },
  });

  expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
    body: expect.any(FormData),
  }));
  expect(appendSpy).toHaveBeenCalledWith('traceId', 'trace-1');
  expect(appendSpy).toHaveBeenCalledWith('persistedHash', 'persisted-hash');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --runInBand src/services/__tests__/apiClient.test.ts src/services/__tests__/photoUploadQueue.test.ts`
Expected: FAIL because `uploadFile` does not accept metadata yet.

- [ ] **Step 3: Implement the minimal upload envelope**

Extend the upload API without breaking voice uploads:

```ts
uploadFile(
  path: string,
  fileUri: string,
  fieldName: string,
  options?: {
    metadata?: {
      traceId?: string;
      localMediaId?: string;
      persistedHash?: string;
      sourceHash?: string;
      size?: number;
      width?: number;
      height?: number;
    };
  }
)
```

Update all photo upload callers to pass the envelope derived from `media.metadata`, and log:

- `photo.upload.start`
- `photo.upload.finish`

When upload succeeds, merge back:

```ts
remoteUri: upload.url,
metadata: {
  ...item.metadata,
  remoteHash: upload.remoteHash,
  integrityStatus: upload.validationStatus === 'healthy' ? 'healthy' : 'upload_mismatch',
  integrityReason: upload.validationError ?? null,
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --runInBand src/services/__tests__/apiClient.test.ts src/services/__tests__/photoUploadQueue.test.ts src/services/__tests__/syncBootstrapService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/services/apiClient.ts app/src/services/__tests__/apiClient.test.ts app/src/services/photoUploadQueue.ts app/src/services/__tests__/photoUploadQueue.test.ts app/src/database/dataSource.ts app/src/services/syncBootstrapService.ts app/src/services/__tests__/syncBootstrapService.test.ts app/src/components/settings-page/useSettingsPageCloudMode.ts
git commit -m "feat: send photo integrity metadata with uploads"
```

### Task 4: Verify Uploaded Media On The Backend And Persist Integrity Fields

**Files:**
- Create: `backend/migrations/004_media_integrity.up.sql`
- Create: `backend/migrations/004_media_integrity.down.sql`
- Modify: `backend/internal/config/schema.go`
- Modify: `backend/internal/models/entry.go`
- Create: `backend/internal/service/media_validation_service.go`
- Create: `backend/internal/service/media_validation_service_test.go`
- Modify: `backend/internal/repository/media_repo.go`
- Modify: `backend/internal/handlers/media.go`
- Modify: `backend/internal/handlers/media_test.go`
- Modify: `backend/internal/repository/entry_repo_test.go`
- Modify: `backend/internal/service/entry_service_test.go`
- Modify: `backend/internal/service/sync_v2_service_test.go`
- Modify: `backend/internal/service/sync_overview_service_test.go`
- Test: `backend/internal/service/media_validation_service_test.go`

- [ ] **Step 1: Write the failing backend validation tests**

```go
func TestValidateUploadedPhoto_ReturnsSHAAndDimensions(t *testing.T) {
	result, err := ValidateUploadedPhoto(testJPEGPath, ClientUploadMetadata{
		PersistedHash: "sha256-good",
		DeclaredSize:  34301,
		DeclaredWidth: 1080,
		DeclaredHeight: 2400,
	})
	if err != nil {
		t.Fatalf("validate uploaded photo: %v", err)
	}
	if result.SHA256 != "sha256-good" {
		t.Fatalf("expected persisted hash match, got %q", result.SHA256)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/service -run TestValidateUploadedPhoto_ReturnsSHAAndDimensions -count=1`
Expected: FAIL because the validation service and migration columns do not exist.

- [ ] **Step 3: Implement the minimal backend verification pipeline**

Add migration columns:

```sql
ALTER TABLE media_files ADD COLUMN sha256 TEXT;
ALTER TABLE media_files ADD COLUMN width INTEGER;
ALTER TABLE media_files ADD COLUMN height INTEGER;
ALTER TABLE media_files ADD COLUMN validation_status TEXT NOT NULL DEFAULT 'healthy';
ALTER TABLE media_files ADD COLUMN validation_error TEXT;
ALTER TABLE media_files ADD COLUMN validated_at TEXT;
ALTER TABLE media_files ADD COLUMN client_local_media_id TEXT;
ALTER TABLE media_files ADD COLUMN client_persisted_hash TEXT;
ALTER TABLE media_files ADD COLUMN upload_trace_id TEXT;
```

Create a backend validator:

```go
type ClientUploadMetadata struct {
	TraceID         string
	LocalMediaID    string
	PersistedHash   string
	SourceHash      string
	DeclaredSize    int64
	DeclaredWidth   int
	DeclaredHeight  int
}

type MediaValidationResult struct {
	SHA256           string
	Size             int64
	Width            int
	Height           int
	ValidationStatus string
	ValidationError  *string
}
```

Handler flow:

1. Save multipart file to disk
2. Parse metadata fields from `FormData`
3. Call `ValidateUploadedPhoto(storagePath, metadata)`
4. Persist the file row with validation fields
5. Return:

```json
{
  "id": "media-1",
  "url": "/api/media/media-1",
  "remoteHash": "sha256-good",
  "validationStatus": "healthy",
  "validationError": null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/service ./internal/handlers ./internal/repository -count=1`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/migrations/004_media_integrity.up.sql backend/migrations/004_media_integrity.down.sql backend/internal/config/schema.go backend/internal/models/entry.go backend/internal/service/media_validation_service.go backend/internal/service/media_validation_service_test.go backend/internal/repository/media_repo.go backend/internal/handlers/media.go backend/internal/handlers/media_test.go backend/internal/repository/entry_repo_test.go backend/internal/service/entry_service_test.go backend/internal/service/sync_v2_service_test.go backend/internal/service/sync_overview_service_test.go
git commit -m "feat: verify uploaded media and persist integrity metadata"
```

### Task 5: Surface Integrity Metadata In Responses And Clean Up Replaced Remote Media

**Files:**
- Modify: `backend/internal/models/entry.go`
- Modify: `backend/internal/repository/media_repo.go`
- Modify: `backend/internal/service/entry_service.go`
- Modify: `backend/internal/service/entry_service_test.go`
- Modify: `backend/internal/service/sync_v2_service.go`
- Modify: `backend/internal/service/sync_v2_service_test.go`
- Test: `backend/internal/service/sync_v2_service_test.go`

- [ ] **Step 1: Write the failing response/replacement tests**

```go
func TestEntryServiceExport_IncludesRemoteHashAndValidationStatus(t *testing.T) {
	entries, err := svc.Export(user.ID)
	if err != nil {
		t.Fatalf("export: %v", err)
	}
	if entries[0].Media[0].RemoteHash != "sha256-good" {
		t.Fatalf("expected remote hash to be returned")
	}
}

func TestSyncV2ServiceUpdate_RemovesReplacedOrphanedMedia(t *testing.T) {
	// apply update with new remote media id
	// expect old media row/file removed only after new one is linked
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/service -run 'TestEntryServiceExport_IncludesRemoteHashAndValidationStatus|TestSyncV2ServiceUpdate_RemovesReplacedOrphanedMedia' -count=1`
Expected: FAIL because response DTOs do not expose integrity metadata and sync replacement does not clean orphaned media.

- [ ] **Step 3: Implement the minimal response + cleanup plumbing**

Extend `models.Media`:

```go
type Media struct {
	URI              string  `json:"uri"`
	MimeType         string  `json:"mimeType"`
	Size             int64   `json:"size"`
	RemoteHash       string  `json:"remoteHash,omitempty"`
	ValidationStatus string  `json:"validationStatus,omitempty"`
	ValidationError  *string `json:"validationError,omitempty"`
	Width            *int    `json:"width,omitempty"`
	Height           *int    `json:"height,omitempty"`
}
```

Update `entry_service.buildMediaList()` to include the new fields from `media_files`.

In `sync_v2_service.go`, after `UnlinkEntryMediaExceptTx` + `LinkToEntryTx`, collect unlinked old media IDs and delete only those that:

- are no longer linked to any entry
- are not the newly linked IDs
- have a storage path on disk

Keep the cleanup after relink succeeds so failed replacements never delete the old good file.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/service -count=1`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/models/entry.go backend/internal/repository/media_repo.go backend/internal/service/entry_service.go backend/internal/service/entry_service_test.go backend/internal/service/sync_v2_service.go backend/internal/service/sync_v2_service_test.go
git commit -m "feat: surface media integrity metadata and clean up replaced uploads"
```

### Task 6: Detect Suspect Cloud Media After Download And Persist Repairable Issues

**Files:**
- Modify: `app/src/store/syncStore.ts`
- Modify: `app/src/store/__tests__/syncStore.test.ts`
- Create: `app/src/store/mediaRepairStore.ts`
- Create: `app/src/store/__tests__/mediaRepairStore.test.ts`
- Modify: `app/src/services/cloudMediaSyncService.ts`
- Modify: `app/src/services/__tests__/cloudMediaSyncService.test.ts`
- Modify: `app/src/services/cloudSyncService.ts`
- Modify: `app/src/services/__tests__/cloudSyncService.test.ts`
- Modify: `app/src/services/syncBootstrapService.ts`
- Modify: `app/src/services/__tests__/syncBootstrapService.test.ts`
- Test: `app/src/services/__tests__/cloudMediaSyncService.test.ts`

- [ ] **Step 1: Write the failing validation tests**

```ts
it('marks a downloaded file as cloud_content_suspect when local persistedHash differs from remoteHash', async () => {
  const result = await createCloudMediaSyncService().validateEntries([entryWithHealthyLocalSource]);
  expect(result.summary).toMatchObject({
    status: 'partial',
    suspect: 1,
    repairable: 1,
  });
  expect(result.issues[0]).toMatchObject({
    entryId: 'entry-1',
    integrityStatus: 'repair_prompt_required',
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --runInBand src/services/__tests__/cloudMediaSyncService.test.ts`
Expected: FAIL because the validation service only checks file existence today.

- [ ] **Step 3: Implement the minimal expanded validation result**

Change the validation service to return:

```ts
type MediaRepairIssue = {
  entryId: string;
  mediaIndex: number;
  localMediaId?: string;
  localUri: string;
  remoteUri?: string;
  persistedHash?: string;
  remoteHash?: string;
  downloadedHash?: string;
  integrityStatus: 'repair_prompt_required' | 'repair_failed';
  integrityReason: string;
};

type MediaValidationRun = {
  summary: MediaSyncValidationSummary & {
    suspect: number;
    repairable: number;
  };
  issues: MediaRepairIssue[];
};
```

Validation rules:

1. Hydrate remote media into local cache
2. Fingerprint the downloaded file
3. Compare `downloadedHash` vs `remoteHash`
4. If a healthy local source still exists and `persistedHash` differs from remote/downloaded hash, mark:

```ts
integrityStatus: 'repair_prompt_required',
integrityReason: 'cloud hash mismatch while local original is still healthy',
repairable: true,
```

Persist the expanded summary in `syncStore`, and make both `cloudSyncService` and `syncBootstrapService` store `issues` for the next prompt step.
Persist the expanded summary in `syncStore`, and write `issues` into `mediaRepairStore` for the next prompt/UI step:

```ts
useMediaRepairStore.getState().replaceIssues(result.issues);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --runInBand src/services/__tests__/cloudMediaSyncService.test.ts src/services/__tests__/cloudSyncService.test.ts src/services/__tests__/syncBootstrapService.test.ts src/store/__tests__/syncStore.test.ts src/store/__tests__/mediaRepairStore.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/store/syncStore.ts app/src/store/__tests__/syncStore.test.ts app/src/store/mediaRepairStore.ts app/src/store/__tests__/mediaRepairStore.test.ts app/src/services/cloudMediaSyncService.ts app/src/services/__tests__/cloudMediaSyncService.test.ts app/src/services/cloudSyncService.ts app/src/services/__tests__/cloudSyncService.test.ts app/src/services/syncBootstrapService.ts app/src/services/__tests__/syncBootstrapService.test.ts
git commit -m "feat: detect suspect cloud photo media after download"
```

### Task 7: Add The User-Confirmed Repair Flow

**Files:**
- Create: `app/src/services/photoRepairService.ts`
- Create: `app/src/services/__tests__/photoRepairService.test.ts`
- Create: `app/src/services/showPhotoRepairPrompt.ts`
- Create: `app/src/services/__tests__/showPhotoRepairPrompt.test.ts`
- Modify: `app/src/services/photoUploadQueue.ts`
- Modify: `app/src/services/cloudSyncService.ts`
- Modify: `app/src/services/syncBootstrapService.ts`
- Test: `app/src/services/__tests__/photoRepairService.test.ts`

- [ ] **Step 1: Write the failing repair tests**

```ts
it('re-uploads the healthy local source and marks the entry pending sync when the user confirms repair', async () => {
  await createPhotoRepairService(deps).repair(issue);

  expect(mockUploadFile).toHaveBeenCalledWith('/media/upload', issue.localUri, 'file', expect.any(Object));
  expect(mockUpdateEntry).toHaveBeenCalledWith(issue.entryId, expect.objectContaining({
    syncStatus: 'pending',
    media: [expect.objectContaining({
      remoteUri: '/api/media/media-new',
      metadata: expect.objectContaining({
        remoteHash: 'sha256-new',
        integrityStatus: 'repair_pending',
      }),
    })],
  }));
  expect(mockSyncNow).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --runInBand src/services/__tests__/photoRepairService.test.ts src/services/__tests__/showPhotoRepairPrompt.test.ts`
Expected: FAIL because there is no repair service or prompt yet.

- [ ] **Step 3: Implement the minimal repair flow**

`photoRepairService.ts` should:

1. Re-fingerprint `issue.localUri`
2. Abort if the local file is gone
3. Upload the healthy local source with the integrity envelope
4. Update the local entry media item with the new `remoteUri` + `remoteHash`
5. Mark:

```ts
integrityStatus: 'repair_pending',
integrityReason: 'waiting for sync confirmation after user-approved repair',
repairable: false,
```

6. Trigger `createCloudSyncService().syncNow()`
7. Log `photo.repair.confirmed`, `photo.repair.completed`, or `photo.repair.failed`

`showPhotoRepairPrompt.ts` should use `Alert.alert` with:

- Title: `发现云端媒体异常`
- Buttons: `稍后处理`, `立即修复`

Guard against duplicate prompts for the same `entryId + localMediaId`.
Read issues from `useMediaRepairStore.getState().issues`, and clear them only after the user confirms repair or explicitly dismisses the prompt.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --runInBand src/services/__tests__/photoRepairService.test.ts src/services/__tests__/showPhotoRepairPrompt.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/services/photoRepairService.ts app/src/services/__tests__/photoRepairService.test.ts app/src/services/showPhotoRepairPrompt.ts app/src/services/__tests__/showPhotoRepairPrompt.test.ts app/src/services/cloudSyncService.ts app/src/services/syncBootstrapService.ts
git commit -m "feat: add user-confirmed cloud photo repair flow"
```

### Task 8: Expose Repair Status In The Sync UI And Run Full Regression Verification

**Files:**
- Modify: `app/src/services/showCloudSyncStatusAlert.ts`
- Modify: `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts`
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`
- Modify: `app/src/components/__tests__/PhotoGrid.test.tsx`
- Test: `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts`

- [ ] **Step 1: Write the failing sync status tests**

```ts
it('shows suspect and repairable counters and exposes a repair action', async () => {
  const feedback = buildCloudSyncStatusFeedback(snapshotWithRepairableMedia, onSyncNow);
  expect(feedback.details).toEqual(expect.arrayContaining([
    expect.objectContaining({ label: '异常媒体数', value: '1' }),
    expect.objectContaining({ label: '可修复媒体数', value: '1' }),
  ]));
  expect(feedback.actions).toEqual(expect.arrayContaining([
    expect.objectContaining({ label: '修复异常媒体' }),
  ]));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --runInBand src/services/__tests__/showCloudSyncStatusAlert.test.ts`
Expected: FAIL because the status UI does not show repair state yet.

- [ ] **Step 3: Implement the minimal status/UI updates**

Update the sync feedback rows to show:

- `异常媒体数`
- `可修复媒体数`
- `最近媒体错误`

Expose a `修复异常媒体` action that replays the prompt for the latest repairable issues captured by the sync services.
That action should pull from `useMediaRepairStore.getState().issues` so the status dialog and auto-prompt path share one source of truth.

Keep the existing render-source logs in `photoService` and rename them only if needed to the new structured event name:

```ts
logger.log('photo.render.source_selected', buildPhotoLogPayload({ ... }));
```

- [ ] **Step 4: Run the focused and full verification suites**

Run:

```bash
cd app && npm test -- --runInBand src/services/__tests__/showCloudSyncStatusAlert.test.ts src/services/__tests__/photoIntegrityService.test.ts src/services/__tests__/photoRepairService.test.ts src/services/__tests__/cloudMediaSyncService.test.ts src/services/__tests__/photoUploadQueue.test.ts 'app/(tabs)/__tests__/index.photo.test.ts' src/components/__tests__/PhotoGrid.test.tsx src/components/__tests__/EntryCard.test.tsx
cd backend && go test ./...
```

Expected:

- App tests: PASS
- Backend tests: PASS

Then run the manual repro in the Android emulator:

```bash
cd backend && go run ./cmd/server
cd app && npm run android
```

Manual expected result:

1. Clear local data
2. Switch to cloud mode
3. Restore from cloud
4. If a cloud photo is healthy, it renders from `file://...`
5. If a cloud photo is wrong but the local original still exists, the app logs `photo.sync.verify.finish`, prompts `发现云端媒体异常`, and after confirming repair the next sync rewrites `remoteHash` and removes the orphaned bad media

- [ ] **Step 5: Commit**

```bash
git add app/src/services/showCloudSyncStatusAlert.ts app/src/services/__tests__/showCloudSyncStatusAlert.test.ts app/src/components/__tests__/PhotoGrid.test.tsx app/src/components/__tests__/EntryCard.test.tsx
git commit -m "feat: surface cloud photo repair status in sync UI"
```
