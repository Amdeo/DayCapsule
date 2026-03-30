# Cloud Sync Overview Remote Paths Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `/api/media/...` server paths from being counted as local media bytes in `cloudSyncOverviewService`.

**Architecture:** Keep the fix local to the existing URI classifier in `cloudSyncOverviewService.ts` and add one focused regression test in the existing unit test file. No other sync services, stores, or UI components are changed.

**Tech Stack:** TypeScript, Jest, Testing Library, Expo FileSystem mocks

---

### Task 1: Fix Remote Path Classification

**Files:**
- Modify: `app/src/services/cloudSyncOverviewService.ts`
- Modify: `app/src/services/__tests__/cloudSyncOverviewService.test.ts`
- Test: `app/src/services/__tests__/cloudSyncOverviewService.test.ts`

- [ ] **Step 1: Write the failing test**

Add this regression test near the existing local media-byte tests in `app/src/services/__tests__/cloudSyncOverviewService.test.ts`:

```ts
it('ignores relative /api/media paths when summing local media bytes', async () => {
  mockGetStatus.mockResolvedValueOnce({
    lastSyncAt: null,
    lastSyncError: null,
    initialSyncState: 'idle',
    pendingEntries: 0,
    pendingUploads: 0,
    uploadingEntries: 0,
    failedEntries: 0,
    conflictCopies: 0,
  });
  (DB.getLocalSyncOverviewCounts as jest.Mock).mockResolvedValueOnce({
    entryCount: 2,
    photoCount: 1,
    voiceCount: 1,
  });
  (DB.getAllEntries as jest.Mock).mockResolvedValueOnce([
    {
      id: 'photo',
      type: 'photo',
      content: '',
      timestamp: 1,
      syncStatus: 'synced',
      media: [
        {
          uri: '/api/media/photo-1',
          thumbnail: '/api/media/thumb-1',
          mimeType: 'image/jpeg',
          size: 1,
        },
      ],
    },
    {
      id: 'voice',
      type: 'voice',
      content: '',
      timestamp: 2,
      syncStatus: 'synced',
      media: [
        {
          uri: 'file:///voice.m4a',
          mimeType: 'audio/m4a',
          size: 1,
        },
      ],
    },
  ]);
  (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (uri: string) => ({
    exists: true,
    size: uri === 'file:///voice.m4a' ? 900 : 9999,
  }));
  mockGet.mockResolvedValueOnce({
    entryCount: 0,
    photoCount: 0,
    voiceCount: 0,
    mediaCount: 0,
    mediaBytes: 0,
  });

  const snapshot = await createCloudSyncOverviewService().getSnapshot();

  expect(snapshot.local.mediaBytes).toBe(900);
  expect(FileSystem.getInfoAsync).toHaveBeenCalledTimes(1);
  expect(FileSystem.getInfoAsync).toHaveBeenCalledWith('file:///voice.m4a');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/services/__tests__/cloudSyncOverviewService.test.ts -t "ignores relative /api/media paths when summing local media bytes"
```

Expected: FAIL because `/api/media/...` is still treated as a local path and `snapshot.local.mediaBytes` includes the wrong file size or extra `getInfoAsync` calls.

- [ ] **Step 3: Write the minimal implementation**

Update `app/src/services/cloudSyncOverviewService.ts`:

```ts
const isRemoteUrl = (uri: string): boolean => /^(?:https?:\/\/|\/api\/media(?:\/|$))/i.test(uri.trim());
```

Do not change any other overview logic.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/services/__tests__/cloudSyncOverviewService.test.ts
```

Then run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/cloudSyncOverviewService.ts src/services/__tests__/cloudSyncOverviewService.test.ts
git commit -m "fix(sync): ignore remote media api paths in overview"
```

### Task 2: Final Verification

**Files:**
- Verify only: `app/src/services/cloudSyncOverviewService.ts`
- Verify only: `app/src/services/__tests__/cloudSyncOverviewService.test.ts`

- [ ] **Step 1: Run focused service tests**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/services/__tests__/cloudSyncOverviewService.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full project verification**

Run:

```bash
npm run verify
```

Expected: PASS.

- [ ] **Step 3: Review final scoped diff**

Run:

```bash
git diff -- src/services/cloudSyncOverviewService.ts src/services/__tests__/cloudSyncOverviewService.test.ts
```

Expected: diff contains only the URI predicate expansion and the focused regression test.

- [ ] **Step 4: Confirm `/api/media` handling is present**

Run:

```bash
rg -n "/api/media|isRemoteUrl" src/services/cloudSyncOverviewService.ts src/services/__tests__/cloudSyncOverviewService.test.ts
```

Expected: both the implementation and the regression test mention `/api/media`.

- [ ] **Step 5: Commit**

```bash
git add src/services/cloudSyncOverviewService.ts src/services/__tests__/cloudSyncOverviewService.test.ts
git commit -m "test(sync): verify overview remote media path handling" || true
```

If there is nothing left to commit because Task 1 already captured the final code state, record that explicitly in execution notes and do not force an empty commit.
