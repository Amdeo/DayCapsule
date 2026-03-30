# Backup Restore Type Tightening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the final production `as any` usages in backup import flow by tightening backup entry/media types and aligning `useBackupPageController` with the real restore/update contracts.

**Architecture:** Keep the work limited to `SyncService` backup entry typing and `useBackupPageController` option contracts. Normalize imported backup media to `MediaInfo[] | undefined` before the controller consumes it, then let the controller call `restoreEntries(entries: Entry[])` and `updateEntry(id, updates: Partial<Entry>)` directly without type escapes.

**Tech Stack:** TypeScript, React Native, Expo FileSystem, JSZip, Jest, Testing Library

---

### Task 1: Lock In Backup Import Media Semantics With Tests

**Files:**
- Modify: `app/src/components/__tests__/BackupPage.test.tsx`
- Test: `app/src/components/__tests__/BackupPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Extend the existing import-related coverage in `app/src/components/__tests__/BackupPage.test.tsx` so it documents the typed media behavior the controller must support.

Keep the current success-path test for restored media arrays, and add one legacy-format test:

```ts
it('persists restored legacy single-media objects after import normalizes them to arrays', async () => {
  mockRestoreEntries.mockResolvedValueOnce(['entry-1']);
  (SyncService.pickAndParseBackup as jest.Mock).mockResolvedValueOnce({
    data: {
      entries: [
        {
          id: 'entry-1',
          type: 'photo',
          media: { relativeUri: 'media/photo-1.jpg', mimeType: 'image/jpeg', size: 100 },
        },
      ],
    },
    zip: {},
  });
  (SyncService.extractMediaFromZip as jest.Mock).mockResolvedValueOnce([
    {
      id: 'entry-1',
      media: [{ uri: 'file:///documents/media/photos/original/photo-1.jpg', mimeType: 'image/jpeg', size: 100 }],
    },
  ]);

  const { getByText } = render(<BackupPage visible onClose={jest.fn()} />);

  fireEvent.press(getByText('导入'));

  await waitFor(() => {
    expect(mockUpdateEntry).toHaveBeenCalledWith('entry-1', {
      media: [{ uri: 'file:///documents/media/photos/original/photo-1.jpg', mimeType: 'image/jpeg', size: 100 }],
    });
  });
});
```

Also tighten the mocks locally so they reflect the intended contracts:

```ts
const mockRestoreEntries = jest.fn<Promise<string[]>, [Entry[]]>();
const mockUpdateEntry = jest.fn<Promise<void>, [string, Partial<Entry>]>()
  .mockResolvedValue(undefined);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/__tests__/BackupPage.test.tsx
```

Expected: either FAIL because the stricter mock typings surface the current controller `any` contract mismatch, or FAIL because one import fixture no longer matches the tightened media expectations.

- [ ] **Step 3: Make only the smallest test-side correction needed for the red phase**

If the failure is caused by a fixture shape typo or an over-strict mock declaration, fix only that test-side issue while preserving the intended contract:

- `restoreEntries` consumes `Entry[]`
- `updateEntry` consumes `Partial<Entry>`
- restored media passed to `updateEntry` is an array when present

Do not modify production code in this task.

- [ ] **Step 4: Run test to verify it still fails for the intended typed contract reason**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/__tests__/BackupPage.test.tsx
```

Expected: FAIL for the intended production typing gap, not for a broken test fixture.

- [ ] **Step 5: Commit**

```bash
git add src/components/__tests__/BackupPage.test.tsx
git commit -m "test(backup): lock restore media typing"
```

### Task 2: Tighten SyncService And Backup Controller Types

**Files:**
- Modify: `app/src/services/syncService.ts`
- Modify: `app/src/components/backup-page/useBackupPageController.ts`
- Modify: `app/src/components/__tests__/BackupPage.test.tsx` only if fixture updates are required to match the final types
- Test: `app/src/components/__tests__/BackupPage.test.tsx`

- [ ] **Step 1: Write the minimal production types**

In `app/src/services/syncService.ts`, replace the loose backup-entry typing with backup-specific types:

```ts
import type { Entry, MediaInfo } from '@/src/types/entry';

type BackupMediaInput = Partial<MediaInfo> & {
  relativeUri?: string;
  remoteUri?: string;
};

type BackupEntryInput = Partial<Entry> & {
  media?: BackupMediaInput | BackupMediaInput[];
};

type RestoredBackupEntry = Omit<BackupEntryInput, 'media'> & {
  media?: MediaInfo[];
};
```

Then update `BackupData` and `ParsedBackup` consumers:

```ts
export interface BackupData {
  exportedAt: string;
  appVersion: string;
  totalEntries: number;
  entries: BackupEntryInput[];
}
```

```ts
static async extractMediaFromZip(
  zip: JSZip,
  entries: BackupData['entries']
): Promise<RestoredBackupEntry[]> {
  ...
}
```

Keep the existing normalization logic, but replace `any[]` / `any` with the new backup-specific types.

- [ ] **Step 2: Update the controller contracts**

In `app/src/components/backup-page/useBackupPageController.ts`, change the option interface to:

```ts
interface UseBackupPageControllerOptions {
  visible: boolean;
  entries: Entry[];
  restoreEntries: (entries: Entry[]) => Promise<string[]>;
  updateEntry: (id: string, updates: Partial<Entry>) => Promise<void> | void;
}
```

Then remove the two production casts:

```ts
const insertedIds = await restoreEntries(data.entries as Entry[]);
```

must instead become a direct typed value flow after `SyncService` types are corrected, with no cast.

And:

```ts
await updateEntry(entry.id, {
  media: entry.media,
});
```

should type-check directly once `entry.media` is normalized to `MediaInfo[] | undefined`.

Do not change runtime control flow, alert copy, or media extraction behavior.

- [ ] **Step 3: Run the targeted test file to verify it passes**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/__tests__/BackupPage.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/syncService.ts src/components/backup-page/useBackupPageController.ts src/components/__tests__/BackupPage.test.tsx
git commit -m "refactor: tighten backup restore typing"
```

### Task 3: Final Verification

**Files:**
- Verify only: `app/src/services/syncService.ts`
- Verify only: `app/src/components/backup-page/useBackupPageController.ts`
- Verify only: `app/src/components/__tests__/BackupPage.test.tsx`

- [ ] **Step 1: Run scoped backup tests**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/__tests__/BackupPage.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full project verification**

Run:

```bash
npm run verify
```

Expected: PASS.

- [ ] **Step 3: Confirm production `as any` removal in scope**

Run:

```bash
rg -n "as any" src/components/backup-page/useBackupPageController.ts src/services/syncService.ts
```

Expected:

- no matches in `useBackupPageController.ts`
- `syncService.ts` may still contain no `as any`; if it contains other non-`as any` loose typing, that is outside this specific grep check

- [ ] **Step 4: Review final scoped diff**

Run:

```bash
git diff -- src/services/syncService.ts src/components/backup-page/useBackupPageController.ts src/components/__tests__/BackupPage.test.tsx
```

Expected: diff contains only the approved backup restore type tightening work.

- [ ] **Step 5: Commit**

```bash
git add src/services/syncService.ts src/components/backup-page/useBackupPageController.ts src/components/__tests__/BackupPage.test.tsx
git commit -m "test(backup): verify restore type tightening" || true
```

If there is nothing left to commit because Task 2 already captured the final code state, record that explicitly in execution notes and do not force an empty commit.
