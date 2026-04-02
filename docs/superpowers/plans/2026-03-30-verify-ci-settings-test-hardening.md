# Verify/CI And Settings Test Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one canonical app verification command, make the Android release workflow reuse it, and harden `renderSettingsPage` so Settings tests settle on observable UI state instead of fixed microtask flushing.

**Architecture:** Keep verification logic centralized in `app/package.json`, with GitHub Actions delegating to that single entry point. Keep the Settings test change narrowly scoped by replacing the helper's `Promise.resolve()` flush loop with a `waitFor`-based observable UI condition that matches the existing storage summary behavior used by Settings tests.

**Tech Stack:** npm scripts, GitHub Actions YAML, Jest, `@testing-library/react-native`, React Native test helpers

---

### Task 1: Add The Canonical `verify` Script

**Files:**
- Modify: `app/package.json`

- [ ] **Step 1: Prove the canonical verification command does not exist yet**

Run:

```bash
pnpm run verify
```

Expected: npm exits non-zero with `Missing script: "verify"`.

- [ ] **Step 2: Add `verify` to `app/package.json`**

Update the scripts block so the app exposes a single full verification entry point:

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "lint": "eslint . --ext .js,.ts,.tsx --max-warnings=0",
    "typecheck": "tsc --noEmit",
    "verify": "pnpm run lint && pnpm run typecheck && pnpm test --runInBand",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

- [ ] **Step 3: Run the new verification command**

Run:

```bash
pnpm run verify
```

Expected: lint, typecheck, and tests all run from the new single entry point and exit successfully.

- [ ] **Step 4: Commit the script change**

Run:

```bash
git add app/package.json
git commit -m "chore: add canonical verify command"
```

### Task 2: Make Android Release CI Reuse `verify`

**Files:**
- Modify: `.github/workflows/android-release.yml`

- [ ] **Step 1: Confirm the workflow does not call `verify` yet**

Run:

```bash
grep -n "pnpm run verify" .github/workflows/android-release.yml
```

Expected: no output.

- [ ] **Step 2: Replace the split typecheck/test steps with one verify step**

Change the workflow section from separate typecheck and test steps to one step:

```yaml
      - name: Install dependencies
        working-directory: app
        run: pnpm install --frozen-lockfile

      - name: Run verify
        working-directory: app
        run: pnpm run verify
```

Delete the old block:

```yaml
      - name: Typecheck
        working-directory: app
        run: pnpm run typecheck

      - name: Run tests
        working-directory: app
        run: pnpm test --runInBand
```

- [ ] **Step 3: Sanity-check the workflow now points at the shared command**

Run:

```bash
grep -n "Run verify\|pnpm run verify" .github/workflows/android-release.yml
```

Expected: one step name line and one `run: pnpm run verify` line.

- [ ] **Step 4: Commit the CI change**

Run:

```bash
git add .github/workflows/android-release.yml
git commit -m "ci: reuse app verify command for release build"
```

### Task 3: Make `renderSettingsPage` Settle On Observable UI

**Files:**
- Modify: `app/src/components/__tests__/helpers/renderSettingsPage.tsx`
- Modify: `app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx`
- Test: `app/src/components/__tests__/SettingsPage.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.backend-env.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.preferences.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.repair-entry.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.sync-status.test.tsx`

- [ ] **Step 1: Add a failing stability assertion that the helper returns after the storage summary is ready**

Update `renderSettingsPage.stability.test.tsx` to assert the helper returns only after the Settings storage card shows its formatted value, and stop using manual microtask flushing in the act-warning test:

```tsx
import React from 'react';
import { within } from '@testing-library/react-native';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from './renderSettingsPage';

describe('renderSettingsPage stability', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('returns only after the storage summary is visible', async () => {
    const { screen } = await renderSettingsPage();

    expect(
      within(screen.getByTestId('settings-storage-card')).getByText('< 0.1 MB')
    ).toBeTruthy();
  });

  it('does not emit act warnings after the initial settings page render settles', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await renderSettingsPage({ authenticated: true, cloudMode: true });

    const actWarnings = consoleErrorSpy.mock.calls
      .map((args) => args.map(String).join(' '))
      .filter((message) => message.includes('not wrapped in act'));

    expect(actWarnings).toHaveLength(0);

    consoleErrorSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run the targeted helper stability test and confirm it fails for the expected reason**

Run:

```bash
pnpm test --runInBand src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx
```

Expected: the new `returns only after the storage summary is visible` assertion fails because `< 0.1 MB` is not yet present immediately after `renderSettingsPage()` returns.

- [ ] **Step 3: Replace the fixed microtask loop in `renderSettingsPage.tsx` with a condition-based wait**

Change the helper imports and settling logic so the helper waits on the existing storage summary UI instead of `Promise.resolve()` cycles:

```tsx
import React from 'react';
import { render, waitFor, within } from '@testing-library/react-native';

async function settleSettingsPage(rendered: ReturnType<typeof render>) {
  await waitFor(() => {
    expect(
      within(rendered.getByTestId('settings-storage-card')).getByText('< 0.1 MB')
    ).toBeTruthy();
  });
}

export async function renderSettingsPage(options: RenderSettingsPageOptions = {}) {
  const {
    visible = true,
    authenticated = false,
    cloudMode,
    entries = [],
    userEmail = authenticated ? 'tester@example.com' : null,
    e2eSyncLab = false,
    props = {},
  } = options;

  resetRenderSettingsPageMocks();

  mockShowE2ESyncLab = e2eSyncLab;
  previousE2ESyncLabEnv = process.env.EXPO_PUBLIC_E2E_SYNC_LAB;
  if (mockShowE2ESyncLab) {
    process.env.EXPO_PUBLIC_E2E_SYNC_LAB = '1';
  } else {
    delete process.env.EXPO_PUBLIC_E2E_SYNC_LAB;
  }

  Object.assign(mockAuthState, {
    user: userEmail ? { email: userEmail } : null,
    isAuthenticated: authenticated,
    logout: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
  });

  Object.assign(mockSettingsState, {
    ...mockPersistedSettings,
    cloudMode: cloudMode ?? mockPersistedSettings.cloudMode,
    isLoaded: true,
  });
  mockPersistedSettings.cloudMode = mockSettingsState.cloudMode;

  Object.assign(mockEntryStoreState, {
    entries,
    loadEntries: jest.fn(async () => undefined),
  });

  const finalProps: SettingsPageProps = {
    visible,
    onClose: jest.fn(),
    ...props,
  };

  const { SettingsPage } = require('../../SettingsPage');
  const rendered = render(<SettingsPage {...finalProps} />);
  await settleSettingsPage(rendered);

  return {
    ...rendered,
    screen: rendered,
    props: finalProps,
    mocks: {
      settings: mockSettingsState,
      auth: mockAuthState,
      entries: mockEntryStoreState,
      syncBootstrap: mockSyncBootstrapService,
      cloudSync: mockCloudSyncService,
      apiClient: mockApiClient,
      backend: mockBackendState,
      showErrorFeedback: mockShowErrorFeedback,
      showCloudSyncStatusAlert: mockShowCloudSyncStatusAlert,
      showSyncRepairPrompt: mockShowSyncRepairPrompt,
      switchBackendEnvironment: mockSwitchBackendEnvironment,
      clearLocalAppData: mockClearLocalAppData,
      injectSuspectRepairable: mockInjectSuspectRepairable,
      injectRepairPending: mockInjectRepairPending,
      injectTextDetailFixture: mockInjectTextDetailFixture,
      clearSyncFixtures: mockClearSyncFixtures,
    },
  };
}
```

Important details:

- delete `act` and `flushSettingsPageEffects`
- import `waitFor` and `within` from `@testing-library/react-native`
- keep the stable signal tied to `settings-storage-card` and the formatted `< 0.1 MB` value already used by `SettingsPage.test.tsx`
- keep the helper scope narrow; do not expand this pattern into other helpers in this batch

- [ ] **Step 4: Re-run the helper stability test and confirm it passes**

Run:

```bash
pnpm test --runInBand src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx
```

Expected: both helper stability tests pass without any manual `Promise.resolve()` flushes.

- [ ] **Step 5: Re-run the Settings page test surface that depends on the helper**

Run:

```bash
pnpm run test:frontend:settings
```

Expected: the Settings page test suite passes without new `act` warnings or helper timing failures.

- [ ] **Step 6: Commit the helper hardening change**

Run:

```bash
git add app/src/components/__tests__/helpers/renderSettingsPage.tsx app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx
git commit -m "test: harden settings page helper settling"
```

### Task 4: Run The Full Verification Gate

**Files:**
- Verify only: `app/package.json`
- Verify only: `.github/workflows/android-release.yml`
- Verify only: `app/src/components/__tests__/helpers/renderSettingsPage.tsx`
- Verify only: `app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx`

- [ ] **Step 1: Run the full app verification command from the app workspace**

Run:

```bash
pnpm run verify
```

Expected: lint, typecheck, and the full Jest suite pass.

- [ ] **Step 2: Confirm the worktree only contains the intended implementation changes**

Run:

```bash
git status --short
```

Expected: no unexpected modified files outside the planned package/workflow/helper paths and the plan/spec docs already created in this worktree.
