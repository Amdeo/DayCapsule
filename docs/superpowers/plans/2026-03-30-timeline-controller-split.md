# Timeline Controller Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the entry detail/edit state machine out of `useTimelineController.ts` while keeping timeline behavior and the controller’s public return shape unchanged.

**Architecture:** Keep `useTimelineController()` as the public composition hook and move only the detail/edit subsystem into a new local hook, `useTimelineEntryDetailState`. Search overlay, view-mode switching, scroll/FAB behavior, and action-sheet tracking stay in the existing controller for this change set.

**Tech Stack:** TypeScript, React, React Native Animated, Jest, Testing Library

---

### Task 1: Extract `useTimelineEntryDetailState`

**Files:**
- Create: `app/src/components/timeline-v2/useTimelineEntryDetailState.ts`
- Modify: `app/src/components/timeline-v2/useTimelineController.ts`
- Test: `app/src/components/__tests__/timeline/timeline.controller.test.tsx`
- Test: `app/src/components/__tests__/timeline/timeline.home.navigation.test.tsx`

- [ ] **Step 1: Write the failing test**

Add one focused regression assertion to `app/src/components/__tests__/timeline/timeline.controller.test.tsx` that proves canceling detail view clears any pending editor handoff so the editor does not reopen unexpectedly.

Append this test if no equivalent assertion already exists:

```ts
it('clears the pending detail-to-editor handoff when the detail view is closed before the timer finishes', () => {
  const entry = {
    id: 'entry-1',
    type: 'text',
    content: '旧内容',
    timestamp: Date.now(),
    syncStatus: 'synced',
  } as any;

  const { result } = renderHook(() =>
    useTimelineController({
      updateEntry: jest.fn(),
    })
  );

  act(() => {
    result.current.handleViewEntry(entry);
    result.current.handleDetailEdit(entry);
    result.current.closeViewingEntry();
  });

  act(() => {
    jest.advanceTimersByTime(DETAIL_PAGE_EXIT_DURATION_MS);
  });

  expect(result.current.editingEntry).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails or meaningfully locks current behavior**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/__tests__/timeline/timeline.controller.test.tsx -t "clears the pending detail-to-editor handoff when the detail view is closed before the timer finishes"
```

Expected:

- Either FAIL because the assertion is new and stricter than current coverage
- Or PASS immediately, which means it now locks the desired behavior before extraction

- [ ] **Step 3: Write the minimal implementation**

Create `app/src/components/timeline-v2/useTimelineEntryDetailState.ts` and move only the detail/edit state machine out of `useTimelineController.ts`.

Target shape:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Entry } from '@/src/types/entry';

const DETAIL_PAGE_EXIT_DURATION_MS = 300;

interface UseTimelineEntryDetailStateOptions {
  updateEntry: (id: string, updates: Partial<Entry>) => void;
}

export function useTimelineEntryDetailState({ updateEntry }: UseTimelineEntryDetailStateOptions) {
  const [viewingEntry, setViewingEntry] = useState<Entry | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const pendingEditingEntryRef = useRef<Entry | null>(null);
  const detailToEditorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // move handleSaveEdit, handleViewEntry, handleEditEntry,
  // closeViewingEntry, closeEditingEntry, handleDetailEdit,
  // and timer cleanup here

  return {
    viewingEntry,
    editingEntry,
    handleSaveEdit,
    handleViewEntry,
    handleEditEntry,
    closeViewingEntry,
    closeEditingEntry,
    handleDetailEdit,
  };
}
```

Then update `useTimelineController.ts` to consume the new hook and keep exposing the same public members currently used by `Timeline.v2.tsx`.

Do not move search, view-mode, scroll/FAB, or action-sheet logic.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/__tests__/timeline/timeline.controller.test.tsx src/components/__tests__/timeline/timeline.home.navigation.test.tsx
```

Then run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/timeline-v2/useTimelineEntryDetailState.ts src/components/timeline-v2/useTimelineController.ts src/components/__tests__/timeline/timeline.controller.test.tsx
git commit -m "refactor: extract timeline entry detail state"
```

### Task 2: Final Verification

**Files:**
- Verify only: `app/src/components/timeline-v2/useTimelineController.ts`
- Verify only: `app/src/components/timeline-v2/useTimelineEntryDetailState.ts`
- Verify only: `app/src/components/__tests__/timeline/timeline.controller.test.tsx`
- Verify only: `app/src/components/__tests__/timeline/timeline.home.navigation.test.tsx`
- Verify only: `app/src/components/__tests__/timeline/timeline.home.sync-status.test.tsx`
- Verify only: `app/src/components/__tests__/Timeline.v2.view-mode.test.tsx`

- [ ] **Step 1: Run focused timeline tests**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/__tests__/timeline/timeline.controller.test.tsx src/components/__tests__/timeline/timeline.home.navigation.test.tsx src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full home frontend suite**

Run:

```bash
npm run test:frontend:home
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
git diff -- src/components/timeline-v2/useTimelineController.ts src/components/timeline-v2/useTimelineEntryDetailState.ts src/components/__tests__/timeline/timeline.controller.test.tsx src/components/__tests__/timeline/timeline.home.navigation.test.tsx src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx
```

Expected: diff contains only the approved detail/edit state extraction and any minimal regression-test additions.

- [ ] **Step 5: Commit**

```bash
git add src/components/timeline-v2/useTimelineController.ts src/components/timeline-v2/useTimelineEntryDetailState.ts src/components/__tests__/timeline/timeline.controller.test.tsx
git commit -m "refactor: split timeline controller" || true
```

If there is nothing left to commit because Task 1 already captured the final code state, record that explicitly in execution notes and do not force an empty commit.
