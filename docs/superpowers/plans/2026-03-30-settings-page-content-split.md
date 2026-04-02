# Settings Page Content Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the two heaviest render sections out of `SettingsPageContent.tsx` while keeping settings-page behavior, section order, and test IDs stable.

**Architecture:** Keep `SettingsPageContent` as the public page-level composition component. Extract only the account/sync section and the data/storage section into presentational local components, and continue passing the same overall props from `SettingsPage.tsx` for now.

**Tech Stack:** TypeScript, React Native, Testing Library, Jest

---

### Task 1: Extract `SettingsAccountSyncSection`

**Files:**
- Create: `app/src/components/settings-page/SettingsAccountSyncSection.tsx`
- Modify: `app/src/components/settings-page/SettingsPageContent.tsx`
- Test: `app/src/components/__tests__/SettingsPage.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.backend-env.test.tsx`

- [ ] **Step 1: Write the failing test**

Add one focused assembly assertion to `app/src/components/__tests__/SettingsPage.test.tsx` that proves the account/sync section still contains the backend card and the authenticated/unauthenticated entry points after extraction.

Append this test if no equivalent assertion already exists:

```ts
it('keeps backend card and account actions inside the account/sync section', async () => {
  const { screen } = await renderSettingsPage({ authenticated: true, userEmail: 'tester@example.com' });
  const accountSection = screen.getByTestId('settings-section-account-sync');

  expect(within(accountSection).getByTestId('settings-backend-card')).toBeTruthy();
  expect(within(accountSection).getByText('云端模式')).toBeTruthy();
  expect(within(accountSection).getByTestId('settings-show-sync-status')).toBeTruthy();
  expect(within(accountSection).getByText('退出登录')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails or meaningfully locks current behavior**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/SettingsPage.test.tsx -t "keeps backend card and account actions inside the account/sync section"
```

Expected:

- Either FAIL because the assertion is new and stricter than current coverage
- Or PASS immediately, which means it now locks the desired behavior before extraction

- [ ] **Step 3: Write the minimal implementation**

Create `app/src/components/settings-page/SettingsAccountSyncSection.tsx` and move only this rendering block out of `SettingsPageContent.tsx`:

- `SettingsBackendServerCard`
- authenticated vs unauthenticated branch
- cloud-mode row
- sync status button
- logout button

Target shape:

```tsx
interface SettingsAccountSyncSectionProps {
  isAuthenticated: boolean;
  userEmail?: string;
  cloudMode: boolean | 'switching';
  isSwitchingMode: boolean;
  currentServerUrl: string;
  backendDraftUrl: string;
  recentServerUrls: string[];
  backendTestStatus: 'idle' | 'testing' | 'success' | 'error';
  backendTestErrorMessage: string | null;
  isSavingBackendServer: boolean;
  canSaveBackendServer: boolean;
  onCloudModeToggle: (value: boolean) => void | Promise<void>;
  onShowSyncStatus: () => void | Promise<void>;
  onLogout: () => void;
  onShowLogin: () => void;
  onBackendDraftUrlChange: (value: string) => void;
  onTestBackendServer: () => void | Promise<void>;
  onSaveBackendServer: () => void | Promise<void>;
  onSelectRecentBackendServer: (url: string) => void;
}
```

Then update `SettingsPageContent.tsx` to render the new component in the same position and keep the same `SettingsSection title="账户与同步"` wrapping behavior, either inside the new component or at the same structural level.

Do not change text, test IDs, or `Switch` behavior.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/settings-page/settings-page.account-auth.test.tsx src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx src/components/__tests__/settings-page/settings-page.backend-env.test.tsx
```

Then run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings-page/SettingsAccountSyncSection.tsx src/components/settings-page/SettingsPageContent.tsx src/components/__tests__/SettingsPage.test.tsx
git commit -m "refactor: extract settings account sync section"
```

### Task 2: Extract `SettingsDataStorageSection`

**Files:**
- Create: `app/src/components/settings-page/SettingsDataStorageSection.tsx`
- Modify: `app/src/components/settings-page/SettingsPageContent.tsx`
- Test: `app/src/components/__tests__/SettingsPage.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx`

- [ ] **Step 1: Write the failing test**

Add one focused assembly assertion to `app/src/components/__tests__/SettingsPage.test.tsx` that proves the data/storage section still contains the high-quality switch, storage card, and clear-cache entry after extraction.

Append this test if no equivalent assertion already exists:

```ts
it('keeps storage controls grouped inside the data/storage section', async () => {
  const { screen } = await renderSettingsPage();
  const dataStorageSection = screen.getByTestId('settings-section-data-storage');

  expect(within(dataStorageSection).getByTestId('settings-switch-high-quality-photos')).toBeTruthy();
  expect(within(dataStorageSection).getByTestId('settings-storage-card')).toBeTruthy();
  expect(within(dataStorageSection).getByText('清除缓存')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails or meaningfully locks current behavior**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/SettingsPage.test.tsx -t "keeps storage controls grouped inside the data/storage section"
```

Expected:

- Either FAIL because the assertion is new and stricter than current coverage
- Or PASS immediately, which means it now locks the desired behavior before extraction

- [ ] **Step 3: Write the minimal implementation**

Create `app/src/components/settings-page/SettingsDataStorageSection.tsx` and move only this rendering block out of `SettingsPageContent.tsx`:

- high-quality-photos switch row
- `SettingsStorageInfo`
- clear-cache button

Target shape:

```tsx
interface SettingsDataStorageSectionProps {
  highQualityPhotos: boolean;
  usedSpace: string;
  entryCount: number;
  photoCount: number;
  voiceCount: number;
  onHighQualityPhotosChange: (value: boolean) => void | Promise<void>;
  onClearCache: () => void;
}
```

Then update `SettingsPageContent.tsx` to render the new component in the same position and preserve the same `SettingsSection title="数据与存储"` structure and test IDs.

Do not change visible text or callback behavior.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx
```

Then run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings-page/SettingsDataStorageSection.tsx src/components/settings-page/SettingsPageContent.tsx src/components/__tests__/SettingsPage.test.tsx
git commit -m "refactor: extract settings data storage section"
```

### Task 3: Final Verification

**Files:**
- Verify only: `app/src/components/settings-page/SettingsPageContent.tsx`
- Verify only: `app/src/components/settings-page/SettingsAccountSyncSection.tsx`
- Verify only: `app/src/components/settings-page/SettingsDataStorageSection.tsx`
- Verify only: `app/src/components/__tests__/SettingsPage.test.tsx`
- Verify only: `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`
- Verify only: `app/src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx`
- Verify only: `app/src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx`
- Verify only: `app/src/components/__tests__/settings-page/settings-page.backend-env.test.tsx`

- [ ] **Step 1: Run scoped settings tests**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/settings-page/settings-page.account-auth.test.tsx src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx src/components/__tests__/settings-page/settings-page.backend-env.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full settings frontend suite**

Run:

```bash
pnpm run test:frontend:settings
```

Expected: PASS.

- [ ] **Step 3: Run full project verification**

Run:

```bash
pnpm run verify
```

Expected: PASS.

- [ ] **Step 4: Review final scoped diff**

Run:

```bash
git diff -- src/components/settings-page/SettingsPageContent.tsx src/components/settings-page/SettingsAccountSyncSection.tsx src/components/settings-page/SettingsDataStorageSection.tsx src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/settings-page/settings-page.account-auth.test.tsx src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx src/components/__tests__/settings-page/settings-page.backend-env.test.tsx
```

Expected: diff contains only the approved content split and any minimal test adjustments.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings-page/SettingsPageContent.tsx src/components/settings-page/SettingsAccountSyncSection.tsx src/components/settings-page/SettingsDataStorageSection.tsx src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/settings-page/settings-page.account-auth.test.tsx src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx src/components/__tests__/settings-page/settings-page.backend-env.test.tsx
git commit -m "refactor: split settings page content" || true
```

If there is nothing left to commit because Task 1 and Task 2 already captured the final code state, record that explicitly in execution notes and do not force an empty commit.
