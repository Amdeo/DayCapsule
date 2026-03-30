# Type Safety And Timeline Dedupe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the approved production `as any` usages and deduplicate timeline empty-state/header components without changing runtime behavior.

**Architecture:** Keep `app/src/components/timeline-v2/` as the single timeline UI implementation, and keep type-safety fixes localized to the existing helpers in `fileSystem.ts` and `operations.ts`. The work stays narrow: tests first, minimal code changes second, and targeted verification after each change.

**Tech Stack:** TypeScript, React Native, Expo, Jest, Testing Library, Expo FileSystem, Expo SQLite

---

### Task 1: Point Timeline Tests At The Canonical Components

**Files:**
- Modify: `app/src/components/__tests__/TimelineEmptyState.test.tsx`
- Modify: `app/src/components/__tests__/TimelineSectionHeader.test.tsx`
- Test: `app/src/components/__tests__/TimelineEmptyState.test.tsx`
- Test: `app/src/components/__tests__/TimelineSectionHeader.test.tsx`

- [ ] **Step 1: Write the failing test change**

Update the imports so the tests target the canonical `timeline-v2` implementations. Use these exact edits:

```tsx
// app/src/components/__tests__/TimelineEmptyState.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { TimelineEmptyState } from '../timeline-v2/TimelineEmptyState';

describe('TimelineEmptyState', () => {
  it('renders the empty-state shell and copy', () => {
    const { getByTestId, getByText } = render(<TimelineEmptyState />);

    expect(getByTestId('timeline-empty-state')).toBeTruthy();
    expect(getByText('还没有记忆')).toBeTruthy();
    expect(getByText('点击右下角 + 按钮开始记录')).toBeTruthy();
  });

  it('does not render unrelated placeholder copy', () => {
    const { queryByText } = render(<TimelineEmptyState />);

    expect(queryByText('加载中')).toBeNull();
  });
});
```

```tsx
// app/src/components/__tests__/TimelineSectionHeader.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { TimelineSectionHeader } from '../timeline-v2/TimelineSectionHeader';

describe('TimelineSectionHeader', () => {
  it('renders the section title with the existing timeline shell', () => {
    const { getByText } = render(<TimelineSectionHeader title="今天" />);

    expect(getByText('今天')).toBeTruthy();
  });

  it('keeps the canonical header height at 48', () => {
    const { toJSON } = render(<TimelineSectionHeader title="昨天" />);

    expect(toJSON()).toMatchObject({
      props: expect.objectContaining({
        style: expect.objectContaining({ height: 48 }),
      }),
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/__tests__/TimelineEmptyState.test.tsx src/components/__tests__/TimelineSectionHeader.test.tsx
```

Expected: `TimelineSectionHeader.test.tsx` fails because the canonical component does not expose `timestamp` or `testID`, proving the old duplicate-specific assertions are no longer valid.

- [ ] **Step 3: Write minimal implementation-compatible assertions**

Keep the import changes above and reduce the section-header assertions to only the behavior the canonical component actually guarantees: visible title and `height: 48`.

No production code changes in this task.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/__tests__/TimelineEmptyState.test.tsx src/components/__tests__/TimelineSectionHeader.test.tsx
```

Expected: PASS for both test files.

- [ ] **Step 5: Commit**

```bash
git add src/components/__tests__/TimelineEmptyState.test.tsx src/components/__tests__/TimelineSectionHeader.test.tsx
git commit -m "test(timeline): point timeline component tests to v2"
```

### Task 2: Remove Duplicate Root-Level Timeline Implementations

**Files:**
- Delete: `app/src/components/TimelineEmptyState.tsx`
- Delete: `app/src/components/TimelineSectionHeader.tsx`
- Test: `app/src/components/__tests__/TimelineEmptyState.test.tsx`
- Test: `app/src/components/__tests__/TimelineSectionHeader.test.tsx`

- [ ] **Step 1: Write the failing change**

Delete the duplicate root-level files:

```text
app/src/components/TimelineEmptyState.tsx
app/src/components/TimelineSectionHeader.tsx
```

Do not touch the `timeline-v2` implementations.

- [ ] **Step 2: Run test to verify behavior is still covered by canonical imports**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/__tests__/TimelineEmptyState.test.tsx src/components/__tests__/TimelineSectionHeader.test.tsx
```

Expected: PASS, showing the tests no longer depend on the deleted duplicate files.

- [ ] **Step 3: Verify runtime imports only target `timeline-v2`**

Run:

```bash
rg -n "TimelineEmptyState|TimelineSectionHeader" src/components app
```

Expected matches include:

- `src/components/timeline-v2/TimelineContent.tsx`
- `src/components/timeline-v2/useTimelineList.tsx`
- the updated test files

Expected non-match: no runtime import should reference `src/components/TimelineEmptyState` or `src/components/TimelineSectionHeader`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/__tests__/TimelineEmptyState.test.tsx src/components/__tests__/TimelineSectionHeader.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/__tests__/TimelineEmptyState.test.tsx src/components/__tests__/TimelineSectionHeader.test.tsx
git rm src/components/TimelineEmptyState.tsx src/components/TimelineSectionHeader.tsx
git commit -m "refactor(timeline): remove duplicate root components"
```

### Task 3: Remove `as any` From `fileSystem.ts`

**Files:**
- Modify: `app/src/utils/fileSystem.ts`
- Test: `app/src/utils/__tests__/fileSystem.test.ts`

- [ ] **Step 1: Write the failing tests**

Append these tests to `app/src/utils/__tests__/fileSystem.test.ts` and update the import list to include the touched helpers:

```ts
import { deleteFile, getDirectorySize, getFileInfo, getMediaPaths } from '../fileSystem';

it('returns file size when getInfoAsync exposes a size field', async () => {
  (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
    exists: true,
    size: 2048,
  });

  await expect(getFileInfo('file:///tmp/voice.m4a')).resolves.toEqual({
    exists: true,
    size: 2048,
  });
});

it('falls back to size 0 when getInfoAsync returns no size field', async () => {
  (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
    exists: true,
  });

  await expect(getFileInfo('file:///tmp/no-size.bin')).resolves.toEqual({
    exists: true,
    size: 0,
  });
});

it('sums directory entries while treating missing size values as 0', async () => {
  (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue(['a.jpg', 'b.jpg']);
  (FileSystem.getInfoAsync as jest.Mock)
    .mockResolvedValueOnce({ exists: true, size: 10 })
    .mockResolvedValueOnce({ exists: true });

  await expect(getDirectorySize('file:///cache/')).resolves.toBe(10);
});
```

Also extend the existing FileSystem mock at the top of the file:

```ts
jest.mock('expo-file-system/legacy', () => ({
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  documentDirectory: 'file:///documents/',
  cacheDirectory: 'file:///cache/',
}));
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/utils/__tests__/fileSystem.test.ts
```

Expected: FAIL because `getFileInfo` and `getDirectorySize` are not yet imported into the test file.

- [ ] **Step 3: Write minimal implementation**

In `app/src/utils/fileSystem.ts`, replace direct `as any` usage with a narrow helper-local type:

```ts
type FileInfoWithOptionalSize = {
  exists: boolean;
  size?: number;
  isDirectory?: boolean;
};

function getInfoSize(info: FileInfoWithOptionalSize): number {
  return info.exists ? info.size ?? 0 : 0;
}
```

Then use it in the existing functions:

```ts
const info = await FileSystem.getInfoAsync(uri) as FileInfoWithOptionalSize;
return {
  exists: info.exists,
  size: getInfoSize(info),
};
```

```ts
const info = await FileSystem.getInfoAsync(fileUri) as FileInfoWithOptionalSize;
if (info.isDirectory) return getDirectorySize(fileUri);
return getInfoSize(info);
```

Do not change public signatures or fallback behavior.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/utils/__tests__/fileSystem.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/fileSystem.ts src/utils/__tests__/fileSystem.test.ts
git commit -m "refactor(filesystem): remove unsafe size casts"
```

### Task 4: Remove `as any` From Legacy Media Writes In `operations.ts`

**Files:**
- Modify: `app/src/database/operations.ts`
- Modify: `app/src/database/__tests__/operations.test.ts`
- Test: `app/src/database/__tests__/operations.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these two tests to `app/src/database/__tests__/operations.test.ts`:

```ts
it('legacy media column insert uses the first media item when media_json is unavailable', async () => {
  mockDb.getAllAsync.mockResolvedValue([
    { name: 'id' },
    { name: 'type' },
    { name: 'content' },
    { name: 'timestamp' },
    { name: 'tags' },
    { name: 'media_uri' },
    { name: 'media_type' },
    { name: 'media_duration' },
    { name: 'media_thumbnail' },
    { name: 'media_metadata' },
  ]);

  await addEntry({
    type: 'photo',
    content: '',
    syncStatus: 'pending_upload',
    media: [
      {
        uri: 'file:///cache/photo-1.jpg',
        thumbnail: 'file:///cache/thumb-1.jpg',
        mimeType: 'image/jpeg',
        size: 100,
        metadata: { createdAt: 1, modifiedAt: 1 },
      },
      {
        uri: 'file:///cache/photo-2.jpg',
        thumbnail: 'file:///cache/thumb-2.jpg',
        mimeType: 'image/jpeg',
        size: 200,
        metadata: { createdAt: 2, modifiedAt: 2 },
      },
    ],
  });

  const [, params] = mockDb.runAsync.mock.calls[0];
  expect(params).toEqual(expect.arrayContaining([
    'file:///cache/photo-1.jpg',
    'image/jpeg',
    'file:///cache/thumb-1.jpg',
    JSON.stringify({ createdAt: 1, modifiedAt: 1 }),
  ]));
});

it('legacy media column update uses the first media item when media_json is unavailable', async () => {
  mockDb.getAllAsync.mockResolvedValue([
    { name: 'id' },
    { name: 'type' },
    { name: 'content' },
    { name: 'timestamp' },
    { name: 'tags' },
    { name: 'media_uri' },
    { name: 'media_type' },
    { name: 'media_duration' },
    { name: 'media_thumbnail' },
    { name: 'media_metadata' },
  ]);

  await updateEntry('entry-1', {
    media: [
      {
        uri: 'file:///cache/photo-1.jpg',
        thumbnail: 'file:///cache/thumb-1.jpg',
        mimeType: 'image/jpeg',
        size: 100,
        metadata: { createdAt: 1, modifiedAt: 1 },
      },
      {
        uri: 'file:///cache/photo-2.jpg',
        thumbnail: 'file:///cache/thumb-2.jpg',
        mimeType: 'image/jpeg',
        size: 200,
        metadata: { createdAt: 2, modifiedAt: 2 },
      },
    ],
  });

  const [sql, params] = mockDb.runAsync.mock.calls[0];
  expect(sql).toContain('media_uri = ?');
  expect(sql).toContain('media_thumbnail = ?');
  expect(params).toEqual(expect.arrayContaining([
    'file:///cache/photo-1.jpg',
    'image/jpeg',
    'file:///cache/thumb-1.jpg',
    JSON.stringify({ createdAt: 1, modifiedAt: 1 }),
  ]));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/database/__tests__/operations.test.ts -t "legacy media column"
```

Expected: FAIL if the test block placement or assertions do not yet match the current mocked column flow. Fix the test until it fails for the intended legacy-media expectation.

- [ ] **Step 3: Write minimal implementation**

In `app/src/database/operations.ts`, replace each legacy normalization expression with direct first-item access:

```ts
const firstMedia = entry.media?.[0];
```

and

```ts
const firstMedia = updates.media?.[0];
```

Apply this to all four approved production locations in the legacy insert/update branches. Do not change SQL text, field ordering, or JSON serialization behavior.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/database/__tests__/operations.test.ts -t "legacy media column"
```

Then run the broader database suite:

```bash
npm test -- --runInBand --runTestsByPath src/database/__tests__/operations.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/database/operations.ts src/database/__tests__/operations.test.ts
git commit -m "refactor(database): remove legacy media any casts"
```

### Task 5: Final Verification

**Files:**
- Verify only: `app/src/components/__tests__/TimelineEmptyState.test.tsx`
- Verify only: `app/src/components/__tests__/TimelineSectionHeader.test.tsx`
- Verify only: `app/src/utils/__tests__/fileSystem.test.ts`
- Verify only: `app/src/database/__tests__/operations.test.ts`
- Verify only: `app/src/utils/fileSystem.ts`
- Verify only: `app/src/database/operations.ts`

- [ ] **Step 1: Run targeted tests**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/__tests__/TimelineEmptyState.test.tsx src/components/__tests__/TimelineSectionHeader.test.tsx src/utils/__tests__/fileSystem.test.ts src/database/__tests__/operations.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit code `0`.

- [ ] **Step 3: Inspect remaining approved-scope `as any` usage**

Run:

```bash
rg -n "as any" src/utils/fileSystem.ts src/database/operations.ts
```

Expected: no matches.

- [ ] **Step 4: Review git diff**

Run:

```bash
git diff -- src/components/__tests__/TimelineEmptyState.test.tsx src/components/__tests__/TimelineSectionHeader.test.tsx src/utils/fileSystem.ts src/utils/__tests__/fileSystem.test.ts src/database/operations.ts src/database/__tests__/operations.test.ts src/components/TimelineEmptyState.tsx src/components/TimelineSectionHeader.tsx
```

Expected: diff contains only the planned test retargeting, duplicate file removal, and type-safety changes.

- [ ] **Step 5: Commit**

```bash
git add src/components/__tests__/TimelineEmptyState.test.tsx src/components/__tests__/TimelineSectionHeader.test.tsx src/utils/fileSystem.ts src/utils/__tests__/fileSystem.test.ts src/database/operations.ts src/database/__tests__/operations.test.ts
git add -u src/components/TimelineEmptyState.tsx src/components/TimelineSectionHeader.tsx
git commit -m "refactor: tighten type safety and dedupe timeline components"
```
