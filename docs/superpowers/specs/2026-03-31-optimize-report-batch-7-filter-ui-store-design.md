# 2026-03-31 Optimize Report Batch 7 Filter UI Store Design

## Summary

Implement the second phase of store responsibility cleanup by extracting search/filter UI state out of `entryStore` into a dedicated filter UI store. This phase moves only the filter state and pure state mutators. Query execution and data-loading side effects remain in `entryStore`.

This keeps the split narrow and avoids turning the batch into a full data/query architecture rewrite.

## Goals

- Remove search/filter UI state from `entryStore`.
- Introduce a dedicated tiny store for filter/search state.
- Keep `entryStore` responsible for data loading, pagination, CRUD, and query-side effects.
- Update Timeline/Search/Filter UI to read filter state from the new store.

## Non-Goals

- Do not move `entries`, `cursor`, `hasMore`, or loading state out of `entryStore`.
- Do not move CRUD or sync actions out of `entryStore`.
- Do not change search semantics or FTS behavior.
- Do not merge playback UI state and filter UI state into one larger UI store.
- Do not redesign query orchestration beyond the minimum needed to read filter state from the new store.

## Approved Scope

Files expected to change:

- `app/src/store/entryStore.ts`
- new small store file under `app/src/store/`
- Timeline/Search/Filter UI consumers that currently read filter state from `entryStore`
- related tests and helper mocks

## Approaches Considered

### Approach A: Move only filter state + pure mutators, keep query actions in entryStore (recommended)

Create a dedicated filter UI store that owns:

- `searchQuery`
- `filterType`
- `filterDateRange`
- `selectedTags`
- pure mutators such as `setSearchQuery`, `setFilterType`, `setFilterDateRange`, `toggleTag`, `clearTags`, and a pure bulk setter for applying multiple filter values at once

`entryStore` keeps:

- `applyFilters()`
- `applySearchFilters()`
- `searchEntries()`
- `loadEntries()` / `loadMore()`

and reads current filter state from the new store when constructing DB filters / query keys.

Pros:

- Smallest safe split.
- Query-side effects remain where data loading already lives.
- Lower regression risk.

Cons:

- Temporary cross-store coordination remains.

### Approach B: Move filter state and query actions together

Create a filter/search store that owns both the UI state and the actions that trigger entry queries.

Pros:

- Clearer long-term separation of UI/query vs data store.

Cons:

- Larger behavioral rewrite.
- Much bigger test surface.

### Approach C: Full data/UI store breakup

Split `entryStore` into multiple stores in one shot.

Pros:

- Most complete architecture cleanup.

Cons:

- Too large for this iteration.

## Chosen Approach

Use Approach A.

This moves pure UI state now, while keeping data-query side effects in the existing store so we do not destabilize loading and pagination flows in the same batch.

## Detailed Design

### 1. Create a dedicated filter UI store

Add a small store file under `app/src/store/`, for example `entryFilterUIStore.ts`, containing:

- `searchQuery`
- `filterType`
- `filterDateRange`
- `selectedTags`
- pure mutators:
  - `setSearchQuery`
  - `setFilterType`
  - `setFilterDateRange`
  - `toggleTag`
  - `clearTags`
  - `applySearchFilters` as a pure bulk setter for UI state only

Design decisions:

- this store should not call database/query functions directly
- it should not import `localDataSource` or `entryStore`

### 2. Remove filter state from entryStore

Delete from `EntryStore`:

- `searchQuery`
- `filterType`
- `filterDateRange`
- `selectedTags`
- the pure mutator fields listed above

Keep in `entryStore`:

- `applyFilters()`
- `applySearchFilters()`
- `searchEntries()`

but update these actions to read filter state from `entryFilterUIStore.getState()`.

### 3. Rewire buildFilters and buildQueryKey

Refactor the internal helpers in `entryStore.ts` so they read from a filter-state input that matches the new store shape. The source of truth for active filter values becomes the new filter UI store.

Design decision:

- `entryStore` should consume the new store's state for query construction, but remain responsible for when queries run

### 4. Rewire UI consumers

Update direct UI consumers of filter state to read/write the new store instead of `entryStore`.

Expected direct consumers in this batch:

- `Timeline.v2.tsx`
- `SearchOverlay.tsx`
- `FilterBar.tsx`
- helper hooks/components that receive those values through props may need only typing updates, not direct store imports

### 5. Preserve query-trigger behavior

Even after state moves out:

- `searchEntries(query)` should still update query state and trigger one query flow
- `applySearchFilters(...)` should still batch UI state updates and then trigger one query flow
- existing stale-query protection, query key logic, and pagination reset behavior stay in `entryStore`

## Testing Strategy

Future implementation should cover:

- `entryStore` tests updated so filter state no longer lives in that store
- Timeline/SearchOverlay/FilterBar tests updated to mock the new filter UI store
- existing renderHomeScreen / timeline interaction tests stay green, proving query trigger behavior is preserved

## Risks And Mitigations

### Risk: query triggers fire multiple times after split

Mitigation:

- keep effectful query methods centralized in `entryStore`
- make the new filter store mutators pure

### Risk: stale query key logic breaks because state moved out

Mitigation:

- update `buildFilters()` / `buildQueryKey()` to consume the new store state explicitly
- preserve the existing stale-request tests

### Risk: tests still mock filter state on entryStore

Mitigation:

- update only tests that directly depend on these filter fields
- keep the new store tiny so mocks remain simple

## Implementation Boundaries

- No playback-state changes in this batch.
- No CRUD/sync ownership changes.
- No search semantics changes.
- No commit unless explicitly requested.

## Success Criteria

- `entryStore` no longer owns search/filter UI state.
- A dedicated filter UI store owns that state and pure mutators.
- `entryStore` still owns query execution side effects.
- Timeline/Search/Filter UI and related tests use the new store.
- Existing query-flow behavior remains intact.
