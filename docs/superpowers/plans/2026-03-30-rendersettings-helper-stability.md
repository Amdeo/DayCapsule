# RenderSettingsPage Helper Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `renderSettingsPage` a clearer helper-facing stability test layer that expresses the highest-value contracts without changing helper or production code unless a real mismatch is exposed.

**Architecture:** Keep the batch test-first and test-only by default. Refine `renderSettingsPage.stability.test.tsx` into a smaller, more contract-oriented helper stability surface while leaving the broader `state` file intact. Only touch `renderSettingsPage.tsx` if a new stability contract reveals an actual bug.

**Tech Stack:** TypeScript, Jest, `@testing-library/react-native`

---

### Task 1: Refine The Stability File Around The Initial-Settle Contract

**Files:**
- Modify: `app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx`
- Conditionally modify only if tests reveal a real mismatch: `app/src/components/__tests__/helpers/renderSettingsPage.tsx`

- [ ] **Step 1: Rewrite the initial-settle stability test to stay contract-oriented and small**

Keep a single focused test for the “must not resolve early before initial observable stable state exists” contract.

The test can keep the existing controlled `getStorageStats` deferred pattern, but should stay narrowly about:

- helper has not resolved yet while storage stats are still pending
- helper resolves once the observable storage value exists
- no act warnings are emitted along that path

If the current test already expresses that cleanly, only reduce incidental noise and keep the behavior the same.

- [ ] **Step 2: Run the focused stability file and verify whether the refined test exposes a real gap**

Run:

```bash
npm test -- --runInBand src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx
```

Expected:

- if helper stability is already correct, the file may pass immediately
- if it fails, the failure must point to a real settle/act-warning mismatch

- [ ] **Step 3: Make the smallest helper fix only if Step 2 exposed a real mismatch**

If the refined stability test fails because the helper still resolves too early or leaks act warnings, make the smallest fix in `renderSettingsPage.tsx`.

If the test passes, make no helper change.

- [ ] **Step 4: Re-run the stability file and confirm GREEN**

Run:

```bash
npm test -- --runInBand src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the refined settle stability coverage**

If only the test file changed:

```bash
git add app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx
git commit -m "test: refine renderSettings settle stability"
```

If a tiny helper fix was needed, include it in the same commit.

### Task 2: Refine The Stability File Around Cross-Render Login Reset

**Files:**
- Modify: `app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx`
- Conditionally modify only if tests reveal a real mismatch: `app/src/components/__tests__/helpers/renderSettingsPage.tsx`

- [ ] **Step 1: Rewrite the cross-render login-reset stability contract so it does not overlap unnecessarily with state coverage**

Keep one focused stability contract proving that later renders do not leave earlier captured login state behind.

Prefer a shape like:

```tsx
it('keeps login capture scoped to the current render lifecycle', async () => {
  const firstRender = await renderSettingsPage({ authenticated: false });

  fireEvent.press(firstRender.screen.getByTestId('settings-open-login'));
  expect(await firstRender.screen.findByTestId('settings-login-dialog')).toBeTruthy();
  expect(getLatestLoginPageProps()?.visible).toBe(true);

 firstRender.unmount();

  const secondRender = await renderSettingsPage({ authenticated: true });

  expect(secondRender.screen.queryByTestId('settings-login-dialog')).toBeNull();
  expect(getLatestLoginPageProps()).toBeNull();
});
```

The exact assertions can differ, but the goal is to express a high-level render-lifecycle contract rather than re-testing persisted-settings state.

- [ ] **Step 2: Run the stability file and verify whether the refined contract exposes a real gap**

Run:

```bash
npm test -- --runInBand src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx
```

Expected:

- if helper behavior is already correct, the file may pass immediately
- if it fails, the failure must point to a real login-capture reset mismatch

- [ ] **Step 3: Make the smallest helper fix only if Step 2 exposed a real mismatch**

If the refined login-reset contract fails because `renderSettingsPage.tsx` does not correctly clear captured login state, make the smallest fix there.

If the test passes, make no helper change.

- [ ] **Step 4: Re-run the stability file and confirm GREEN**

Run:

```bash
npm test -- --runInBand src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the refined login-reset stability coverage only if new code changed beyond Task 1**

If Task 1 already covered the file and no new code changes were needed, you may skip a second commit.

Otherwise run:

```bash
git add app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx app/src/components/__tests__/helpers/renderSettingsPage.tsx
git commit -m "test: refine renderSettings login stability"
```

### Task 3: Run Focused Settings Helper Stability Tests And Full Verification

**Files:**
- Verify only: `app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx`
- Verify only: `app/src/components/__tests__/helpers/renderSettingsPage.state.test.tsx`

- [ ] **Step 1: Run the focused renderSettingsPage helper verification surface**

Run:

```bash
npm test -- --runInBand src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx src/components/__tests__/helpers/renderSettingsPage.state.test.tsx src/components/__tests__/SettingsPage.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run the full app verification gate**

Run:

```bash
npm run verify
```

Expected: lint, typecheck, and the full Jest suite pass.

- [ ] **Step 3: Confirm the worktree only contains intended changes for this batch**

Run:

```bash
git status --short
```

Expected: only the refined stability test file, optional tiny helper fixes, and this batch's spec/plan docs are changed in this worktree.
