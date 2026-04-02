# Settings Helper State Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten `renderSettingsPage`'s most leak-prone shared state so login prop capture and persisted settings behave with clearer per-render and reset boundaries, without changing the helper's public API.

**Architecture:** Keep the existing helper entry points intact while classifying state by lifetime: baseline configuration that intentionally persists until reset, and per-render captured state that must be re-initialized on every render. Lock the new boundaries through helper-facing tests that use the current public helper API rather than new internal abstractions.

**Tech Stack:** Jest, `@testing-library/react-native`, React Native test helpers, npm scripts

---

### Task 1: Prove And Tighten Login Prop Capture Lifetime

**Files:**
- Modify: `app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx`
- Modify: `app/src/components/__tests__/helpers/renderSettingsPage.tsx`
- Verify against: `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`

- [ ] **Step 1: Add a failing helper-facing regression test for stale login prop capture**

Extend `app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx` with a new test that proves `latestLoginPageProps` is re-initialized per render instead of leaking across renders:

```tsx
import {
  getLatestLoginPageProps,
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from './renderSettingsPage';

it('clears captured login props before a new render that does not open login', async () => {
  const firstRender = await renderSettingsPage({ authenticated: false });

  expect(getLatestLoginPageProps()).toBeNull();

  await firstRender.screen.findByTestId('settings-open-login');
  firstRender.screen.getByTestId('settings-open-login').props.onPress?.();

  expect(getLatestLoginPageProps()?.visible).toBe(true);

  await renderSettingsPage({ authenticated: true });

  expect(getLatestLoginPageProps()).toBeNull();
});
```

Important:

- keep the test on the public helper API
- do not assert private internals
- the point is to prove a previous render's captured login props cannot silently survive into the next render

- [ ] **Step 2: Run the helper stability test and verify RED**

Run:

```bash
pnpm test --runInBand src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx
```

Expected: FAIL because the current helper can retain `latestLoginPageProps` from the earlier render.

- [ ] **Step 3: Implement the minimal login-prop lifetime fix in `renderSettingsPage.tsx`**

Keep the public API the same, but make the captured login prop lifetime explicit. The fix should follow this shape:

```tsx
function resetPerRenderCaptures() {
  latestLoginPageProps = null;
}

export async function renderSettingsPage(options: RenderSettingsPageOptions = {}) {
  resetPerRenderCaptures();

  const {
    visible = true,
    authenticated = false,
    cloudMode,
    entries = [],
    userEmail = authenticated ? 'tester@example.com' : null,
    e2eSyncLab = false,
    props = {},
  } = options;

  // existing setup continues unchanged
}
```

Requirements for this step:

- do not rename or remove `getLatestLoginPageProps()`
- do not change `triggerLatestLoginSuccess()` signature
- keep the fix minimal and inside the helper

- [ ] **Step 4: Re-run the helper stability test and verify GREEN**

Run:

```bash
pnpm test --runInBand src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Re-run the account-auth test surface**

Run:

```bash
pnpm test --runInBand src/components/__tests__/settings-page/settings-page.account-auth.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the login capture lifetime fix**

Run:

```bash
git add app/src/components/__tests__/helpers/renderSettingsPage.tsx app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx
git commit -m "test: reset settings login capture per render"
```

### Task 2: Prove And Tighten Persisted Settings Lifetime

**Files:**
- Modify: `app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx` or create `app/src/components/__tests__/helpers/renderSettingsPage.state.test.tsx`
- Modify: `app/src/components/__tests__/helpers/renderSettingsPage.tsx`
- Verify against: `app/src/components/__tests__/SettingsPage.test.tsx`
- Verify against: `app/src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx`

- [ ] **Step 1: Add a failing helper-facing regression test for persisted settings drift**

Prefer creating a focused helper test file if that keeps the signal cleaner:

`app/src/components/__tests__/helpers/renderSettingsPage.state.test.tsx`

Add a test that proves the next render starts from the helper's explicit baseline unless the test intentionally sets state up through the current API:

```tsx
import { renderSettingsPage, resetRenderSettingsPageMocks } from './renderSettingsPage';

describe('renderSettingsPage state boundaries', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('does not carry persisted cloudMode from one render into the next without explicit setup', async () => {
    const first = await renderSettingsPage({ cloudMode: true, authenticated: true });

    expect(first.mocks.settings.cloudMode).toBe(true);

    const second = await renderSettingsPage({ authenticated: false });

    expect(second.mocks.settings.cloudMode).toBe(false);
  });
});
```

The exact assertion can vary, but it must prove that one render's effective settings do not silently become the next render's baseline unless reset/setup made that intentional.

- [ ] **Step 2: Run the new helper state test and verify RED**

Run one of these, depending on where you placed the test:

```bash
pnpm test --runInBand src/components/__tests__/helpers/renderSettingsPage.state.test.tsx
```

or

```bash
pnpm test --runInBand src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx
```

Expected: FAIL because the current helper updates `mockPersistedSettings.cloudMode` from the render path and can bias the next render.

- [ ] **Step 3: Implement the minimal persisted-settings lifetime fix in `renderSettingsPage.tsx`**

Make the render path derive effective settings from a fresh baseline per render, and only let explicit reset/setup operations manage the persisted baseline. A minimal acceptable shape is:

```tsx
function createPersistedSettingsSnapshot() {
  return { ...mockPersistedSettings };
}

export async function renderSettingsPage(options: RenderSettingsPageOptions = {}) {
  resetPerRenderCaptures();

  const persistedSettings = createPersistedSettingsSnapshot();

  Object.assign(mockSettingsState, {
    ...persistedSettings,
    cloudMode: options.cloudMode ?? persistedSettings.cloudMode,
    isLoaded: true,
  });

  // Do not write the render-time effective cloudMode back into mockPersistedSettings here.
}
```

Requirements for this step:

- keep `resetSettings()` behavior intact
- preserve existing setter behavior (`setCloudMode`, `setNotifications`, etc.) so explicit updates still mutate the persisted baseline
- only remove the unintentional render-time baseline drift

- [ ] **Step 4: Re-run the new helper state test and verify GREEN**

Run the same test command from Step 2.

Expected: PASS.

- [ ] **Step 5: Re-run representative Settings UI tests**

Run:

```bash
pnpm test --runInBand src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the persisted-settings lifetime fix**

Run:

```bash
git add app/src/components/__tests__/helpers/renderSettingsPage.tsx app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx app/src/components/__tests__/helpers/renderSettingsPage.state.test.tsx
git commit -m "test: isolate settings helper persisted state"
```

If you kept all helper-facing tests inside `renderSettingsPage.stability.test.tsx`, omit the new file from `git add`.

### Task 3: Run Frontend Settings Surface And Full Verification

**Files:**
- Verify only: `app/src/components/__tests__/helpers/renderSettingsPage.tsx`
- Verify only: `app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx`
- Verify only: `app/src/components/__tests__/helpers/renderSettingsPage.state.test.tsx` if created

- [ ] **Step 1: Run the named Settings frontend script**

Run:

```bash
pnpm run test:frontend:settings
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

Expected: only the helper/spec/plan/test paths planned for this batch are changed in this worktree.
