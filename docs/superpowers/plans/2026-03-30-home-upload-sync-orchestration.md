# Home Upload Sync Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract HomeScreen's upload/sync orchestration policy into a focused service so the screen stops directly owning queue callback wiring, cloud sync indicator refresh triggering, and targeted photo/voice upload enqueue decisions.

**Architecture:** Add a small service module in `app/src/services/` that centralizes Home upload/sync coordination behind pure/focused functions. Keep `app/app/(tabs)/index.tsx` as the composition layer that calls those functions, while preserving existing queue/store APIs and runtime behavior.

**Tech Stack:** React Native, Expo Router, Jest, Zustand store access, upload queue services

---

### Task 1: Extract Queue Callback Wiring And Sync Refresh Policy

**Files:**
- Create: `app/src/services/homeUploadSyncOrchestration.ts`
- Create: `app/src/services/__tests__/homeUploadSyncOrchestration.test.ts`
- Modify: `app/app/(tabs)/index.tsx`

- [ ] **Step 1: Add a failing service test for queue callback wiring behavior**

Create `app/src/services/__tests__/homeUploadSyncOrchestration.test.ts` with a focused test that proves Home upload queue callbacks update entry sync state and refresh the cloud sync indicator:

```tsx
import type { Entry } from '@/src/types/entry';
import {
  createHomeUploadSyncCallbacks,
} from '../homeUploadSyncOrchestration';

describe('homeUploadSyncOrchestration queue callbacks', () => {
  it('marks entries uploading or pending and refreshes the cloud sync indicator', () => {
    const setEntries = jest.fn();
    const refreshIndicator = jest.fn();
    const entry: Entry = {
      id: 'voice-1',
      type: 'voice',
      content: '',
      timestamp: 1,
      syncStatus: 'pending_upload',
      media: [{ uri: 'file:///voice.m4a', mimeType: 'audio/m4a', size: 1, duration: 1 }],
    };

    const callbacks = createHomeUploadSyncCallbacks({
      setEntries,
      refreshIndicator,
    });

    callbacks.onVoiceEntryUploading('voice-1');
    callbacks.onVoiceEntryPendingSync('voice-1', entry);

    expect(setEntries).toHaveBeenCalledTimes(2);
    expect(refreshIndicator).toHaveBeenCalledTimes(2);
  });
});
```

The exact assertion shape can vary, but the test must prove the extracted orchestration API owns:

- mapping upload queue events to entry sync state transitions
- triggering cloud sync indicator refresh after each relevant transition

- [ ] **Step 2: Run the new service test and verify RED**

Run:

```bash
npm test -- --runInBand src/services/__tests__/homeUploadSyncOrchestration.test.ts
```

Expected: FAIL because the new service module and callback factory do not exist yet.

- [ ] **Step 3: Implement the minimal service extraction for queue callback wiring**

Create `app/src/services/homeUploadSyncOrchestration.ts` with a focused API like:

```ts
import type { Entry, MediaInfo } from '@/src/types/entry';

type SetEntries = (updater: (entries: Entry[]) => Entry[]) => void;

export function updateEntrySyncState(
  entries: Entry[],
  entryId: string,
  updater: (entry: Entry) => Entry
): Entry[] {
  return entries.map((entry) => (entry.id === entryId ? updater(entry) : entry));
}

export function createHomeUploadSyncCallbacks({
  setEntries,
  refreshIndicator,
}: {
  setEntries: SetEntries;
  refreshIndicator: () => void;
}) {
  return {
    onVoiceEntryUploading(id: string) {
      setEntries((entries) => updateEntrySyncState(entries, id, (entry) => ({ ...entry, syncStatus: 'uploading' })));
      refreshIndicator();
    },
    onVoiceEntryPending(id: string) {
      setEntries((entries) => updateEntrySyncState(entries, id, (entry) => ({ ...entry, syncStatus: 'pending_upload' })));
      refreshIndicator();
    },
    onVoiceEntryPendingSync(id: string, entry: Entry) {
      setEntries((entries) => updateEntrySyncState(entries, id, (current) => ({ ...current, syncStatus: 'pending', media: entry.media })));
      refreshIndicator();
    },
    onPhotoEntryUploading(id: string) {
      setEntries((entries) => updateEntrySyncState(entries, id, (entry) => ({ ...entry, syncStatus: 'uploading' })));
      refreshIndicator();
    },
    onPhotoEntryPendingUpload(id: string) {
      setEntries((entries) => updateEntrySyncState(entries, id, (entry) => ({ ...entry, syncStatus: 'pending_upload' })));
      refreshIndicator();
    },
    onPhotoEntryPendingSync(id: string, media: MediaInfo[]) {
      setEntries((entries) => updateEntrySyncState(entries, id, (entry) => ({ ...entry, syncStatus: 'pending', media })));
      refreshIndicator();
    },
  };
}
```

Then change `app/app/(tabs)/index.tsx` so the queue callback registration effect delegates to this service instead of inlining the mapping logic.

The `setEntries` adapter inside `index.tsx` should remain small and local, for example:

```ts
const setEntries = useCallback((updater: (entries: Entry[]) => Entry[]) => {
  useEntryStore.setState((state) => ({
    entries: updater(state.entries),
  }));
}, []);

const uploadSyncCallbacks = useMemo(
  () => createHomeUploadSyncCallbacks({
    setEntries,
    refreshIndicator: refreshCloudSyncIndicator,
  }),
  [setEntries, refreshCloudSyncIndicator]
);
```

and then:

```ts
configureVoiceUploadQueueCallbacks({
  onEntryUploading: uploadSyncCallbacks.onVoiceEntryUploading,
  onEntryPending: uploadSyncCallbacks.onVoiceEntryPending,
  onEntryPendingSync: uploadSyncCallbacks.onVoiceEntryPendingSync,
});

configurePhotoUploadQueueCallbacks({
  onEntryUploading: uploadSyncCallbacks.onPhotoEntryUploading,
  onEntryPendingUpload: uploadSyncCallbacks.onPhotoEntryPendingUpload,
  onEntryPendingSync: uploadSyncCallbacks.onPhotoEntryPendingSync,
});
```

- [ ] **Step 4: Re-run the new service test and verify GREEN**

Run:

```bash
npm test -- --runInBand src/services/__tests__/homeUploadSyncOrchestration.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the callback-wiring extraction**

Run:

```bash
git add app/src/services/homeUploadSyncOrchestration.ts app/src/services/__tests__/homeUploadSyncOrchestration.test.ts app/app/(tabs)/index.tsx
git commit -m "refactor: extract home upload sync callbacks"
```

### Task 2: Extract Upload Enqueue Decision Policy

**Files:**
- Modify: `app/src/services/homeUploadSyncOrchestration.ts`
- Modify: `app/src/services/__tests__/homeUploadSyncOrchestration.test.ts`
- Modify: `app/app/(tabs)/index.tsx`
- Verify against: `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts`
- Verify against: `app/app/(tabs)/__tests__/index.photo.test.ts`

- [ ] **Step 1: Add a failing service test for enqueue decision behavior**

Extend `app/src/services/__tests__/homeUploadSyncOrchestration.test.ts` with one focused test that proves upload enqueue policy remains correct for cloud-mode media flows:

```tsx
import {
  resolveHomeUploadSyncActions,
} from '../homeUploadSyncOrchestration';

describe('homeUploadSyncOrchestration enqueue decisions', () => {
  it('enqueues photo and voice uploads only when cloud mode is enabled', () => {
    const enqueueVoice = jest.fn();
    const enqueuePhoto = jest.fn();

    const enabled = resolveHomeUploadSyncActions({
      isCloudModeEnabled: true,
      enqueueVoiceUpload: enqueueVoice,
      enqueuePhotoUpload: enqueuePhoto,
    });
    const disabled = resolveHomeUploadSyncActions({
      isCloudModeEnabled: false,
      enqueueVoiceUpload: enqueueVoice,
      enqueuePhotoUpload: enqueuePhoto,
    });

    enabled.enqueueVoiceUpload('voice-1');
    enabled.enqueuePhotoUpload('photo-1');
    disabled.enqueueVoiceUpload('voice-2');
    disabled.enqueuePhotoUpload('photo-2');

    expect(enqueueVoice).toHaveBeenCalledWith('voice-1');
    expect(enqueuePhoto).toHaveBeenCalledWith('photo-1');
    expect(enqueueVoice).not.toHaveBeenCalledWith('voice-2');
    expect(enqueuePhoto).not.toHaveBeenCalledWith('photo-2');
  });
});
```

- [ ] **Step 2: Run the service test and verify RED for the new enqueue API**

Run:

```bash
npm test -- --runInBand src/services/__tests__/homeUploadSyncOrchestration.test.ts
```

Expected: FAIL because the enqueue-decision API does not exist yet.

- [ ] **Step 3: Implement the minimal enqueue-decision extraction**

Extend `app/src/services/homeUploadSyncOrchestration.ts` with a focused helper like:

```ts
export function resolveHomeUploadSyncActions({
  isCloudModeEnabled,
  enqueueVoiceUpload,
  enqueuePhotoUpload,
}: {
  isCloudModeEnabled: boolean;
  enqueueVoiceUpload: (entryId: string) => void;
  enqueuePhotoUpload: (entryId: string) => void;
}) {
  return {
    enqueueVoiceUpload(entryId: string) {
      if (!isCloudModeEnabled) return;
      enqueueVoiceUpload(entryId);
    },
    enqueuePhotoUpload(entryId: string) {
      if (!isCloudModeEnabled) return;
      enqueuePhotoUpload(entryId);
    },
    getPhotoInitialSyncStatus() {
      return isCloudModeEnabled ? 'pending_upload' : 'synced';
    },
  };
}
```

Then update `app/app/(tabs)/index.tsx` so:

- `handleStopRecording` delegates cloud-mode voice enqueue through the orchestration service
- `handlePhotoSelectArr` gets `enqueueUpload` and `initialSyncStatus` through the orchestration service instead of inline conditionals

Keep the recording and photo flow structure otherwise unchanged.

- [ ] **Step 4: Re-run the service test and verify GREEN**

Run:

```bash
npm test -- --runInBand src/services/__tests__/homeUploadSyncOrchestration.test.ts
```

Expected: PASS.

- [ ] **Step 5: Re-run focused Home flow tests**

Run:

```bash
npm test -- --runInBand --runTestsByPath "app/(tabs)/__tests__/index.voice-cloud-mode.test.ts" "app/(tabs)/__tests__/index.photo.test.ts"
```

Expected: PASS.

- [ ] **Step 6: Commit the enqueue-decision extraction**

Run:

```bash
git add app/src/services/homeUploadSyncOrchestration.ts app/src/services/__tests__/homeUploadSyncOrchestration.test.ts app/app/(tabs)/index.tsx
git commit -m "refactor: extract home upload enqueue decisions"
```

### Task 3: Run Full Verification And Confirm Final Scope

**Files:**
- Verify only: `app/app/(tabs)/index.tsx`
- Verify only: `app/src/services/homeUploadSyncOrchestration.ts`
- Verify only: `app/src/services/__tests__/homeUploadSyncOrchestration.test.ts`

- [ ] **Step 1: Run the focused Home verification surface**

Run:

```bash
npm test -- --runInBand --runTestsByPath "app/(tabs)/__tests__/index.voice-cloud-mode.test.ts" "app/(tabs)/__tests__/index.photo.test.ts" src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/services/__tests__/homeUploadSyncOrchestration.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the full app verification gate**

Run:

```bash
npm run verify
```

Expected: lint, typecheck, and the full Jest suite pass.

- [ ] **Step 3: Confirm the worktree only contains intended changes for this batch**

Run:

```bash
git status --short
```

Expected: only the Home upload/sync orchestration code/tests/spec/plan paths are changed in this worktree.
