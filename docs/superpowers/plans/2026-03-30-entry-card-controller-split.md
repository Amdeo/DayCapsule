# Entry Card Controller Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the swipe/action-sheet state machine out of `useEntryCardController.ts` while keeping `EntryCard` behavior and the controller’s public return shape unchanged.

**Architecture:** Keep `useEntryCardController()` as the public composition hook and move only the swipe/action-sheet interaction subsystem into a new local hook, `useEntryCardActionSheetState`. All media-viewer state, card-press routing, and stop-recording guarding stay in the existing controller for this change set.

**Tech Stack:** TypeScript, React, React Native Gesture Handler, Jest, Testing Library

---

### Task 1: Extract `useEntryCardActionSheetState`

**Files:**
- Create: `app/src/components/entry-card/useEntryCardActionSheetState.ts`
- Modify: `app/src/components/entry-card/useEntryCardController.ts`
- Test: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Add one focused regression assertion to `app/src/components/__tests__/EntryCard.test.tsx` that proves action-sheet closing still resets the interaction cycle so a second swipe can reopen it.

Append this test near the existing swipe/action-sheet cases if no equivalent assertion already exists:

```ts
it('can reopen the action sheet after it closes and resets', () => {
  const { getByTestId, queryByTestId } = render(
    <EntryCard entry={mockEntry} onDelete={jest.fn()} />
  );

  act(() => {
    getByTestId('swipeable').props.onSwipeableOpen('right');
    jest.advanceTimersByTime(100);
  });

  expect(getByTestId('entry-action-sheet')).toBeTruthy();

  fireEvent.press(getByTestId('action-sheet-cancel'));
  expect(queryByTestId('entry-action-sheet')).toBeNull();

  act(() => {
    jest.advanceTimersByTime(ENTRY_ACTION_SHEET_EXIT_DURATION);
    getByTestId('swipeable').props.onSwipeableOpen('right');
    jest.advanceTimersByTime(100);
  });

  expect(getByTestId('entry-action-sheet')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails or meaningfully locks current behavior**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/EntryCard.test.tsx -t "can reopen the action sheet after it closes and resets"
```

Expected:

- Either FAIL because the assertion is new and stricter than current coverage
- Or PASS immediately, which means it now locks the desired behavior before extraction

- [ ] **Step 3: Write the minimal implementation**

Create `app/src/components/entry-card/useEntryCardActionSheetState.ts` and move only the swipe/action-sheet subsystem out of `useEntryCardController.ts`.

Target shape:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Swipeable } from 'react-native-gesture-handler';
import { logger } from '@/src/utils/logger';
import { ENTRY_ACTION_SHEET_EXIT_DURATION } from '../entry-action-sheet/entryActionSheetConfig';

const ACTION_SHEET_OPEN_DELAY = 100;

export type CardInteractionState = 'idle' | 'pendingSheet' | 'sheetOpen' | 'closing';

interface UseEntryCardActionSheetStateOptions {
  entryId: string;
  isActionSheetActive?: boolean;
  onActionSheetOpen?: (entryId: string) => void;
}

export function useEntryCardActionSheetState({
  entryId,
  isActionSheetActive,
  onActionSheetOpen,
}: UseEntryCardActionSheetStateOptions) {
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [interactionState, setInteractionState] = useState<CardInteractionState>('idle');
  const interactionStateRef = useRef<CardInteractionState>('idle');
  const swipeableRef = useRef<Swipeable>(null);
  const openSheetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetCardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // move clearOpenSheetTimeout, clearResetCardTimeout, setInteractionStateSafely,
  // closeActionSheetAndResetCard, handleSwipeTrigger, and the related effects here

  return {
    swipeableRef,
    showActionSheet,
    handleSwipeTrigger,
    closeActionSheetAndResetCard,
  };
}
```

Then update `useEntryCardController.ts` to consume the new hook and keep exposing the same public members currently used by `EntryCard.tsx`.

Do not move image-viewer state, `handleCardPress()`, or `runStopRecording()`.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/EntryCard.test.tsx
```

Then run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/entry-card/useEntryCardActionSheetState.ts src/components/entry-card/useEntryCardController.ts src/components/__tests__/EntryCard.test.tsx
git commit -m "refactor: extract entry card action sheet state"
```

### Task 2: Final Verification

**Files:**
- Verify only: `app/src/components/entry-card/useEntryCardController.ts`
- Verify only: `app/src/components/entry-card/useEntryCardActionSheetState.ts`
- Verify only: `app/src/components/__tests__/EntryCard.test.tsx`
- Verify only: `app/src/components/__tests__/EntryCard.missing-media.test.tsx`
- Verify only: `app/src/components/__tests__/image/entry-card.missing-media-variants.test.tsx`

- [ ] **Step 1: Run focused entry-card tests**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/EntryCard.test.tsx src/components/__tests__/EntryCard.missing-media.test.tsx src/components/__tests__/image/entry-card.missing-media-variants.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full editor/image frontend suite**

Run:

```bash
pnpm run test:frontend:editor-image
```

Expected: PASS.

- [ ] **Step 3: Run full project verification**

Run:

```bash
pnpm run verify
```

Expected: PASS.

- [ ] **Step 4: Review final scoped diff**

Run:

```bash
git diff -- src/components/entry-card/useEntryCardController.ts src/components/entry-card/useEntryCardActionSheetState.ts src/components/__tests__/EntryCard.test.tsx src/components/__tests__/EntryCard.missing-media.test.tsx src/components/__tests__/image/entry-card.missing-media-variants.test.tsx
```

Expected: diff contains only the approved action-sheet state extraction and any minimal regression-test additions.

- [ ] **Step 5: Commit**

```bash
git add src/components/entry-card/useEntryCardController.ts src/components/entry-card/useEntryCardActionSheetState.ts src/components/__tests__/EntryCard.test.tsx
git commit -m "refactor: split entry card controller" || true
```

If there is nothing left to commit because Task 1 already captured the final code state, record that explicitly in execution notes and do not force an empty commit.
