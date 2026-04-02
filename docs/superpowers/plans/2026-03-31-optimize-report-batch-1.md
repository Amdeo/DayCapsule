# Optimize Report Batch 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved low-risk optimization batch: add the missing `sync_status` index, ensure the voice recorder cancels active recording on modal close, tighten hot-path Zustand subscriptions in `Timeline.v2` and `EntryCard`, and replace low-value database-row `any` usage with explicit row typing.

**Architecture:** Keep all changes local to the approved files and existing test suites. Use TDD for the real behavior change first, then make the smallest production edits to satisfy those tests while preserving runtime behavior. For the store cleanup, narrow subscriptions in the two approved hot paths without restructuring `entryStore` or broadening cleanup to every consumer.

**Tech Stack:** TypeScript, React Native, Zustand, Expo SQLite, Jest, Testing Library

---

### Task 1: Add `sync_status` Schema Coverage And Row Typing

**Files:**
- Modify: `app/src/database/sqlite.ts`
- Modify: `app/src/database/operations.ts`
- Test: `app/src/database/__tests__/sqlite.test.ts`
- Test: `app/src/database/__tests__/operations.test.ts`

- [ ] **Step 1: Write the failing tests**

In `app/src/database/__tests__/sqlite.test.ts`, add a schema assertion right after the existing local-ready-state test coverage:

```ts
it('creates an index for sync_status in the base schema', async () => {
  await initDatabase();

  const db = openDatabase() as { execAsync: jest.Mock };
  const createIndexSql = db.execAsync.mock.calls[2][0] as string;

  expect(createIndexSql).toContain(
    'CREATE INDEX IF NOT EXISTS idx_entries_sync_status ON entries(sync_status);'
  );
});
```

In `app/src/database/__tests__/operations.test.ts`, add a typing-oriented regression that still exercises row mapping with a legacy-media row shape so the conversion helpers remain covered after `row: any` is removed:

```ts
it('maps a legacy media row with optional fields through row conversion', async () => {
  mockDb.getAllAsync.mockResolvedValue([
    {
      id: 'typed-row-1',
      type: 'voice',
      content: '',
      timestamp: 1700000003000,
      tags: null,
      media_json: null,
      media_uri: 'file:///legacy/voice.m4a',
      media_type: 'audio/m4a',
      media_duration: 18000,
      media_thumbnail: null,
      media_metadata: null,
      recording_status: 'completed',
      recording_duration: 18,
      sync_status: 'synced',
      sync_op: 'update',
      conflicted_copy_of: null,
      base_updated_at: null,
      user_id: null,
      deleted: 0,
      local_ready_state: 'ready',
      updated_at: 1700000003000,
    },
  ]);

  const result = await getAllEntries();

  expect(result[0]).toEqual(
    expect.objectContaining({
      id: 'typed-row-1',
      syncStatus: 'synced',
      localReadyState: 'ready',
      media: [
        expect.objectContaining({
          uri: 'file:///legacy/voice.m4a',
          mimeType: 'audio/m4a',
        }),
      ],
    })
  );
});
```

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/database/__tests__/sqlite.test.ts src/database/__tests__/operations.test.ts
```

Expected: `sqlite.test.ts` fails because the new index assertion is not yet true. `operations.test.ts` should stay green or fail only if the row-shape assumptions expose a typing-related mismatch after the next code change.

- [ ] **Step 3: Write the minimal implementation**

In `app/src/database/sqlite.ts`, add the missing index to the existing index block:

```ts
await db.execAsync(`
  CREATE INDEX IF NOT EXISTS idx_entries_timestamp ON entries(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(type);
  CREATE INDEX IF NOT EXISTS idx_entries_recording_status ON entries(recording_status);
  CREATE INDEX IF NOT EXISTS idx_entries_sync_status ON entries(sync_status);
  CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags(tag_id);
  CREATE INDEX IF NOT EXISTS idx_entry_tags_entry ON entry_tags(entry_id);
`);
```

In `app/src/database/operations.ts`, replace the `row: any` parameters used by `getLegacyEntryMedia` and `rowToEntry` with a local explicit row type that covers the fields those helpers currently read:

```ts
type EntryRow = {
  id: string;
  type: Entry['type'];
  content: string;
  timestamp: number;
  tags: string | null;
  media_uri?: string | null;
  media_type?: string | null;
  media_duration?: number | null;
  media_thumbnail?: string | null;
  media_metadata?: string | null;
  media_json?: string | null;
  recording_status?: Entry['recordingStatus'] | null;
  recording_duration?: number | null;
  sync_status?: Entry['syncStatus'] | null;
  sync_op?: Entry['syncOp'] | null;
  conflicted_copy_of?: string | null;
  base_updated_at?: number | null;
  user_id?: string | null;
  deleted?: number | null;
  local_ready_state?: Entry['localReadyState'] | null;
  updated_at?: number | null;
};

const getLegacyEntryMedia = (row: EntryRow): EntryMediaInfo[] | undefined => {
  ...
};

const rowToEntry = (row: EntryRow): Entry => {
  ...
};
```

Keep the type local to the file and do not broaden this task into typing every SQL params array.

- [ ] **Step 4: Run tests to verify green**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/database/__tests__/sqlite.test.ts src/database/__tests__/operations.test.ts
```

Then run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/database/sqlite.ts src/database/operations.ts src/database/__tests__/sqlite.test.ts src/database/__tests__/operations.test.ts
git commit -m "perf: add sync status index"
```

### Task 2: Cancel Active Recording When The Modal Closes

**Files:**
- Modify: `app/src/components/voice-recorder/useVoiceRecorderController.ts`
- Test: `app/src/components/__tests__/VoiceRecorder.test.tsx`

- [ ] **Step 1: Write the failing test**

Add this test to `app/src/components/__tests__/VoiceRecorder.test.tsx` after the existing dismiss-while-recording case:

```ts
it('cancels the active recording when the modal becomes hidden externally', async () => {
  const screen = render(
    <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
  );

  fireEvent.press(screen.getByText('开始录音'));

  await waitFor(() => {
    expect(screen.getByTestId('voice-recorder-recording')).toBeTruthy();
  });

  screen.rerender(<VoiceRecorder visible={false} onSave={jest.fn()} onCancel={jest.fn()} />);

  await waitFor(() => {
    expect(VoiceService.cancelRecording).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify red**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/VoiceRecorder.test.tsx
```

Expected: FAIL because hiding the modal currently resets local state without cancelling the active recorder.

- [ ] **Step 3: Write the minimal implementation**

In `app/src/components/voice-recorder/useVoiceRecorderController.ts`, add visibility cleanup that treats modal closure as cancellation:

```ts
useEffect(() => {
  if (visible) {
    return;
  }

  void VoiceService.cancelRecording().catch((error) => {
    logger.error('Failed to cancel recording during visibility cleanup:', error);
  });

  setIsRecording(false);
  setIsPaused(false);
  setDuration(0);
  setRecordingUri(null);
  setIsLoading(false);
}, [visible]);
```

If a small guard is needed to avoid duplicate cleanup during an already-handled cancel flow, add only the smallest condition required. Do not switch this behavior to `stopRecording()`.

- [ ] **Step 4: Run test to verify green**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/VoiceRecorder.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/voice-recorder/useVoiceRecorderController.ts src/components/__tests__/VoiceRecorder.test.tsx
git commit -m "fix: cancel recorder on modal close"
```

### Task 3: Tighten Hot-Path `entryStore` Subscriptions

**Files:**
- Modify: `app/src/components/Timeline.v2.tsx`
- Modify: `app/src/components/EntryCard.tsx`
- Test: `app/src/components/__tests__/timeline/timeline.home.sync-status.test.tsx`
- Test: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: Write the failing tests through mock shape pressure**

Update the existing store mocks so they only satisfy selector-based access instead of full-store access.

In `app/src/components/__tests__/timeline/timeline.home.sync-status.test.tsx`, replace the current mock with a selector-aware version:

```ts
const mockEntryStoreState = {
  entries: [],
  searchQuery: '',
  filterType: 'all',
  filterDateRange: 'all',
  selectedTags: [],
  deleteEntry: jest.fn(),
  updateEntry: jest.fn(),
  setSearchQuery: jest.fn(),
  setFilterType: jest.fn(),
  setFilterDateRange: jest.fn(),
  toggleTag: jest.fn(),
  clearTags: jest.fn(),
  loadMore: jest.fn(),
  isLoadingMore: false,
  hasMore: false,
};

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: (selector: (state: typeof mockEntryStoreState) => unknown) =>
    selector(mockEntryStoreState),
}));
```

In `app/src/components/__tests__/EntryCard.test.tsx`, replace the current mock with:

```ts
const mockEntryStoreState = {
  currentPlayingId: null as string | null,
  setCurrentPlayingId: jest.fn(),
};

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: (selector: (state: typeof mockEntryStoreState) => unknown) =>
    selector(mockEntryStoreState),
}));
```

These test edits should fail before production code changes because `Timeline.v2` and `EntryCard` currently call `useEntryStore()` without selectors.

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/EntryCard.test.tsx
```

Expected: FAIL because the components still expect whole-store returns.

- [ ] **Step 3: Write the minimal implementation**

In `app/src/components/Timeline.v2.tsx`, replace the whole-store destructure with individual selectors for the exact fields/actions currently used, for example:

```ts
const entries = useEntryStore((state) => state.entries);
const deleteEntry = useEntryStore((state) => state.deleteEntry);
const searchQuery = useEntryStore((state) => state.searchQuery);
const updateEntry = useEntryStore((state) => state.updateEntry);
const filterType = useEntryStore((state) => state.filterType);
const filterDateRange = useEntryStore((state) => state.filterDateRange);
const selectedTags = useEntryStore((state) => state.selectedTags);
const setSearchQuery = useEntryStore((state) => state.setSearchQuery);
const setFilterType = useEntryStore((state) => state.setFilterType);
const setFilterDateRange = useEntryStore((state) => state.setFilterDateRange);
const toggleTag = useEntryStore((state) => state.toggleTag);
const clearTags = useEntryStore((state) => state.clearTags);
const loadMore = useEntryStore((state) => state.loadMore);
const isLoadingMore = useEntryStore((state) => state.isLoadingMore);
const hasMore = useEntryStore((state) => state.hasMore);
```

In `app/src/components/EntryCard.tsx`, narrow store access to only:

```ts
const currentPlayingId = useEntryStore((state) => state.currentPlayingId);
const setCurrentPlayingId = useEntryStore((state) => state.setCurrentPlayingId);
```

Do not broaden this task into other components.

- [ ] **Step 4: Run tests to verify green**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/EntryCard.test.tsx src/components/__tests__/timeline/timeline.home.navigation.test.tsx
```

Then run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Timeline.v2.tsx src/components/EntryCard.tsx src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/EntryCard.test.tsx
git commit -m "perf: narrow timeline store subscriptions"
```

### Task 4: Final Verification

**Files:**
- Verify only: `app/src/database/sqlite.ts`
- Verify only: `app/src/database/operations.ts`
- Verify only: `app/src/components/voice-recorder/useVoiceRecorderController.ts`
- Verify only: `app/src/components/Timeline.v2.tsx`
- Verify only: `app/src/components/EntryCard.tsx`
- Verify only: `app/src/database/__tests__/sqlite.test.ts`
- Verify only: `app/src/database/__tests__/operations.test.ts`
- Verify only: `app/src/components/__tests__/VoiceRecorder.test.tsx`
- Verify only: `app/src/components/__tests__/timeline/timeline.home.sync-status.test.tsx`
- Verify only: `app/src/components/__tests__/timeline/timeline.home.navigation.test.tsx`
- Verify only: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: Run scoped regression tests**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/database/__tests__/sqlite.test.ts src/database/__tests__/operations.test.ts src/components/__tests__/VoiceRecorder.test.tsx src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/timeline/timeline.home.navigation.test.tsx src/components/__tests__/EntryCard.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run lint and typecheck**

Run:

```bash
pnpm run lint
```

Then run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run project verify if the scoped suite is clean and time allows**

Run:

```bash
pnpm run verify
```

Expected: PASS. If this is too slow or reveals unrelated pre-existing failures, record the exact failure and stop widening the fix scope.

- [ ] **Step 4: Commit**

```bash
git add src/database/sqlite.ts src/database/operations.ts src/components/voice-recorder/useVoiceRecorderController.ts src/components/Timeline.v2.tsx src/components/EntryCard.tsx src/database/__tests__/sqlite.test.ts src/database/__tests__/operations.test.ts src/components/__tests__/VoiceRecorder.test.tsx src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/timeline/timeline.home.navigation.test.tsx src/components/__tests__/EntryCard.test.tsx
git commit -m "perf: apply report batch one optimizations"
```
