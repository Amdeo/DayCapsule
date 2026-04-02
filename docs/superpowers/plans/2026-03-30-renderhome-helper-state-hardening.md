# RenderHomeScreen Helper State Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten the most leak-prone module-level state in `renderHomeScreen` so Home/timeline tests do not silently inherit source entries, tags, or cloud UI state from a previous render.

**Architecture:** Keep `renderHomeScreen(options)` and its returned `screen` / `controls` / `spies` API stable. Add focused helper-facing regression tests for state lifetime, then make the smallest internal changes so per-render setup derives from fresh snapshots instead of ambient leftover module state.

**Tech Stack:** TypeScript, Jest, `@testing-library/react-native`, React Native test helpers

---

### Task 1: Prove And Tighten Source Entries And Tags Lifetime

**Files:**
- Create: `app/src/components/__tests__/helpers/renderHomeScreen.state.test.tsx`
- Modify: `app/src/components/__tests__/helpers/renderHomeScreen.tsx`
- Verify against: `app/src/components/__tests__/timeline/timeline.home.interactions.test.tsx`

- [ ] **Step 1: Add a failing helper-facing regression test for source entry/tag leakage**

Create `app/src/components/__tests__/helpers/renderHomeScreen.state.test.tsx` with a test proving one render's source entries and derived tags do not silently become the next render's baseline:

```tsx
import type { Entry } from '@/src/types/entry';
import { renderHomeScreen } from './renderHomeScreen';

const travelPhotoEntry: Entry = {
  id: 'entry-photo-1',
  type: 'photo',
  content: '旅行海边照片',
  tags: ['旅行'],
  timestamp: 1,
  syncStatus: 'synced',
  media: [{ uri: 'file:///photo.jpg', mimeType: 'image/jpeg', size: 123 }],
};

describe('renderHomeScreen state boundaries', () => {
  it('does not carry source entries and derived tags into the next render without explicit setup', async () => {
    const first = renderHomeScreen({
      entries: [travelPhotoEntry],
      allTags: ['旅行'],
    });

    await first.spies.applySearchFilters({
      query: '旅行',
      type: 'photo',
      dateRange: 'all',
      tags: ['旅行'],
    });

    expect(first.screen.getByTestId('timeline-entry-entry-photo-1')).toBeTruthy();

    const second = renderHomeScreen();

    expect(second.screen.queryByTestId('timeline-entry-entry-photo-1')).toBeNull();
    await expect(second.spies.getAllTags()).resolves.toEqual([]);
  });
});
```

The exact fixture data can differ, but the test must prove:

- previous render entries are not reused as the next render's source entries
- derived tag baseline is not silently inherited when the next render omits explicit tag setup

- [ ] **Step 2: Run the new helper state test and verify RED**

Run:

```bash
pnpm test --runInBand src/components/__tests__/helpers/renderHomeScreen.state.test.tsx
```

Expected: FAIL if the current helper leaks entries/tags across renders.

- [ ] **Step 3: Implement the minimal source entry/tag lifetime fix in `renderHomeScreen.tsx`**

Make the helper derive fresh per-render baselines instead of mutating and reusing ambient state. A minimal acceptable shape is:

```ts
function createPerRenderHomeState(options: RenderHomeScreenOptions) {
  const entries = options.entries ?? [];
  return {
    sourceEntries: entries,
    allTags: options.allTags ?? Array.from(new Set(entries.flatMap((entry) => entry.tags ?? []))),
    cloudSyncUiState: options.cloudSyncUiState ?? 'hidden',
  };
}

export function renderHomeScreen(options: RenderHomeScreenOptions = {}) {
  const perRender = createPerRenderHomeState(options);

  mockSourceEntries = perRender.sourceEntries;
  mockAllTags = perRender.allTags;
  mockCloudSyncUiState = perRender.cloudSyncUiState;
  mockEntryStoreState = createEntryStoreState(
    perRender.sourceEntries,
    options.initialFilters,
    options.loadEntriesImplementation
  );
  // existing setup continues
}
```

If another tiny reset helper is clearer, use that instead. The important point is that the next render starts from freshly derived state instead of ambient leftovers.

- [ ] **Step 4: Re-run the new helper state test and verify GREEN**

Run:

```bash
pnpm test --runInBand src/components/__tests__/helpers/renderHomeScreen.state.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Re-run the Home interactions consumer test**

Run:

```bash
pnpm test --runInBand src/components/__tests__/timeline/timeline.home.interactions.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the source entry/tag lifetime fix**

Run:

```bash
git add app/src/components/__tests__/helpers/renderHomeScreen.tsx app/src/components/__tests__/helpers/renderHomeScreen.state.test.tsx
git commit -m "test: isolate renderhome source state"
```

### Task 2: Prove And Tighten Cloud Sync UI State Lifetime

**Files:**
- Modify: `app/src/components/__tests__/helpers/renderHomeScreen.state.test.tsx`
- Modify: `app/src/components/__tests__/helpers/renderHomeScreen.tsx`
- Verify against: `app/src/components/__tests__/timeline/timeline.home.navigation.test.tsx`

- [ ] **Step 1: Add a failing helper-facing regression test for cloud UI state leakage**

Extend `renderHomeScreen.state.test.tsx` with a test proving one render's cloud sync UI state does not silently become the next render's default:

```tsx
it('does not carry cloud sync UI state into the next render without explicit setup', () => {
  const first = renderHomeScreen({ cloudSyncUiState: 'failed' });

  expect(first.screen.getByText('cloud-sync-failed')).toBeTruthy();

  const second = renderHomeScreen();

  expect(second.screen.queryByText('cloud-sync-failed')).toBeNull();
});
```

If the helper exposes this state through a different rendered token or spy surface, assert through that existing behavior instead. The test must prove the next render falls back to the default hidden state when not explicitly configured.

- [ ] **Step 2: Run the helper state test and verify RED**

Run:

```bash
pnpm test --runInBand src/components/__tests__/helpers/renderHomeScreen.state.test.tsx
```

Expected: FAIL if the current helper leaks cloud sync UI state across renders.

- [ ] **Step 3: Implement the minimal cloud UI state lifetime fix in `renderHomeScreen.tsx`**

If Step 1 exposed a real gap, make the smallest internal fix so `mockCloudSyncUiState` is explicitly reset from each render's options-derived baseline rather than inheriting previous state.

If Task 1's refactor already fixed this behavior and the new test passes immediately, make no additional production change.

- [ ] **Step 4: Re-run the helper state test and verify GREEN**

Run:

```bash
pnpm test --runInBand src/components/__tests__/helpers/renderHomeScreen.state.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Re-run a representative Home navigation consumer test**

Run:

```bash
pnpm test --runInBand src/components/__tests__/timeline/timeline.home.navigation.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the cloud UI state lifetime fix only if additional code changed beyond Task 1**

If Task 1 already covered the behavior and no new code changes were needed, skip this commit.

Otherwise run:

```bash
git add app/src/components/__tests__/helpers/renderHomeScreen.tsx app/src/components/__tests__/helpers/renderHomeScreen.state.test.tsx
git commit -m "test: isolate renderhome cloud ui state"
```

### Task 3: Run Focused Home Helper Tests And Full Verification

**Files:**
- Verify only: `app/src/components/__tests__/helpers/renderHomeScreen.tsx`
- Verify only: `app/src/components/__tests__/helpers/renderHomeScreen.state.test.tsx`

- [ ] **Step 1: Run the focused Home helper verification surface**

Run:

```bash
pnpm test --runInBand src/components/__tests__/helpers/renderHomeScreen.state.test.tsx src/components/__tests__/timeline/timeline.home.interactions.test.tsx src/components/__tests__/timeline/timeline.home.navigation.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run the full app verification gate**

Run:

```bash
pnpm run verify
```

Expected: lint, typecheck, and the full Jest suite pass.

- [ ] **Step 3: Confirm the worktree only contains intended changes for this batch**

Run:

```bash
git status --short
```

Expected: only the `renderHomeScreen` helper, helper-facing tests, optional minimal consumer-safe fixes, and this batch's spec/plan docs are changed in this worktree.
