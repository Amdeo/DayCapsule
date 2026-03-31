# Optimize Report Batch 3 Insert Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the duplicated `entries` insert column/value assembly shared by `addEntry()` and `restoreEntries()` into one local helper while preserving current behavior exactly.

**Architecture:** Keep the refactor entirely inside `app/src/database/operations.ts`. Introduce one file-local helper that returns the insert columns, placeholders, and value array for a given entry plus schema capabilities, then let `addEntry()` and `restoreEntries()` keep their caller-specific outer SQL, timestamp handling, and post-insert behavior. Tests stay focused in `operations.test.ts` and should prove the extraction does not change the existing insert SQL forms or branch behavior.

**Tech Stack:** TypeScript, Expo SQLite, Jest

---

### Task 1: Extract Shared Entry Insert Parts Without Changing Behavior

**Files:**
- Modify: `app/src/database/operations.ts`
- Test: `app/src/database/__tests__/operations.test.ts`

- [ ] **Step 1: Write the failing tests**

In `app/src/database/__tests__/operations.test.ts`, add two focused regressions that lock the caller-owned outer SQL shape before extraction.

Add this test in the `addEntry` section after the existing media-json insert coverage:

```ts
it('addEntry 应继续使用普通 INSERT INTO entries', async () => {
  mockDb.getAllAsync.mockResolvedValue([
    { name: 'id' },
    { name: 'type' },
    { name: 'content' },
    { name: 'timestamp' },
    { name: 'tags' },
    { name: 'media_json' },
  ]);

  await addEntry({
    type: 'text' as const,
    content: 'insert form lock',
  });

  const [sql] = mockDb.runAsync.mock.calls[0];
  expect(sql).toContain('INSERT INTO entries');
  expect(sql).not.toContain('INSERT OR IGNORE INTO entries');
});
```

Add this test in the `restoreEntries` section near the existing insert coverage:

```ts
it('restoreEntries 应继续使用 INSERT OR IGNORE INTO entries', async () => {
  mockDb.getAllAsync.mockResolvedValue([
    { name: 'id' },
    { name: 'type' },
    { name: 'content' },
    { name: 'timestamp' },
    { name: 'tags' },
    { name: 'media_json' },
  ]);
  mockDb.withTransactionAsync.mockImplementation(async (callback: () => Promise<void>) => callback());
  mockDb.getFirstAsync.mockResolvedValueOnce({ changes: 1 });

  await restoreEntries([
    {
      id: 'restore-insert-form-1',
      type: 'text',
      content: 'restore insert form lock',
      timestamp: 1,
    },
  ]);

  const [sql] = mockDb.runAsync.mock.calls[0];
  expect(sql).toContain('INSERT OR IGNORE INTO entries');
  expect(sql).not.toContain('INSERT INTO entries\n');
});
```

These tests should fail once you intentionally tighten them against the exact current SQL form if the extraction changes caller-owned semantics.

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/database/__tests__/operations.test.ts
```

Expected: FAIL only if the new assertions expose a mismatch during extraction work. If they pass immediately, keep them and proceed — existing behavior is now locked before refactor.

- [ ] **Step 3: Write the minimal implementation**

In `app/src/database/operations.ts`, add one file-local helper that builds the duplicated insert parts now shared between `addEntry()` and `restoreEntries()`.

Use a shape like this:

```ts
type EntryInsertSchema = {
  hasMediaJson: boolean;
  hasMediaColumns: boolean;
  hasSyncStatus: boolean;
  hasSyncOp: boolean;
  hasConflictedCopyOf: boolean;
  hasBaseUpdatedAt: boolean;
  hasUserID: boolean;
  hasDeleted: boolean;
  hasLocalReadyState?: boolean;
};

type EntryInsertParts = {
  columnsSql: string;
  placeholdersSql: string;
  values: unknown[];
};

const buildEntryInsertParts = (
  entry: Pick<Entry, 'id' | 'type' | 'content' | 'timestamp' | 'tags' | 'media' | 'recordingStatus' | 'recordingDuration' | 'syncStatus' | 'syncOp' | 'conflictedCopyOf' | 'baseUpdatedAt' | 'userId' | 'deleted' | 'localReadyState' | 'updatedAt' | 'editedAt'>,
  schema: EntryInsertSchema,
  options: { includeCreatedAtUpdatedAt: boolean }
): EntryInsertParts => {
  // move the duplicated column / placeholder / value assembly here
};
```

Implementation constraints:

- The helper should only build `columnsSql`, `placeholdersSql`, and `values`.
- `addEntry()` must still wrap it with `INSERT INTO entries (...) VALUES (...)`.
- `restoreEntries()` must still wrap it with `INSERT OR IGNORE INTO entries (...) VALUES (...)`.
- Preserve all current branches:
  - `media_json`
  - extended legacy media columns
  - old legacy media columns only
  - optional sync / cloud metadata columns
- Preserve current timestamp behavior:
  - `addEntry()` does not add `created_at` / `updated_at`
  - `restoreEntries()` does add `created_at` / `updated_at`

- [ ] **Step 4: Run tests to verify green**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/database/__tests__/operations.test.ts
```

Then run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/database/operations.ts src/database/__tests__/operations.test.ts
git commit -m "refactor: share entry insert assembly"
```

### Task 2: Final Verification

**Files:**
- Verify only: `app/src/database/operations.ts`
- Verify only: `app/src/database/__tests__/operations.test.ts`

- [ ] **Step 1: Run the focused database suite**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/database/__tests__/operations.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run project verify**

Run:

```bash
npm run verify
```

Expected: PASS. If unrelated pre-existing failures appear, record them exactly and stop widening scope.

- [ ] **Step 3: Commit**

```bash
git add src/database/operations.ts src/database/__tests__/operations.test.ts
git commit -m "refactor: deduplicate entry insert builders"
```
