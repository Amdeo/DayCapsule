# Settings Page Controller Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `useSettingsPageController.ts` into smaller internal hooks for storage and backend-server concerns while keeping the public controller contract stable.

**Architecture:** Keep `useSettingsPageController()` as the outward-facing orchestrator. Extract `useSettingsPageStorage()` and `useSettingsPageBackendServer()` into the same settings-page folder, move only the clearly bounded state/handlers into those hooks, and preserve the existing return shape consumed by `SettingsPage.tsx` and `SettingsPageContent.tsx`.

**Tech Stack:** TypeScript, React, React Native, Jest, Testing Library

---

### Task 1: Extract Storage Logic To `useSettingsPageStorage`

**Files:**
- Create: `app/src/components/settings-page/useSettingsPageStorage.ts`
- Modify: `app/src/components/settings-page/useSettingsPageController.ts`
- Test: `app/src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx`
- Test: `app/src/components/__tests__/SettingsPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Add one focused assertion to the existing storage-actions coverage in `app/src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx` that proves the extracted storage behavior still refreshes displayed storage info after clearing cache.

Append this test if an equivalent assertion does not already exist:

```ts
it('refreshes storage info after clearing cache completes', async () => {
  const { screen, mocks } = await renderSettingsPage();

  fireEvent.press(screen.getByText('清除缓存'));
  fireEvent.press(screen.getByText('清除'));

  await waitFor(() => {
    expect(mocks.clearLocalAppData).toHaveBeenCalledTimes(1);
    expect(mocks.entries.loadEntries).toHaveBeenCalledTimes(1);
    expect(mocks.fileSystem.getStorageStats).toHaveBeenCalledTimes(2);
  });
});
```

This test should document the storage-refresh contract before the extraction.

- [ ] **Step 2: Run test to verify it fails or meaningfully exercises the current behavior**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx
```

Expected:

- Either FAIL because the new assertion is stricter than the current coverage
- Or PASS immediately, which means the test successfully locks the existing behavior before refactor

- [ ] **Step 3: Write the minimal implementation**

Create `app/src/components/settings-page/useSettingsPageStorage.ts` and move only the storage concern into it.

Target shape:

```ts
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { clearLocalAppData } from '@/src/services/localAppDataService';
import { getStorageStats } from '@/src/utils/fileSystem';
import { useEntryStore } from '@/src/store/entryStore';

function formatUsedSpace(totalSize: number) {
  const mb = totalSize / (1024 * 1024);
  return mb < 0.1 ? '< 0.1 MB' : `${mb.toFixed(1)} MB`;
}

export function useSettingsPageStorage() {
  const [usedSpace, setUsedSpace] = useState('计算中...');

  const refreshStorageStats = useCallback(async () => {
    try {
      const stats = await getStorageStats();
      setUsedSpace(formatUsedSpace(stats.totalSize));
    } catch {
      setUsedSpace('未知');
    }
  }, []);

  const handleClearCache = useCallback(() => {
    Alert.alert('清除缓存', '确定要清除当前设备上的本地记录、媒体和缓存数据吗？后端数据不会受影响。', [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        style: 'destructive',
        onPress: async () => {
          try {
            setUsedSpace('计算中...');
            await clearLocalAppData();
            await useEntryStore.getState().loadEntries();
            await refreshStorageStats();
            Alert.alert('成功', '本地数据已清除');
          } catch {
            await refreshStorageStats();
            Alert.alert('清除失败', '清理本地数据时发生错误');
          }
        },
      },
    ]);
  }, [refreshStorageStats]);

  return { usedSpace, refreshStorageStats, handleClearCache };
}
```

Then update `useSettingsPageController.ts` to import and use that hook, removing only the moved state/helpers.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx src/components/__tests__/SettingsPage.test.tsx
```

Then run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings-page/useSettingsPageStorage.ts src/components/settings-page/useSettingsPageController.ts src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx
git commit -m "refactor: extract settings storage controller"
```

### Task 2: Extract Backend Server Logic To `useSettingsPageBackendServer`

**Files:**
- Create: `app/src/components/settings-page/useSettingsPageBackendServer.ts`
- Modify: `app/src/components/settings-page/useSettingsPageController.ts`
- Test: `app/src/components/__tests__/settings-page/settings-page.backend-env.test.tsx`
- Test: `app/src/components/__tests__/SettingsPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Add one focused assertion to `app/src/components/__tests__/settings-page/settings-page.backend-env.test.tsx` that proves the extracted backend hook still resets backend test state when the draft URL changes.

Append this test if no equivalent assertion already exists:

```ts
it('resets backend test status when the draft url changes after a successful test', async () => {
  const { screen, mocks } = await renderSettingsPage();

  fireEvent.changeText(screen.getByDisplayValue('https://server-a.example.com'), 'https://server-b.example.com');
  fireEvent.press(screen.getByText('测试连接'));

  await waitFor(() => {
    expect(mocks.backendConnection.testBackendConnection).toHaveBeenCalledTimes(1);
  });

  fireEvent.changeText(screen.getByDisplayValue('https://server-b.example.com'), 'https://server-c.example.com');

  expect(screen.queryByText('连接成功')).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails or meaningfully locks current behavior**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/__tests__/settings-page/settings-page.backend-env.test.tsx
```

Expected:

- Either FAIL because the assertion is stricter than the current file
- Or PASS immediately, which means it now locks the backend reset behavior before refactor

- [ ] **Step 3: Write the minimal implementation**

Create `app/src/components/settings-page/useSettingsPageBackendServer.ts` and move only backend-server state/actions from the controller.

It should own:

- `currentServerUrl`
- `backendDraftUrl`
- `recentServerUrls`
- `backendTestStatus`
- `backendTestedUrl`
- `backendTestErrorMessage`
- `isSavingBackendServer`
- `canSaveBackendServer`
- `loadBackendState`
- `handleBackendDraftUrlChange`
- `handleSelectRecentBackendServer`
- `handleTestBackendServer`
- `handleSaveBackendServer`

Keep all existing implementation logic, alert copy, and backend-service calls unchanged. Then update `useSettingsPageController.ts` to compose the new hook and expose the same return fields as before.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/__tests__/settings-page/settings-page.backend-env.test.tsx src/components/__tests__/SettingsPage.test.tsx
```

Then run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings-page/useSettingsPageBackendServer.ts src/components/settings-page/useSettingsPageController.ts src/components/__tests__/settings-page/settings-page.backend-env.test.tsx
git commit -m "refactor: extract settings backend controller"
```

### Task 3: Final Verification

**Files:**
- Verify only: `app/src/components/settings-page/useSettingsPageController.ts`
- Verify only: `app/src/components/settings-page/useSettingsPageStorage.ts`
- Verify only: `app/src/components/settings-page/useSettingsPageBackendServer.ts`
- Verify only: `app/src/components/__tests__/SettingsPage.test.tsx`
- Verify only: `app/src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx`
- Verify only: `app/src/components/__tests__/settings-page/settings-page.backend-env.test.tsx`

- [ ] **Step 1: Run scoped settings tests**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx src/components/__tests__/settings-page/settings-page.backend-env.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full settings frontend suite**

Run:

```bash
npm run test:frontend:settings
```

Expected: PASS.

- [ ] **Step 3: Run full project verification**

Run:

```bash
npm run verify
```

Expected: PASS.

- [ ] **Step 4: Review final scoped diff**

Run:

```bash
git diff -- src/components/settings-page/useSettingsPageController.ts src/components/settings-page/useSettingsPageStorage.ts src/components/settings-page/useSettingsPageBackendServer.ts src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx src/components/__tests__/settings-page/settings-page.backend-env.test.tsx
```

Expected: diff contains only the approved controller split and any minimal test adjustments.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings-page/useSettingsPageController.ts src/components/settings-page/useSettingsPageStorage.ts src/components/settings-page/useSettingsPageBackendServer.ts src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx src/components/__tests__/settings-page/settings-page.backend-env.test.tsx
git commit -m "refactor: split settings page controller" || true
```

If there is nothing left to commit because Task 1 and Task 2 already captured the final code state, record that explicitly in execution notes and do not force an empty commit.
