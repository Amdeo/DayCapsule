# Optimize Report Batch 7 Filter UI Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move search/filter UI state out of `entryStore` into a dedicated filter UI store while preserving existing query-trigger behavior in `entryStore`.

**Architecture:** This batch introduces a small `entryFilterUIStore` that owns filter state and pure mutators only. `entryStore` remains the owner of query side effects, pagination, CRUD, and sync behavior, but reads current filter state from the new store when building filters and query keys. UI consumers shift to the new store; query orchestration stays where it is.

**Tech Stack:** TypeScript, React Native, Zustand, Jest, Testing Library

---

### Task 1: Create `entryFilterUIStore` And Remove Filter State From `entryStore`

**Files:**
- Create: `app/src/store/entryFilterUIStore.ts`
- Modify: `app/src/store/entryStore.ts`
- Test: `app/src/store/__tests__/entryStore.test.ts`

- [ ] **Step 1: Write the failing tests**

In `app/src/store/__tests__/entryStore.test.ts`, replace the existing reset helper so it no longer sets filter state on `useEntryStore.setState(...)`. Change:

```ts
const resetStore = () =>
  useEntryStore.setState({
    entries: [],
    isLoading: false,
    isLoadingMore: false,
    cursor: null,
    hasMore: true,
    searchQuery: '',
    filterType: 'all',
    filterDateRange: 'all',
    selectedTags: [],
    loadRetryCount: 0,
    activeQueryKey: '',
  });
```

to:

```ts
const resetStore = () =>
  useEntryStore.setState({
    entries: [],
    isLoading: false,
    isLoadingMore: false,
    cursor: null,
    hasMore: true,
    loadRetryCount: 0,
    activeQueryKey: '',
  });
```

Then add a new regression near the top of the suite:

```ts
it('不再暴露 filter UI 状态字段', () => {
  const state = useEntryStore.getState() as Record<string, unknown>;

  expect(state).not.toHaveProperty('searchQuery');
  expect(state).not.toHaveProperty('filterType');
  expect(state).not.toHaveProperty('filterDateRange');
  expect(state).not.toHaveProperty('selectedTags');
  expect(state).not.toHaveProperty('setSearchQuery');
  expect(state).not.toHaveProperty('setFilterType');
  expect(state).not.toHaveProperty('setFilterDateRange');
  expect(state).not.toHaveProperty('toggleTag');
  expect(state).not.toHaveProperty('clearTags');
});
```

Update the tests that currently assert filter state directly on `useEntryStore.getState()` so they instead read from the new filter store once it exists. For example, change:

```ts
expect(useEntryStore.getState().searchQuery).toBe('second');
```

to:

```ts
expect(useEntryFilterUIStore.getState().searchQuery).toBe('second');
```

Do the same for `filterType`, `filterDateRange`, and `selectedTags` assertions.

At this point, the tests should fail because production code and imports still assume filters live in `entryStore`.

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/store/__tests__/entryStore.test.ts
```

Expected: FAIL because the new filter store does not exist yet and `entryStore` still owns filter state.

- [ ] **Step 3: Write the minimal implementation**

Create `app/src/store/entryFilterUIStore.ts`:

```ts
import { create } from 'zustand';

export interface EntryFilterState {
  searchQuery: string;
  filterType: 'all' | 'text' | 'photo' | 'voice';
  filterDateRange: 'all' | 'today' | 'week' | 'month';
  selectedTags: string[];
}

interface EntryFilterUIStore extends EntryFilterState {
  setSearchQuery: (query: string) => void;
  setFilterType: (type: EntryFilterState['filterType']) => void;
  setFilterDateRange: (range: EntryFilterState['filterDateRange']) => void;
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  applySearchFilters: (filters: {
    query?: string;
    type?: EntryFilterState['filterType'];
    dateRange?: EntryFilterState['filterDateRange'];
    tags?: string[];
  }) => void;
}

export const useEntryFilterUIStore = create<EntryFilterUIStore>((set, get) => ({
  searchQuery: '',
  filterType: 'all',
  filterDateRange: 'all',
  selectedTags: [],
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterType: (type) => set({ filterType: type }),
  setFilterDateRange: (range) => set({ filterDateRange: range }),
  toggleTag: (tag) => {
    const { selectedTags } = get();
    set({
      selectedTags: selectedTags.includes(tag)
        ? selectedTags.filter((item) => item !== tag)
        : [...selectedTags, tag],
    });
  },
  clearTags: () => set({ selectedTags: [] }),
  applySearchFilters: (filters) =>
    set((state) => ({
      searchQuery: filters.query ?? state.searchQuery,
      filterType: filters.type ?? state.filterType,
      filterDateRange: filters.dateRange ?? state.filterDateRange,
      selectedTags: filters.tags ?? state.selectedTags,
    })),
}));
```

In `app/src/store/entryStore.ts`:

- remove filter state fields and pure mutators from the `EntryStore` interface and initial state
- import `useEntryFilterUIStore`
- update `buildFilters(...)` / `buildQueryKey(...)` call sites to read from `useEntryFilterUIStore.getState()`
- keep `applyFilters()`, `applySearchFilters()`, and `searchEntries()` in `entryStore`, but change them so they first update `useEntryFilterUIStore` and then trigger the existing query flow

Representative changes:

```ts
import { useEntryFilterUIStore, type EntryFilterState } from '@/src/store/entryFilterUIStore';

const buildFilters = (state: EntryFilterState): EntryFilters => {
  ...
};

const buildQueryKey = (state: EntryFilterState) =>
  JSON.stringify({
    query: state.searchQuery,
    type: state.filterType,
    dateRange: state.filterDateRange,
    tags: [...state.selectedTags].sort((a, b) => a.localeCompare(b)),
  });
```

and inside query actions:

```ts
const filters = buildFilters(useEntryFilterUIStore.getState());
const queryKey = buildQueryKey(useEntryFilterUIStore.getState());
```

For effectful actions, keep behavior centralized:

```ts
searchEntries: async (query) => {
  useEntryFilterUIStore.getState().setSearchQuery(query);
  await get().applyFilters();
},

applySearchFilters: async (filters) => {
  useEntryFilterUIStore.getState().applySearchFilters(filters);
  await get().applyFilters();
},
```

Do not move `entries`, paging, CRUD, or sync state.

- [ ] **Step 4: Run tests to verify green**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/store/__tests__/entryStore.test.ts
```

Then run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/entryFilterUIStore.ts src/store/entryStore.ts src/store/__tests__/entryStore.test.ts
git commit -m "refactor: extract filter ui state"
```

### Task 2: Rewire Timeline, SearchOverlay, and FilterBar To The New Store

**Files:**
- Modify: `app/src/components/Timeline.v2.tsx`
- Modify: `app/src/components/SearchOverlay.tsx`
- Modify: `app/src/components/FilterBar.tsx`
- Test: `app/src/components/__tests__/timeline/timeline.home.sync-status.test.tsx`
- Test: `app/src/components/__tests__/timeline/timeline.home.navigation.test.tsx`
- Test: `app/src/components/__tests__/Timeline.v2.view-mode.test.tsx`
- Test: `app/src/components/__tests__/SearchOverlay.test.tsx`
- Test: `app/src/components/__tests__/search/search-overlay.filters.test.tsx`
- Test: `app/src/components/__tests__/search/search-overlay.restore-state.test.tsx`
- Test: `app/src/components/__tests__/FilterBar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Update the affected UI tests so filter state is mocked from `entryFilterUIStore` instead of `entryStore`.

Example selector-style mock to add in the affected files:

```ts
const mockFilterUiState = {
  searchQuery: '',
  filterType: 'all' as const,
  filterDateRange: 'all' as const,
  selectedTags: [] as string[],
  setSearchQuery: jest.fn(),
  setFilterType: jest.fn(),
  setFilterDateRange: jest.fn(),
  toggleTag: jest.fn(),
  clearTags: jest.fn(),
  applySearchFilters: jest.fn(),
};

jest.mock('@/src/store/entryFilterUIStore', () => ({
  useEntryFilterUIStore: (selector: (state: typeof mockFilterUiState) => unknown) =>
    selector(mockFilterUiState),
}));
```

Then remove those filter fields from the corresponding `entryStore` mocks, keeping only data/query fields actually owned by `entryStore`.

At this point, component tests should fail because production UI still reads filters from `entryStore`.

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/timeline/timeline.home.navigation.test.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx src/components/__tests__/SearchOverlay.test.tsx src/components/__tests__/search/search-overlay.filters.test.tsx src/components/__tests__/search/search-overlay.restore-state.test.tsx src/components/__tests__/FilterBar.test.tsx
```

Expected: FAIL because `Timeline.v2`, `SearchOverlay`, and `FilterBar` still read filter state from `entryStore`.

- [ ] **Step 3: Write the minimal implementation**

In `Timeline.v2.tsx`, replace the filter-related selectors:

```ts
import { useEntryFilterUIStore } from '@/src/store/entryFilterUIStore';

const searchQuery = useEntryFilterUIStore((state) => state.searchQuery);
const filterType = useEntryFilterUIStore((state) => state.filterType);
const filterDateRange = useEntryFilterUIStore((state) => state.filterDateRange);
const selectedTags = useEntryFilterUIStore((state) => state.selectedTags);
const setSearchQuery = useEntryFilterUIStore((state) => state.setSearchQuery);
const setFilterType = useEntryFilterUIStore((state) => state.setFilterType);
const setFilterDateRange = useEntryFilterUIStore((state) => state.setFilterDateRange);
const toggleTag = useEntryFilterUIStore((state) => state.toggleTag);
const clearTags = useEntryFilterUIStore((state) => state.clearTags);
```

Leave data-loading selectors on `entryStore` unchanged.

In `SearchOverlay.tsx`, change the filter-state reads to `useEntryFilterUIStore`, but keep `getAllTags` and the effectful `applySearchFilters` action coming from `entryStore`:

```ts
const searchQuery = useEntryFilterUIStore((state) => state.searchQuery);
const filterType = useEntryFilterUIStore((state) => state.filterType);
const filterDateRange = useEntryFilterUIStore((state) => state.filterDateRange);
const selectedTags = useEntryFilterUIStore((state) => state.selectedTags);
const getAllTags = useEntryStore((state) => state.getAllTags);
const applySearchFilters = useEntryStore((state) => state.applySearchFilters);
```

In `FilterBar.tsx`, change the filter-state reads/writes to `useEntryFilterUIStore`, but keep `entries` and `getAllTags` from `entryStore`:

```ts
const entries = useEntryStore((state) => state.entries);
const getAllTags = useEntryStore((state) => state.getAllTags);

const filterType = useEntryFilterUIStore((state) => state.filterType);
const filterDateRange = useEntryFilterUIStore((state) => state.filterDateRange);
const selectedTags = useEntryFilterUIStore((state) => state.selectedTags);
const setFilterType = useEntryFilterUIStore((state) => state.setFilterType);
const setFilterDateRange = useEntryFilterUIStore((state) => state.setFilterDateRange);
const toggleTag = useEntryFilterUIStore((state) => state.toggleTag);
const clearTags = useEntryFilterUIStore((state) => state.clearTags);
```

Do not change search semantics or query-side effects in UI components.

- [ ] **Step 4: Run tests to verify green**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/timeline/timeline.home.navigation.test.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx src/components/__tests__/SearchOverlay.test.tsx src/components/__tests__/search/search-overlay.filters.test.tsx src/components/__tests__/search/search-overlay.restore-state.test.tsx src/components/__tests__/FilterBar.test.tsx
```

Then run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Timeline.v2.tsx src/components/SearchOverlay.tsx src/components/FilterBar.tsx src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/timeline/timeline.home.navigation.test.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx src/components/__tests__/SearchOverlay.test.tsx src/components/__tests__/search/search-overlay.filters.test.tsx src/components/__tests__/search/search-overlay.restore-state.test.tsx src/components/__tests__/FilterBar.test.tsx
git commit -m "refactor: move filter ui ownership"
```

### Task 3: Update `renderHomeScreen` Test Helper And Final Verification

**Files:**
- Modify: `app/src/components/__tests__/helpers/renderHomeScreen.tsx`
- Test: `app/src/components/__tests__/helpers/renderHomeScreen.state.test.tsx`
- Test: `app/src/components/__tests__/helpers/renderHomeScreen.stability.test.tsx`
- Test: `app/src/components/__tests__/timeline/timeline.home.interactions.test.tsx`
- Verify: all files touched in Tasks 1-2

- [ ] **Step 1: Write the failing tests or helper adjustments**

`renderHomeScreen.tsx` currently models filter state inside its mock `entryStore` container. Update the helper so filter state has its own mock container matching the new store shape, and expose both stores to the rendered tree.

Add a second mock container type such as:

```ts
type MockEntryFilterUiState = {
  searchQuery: string;
  filterType: 'all' | 'text' | 'photo' | 'voice';
  filterDateRange: 'all' | 'today' | 'week' | 'month';
  selectedTags: string[];
  setSearchQuery: jest.Mock<void, [string]>;
  setFilterType: jest.Mock<void, ['all' | 'text' | 'photo' | 'voice']>;
  setFilterDateRange: jest.Mock<void, ['all' | 'today' | 'week' | 'month']>;
  toggleTag: jest.Mock<void, [string]>;
  clearTags: jest.Mock<void, []>;
  applySearchFilters: jest.Mock<void, [{ query?: string; type?: 'all' | 'text' | 'photo' | 'voice'; dateRange?: 'all' | 'today' | 'week' | 'month'; tags?: string[] }]>
};
```

and move filter state management in the helper from the mock entry store to this new filter-store mock.

Then update the helper tests to read filter state assertions from the new mock filter store while keeping query-trigger spies on `entryStore` actions.

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/helpers/renderHomeScreen.state.test.tsx src/components/__tests__/helpers/renderHomeScreen.stability.test.tsx src/components/__tests__/timeline/timeline.home.interactions.test.tsx
```

Expected: FAIL until the helper is updated for the new filter-store ownership.

- [ ] **Step 3: Write the minimal implementation**

Update `renderHomeScreen.tsx` so:

- mock entry store keeps data/query actions only
- mock filter UI store owns filter state and pure mutators
- `applySearchFilters` in the mock entry store updates the mock filter store first, then updates visible entries

Representative adjustment inside the helper:

```ts
mockEntryStoreState.applySearchFilters = jest.fn(async (filters) => {
  setMockFilterUiState({
    searchQuery: filters.query ?? '',
    filterType: filters.type ?? 'all',
    filterDateRange: filters.dateRange ?? 'all',
    selectedTags: filters.tags ?? [],
  });
  setMockEntryStoreState({
    entries: applyFilters(renderState.sourceEntries, filters),
  });
});
```

Keep helper behavior aligned with the existing tests; do not redesign its abstractions beyond what is needed for the store split.

- [ ] **Step 4: Run tests to verify green**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/helpers/renderHomeScreen.state.test.tsx src/components/__tests__/helpers/renderHomeScreen.stability.test.tsx src/components/__tests__/timeline/timeline.home.interactions.test.tsx
```

Then run the broader final verification:

```bash
pnpm run verify
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/__tests__/helpers/renderHomeScreen.tsx src/components/__tests__/helpers/renderHomeScreen.state.test.tsx src/components/__tests__/helpers/renderHomeScreen.stability.test.tsx src/components/__tests__/timeline/timeline.home.interactions.test.tsx src/store/entryFilterUIStore.ts src/store/entryStore.ts src/components/Timeline.v2.tsx src/components/SearchOverlay.tsx src/components/FilterBar.tsx src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/timeline/timeline.home.navigation.test.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx src/components/__tests__/SearchOverlay.test.tsx src/components/__tests__/search/search-overlay.filters.test.tsx src/components/__tests__/search/search-overlay.restore-state.test.tsx src/components/__tests__/FilterBar.test.tsx src/store/__tests__/entryStore.test.ts
git commit -m "refactor: split filter ui state"
```
