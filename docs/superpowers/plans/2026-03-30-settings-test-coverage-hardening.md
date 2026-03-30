# Settings Test Coverage Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the named Settings frontend test command truthfully cover the helper-sensitive Settings tests, while keeping the shared Settings helper boundary explicit and narrowly scoped.

**Architecture:** Treat `test:frontend:settings` as the canonical script for the Settings frontend surface that depends on `renderSettingsPage`, even if some files also belong to narrower behavior-specific commands. Keep helper behavior stable by changing only the script surface unless a tiny helper-facing clarification is required to express the contract that already exists.

**Tech Stack:** npm scripts, Jest, `@testing-library/react-native`, React Native test helpers

---

### Task 1: Expand `test:frontend:settings` To Cover Helper-Sensitive Settings Tests

**Files:**
- Modify: `app/package.json`
- Test: `app/src/components/__tests__/SettingsPage.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.preferences.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.sync-status.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.repair-entry.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.backend-env.test.tsx`

- [ ] **Step 1: Prove the current script does not list the missing helper-sensitive files**

Run:

```bash
npm run test:frontend:settings -- --listTests
```

Expected: the output includes the existing Settings files but does **not** include:

```text
src/components/__tests__/settings-page/settings-page.account-auth.test.tsx
src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx
```

- [ ] **Step 2: Update `test:frontend:settings` in `app/package.json`**

Change the script so it explicitly includes the missing helper-sensitive files while preserving the existing Settings test list:

```json
{
  "scripts": {
    "test:frontend:settings": "jest --runInBand --runTestsByPath src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/settings-page/settings-page.account-auth.test.tsx src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx src/components/__tests__/settings-page/settings-page.preferences.test.tsx src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx src/components/__tests__/settings-page/settings-page.sync-status.test.tsx src/components/__tests__/settings-page/settings-page.repair-entry.test.tsx src/components/__tests__/settings-page/settings-page.backend-env.test.tsx"
  }
}
```

Do not remove `settings-page.account-auth.test.tsx` from `test:frontend:auth`; overlapping coverage is intentional in this batch.

- [ ] **Step 3: Re-run the script listing and confirm the two missing files are now covered**

Run:

```bash
npm run test:frontend:settings -- --listTests
```

Expected: the output now includes both:

```text
src/components/__tests__/settings-page/settings-page.account-auth.test.tsx
src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx
```

- [ ] **Step 4: Run the adjusted Settings frontend script and confirm it passes**

Run:

```bash
npm run test:frontend:settings
```

Expected: the command passes and runs the full Settings helper-sensitive surface from the named script.

- [ ] **Step 5: Commit the script coverage change**

Run:

```bash
git add app/package.json
git commit -m "test: expand settings frontend script coverage"
```

### Task 2: Lock The Helper Boundary To The Named Settings Script Surface

**Files:**
- Modify: `app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx` only if needed
- Modify: `app/src/components/__tests__/helpers/renderSettingsPage.tsx` only if needed
- Test: `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx`

- [ ] **Step 1: Add a failing helper-facing proof only if the current tests do not already express the boundary**

First inspect whether the current helper stability coverage already proves both supported settle paths:

- real `settings-storage-card`
- mocked content that still renders `usedSpace`

If it does **not**, extend `renderSettingsPage.stability.test.tsx` with one narrow failing test such as:

```tsx
it('settles when settings content is mocked but usedSpace text is visible', async () => {
  const { screen } = await renderSettingsPage({ authenticated: false });

  expect(screen.getByText('< 0.1 MB')).toBeTruthy();
});
```

Only add this test if it creates a real missing proof. If current coverage already expresses the helper boundary sufficiently, skip this step and do not change the helper files.

- [ ] **Step 2: If Step 1 added a test, run it first and verify the intended RED state**

Run the narrow helper test you added, or the helper stability file if you extended it:

```bash
npm test -- --runInBand src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx
```

Expected: FAIL only if you intentionally added a new missing-proof test before implementation. If no new helper-facing proof was needed, skip this step.

- [ ] **Step 3: Implement the minimal helper-facing clarification only if required**

If Step 1 exposed a real gap, make the smallest possible adjustment in one of these files:

- `app/src/components/__tests__/helpers/renderSettingsPage.tsx`
- `app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx`

Preferred minimal clarification examples:

```tsx
// The helper settles on either the real storage card or the mocked content's
// visible usedSpace text so helper-sensitive Settings tests stay script-covered.
```

or a tiny extra assertion in the stability test that proves the fallback path.

Do not refactor helper state or change production behavior.

- [ ] **Step 4: Re-run the helper-facing test surface**

Run:

```bash
npm test -- --runInBand src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Re-run the helper-sensitive Settings files directly**

Run:

```bash
npm test -- --runInBand src/components/__tests__/settings-page/settings-page.account-auth.test.tsx src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the helper-boundary clarification only if files changed**

If you changed a helper file or helper stability test, commit it separately:

```bash
git add app/src/components/__tests__/helpers/renderSettingsPage.tsx app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx
git commit -m "test: clarify settings helper boundary"
```

If no helper files changed because the current boundary proof was already sufficient, skip this commit.

### Task 3: Run Full Verification And Confirm Final Scope

**Files:**
- Verify only: `app/package.json`
- Verify only: `app/src/components/__tests__/helpers/renderSettingsPage.tsx`
- Verify only: `app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx`

- [ ] **Step 1: Run the full app verification gate**

Run:

```bash
npm run verify
```

Expected: lint, typecheck, and the full Jest suite pass.

- [ ] **Step 2: Confirm the worktree only contains intended changes for this batch**

Run:

```bash
git status --short
```

Expected: only the planned package/helper/spec/plan paths are changed in this worktree.
