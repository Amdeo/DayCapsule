# Photo Repair Local Media ID Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve `localMediaId` in repair upload metadata and repair logs when `MediaRepairIssue.localMediaId` is missing but the target media item already carries one.

**Architecture:** Keep the fix local to `photoRepairService.ts`. Derive one fallback `repairLocalMediaId` from the target media item after loading the repair target entry, then thread that value into upload metadata and repair logging only. The rest of the repair flow remains unchanged.

**Tech Stack:** TypeScript, Jest

---

### Task 1: Add Fallback Coverage Tests

**Files:**
- Modify: `app/src/services/__tests__/photoRepairService.test.ts`
- Test: `app/src/services/__tests__/photoRepairService.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these two focused tests to `app/src/services/__tests__/photoRepairService.test.ts`:

```ts
it('falls back to existing media localMediaId when the issue omits it', async () => {
  const fallbackIssue: MediaRepairIssue = {
    ...issue,
    localMediaId: undefined,
  };
  const mockGetEntryById = jest.fn().mockResolvedValue({
    id: 'entry-1',
    type: 'photo',
    content: '',
    timestamp: 1,
    updatedAt: 2,
    syncStatus: 'synced',
    media: [
      {
        uri: issue.localUri,
        remoteUri: issue.remoteUri,
        mimeType: 'image/jpeg',
        size: 2048,
        metadata: {
          localMediaId: 'local-1',
          persistedHash: 'local-good',
          remoteHash: 'remote-bad',
          integrityStatus: 'repair_prompt_required',
          repairable: true,
          createdAt: 1,
          modifiedAt: 1,
        },
      },
    ],
  });
  const mockUpdateEntry = jest.fn().mockResolvedValue(undefined);
  const mockUploadFile = jest.fn().mockResolvedValue({
    id: 'media-new',
    url: '/api/media/media-new',
    remoteHash: 'sha256-new',
    validationStatus: 'healthy',
    validationError: null,
  });
  const mockSyncNow = jest.fn().mockResolvedValue(undefined);
  const mockFingerprintPhotoFile = jest.fn().mockResolvedValue({
    uri: issue.localUri,
    sha256: 'local-good',
    size: 2048,
    width: 1200,
    height: 900,
    mimeType: 'image/jpeg',
  });

  await createPhotoRepairService({
    getEntryById: mockGetEntryById,
    updateEntry: mockUpdateEntry,
    uploadFile: mockUploadFile,
    syncNow: mockSyncNow,
    fingerprintPhotoFile: mockFingerprintPhotoFile,
    now: () => 1234,
  }).repair(fallbackIssue);

  expect(mockUploadFile).toHaveBeenCalledWith(
    '/media/upload',
    fallbackIssue.localUri,
    'file',
    {
      metadata: expect.objectContaining({
        traceId: 'local-1',
        localMediaId: 'local-1',
      }),
    },
  );
  expect(logger.log).toHaveBeenCalledWith(
    'photo.repair.confirmed',
    expect.objectContaining({ localMediaId: 'local-1' }),
  );
  expect(logger.log).toHaveBeenCalledWith(
    'photo.repair.completed',
    expect.objectContaining({ localMediaId: 'local-1' }),
  );
});

it('falls back to existing media localMediaId in failed logs when the issue omits it', async () => {
  const fallbackIssue: MediaRepairIssue = {
    ...issue,
    localMediaId: undefined,
  };
  const mockGetEntryById = jest.fn().mockResolvedValue({
    id: 'entry-1',
    type: 'photo',
    content: '',
    timestamp: 1,
    updatedAt: 2,
    syncStatus: 'synced',
    media: [
      {
        uri: issue.localUri,
        remoteUri: issue.remoteUri,
        mimeType: 'image/jpeg',
        size: 2048,
        metadata: {
          localMediaId: 'local-1',
          persistedHash: 'local-good',
          remoteHash: 'remote-bad',
          integrityStatus: 'repair_prompt_required',
          repairable: true,
          createdAt: 1,
          modifiedAt: 1,
        },
      },
    ],
  });
  const mockUpdateEntry = jest.fn().mockResolvedValue(undefined);
  const mockUploadFile = jest.fn().mockRejectedValue(new Error('upload unavailable'));
  const mockSyncNow = jest.fn().mockResolvedValue(undefined);
  const mockFingerprintPhotoFile = jest.fn().mockResolvedValue({
    uri: issue.localUri,
    sha256: 'local-good',
    size: 2048,
    width: 1200,
    height: 900,
    mimeType: 'image/jpeg',
  });

  await expect(
    createPhotoRepairService({
      getEntryById: mockGetEntryById,
      updateEntry: mockUpdateEntry,
      uploadFile: mockUploadFile,
      syncNow: mockSyncNow,
      fingerprintPhotoFile: mockFingerprintPhotoFile,
      now: () => 1234,
    }).repair(fallbackIssue)
  ).rejects.toThrow('upload unavailable');

  expect(logger.log).toHaveBeenCalledWith(
    'photo.repair.failed',
    expect.objectContaining({
      localMediaId: 'local-1',
      integrityStatus: 'repair_failed',
      integrityReason: 'upload unavailable',
    }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/services/__tests__/photoRepairService.test.ts -t "falls back to existing media localMediaId"
```

Expected: FAIL because the service still uses `issue.localMediaId` directly in upload metadata and logs.

- [ ] **Step 3: Make only the smallest test-side correction needed for the red phase**

If a mock fixture typo causes the wrong failure shape, fix only the fixture while preserving the intended fallback assertions.

Do not modify production code in this task.

- [ ] **Step 4: Run test to verify it still fails for the intended reason**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/services/__tests__/photoRepairService.test.ts -t "falls back to existing media localMediaId"
```

Expected: FAIL specifically because `traceId` / `localMediaId` / log payload still remain `undefined` when the issue omits them.

- [ ] **Step 5: Commit**

```bash
git add src/services/__tests__/photoRepairService.test.ts
git commit -m "test(sync): lock photo repair local media id fallback"
```

### Task 2: Implement Fallback In `photoRepairService`

**Files:**
- Modify: `app/src/services/photoRepairService.ts`
- Modify: `app/src/services/__tests__/photoRepairService.test.ts` only if a tiny fixture adjustment is required by the final code
- Test: `app/src/services/__tests__/photoRepairService.test.ts`

- [ ] **Step 1: Write the minimal implementation**

In `app/src/services/photoRepairService.ts`, derive one fallback value after loading the target entry:

```ts
const repairLocalMediaId = issue.localMediaId ?? entry.media[issue.mediaIndex]?.metadata?.localMediaId;
```

Then thread it through the helper calls.

Update helper signatures like this:

```ts
function buildRepairUploadMetadata(
  issue: MediaRepairIssue,
  localMediaId: string | undefined,
  fingerprint: PhotoFileFingerprint
): NonNullable<UploadFileOptions['metadata']> {
  return {
    traceId: localMediaId,
    localMediaId,
    persistedHash: fingerprint.sha256,
    sourceHash: fingerprint.sha256,
    size: fingerprint.size,
    width: fingerprint.width,
    height: fingerprint.height,
  };
}
```

```ts
function buildRepairLogPayload(
  issue: MediaRepairIssue,
  localMediaId?: string,
  fingerprint?: PhotoFileFingerprint,
  remoteUri?: string,
  remoteHash?: string,
  integrityStatus?: MediaIntegrityStatus,
  integrityReason?: string | null
) {
  return buildPhotoLogPayload({
    entryId: issue.entryId,
    localMediaId: localMediaId ?? issue.localMediaId,
    ...
  });
}
```

Use the single derived value in:

- `photo.repair.confirmed`
- upload metadata
- `photo.repair.completed`
- `photo.repair.failed`

Do not change the repair writeback, sync trigger, or error propagation flow.

- [ ] **Step 2: Run focused tests and typecheck**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/services/__tests__/photoRepairService.test.ts
```

Then run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run full project verification**

Run:

```bash
pnpm run verify
```

Expected: PASS.

- [ ] **Step 4: Review final scoped diff**

Run:

```bash
git diff -- src/services/photoRepairService.ts src/services/__tests__/photoRepairService.test.ts
```

Expected: diff contains only the fallback localMediaId threading and the focused tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/photoRepairService.ts src/services/__tests__/photoRepairService.test.ts
git commit -m "fix(sync): preserve photo repair local media id fallback"
```

### Task 3: Final Verification

**Files:**
- Verify only: `app/src/services/photoRepairService.ts`
- Verify only: `app/src/services/__tests__/photoRepairService.test.ts`

- [ ] **Step 1: Run focused service tests again**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/services/__tests__/photoRepairService.test.ts
```

Expected: PASS.

- [ ] **Step 2: Confirm fallback is present in code and tests**

Run:

```bash
rg -n "repairLocalMediaId|localMediaId: localMediaId \?\?|traceId: localMediaId|falls back to existing media localMediaId" src/services/photoRepairService.ts src/services/__tests__/photoRepairService.test.ts
```

Expected: matches in both implementation and tests.

- [ ] **Step 3: Review git status**

Run:

```bash
git status --short
```

Expected: only the planned file changes are present before the final commit, and the tree is clean after commits complete.

- [ ] **Step 4: Commit**

```bash
git add src/services/photoRepairService.ts src/services/__tests__/photoRepairService.test.ts
git commit -m "test(sync): verify photo repair local media id fallback" || true
```

If there is nothing left to commit because Task 2 already captured the final code state, record that explicitly in the execution notes and do not force an empty commit.
