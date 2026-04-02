# RenderHomeScreen Helper Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated `renderHomeScreen` helper-facing stability test file that encodes the highest-value isolation guarantees without changing the helper API or production Home code unless a real mismatch is exposed.

**Architecture:** Keep the batch test-first and test-only by default. Introduce a small `renderHomeScreen.stability.test.tsx` focused on a few high-value contracts, while leaving the broader state test file in place. Only touch `renderHomeScreen.tsx` if a new stability test exposes a real gap.

**Tech Stack:** TypeScript, Jest, `@testing-library/react-native`

---

### Task 1: Add Focused Stability Coverage For Cross-Render Independence

**Files:**
- Create: `app/src/components/__tests__/helpers/renderHomeScreen.stability.test.tsx`
- Conditionally modify only if tests reveal a real mismatch: `app/src/components/__tests__/helpers/renderHomeScreen.tsx`

- [ ] **Step 1: Add a failing stability test for cross-render independence**

Create `app/src/components/__tests__/helpers/renderHomeScreen.stability.test.tsx` and add a focused contract test proving that a later render does not destabilize an earlier render's visible Home state. Keep this smaller than the broader `renderHomeScreen.state.test.tsx` file.

Add a test like:

```tsx
import type { Entry } from '@/src/types/entry';
import { act } from '@testing-library/react-native';
import { renderHomeScreen } from './renderHomeScreen';

const workEntry = {
  id: 'entry-work-1',
  type: 'text',
  content: '工作复盘',
  tags: ['工作'],
  timestamp: 1,
  syncStatus: 'synced',
} as Entry;

describe('renderHomeScreen stability', () => {
  it('keeps an earlier render stable after a later render is created', async () => {
    const first = renderHomeScreen({ entries: [workEntry] });
    const second = renderHomeScreen();

    await act(async () => {
      await first.spies.applySearchFilters({
        query: '工作',
        type: 'all',
        dateRange: 'all',
        tags: ['工作'],
      });
    });

    expect(first.screen.getByTestId('timeline-entry-entry-work-1')).toBeTruthy();
    expect(second.screen.getByTestId('timeline-empty-state')).toBeTruthy();

    first.screen.unmount();
    second.screen.unmount();
  });
});
```

This should express the stability contract directly, not replicate every state-isolation assertion already present elsewhere.

- [ ] **Step 2: Run the new stability test and verify whether it exposes a real gap**

Run:

```bash
pnpm test --runInBand src/components/__tests__/helpers/renderHomeScreen.stability.test.tsx
```

Expected:

- if helper stability is already correct, the test may pass immediately
- if it fails, the failure must point to a real cross-render stability mismatch

- [ ] **Step 3: Make the smallest helper fix only if Step 2 exposed a real mismatch**

If the new stability test fails because `renderHomeScreen.tsx` still leaks render state, make the smallest helper-only fix.

If the test passes, make no helper change.

- [ ] **Step 4: Re-run the new stability test and confirm GREEN**

Run:

```bash
pnpm test --runInBand src/components/__tests__/helpers/renderHomeScreen.stability.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the stability cross-render coverage**

If only the new test file changed:

```bash
git add app/src/components/__tests__/helpers/renderHomeScreen.stability.test.tsx
git commit -m "test: add renderhome stability coverage"
```

If a tiny helper fix was needed, include it in the same commit.

### Task 2: Add Focused Stability Coverage For Helper Trigger Binding

**Files:**
- Modify: `app/src/components/__tests__/helpers/renderHomeScreen.stability.test.tsx`
- Conditionally modify only if tests reveal a real mismatch: `app/src/components/__tests__/helpers/renderHomeScreen.tsx`

- [ ] **Step 1: Add a failing stability test for helper trigger binding**

Extend `renderHomeScreen.stability.test.tsx` with a focused contract test proving helper-exposed triggers still affect only the render they came from:

```tsx
it('keeps helper triggers bound to the render they came from', async () => {
  const first = renderHomeScreen();
  const second = renderHomeScreen();

  await act(async () => {
    await first.spies.triggerQuickAddVoice?.();
  });

  expect(first.screen.getByTestId('timeline-entry-mock-entry-1')).toBeTruthy();
  expect(second.screen.queryByTestId('timeline-entry-mock-entry-1')).toBeNull();

  first.screen.unmount();
  second.screen.unmount();
});
```

The exact fixture details can vary, but the test must validate the helper-facing trigger contract directly.

- [ ] **Step 2: Run the stability test file and verify whether it exposes a real gap**

Run:

```bash
pnpm test --runInBand src/components/__tests__/helpers/renderHomeScreen.stability.test.tsx
```

Expected:

- if trigger binding is already correct, the file may pass immediately
- if it fails, the failure must point to a real trigger-binding mismatch

- [ ] **Step 3: Make the smallest helper fix only if Step 2 exposed a real mismatch**

If the new stability test fails because helper-exposed trigger binding is still incorrect, make the smallest fix in `renderHomeScreen.tsx`.

If the test passes, make no helper change.

- [ ] **Step 4: Re-run the stability test file and confirm GREEN**

Run:

```bash
pnpm test --runInBand src/components/__tests__/helpers/renderHomeScreen.stability.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the trigger-binding stability coverage only if new code changed beyond Task 1**

If Task 1 already covered the file and no new code changes were needed, you may skip a second commit.

Otherwise run:

```bash
git add app/src/components/__tests__/helpers/renderHomeScreen.stability.test.tsx app/src/components/__tests__/helpers/renderHomeScreen.tsx
git commit -m "test: tighten renderhome trigger stability"
```

### Task 3: Run Focused Stability Tests And Full Verification

**Files:**
- Verify only: `app/src/components/__tests__/helpers/renderHomeScreen.stability.test.tsx`
- Verify only: `app/src/components/__tests__/helpers/renderHomeScreen.state.test.tsx`

- [ ] **Step 1: Run the focused renderHomeScreen helper verification surface**

Run:

```bash
pnpm test --runInBand src/components/__tests__/helpers/renderHomeScreen.stability.test.tsx src/components/__tests__/helpers/renderHomeScreen.state.test.tsx src/components/__tests__/timeline/timeline.home.interactions.test.tsx src/components/__tests__/timeline/timeline.home.navigation.test.tsx
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

Expected: only the new stability test file, optional tiny helper fixes, and this batch's spec/plan docs are changed in this worktree.
