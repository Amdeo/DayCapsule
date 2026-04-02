# 2026-03-30 Timeline Controller Split Design

## Summary

Perform a minimal structural refactor of `app/src/components/timeline-v2/useTimelineController.ts` by extracting the entry detail/edit flow into a focused local hook, while keeping `useTimelineController()` as the outward-facing controller used by timeline screens.

This is intentionally the first and smallest split for the timeline controller. View-mode switching, search overlay state, scroll/FAB behavior, and action-sheet tracking remain in the existing hook for now.

## Goals

- Reduce the number of unrelated responsibilities inside `useTimelineController.ts`.
- Isolate the most obvious internal state machine: view-entry / close-detail / handoff-to-editor / save-edit.
- Preserve the existing `useTimelineController()` public return shape consumed by timeline views.
- Keep all current detail/edit timing and behavior unchanged.

## Non-Goals

- Refactor scroll/FAB behavior in this change set.
- Refactor view-mode switching in this change set.
- Change timeline screen UI or render structure.
- Redesign action-sheet behavior.

## Current State

`useTimelineController.ts` currently mixes several distinct concerns:

- entry detail and edit lifecycle
- search overlay state
- view-mode toggle and transition timing
- scroll/FAB/show-scroll-top behavior
- action-sheet active item tracking

The clearest extraction boundary is the detail/edit subsystem, which currently owns:

- `viewingEntry`
- `editingEntry`
- `pendingEditingEntryRef`
- `detailToEditorTimerRef`
- `handleSaveEdit()`
- `handleViewEntry()`
- `handleEditEntry()`
- `closeViewingEntry()`
- `closeEditingEntry()`
- `handleDetailEdit()`
- timer cleanup on unmount

This is already a small state machine with explicit transition timing (`DETAIL_PAGE_EXIT_DURATION_MS`) and does not depend on scroll or view-mode animation state.

## Chosen Approach

Keep `useTimelineController()` as the public facade, but extract the detail/edit flow into a nearby local hook, for example:

- `useTimelineEntryDetailState`

This hook will own the detail/edit state machine and return the minimal state/handlers the outer controller needs.

This is preferred over extracting scroll/FAB or view-mode logic first because:

- the detail/edit boundary is already visible in the current state and refs
- the subsystem is internally cohesive and less coupled to `RNAnimated` and `SectionList` refs
- existing hook tests already provide direct coverage for this behavior

## Detailed Design

### 1. New local hook for detail/edit state

Create a new file in the same folder:

- `app/src/components/timeline-v2/useTimelineEntryDetailState.ts`

This hook should encapsulate only the entry detail/edit lifecycle.

It should own:

- `viewingEntry`
- `editingEntry`
- `handleSaveEdit()`
- `handleViewEntry()`
- `handleEditEntry()`
- `closeViewingEntry()`
- `closeEditingEntry()`
- `handleDetailEdit()`
- refs/timer cleanup needed to preserve delayed transition into the editor

It should accept only the minimal dependencies it needs, such as:

- `updateEntry`

It should not own:

- `showSearchOverlay`
- `viewMode` / `displayMode`
- `showScrollTop`
- `fabShouldHide`
- `activeActionSheetId`
- `sectionListRef`

### 2. Keep `useTimelineController()` as orchestrator

After extraction, `useTimelineController()` should continue to own and expose:

- `showSearchOverlay`
- `handleSearchFocus()` / `handleCloseSearch()`
- `viewMode`, `displayMode`, `showViewToggle`, `isTransitioning`, `handleToggleViewMode()`
- `activeActionSheetId`, `handleActionSheetOpen()`
- `showScrollTop`, `scrollTopOpacity`, `scrollTopScale`, `fabShouldHide`
- `handleScroll()`, `scrollToTop()`, `handlePressIn()`, `handlePressOut()`, `revealFab()`

It should compose the new detail-state hook and keep returning the same public shape currently consumed by the timeline view, including:

- `viewingEntry`
- `editingEntry`
- `handleSaveEdit`
- `handleViewEntry`
- `handleEditEntry`
- `closeViewingEntry`
- `closeEditingEntry`
- `handleDetailEdit`

### 3. Preserve timing and transition behavior exactly

The following behavior must remain unchanged:

- only text entries open the detail view via `handleViewEntry`
- direct edit still clears any pending detail-to-editor timer first
- detail-to-editor transition still waits `DETAIL_PAGE_EXIT_DURATION_MS`
- close handlers still clear pending timers and reset pending entry refs
- saving edits still updates entry content/tags and closes the editor state

This refactor is structural only.

### 4. File structure

Expected files after refactor:

- `app/src/components/timeline-v2/useTimelineController.ts`
- `app/src/components/timeline-v2/useTimelineEntryDetailState.ts`

The new hook should stay local to `timeline-v2` and should not be generalized prematurely.

## Testing Strategy

Prefer the existing timeline controller hook tests, because the public controller contract should remain stable.

Most relevant verification targets:

- `app/src/components/__tests__/timeline/timeline.controller.test.tsx`
- `app/src/components/__tests__/timeline/timeline.home.navigation.test.tsx`
- `app/src/components/__tests__/timeline/timeline.home.sync-status.test.tsx`
- `pnpm run test:frontend:home`
- `pnpm run verify`

If an extra regression test is needed, it should focus on externally visible detail/edit behavior, not on whether a new internal hook exists.

## Risks And Mitigations

### Risk: extraction changes detail-to-editor timing

Mitigation:

- move the timer/ref logic mechanically first
- preserve `DETAIL_PAGE_EXIT_DURATION_MS` and current state transitions
- validate with the existing timeline controller tests

### Risk: new hook accidentally absorbs unrelated controller state

Mitigation:

- limit the new hook strictly to detail/edit state
- keep scroll/FAB, view-mode, and search state in the outer controller

### Risk: tests drift toward implementation-detail assertions

Mitigation:

- reuse existing hook-level and timeline home tests as primary guardrails
- avoid adding tests that assert delegation to the new hook by name

## Implementation Boundaries

The implementation should remain minimal:

- Only extract detail/edit lifecycle logic.
- Do not refactor scroll/FAB or view-mode logic in this work item.
- Do not change timeline UI behavior.
- Do not redesign search or action-sheet flows.

## Success Criteria

- `useTimelineController.ts` is meaningfully smaller and easier to scan.
- detail/edit state logic lives in `useTimelineEntryDetailState.ts`.
- `useTimelineController()` keeps the same public return shape for timeline consumers.
- relevant timeline tests and project verification pass.
