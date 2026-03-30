# Storage Available Space Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement real available-space reporting in `getStorageStats()` while preserving `-1` as the unknown sentinel when Expo cannot provide the value.

**Architecture:** Keep the change local to `app/src/utils/fileSystem.ts` and its test file. Add a tiny internal helper for reading available space from the existing Expo file-system module, then thread that value into `getStorageStats()` without changing any current UI consumer or widening the public data model.

**Tech Stack:** TypeScript, Expo FileSystem, Jest

---

### Task 1: Lock In Available-Space Semantics With Tests

**Files:**
- Modify: `app/src/utils/__tests__/fileSystem.test.ts`
- Test: `app/src/utils/__tests__/fileSystem.test.ts`

- [ ] **Step 1: Write the failing tests**

Update the file-system mock and imports in `app/src/utils/__tests__/fileSystem.test.ts`, then add two `getStorageStats()` tests.

First, extend the import list:

```ts
import {
  deleteFile,
  getDirectorySize,
  getFileInfo,
  getMediaPaths,
  getStorageStats,
} from '../fileSystem';
```

Then replace the top mock with one that exposes an optional available-space field:

```ts
jest.mock('expo-file-system/legacy', () => ({
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  documentDirectory: 'file:///documents/',
  cacheDirectory: 'file:///cache/',
  getFreeDiskStorageAsync: jest.fn(),
}));
```

Then add these tests:

```ts
it('returns available disk bytes when Expo reports free storage', async () => {
  (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([]);
  (FileSystem.getFreeDiskStorageAsync as jest.Mock).mockResolvedValue(4096);

  await expect(getStorageStats()).resolves.toMatchObject({
    photoSize: 0,
    voiceSize: 0,
    databaseSize: 0,
    cacheSize: 0,
    totalSize: 0,
    available: 4096,
  });
});

it('falls back to -1 when Expo cannot report free storage', async () => {
  (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([]);
  (FileSystem.getFreeDiskStorageAsync as jest.Mock).mockRejectedValue(new Error('unsupported'));

  await expect(getStorageStats()).resolves.toMatchObject({
    totalSize: 0,
    available: -1,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/utils/__tests__/fileSystem.test.ts
```

Expected: FAIL because `getStorageStats()` still returns the placeholder value and does not yet use the free-space API.

- [ ] **Step 3: Adjust the failing tests only if the mock shape needs one minimal correction**

If Jest fails because the mock function is missing from the typed module namespace, keep the same assertions and only make the smallest correction needed for the mock access pattern. Do not weaken the behavior checks.

- [ ] **Step 4: Run test to verify it still fails for the intended reason**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/utils/__tests__/fileSystem.test.ts
```

Expected: FAIL specifically on the `available` assertions.

- [ ] **Step 5: Commit**

```bash
git add src/utils/__tests__/fileSystem.test.ts
git commit -m "test(filesystem): lock available storage semantics"
```

### Task 2: Implement Available-Space Lookup In `getStorageStats()`

**Files:**
- Modify: `app/src/utils/fileSystem.ts`
- Modify: `app/src/utils/__tests__/fileSystem.test.ts`
- Test: `app/src/utils/__tests__/fileSystem.test.ts`

- [ ] **Step 1: Write the minimal implementation**

In `app/src/utils/fileSystem.ts`, add a narrow helper near the existing size helpers:

```ts
const getAvailableDiskSpace = async (): Promise<number> => {
  try {
    const getFreeDiskStorageAsync = (FileSystem as typeof FileSystem & {
      getFreeDiskStorageAsync?: () => Promise<number>;
    }).getFreeDiskStorageAsync;

    if (!getFreeDiskStorageAsync) {
      return -1;
    }

    const bytes = await getFreeDiskStorageAsync();
    return typeof bytes === 'number' && Number.isFinite(bytes) ? bytes : -1;
  } catch {
    return -1;
  }
};
```

Then update `getStorageStats()` to fetch available space after directory-size aggregation succeeds:

```ts
const available = await getAvailableDiskSpace();

return {
  photoSize: photoOriginalSize + photoDisplaySize,
  voiceSize: voiceOriginalSize + voiceCompressedSize,
  databaseSize,
  cacheSize: tempSize,
  totalSize:
    photoOriginalSize +
    photoDisplaySize +
    voiceOriginalSize +
    voiceCompressedSize +
    databaseSize +
    tempSize,
  available,
};
```

Do not change the outer catch block that returns zeroed stats.

- [ ] **Step 2: Run test to verify it passes**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/utils/__tests__/fileSystem.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run focused typecheck for the touched file through project typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit code `0`.

- [ ] **Step 4: Inspect the final scoped diff**

Run:

```bash
git diff -- src/utils/fileSystem.ts src/utils/__tests__/fileSystem.test.ts
```

Expected: diff contains only the new internal helper, the `getStorageStats()` wiring, and the added tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/fileSystem.ts src/utils/__tests__/fileSystem.test.ts
git commit -m "feat(filesystem): report available disk space"
```

### Task 3: Final Verification

**Files:**
- Verify only: `app/src/utils/fileSystem.ts`
- Verify only: `app/src/utils/__tests__/fileSystem.test.ts`

- [ ] **Step 1: Run the targeted test file again**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/utils/__tests__/fileSystem.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full project verification**

Run:

```bash
npm run verify
```

Expected: PASS.

- [ ] **Step 3: Confirm spec contract in code**

Run:

```bash
rg -n "available: -1|getFreeDiskStorageAsync|getStorageStats" src/utils/fileSystem.ts src/utils/__tests__/fileSystem.test.ts
```

Expected:

- `getFreeDiskStorageAsync` appears in the helper or tests
- `available: -1` only appears in the unknown fallback semantics, not as the unconditional return value in the success path

- [ ] **Step 4: Review git status**

Run:

```bash
git status --short
```

Expected: only the planned file changes are present before the final commit, and the tree is clean after commits complete.

- [ ] **Step 5: Commit**

```bash
git add src/utils/fileSystem.ts src/utils/__tests__/fileSystem.test.ts
git commit -m "test(filesystem): verify available space reporting" || true
```

If there is nothing left to commit because Task 2 already captured the final code state, record that explicitly in the execution notes and do not force an empty commit.
