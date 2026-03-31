# Sync Bootstrap Settlement Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten `syncBootstrapService` so bootstrap only shows the repair prompt for `repair_prompt_required` issues and skips media pre-upload for entries already marked for deletion.

**Architecture:** Keep the fix local to `syncBootstrapService.ts` and its unit test file. Reuse the existing helper `shouldSkipBootstrapMediaUpload(entry)` and existing validation issue model, rather than introducing new abstractions or moving code between files.

**Tech Stack:** TypeScript, Jest

---

### Task 1: Lock Behavior With Focused Tests

**Files:**
- Modify: `app/src/services/__tests__/syncBootstrapService.test.ts`
- Test: `app/src/services/__tests__/syncBootstrapService.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these two focused tests to `app/src/services/__tests__/syncBootstrapService.test.ts` if they are not already present verbatim.

```ts
it('shows the repair prompt only when validation issues require repair action', async () => {
  mockApiGet.mockResolvedValueOnce([
    {
      id: 'photo-restore-prompt-1',
      type: 'photo',
      content: '',
      timestamp: 1700000003100,
      media: [
        {
          uri: 'https://cdn.example.com/photo-restore-prompt-1.jpg',
          remoteUri: 'https://cdn.example.com/photo-restore-prompt-1.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
        },
      ],
    },
  ]);
  mockValidateEntries.mockResolvedValueOnce({
    summary: {
      status: 'partial',
      total: 2,
      downloaded: 1,
      missing: 0,
      failed: 0,
      suspect: 1,
      repairable: 1,
      lastError: null,
      lastValidatedAt: 1700000003100,
    },
    issues: [
      {
        entryId: 'photo-restore-prompt-1',
        mediaIndex: 0,
        localUri: 'file:///documents/media/photos/original/photo-restore-prompt-1.jpg',
        integrityStatus: 'repair_pending',
        integrityReason: 'already queued',
      },
      {
        entryId: 'photo-restore-prompt-2',
        mediaIndex: 1,
        localUri: 'file:///documents/media/photos/original/photo-restore-prompt-2.jpg',
        integrityStatus: 'repair_prompt_required',
        integrityReason: 'local original is available for repair',
      },
    ],
  });

  await createSyncBootstrapService().runInitialFlow('cloud');

  expect(mockShowPhotoRepairPrompt).toHaveBeenCalledTimes(1);
});

it('skips pre-upload for pending-delete or delete-op entries', async () => {
  (DB.getAllEntries as jest.Mock).mockResolvedValueOnce([
    {
      id: 'entry-pending-delete-1',
      type: 'photo',
      content: '待删除图片',
      timestamp: 1700000001000,
      syncStatus: 'pending_delete',
      syncOp: 'delete',
      media: [
        {
          uri: 'file:///data/user/0/com.memorycapsule.app/cache/photo-delete-1.jpg',
          mimeType: 'image/jpeg',
          size: 2048,
          metadata: {
            localMediaId: 'bootstrap-delete-media-1',
            sourceHash: 'source-hash-delete-1',
            persistedHash: 'persisted-hash-delete-1',
            width: 1200,
            height: 900,
            createdAt: 1700000001000,
            modifiedAt: 1700000001000,
          },
        },
      ],
      deleted: true,
    },
  ]);

  await createSyncBootstrapService().runInitialFlow('local');

  expect(mockUploadFile).not.toHaveBeenCalled();
  expect(DB.updateEntry).toHaveBeenCalledWith(
    'entry-pending-delete-1',
    expect.objectContaining({
      syncStatus: 'pending_delete',
      syncOp: 'delete',
      deleted: true,
    }),
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/services/__tests__/syncBootstrapService.test.ts -t "shows the repair prompt only when validation issues require repair action|skips pre-upload for pending-delete or delete-op entries"
```

Expected: FAIL because current `main` shows the prompt for any non-empty issues and still pre-uploads delete-bound entries.

- [ ] **Step 3: Make only the smallest test-side correction needed for the red phase**

If a fixture shape typo causes the wrong failure shape, fix only the fixture while preserving the intended assertions.

Do not modify production code in this task.

- [ ] **Step 4: Re-run to verify it still fails for the intended reasons**

Run the same command again:

```bash
npm test -- --runInBand --runTestsByPath src/services/__tests__/syncBootstrapService.test.ts -t "shows the repair prompt only when validation issues require repair action|skips pre-upload for pending-delete or delete-op entries"
```

Expected: FAIL specifically on prompt gating and delete-aware pre-upload skipping.

- [ ] **Step 5: Commit**

```bash
git add src/services/__tests__/syncBootstrapService.test.ts
git commit -m "test(sync): lock bootstrap settlement behavior"
```

### Task 2: Implement the Two Bootstrap Behavior Fixes

**Files:**
- Modify: `app/src/services/syncBootstrapService.ts`
- Modify: `app/src/services/__tests__/syncBootstrapService.test.ts` only if a tiny fixture adjustment is required by the final code
- Test: `app/src/services/__tests__/syncBootstrapService.test.ts`

- [ ] **Step 1: Write the minimal implementation**

In `app/src/services/syncBootstrapService.ts`, make exactly these two changes.

First, restore prompt gating to only actionable issues:

```ts
if (
  mediaValidationRun.issues.some(
    (issue) => issue.integrityStatus === 'repair_prompt_required'
  )
) {
  showPhotoRepairPrompt();
}
```

Second, restore delete-aware skip behavior in local bootstrap by reusing the existing helper:

```ts
if (
  entry.syncStatus === 'pending_upload' ||
  entry.syncStatus === 'uploading' ||
  shouldSkipBootstrapMediaUpload(entry)
) {
  continue;
}
```

Do not change any other bootstrap logic.

- [ ] **Step 2: Run focused tests and typecheck**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/services/__tests__/syncBootstrapService.test.ts
```

Then run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run full project verification**

Run:

```bash
npm run verify
```

Expected: PASS.

- [ ] **Step 4: Review final scoped diff**

Run:

```bash
git diff -- src/services/syncBootstrapService.ts src/services/__tests__/syncBootstrapService.test.ts
```

Expected: diff contains only the prompt gating fix, the delete-aware skip fix, and the focused tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/syncBootstrapService.ts src/services/__tests__/syncBootstrapService.test.ts
git commit -m "fix(sync): restore bootstrap settlement guards"
```

### Task 3: Final Verification

**Files:**
- Verify only: `app/src/services/syncBootstrapService.ts`
- Verify only: `app/src/services/__tests__/syncBootstrapService.test.ts`

- [ ] **Step 1: Run focused service tests again**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/services/__tests__/syncBootstrapService.test.ts
```

Expected: PASS.

- [ ] **Step 2: Confirm the two guards are present**

Run:

```bash
rg -n "repair_prompt_required|shouldSkipBootstrapMediaUpload\(entry\)" src/services/syncBootstrapService.ts src/services/__tests__/syncBootstrapService.test.ts
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
git add src/services/syncBootstrapService.ts src/services/__tests__/syncBootstrapService.test.ts
git commit -m "test(sync): verify bootstrap settlement guards" || true
```

If there is nothing left to commit because Task 2 already captured the final code state, record that explicitly in the execution notes and do not force an empty commit.
