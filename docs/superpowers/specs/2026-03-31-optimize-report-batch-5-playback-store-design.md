# 2026-03-31 Optimize Report Batch 5 Playback Store Design

## Summary

Implement a minimal store split that extracts playback-only UI state out of `entryStore`. The only state moved in this batch is `currentPlayingId` and its setter. All entry data, paging, filtering, CRUD, and sync behavior remain in `entryStore` unchanged.

This batch is intentionally narrow. It is the first step of the larger store-responsibility cleanup and avoids touching search/filter state or data-loading architecture.

## Goals

- Remove playback-only UI state from `entryStore`.
- Introduce a dedicated tiny Zustand store for `currentPlayingId`.
- Update `EntryCard` and its playback helpers to use the new store.
- Keep all existing playback behavior unchanged.
- Minimize the rerender surface tied to data-store updates.

## Non-Goals

- Split search/filter state out of `entryStore`.
- Refactor `Timeline.v2`, `SearchOverlay`, or `FilterBar` store ownership.
- Change audio playback behavior.
- Change entry CRUD, pagination, or sync flows.
- Introduce a broader UI store abstraction.

## Approved Scope

Files expected to change:

- `app/src/store/entryStore.ts`
- New small store file under `app/src/store/`
- `app/src/components/EntryCard.tsx`
- Related playback tests that currently mock `entryStore` for `currentPlayingId`

## Approaches Considered

### Approach A: Extract only playback UI state (recommended)

Create a tiny dedicated store such as `useEntryPlaybackUIStore` with:

- `currentPlayingId`
- `setCurrentPlayingId`

Pros:

- Smallest safe split.
- Immediate responsibility improvement.
- Minimal test churn.

Cons:

- Leaves filter/search UI state in `entryStore` for now.

### Approach B: Extract playback plus filter/search state

Move both playback state and query/filter state into separate UI stores.

Pros:

- Larger responsibility cleanup.

Cons:

- Much larger test and call-site surface.
- Higher regression risk.

### Approach C: Full data/UI store split

Replace `entryStore` with multiple new stores in one batch.

Pros:

- Most complete architecture cleanup.

Cons:

- Too large for this iteration.

## Chosen Approach

Use Approach A.

This is the smallest slice that cleanly separates pure UI playback state from data/pagination/sync responsibilities.

## Detailed Design

### 1. Create a tiny playback store

Add a new store file under `app/src/store/`, for example `entryPlaybackUIStore.ts`, containing only:

- `currentPlayingId: string | null`
- `setCurrentPlayingId(id: string | null)`

Design decisions:

- Keep it fully independent from `entryStore`.
- No selectors or helpers beyond what is needed for the two fields.

### 2. Remove playback state from `entryStore`

Delete from `EntryStore`:

- `currentPlayingId`
- `setCurrentPlayingId`

Do not change any other `entryStore` state or actions.

### 3. Update playback consumers

Move `EntryCard` playback state access to the new playback store.

Expected direct consumers in this batch:

- `EntryCard.tsx`
- any helper it directly wires into, via props or hook inputs

Do not broaden this batch to unrelated components unless they directly fail to compile after the split.

### 4. Update tests and mocks

Any tests currently mocking `entryStore` only to provide `currentPlayingId` / `setCurrentPlayingId` should switch to mocking the new playback store instead.

## Testing Strategy

Keep the testing surface focused on playback consumers and the data store contract.

Validation targets:

- `EntryCard` playback-related tests remain green.
- `entryStore` tests are updated so they no longer expect playback-only UI state in `entryStore`.
- No data-store tests should require wider behavior changes.

## Risks And Mitigations

### Risk: hidden playback consumer still imports `entryStore`

Mitigation:

- grep all `currentPlayingId` / `setCurrentPlayingId` references before implementation.
- fix only the direct consumers found.

### Risk: tests still mock the old store shape

Mitigation:

- update only the tests that depend on playback state.
- keep the new store tiny so mocks remain trivial.

### Risk: over-expanding the split

Mitigation:

- explicitly forbid moving search/filter/data state in this batch.

## Implementation Boundaries

- No new architectural abstractions beyond the tiny playback UI store.
- No changes to filter/search ownership.
- No behavior changes in audio playback.
- No commit unless explicitly requested.

## Success Criteria

- `entryStore` no longer owns `currentPlayingId`.
- A tiny dedicated playback store owns `currentPlayingId` and its setter.
- `EntryCard` and related playback tests use the new store.
- Relevant tests pass.
