# Sync Bootstrap Summary Writeback Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one focused regression test proving cloud bootstrap still writes validation summary and issues even when no repair prompt is shown.

**Architecture:** Keep this as a test-only change in `syncBootstrapService.test.ts`. Reuse the existing cloud-restore test scaffolding and add one non-`repair_prompt_required` scenario that asserts summary/issue writeback continues while prompt display remains suppressed.

**Tech Stack:** TypeScript, Jest

---

### Task 1: Add The Summary/Issue Writeback Regression Test

**Files:**
- Modify: `app/src/services/__tests__/syncBootstrapService.test.ts`
- Test: `app/src/services/__tests__/syncBootstrapService.test.ts`

- [ ] **Step 1: Write the focused test**

Add this regression test to `app/src/services/__tests__/syncBootstrapService.test.ts` near the other cloud-restore validation side-effect tests:

```ts
it('writes validation summary and issues even when no repair prompt is shown', async () => {
  mockApiGet.mockResolvedValueOnce([
    {
      id: 'photo-restore-quiet-1',
      type: 'photo',
      content: '',
      timestamp: 1700000003000,
      media: [
        {
          uri: 'https://cdn.example.com/photo-restore-quiet-1.jpg',
          remoteUri: 'https://cdn.example.com/photo-restore-quiet-1.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
        },
      ],
    },
  ]);
  const validationRun = {
    summary: {
      status: 'partial' as const,
      total: 1,
      downloaded: 1,
      missing: 0,
      failed: 0,
      suspect: 1,
      repairable: 0,
      lastError: null,
      lastValidatedAt: 1700000003000,
    },
    issues: [
      {
        entryId: 'photo-restore-quiet-1',
        mediaIndex: 0,
        localUri: 'file:///documents/media/photos/original/photo-restore-quiet-1.jpg',
        integrityStatus: 'repair_pending',
        integrityReason: 'already queued',
      },
    ],
  };
  mockValidateEntries.mockResolvedValueOnce(validationRun);

  await createSyncBootstrapService().runInitialFlow('cloud');

  expect(mockSetMediaValidationSummary).toHaveBeenCalledWith(validationRun.summary);
  expect(mockReplaceIssues).toHaveBeenCalledWith(validationRun.issues);
  expect(mockShowPhotoRepairPrompt).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the focused service test file**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/services/__tests__/syncBootstrapService.test.ts
```

Expected: PASS immediately, because this is a test-only follow-up that locks existing behavior already present on `main`.

- [ ] **Step 3: Run full project verification**

Run:

```bash
npm run verify
```

Expected: PASS.

- [ ] **Step 4: Review final scoped diff**

Run:

```bash
git diff -- src/services/__tests__/syncBootstrapService.test.ts
```

Expected: diff contains only the one focused regression test addition.

- [ ] **Step 5: Commit**

```bash
git add src/services/__tests__/syncBootstrapService.test.ts
git commit -m "test(sync): verify bootstrap summary writeback without prompt"
```

### Task 2: Final Verification

**Files:**
- Verify only: `app/src/services/__tests__/syncBootstrapService.test.ts`

- [ ] **Step 1: Re-run the focused service test file**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/services/__tests__/syncBootstrapService.test.ts
```

Expected: PASS.

- [ ] **Step 2: Confirm the new writeback assertions are present**

Run:

```bash
rg -n "writes validation summary and issues even when no repair prompt is shown|mockSetMediaValidationSummary|mockReplaceIssues|mockShowPhotoRepairPrompt" src/services/__tests__/syncBootstrapService.test.ts
```

Expected: matches for the test name and the three key assertions.

- [ ] **Step 3: Review git status**

Run:

```bash
git status --short
```

Expected: only the planned test file change is present before the commit, and the tree is clean after the commit completes.

- [ ] **Step 4: Commit**

```bash
git add src/services/__tests__/syncBootstrapService.test.ts
git commit -m "test(sync): verify non-prompt bootstrap writeback" || true
```

If there is nothing left to commit because Task 1 already captured the final code state, record that explicitly in the execution notes and do not force an empty commit.
