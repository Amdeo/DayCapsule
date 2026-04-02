# Low Risk As-Any Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the approved low-risk production `as any` usages by tightening `Ionicons` name typing and safely narrowing home-screen error-code access.

**Architecture:** Keep the work local to the approved files only. For icon consumers, move from broad `string` types to `ComponentProps<typeof Ionicons>['name']` at the data/prop definition sites so the JSX call sites no longer need casts. For the home screen, add a tiny local helper that reads a string `code` from `unknown` errors without changing any runtime control flow.

**Tech Stack:** TypeScript, React Native, Expo Vector Icons, Jest, Testing Library

---

### Task 1: Tighten Ionicons Name Types

**Files:**
- Modify: `app/src/components/settings-page/SettingRow.tsx`
- Modify: `app/src/components/fab-menu/FABMenuView.tsx`
- Modify: `app/src/components/timeline-v2/TimelineViewModeToggle.tsx`
- Modify: `app/src/components/settings-page/SettingsSegmentedSelector.tsx`
- Modify: `app/src/components/entry-card/entryCardAppearance.ts`
- Modify: `app/src/components/entry-card/EntryCardDefaultMeta.tsx`
- Test: `app/src/components/__tests__/SettingsPage.test.tsx`
- Test: `app/src/components/__tests__/EntryCard.test.tsx`
- Test: `app/src/components/__tests__/timeline/timeline.controller.test.tsx`

- [ ] **Step 1: Write the failing test expectation through type pressure**

Do not add a new runtime assertion first. Instead, make the implementation-oriented type edits below and use project typecheck as the failing test. This task is about removing unsafe casts caused by overly broad local types.

Prepare these type changes:

```ts
// SettingRow.tsx
import type { ComponentProps } from 'react';
type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface SettingItemProps {
  icon: IoniconName;
  title: string;
  subtitle: string;
  rightComponent?: React.ReactNode;
}

interface SettingButtonProps {
  icon: IoniconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
  testID?: string;
}
```

```ts
// FABMenuView.tsx
import type { ComponentProps } from 'react';
type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface FABMenuViewProps {
  ...
  fabIcon: IoniconName;
  ...
}
```

```ts
// TimelineViewModeToggle.tsx
import type { ComponentProps } from 'react';
type IoniconName = ComponentProps<typeof Ionicons>['name'];

const VIEW_MODES: { mode: ViewMode; icon: IoniconName; label: string }[] = [
  { mode: 'list', icon: 'list', label: '列表' },
  { mode: 'calendar', icon: 'calendar', label: '日历' },
];
```

```ts
// SettingsSegmentedSelector.tsx
import type { ComponentProps } from 'react';
type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface SettingsSegmentedSelectorProps<T extends string> {
  icon: IoniconName;
  ...
}
```

```ts
// entryCardAppearance.ts
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type EntryCardSyncStatusMeta = {
  iconName: IoniconName | null;
  iconColor: string;
  text: string | null;
};
```

Then remove the `as any` casts from the corresponding `Ionicons` JSX call sites.

- [ ] **Step 2: Run typecheck to verify it fails if any local icon source is still too broad**

Run:

```bash
pnpm run typecheck
```

Expected: either FAIL with a specific icon-name type mismatch that reveals one remaining broad local type, or PASS immediately if the local type tightening was complete on the first pass.

- [ ] **Step 3: Make the minimal implementation correction**

If typecheck failed, make only the smallest correction needed in the approved icon files so every `Ionicons` call site becomes type-safe without `as any`.

If typecheck already passed, keep the initial changes only and do not widen scope.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```bash
pnpm run typecheck
```

Then run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/EntryCard.test.tsx src/components/__tests__/timeline/timeline.controller.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings-page/SettingRow.tsx src/components/fab-menu/FABMenuView.tsx src/components/timeline-v2/TimelineViewModeToggle.tsx src/components/settings-page/SettingsSegmentedSelector.tsx src/components/entry-card/entryCardAppearance.ts src/components/entry-card/EntryCardDefaultMeta.tsx
git commit -m "refactor: tighten icon name typing"
```

### Task 2: Replace Home-Screen Error `as any` Access

**Files:**
- Modify: `app/app/(tabs)/index.tsx`
- Test: `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts`

- [ ] **Step 1: Write the failing test**

Add a tiny helper-focused test to `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts` that documents the narrowing contract. Import the helper from `../index` only if it is already exported for tests; otherwise, use an existing test export pattern from that file.

Add this test:

```ts
it('reads a string error code only when the thrown value exposes one', () => {
  expect(getErrorCodeForTest({ code: 'PERMISSION_DENIED' })).toBe('PERMISSION_DENIED');
  expect(getErrorCodeForTest({ code: 123 })).toBeNull();
  expect(getErrorCodeForTest(null)).toBeNull();
  expect(getErrorCodeForTest(new Error('x'))).toBeNull();
});
```

If `index.tsx` does not currently expose a test helper, add the smallest test-only export in that file:

```ts
export function getErrorCodeForTest(error: unknown): string | null {
  return getErrorCode(error);
}
```

with the real private helper named `getErrorCode`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test --runInBand --runTestsByPath "app/(tabs)/__tests__/index.voice-cloud-mode.test.ts"
```

Expected: FAIL because the helper does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

In `app/app/(tabs)/index.tsx`, add the narrowing helper near the other test exports or helper utilities:

```ts
function getErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

export function getErrorCodeForTest(error: unknown): string | null {
  return getErrorCode(error);
}
```

Then replace the two production branches:

```ts
if (getErrorCode(error) === 'ACTIVE_RECORDING_IN_PROGRESS') {
  ...
}
```

```ts
if (getErrorCode(error) === 'PERMISSION_DENIED') {
  ...
}
```

Do not change alert copy, cleanup logic, or logging flow.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test --runInBand --runTestsByPath "app/(tabs)/__tests__/index.voice-cloud-mode.test.ts"
```

Then run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/index.tsx" "app/(tabs)/__tests__/index.voice-cloud-mode.test.ts"
git commit -m "refactor: narrow home screen error codes"
```

### Task 3: Final Verification

**Files:**
- Verify only: `app/src/components/settings-page/SettingRow.tsx`
- Verify only: `app/src/components/fab-menu/FABMenuView.tsx`
- Verify only: `app/src/components/timeline-v2/TimelineViewModeToggle.tsx`
- Verify only: `app/src/components/settings-page/SettingsSegmentedSelector.tsx`
- Verify only: `app/src/components/entry-card/entryCardAppearance.ts`
- Verify only: `app/src/components/entry-card/EntryCardDefaultMeta.tsx`
- Verify only: `app/app/(tabs)/index.tsx`
- Verify only: `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts`

- [ ] **Step 1: Run scoped tests**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/EntryCard.test.tsx src/components/__tests__/timeline/timeline.controller.test.tsx "app/(tabs)/__tests__/index.voice-cloud-mode.test.ts"
```

Expected: PASS.

- [ ] **Step 2: Run full project verification**

Run:

```bash
pnpm run verify
```

Expected: PASS.

- [ ] **Step 3: Confirm approved-scope `as any` removal**

Run:

```bash
rg -n "as any" src/components/settings-page/SettingRow.tsx src/components/fab-menu/FABMenuView.tsx src/components/timeline-v2/TimelineViewModeToggle.tsx src/components/settings-page/SettingsSegmentedSelector.tsx src/components/entry-card/EntryCardDefaultMeta.tsx src/components/entry-card/entryCardAppearance.ts "app/(tabs)/index.tsx"
```

Expected: no matches.

- [ ] **Step 4: Review final git diff**

Run:

```bash
git diff -- src/components/settings-page/SettingRow.tsx src/components/fab-menu/FABMenuView.tsx src/components/timeline-v2/TimelineViewModeToggle.tsx src/components/settings-page/SettingsSegmentedSelector.tsx src/components/entry-card/entryCardAppearance.ts src/components/entry-card/EntryCardDefaultMeta.tsx "app/(tabs)/index.tsx" "app/(tabs)/__tests__/index.voice-cloud-mode.test.ts"
```

Expected: diff contains only the approved icon-name typing and error-code narrowing work.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings-page/SettingRow.tsx src/components/fab-menu/FABMenuView.tsx src/components/timeline-v2/TimelineViewModeToggle.tsx src/components/settings-page/SettingsSegmentedSelector.tsx src/components/entry-card/entryCardAppearance.ts src/components/entry-card/EntryCardDefaultMeta.tsx "app/(tabs)/index.tsx" "app/(tabs)/__tests__/index.voice-cloud-mode.test.ts"
git commit -m "refactor: remove low-risk any casts" || true
```

If there is nothing left to commit because Task 1 and Task 2 already captured the final code state, record that explicitly in execution notes and do not force an empty commit.
