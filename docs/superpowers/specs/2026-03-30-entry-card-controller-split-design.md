# 2026-03-30 Entry Card Controller Split Design

## Summary

Perform a minimal structural refactor of `app/src/components/entry-card/useEntryCardController.ts` by extracting the swipe/action-sheet interaction state machine into a focused local hook, while keeping `useEntryCardController()` as the outward-facing controller used by `EntryCard.tsx`.

This is intentionally the first and smallest split for the entry-card controller. Media-viewer state, card-press routing, and stop-recording guard logic remain in the existing hook for now.

## Goals

- Reduce the number of unrelated responsibilities inside `useEntryCardController.ts`.
- Isolate the most stateful and timing-sensitive portion of the controller: swipe/action-sheet orchestration.
- Preserve the existing `useEntryCardController()` public return shape consumed by `EntryCard.tsx`.
- Keep all current entry-card behavior, delays, and gesture semantics unchanged.

## Non-Goals

- Refactor image-viewer state in this change set.
- Refactor `runStopRecording()` in this change set.
- Change `EntryCard.tsx` render structure or visual behavior.
- Redesign the swipe UX or action-sheet UX.

## Current State

`useEntryCardController.ts` currently mixes several distinct concerns:

- expand/press/image-viewer local UI state
- swipe lifecycle handling
- action-sheet open/close delayed state machine
- card-press routing by entry type
- stop-recording in-flight guarding and timer cleanup

The clearest extraction boundary is the swipe/action-sheet subsystem, which currently owns:

- `showActionSheet`
- `interactionState`
- `interactionStateRef`
- `swipeableRef`
- `openSheetTimeoutRef`
- `resetCardTimeoutRef`
- `clearOpenSheetTimeout()`
- `clearResetCardTimeout()`
- `setInteractionStateSafely()`
- `closeActionSheetAndResetCard()`
- `handleSwipeTrigger()`
- the `isActionSheetActive === false` reconciliation effect
- part of the unmount cleanup effect

This is the most stateful and coordination-heavy logic in the file, and it already behaves like an internal state machine.

## Chosen Approach

Keep `useEntryCardController()` as the public facade, but extract the swipe/action-sheet logic into a nearby local hook, for example:

- `useEntryCardActionSheetState`

This hook will own the action-sheet state machine and return the minimal state/handlers the outer controller needs.

This is preferred over splitting the card-press or stop-recording logic first because:

- the boundary is already visible in the current state/refs/effects
- the timing and gesture code is the most self-contained subsystem
- existing `EntryCard.test.tsx` coverage already exercises swipe and action-sheet behavior heavily

## Detailed Design

### 1. New local hook for swipe/action-sheet state

Create a new file in the same folder:

- `app/src/components/entry-card/useEntryCardActionSheetState.ts`

This hook should encapsulate only the swipe/action-sheet interaction state machine.

It should own:

- `showActionSheet`
- `swipeableRef`
- `interactionState` and its ref
- the two timeout refs for opening/resetting the sheet
- `handleSwipeTrigger()`
- `closeActionSheetAndResetCard()`
- any related cleanup and inactive-sheet reconciliation effects

It should accept only the minimal dependencies it needs, such as:

- `entryId`
- `isActionSheetActive`
- `onActionSheetOpen`

It should not own:

- image-viewer state
- `handleCardPress()`
- `runStopRecording()`
- delete/edit callbacks themselves

### 2. Keep `useEntryCardController()` as orchestrator

After extraction, `useEntryCardController()` should continue to own and expose:

- `isExpanded`
- `isPressed`
- `isProcessing`
- `showImageViewer`
- `selectedImageIndex`
- `needsExpansion`
- `setIsPressed`
- `handleLongPress`
- `handleImagePress`
- `handleCardPress`
- `runStopRecording`
- `handleActionSheetEdit`
- `handleActionSheetDelete`
- `closeImageViewer`

It should compose the new action-sheet hook and keep returning the same public shape currently consumed by `EntryCard.tsx`, including:

- `swipeableRef`
- `showActionSheet`
- `handleSwipeTrigger`
- `closeActionSheetAndResetCard`

### 3. Preserve timing and gesture behavior exactly

The following behavior must remain unchanged:

- action sheet opens only after `ACTION_SHEET_OPEN_DELAY`
- duplicate swipe lifecycle callbacks are ignored
- non-right swipe directions are ignored
- closing the action sheet resets interaction state after `ENTRY_ACTION_SHEET_EXIT_DURATION`
- when `isActionSheetActive === false`, non-idle cards reconcile by closing

This refactor is structural only.

### 4. File structure

Expected files after refactor:

- `app/src/components/entry-card/useEntryCardController.ts`
- `app/src/components/entry-card/useEntryCardActionSheetState.ts`

The new hook should stay local to the entry-card folder and should not be generalized prematurely.

## Testing Strategy

Prefer existing `EntryCard` integration tests, because the public controller contract should remain stable.

Most relevant verification targets:

- `app/src/components/__tests__/EntryCard.test.tsx`
- `app/src/components/__tests__/EntryCard.missing-media.test.tsx`
- `app/src/components/__tests__/image/entry-card.missing-media-variants.test.tsx`
- `pnpm run verify`

If an extra regression test is needed, it should focus on externally visible swipe/action-sheet behavior, not on whether the new internal hook exists.

## Risks And Mitigations

### Risk: extraction changes action-sheet timing behavior

Mitigation:

- move the timing logic mechanically first
- preserve the same constants and timeout ordering
- validate with existing swipe/action-sheet tests

### Risk: new hook accidentally absorbs unrelated entry-card concerns

Mitigation:

- limit the new hook strictly to action-sheet/swipe state
- keep media-viewer, card-press routing, and stop-recording logic in the outer controller

### Risk: tests drift toward implementation-detail assertions

Mitigation:

- reuse existing EntryCard integration tests as primary guardrails
- avoid adding tests that assert the controller delegates to a new hook by name

## Implementation Boundaries

The implementation should remain minimal:

- Only extract swipe/action-sheet interaction logic.
- Do not refactor image-viewer state or stop-recording flow in this work item.
- Do not change `EntryCard.tsx` UI behavior.
- Do not redesign gesture semantics.

## Success Criteria

- `useEntryCardController.ts` is meaningfully smaller and easier to scan.
- swipe/action-sheet logic lives in `useEntryCardActionSheetState.ts`.
- `useEntryCardController()` keeps the same public return shape for `EntryCard.tsx`.
- relevant entry-card tests and project verification pass.
