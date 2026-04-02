# Maestro Android Cloud Sync Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Android 模拟器补齐云同步与异常媒体修复的 Maestro UI flows，覆盖真实后端 happy path 和测试注入异常场景。

**Architecture:** 在现有 `.maestro` smoke 基础上扩展一组 `cloud-sync` flows，同时在设置页里增加一个仅测试环境可见的 `E2E Sync Lab` 入口，用本地注入稳定复现 suspect media、repair prompt 和 repair pending 等状态。为了让 Maestro 选择器稳定，补少量 `testID` 和错误反馈动作的显式锚点，再通过公共子 flow 复用启动、打开设置页、打开同步状态和清理测试夹具等动作。

**Tech Stack:** React Native, Expo, Zustand, Jest, React Native Testing Library, Maestro YAML flows, Android emulator

---

## File Structure

- Modify: `app/src/store/errorFeedbackStore.ts`
  Purpose: 给错误反馈动作增加可选 `testID`，为 Maestro 提供稳定选择器。
- Modify: `app/src/components/ErrorFeedbackModal.tsx`
  Purpose: 透传错误反馈动作的 `testID` 到按钮容器，避免 Maestro 依赖按钮索引或文案。
- Modify: `app/src/components/__tests__/ErrorFeedbackModal.test.tsx`
  Purpose: 锁定反馈弹窗动作按钮 `testID` 的透传行为。
- Create: `app/src/services/e2eSyncLabService.ts`
  Purpose: 注入和清理云同步测试夹具，写入 `syncStore`、`mediaRepairStore`，必要时写入本地 photo entry。
- Create: `app/src/services/__tests__/e2eSyncLabService.test.ts`
  Purpose: 覆盖 suspect fixture、repair pending fixture、clear fixture 和 repair prompt 触发。
- Create: `app/src/components/settings-page/SettingsE2ESyncLab.tsx`
  Purpose: 在设置页渲染测试环境专用的 `E2E Sync Lab` 按钮区。
- Modify: `app/src/components/settings-page/SettingsPageContent.tsx`
  Purpose: 在设置页接入 `E2E Sync Lab` 区块，并给“同步状态”入口补稳定 `testID`。
- Modify: `app/src/components/SettingsPage.tsx`
  Purpose: 组装 `E2E Sync Lab` handler，把 service 接进设置页。
- Modify: `app/src/components/__tests__/SettingsPage.test.tsx`
  Purpose: 覆盖 `E2E Sync Lab` 显示条件、按钮交互和同步状态入口 `testID`。
- Modify: `app/src/services/showCloudSyncStatusAlert.ts`
  Purpose: 为“修复异常媒体”“立即同步”等动作分配稳定 `testID`。
- Modify: `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts`
  Purpose: 锁定同步状态弹窗动作里的 `testID`。
- Modify: `app/.maestro/README.md`
  Purpose: 补充 Android 云同步 flow 的运行前提、真实后端要求、测试开关和执行命令。
- Create: `app/.maestro/env/android-dev.yaml`
  Purpose: 约定 Android 开发环境下的 appId、后端地址、测试开关与账号变量。
- Create: `app/.maestro/common/launch-app.yaml`
  Purpose: 统一启动 app 并等待首页锚点稳定出现。
- Create: `app/.maestro/common/open-sync-status.yaml`
  Purpose: 从设置页进入同步状态弹窗。
- Create: `app/.maestro/common/open-e2e-sync-lab.yaml`
  Purpose: 从设置页定位到 `E2E Sync Lab`。
- Create: `app/.maestro/common/clear-e2e-sync-fixture.yaml`
  Purpose: 清理测试夹具，避免 flow 串场。
- Create: `app/.maestro/flows/cloud-sync/happy-path-restore.yaml`
  Purpose: 真实后端恢复 happy path。
- Create: `app/.maestro/flows/cloud-sync/status-from-settings.yaml`
  Purpose: 从设置页查看同步状态。
- Create: `app/.maestro/flows/cloud-sync/suspect-media.yaml`
  Purpose: 测试注入 suspect + repairable 状态。
- Create: `app/.maestro/flows/cloud-sync/repair-confirm.yaml`
  Purpose: 测试注入后确认修复。
- Create: `app/.maestro/flows/cloud-sync/repair-later.yaml`
  Purpose: 测试注入后稍后处理，再从状态弹窗重新拉起修复提示。

### Task 1: Add Stable UI Anchors For Cloud Sync Maestro Paths

**Files:**
- Modify: `app/src/store/errorFeedbackStore.ts`
- Modify: `app/src/components/ErrorFeedbackModal.tsx`
- Modify: `app/src/components/__tests__/ErrorFeedbackModal.test.tsx`
- Modify: `app/src/components/settings-page/SettingsPageContent.tsx`
- Modify: `app/src/components/__tests__/SettingsPage.test.tsx`
- Modify: `app/src/services/showCloudSyncStatusAlert.ts`
- Modify: `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts`
- Test: `app/src/components/__tests__/ErrorFeedbackModal.test.tsx`
- Test: `app/src/components/__tests__/SettingsPage.test.tsx`
- Test: `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts`

- [ ] **Step 1: Write the failing ErrorFeedbackModal test for action test IDs**

在 `app/src/components/__tests__/ErrorFeedbackModal.test.tsx` 新增最小失败用例，锁定错误反馈动作 `testID` 透传：

```tsx
it('renders stable action testIDs for cloud sync feedback actions', () => {
  render(
    <ErrorFeedbackModal
      visible
      onDismiss={jest.fn()}
      request={{
        title: '云同步状态',
        actions: [
          { label: '修复异常媒体', role: 'secondary', testID: 'error-feedback-action-repair-media' },
          { label: '立即同步', role: 'primary', testID: 'error-feedback-action-sync-now' },
        ],
      }}
    />
  );

  expect(screen.getByTestId('error-feedback-action-repair-media')).toBeTruthy();
  expect(screen.getByTestId('error-feedback-action-sync-now')).toBeTruthy();
});
```

- [ ] **Step 2: Run the modal test to verify it fails**

Run: `cd app && pnpm test -- --runTestsByPath src/components/__tests__/ErrorFeedbackModal.test.tsx --runInBand`

Expected: FAIL，因为 `ErrorFeedbackAction` 还没有 `testID` 字段，`ErrorFeedbackModal` 也还没有透传。

- [ ] **Step 3: Implement the minimal ErrorFeedbackModal changes**

在 `app/src/store/errorFeedbackStore.ts` 给动作类型增加：

```ts
export type ErrorFeedbackAction = {
  label: string;
  role: 'primary' | 'secondary';
  onPress?: () => void | Promise<void>;
  testID?: string;
};
```

在 `app/src/components/ErrorFeedbackModal.tsx` 把 `testID` 透传到 `Pressable`：

```tsx
<Pressable
  testID={action.testID ?? `error-feedback-action-${index}`}
  ...
>
```

并把现有 `Text` 上的 `testID` 去掉，避免 `Pressable` 和 `Text` 竞争同一个锚点。

- [ ] **Step 4: Re-run the modal test to verify it passes**

Run: `cd app && pnpm test -- --runTestsByPath src/components/__tests__/ErrorFeedbackModal.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Write the failing settings and sync status tests**

在 `app/src/components/__tests__/SettingsPage.test.tsx` 新增失败用例：

```tsx
it('renders a stable sync status button testID for authenticated cloud users', async () => {
  mockCloudMode = true;
  mockIsAuthenticated = true;
  mockUser = { email: 'sync@test.com' };

  const screen = render(<SettingsPage visible onClose={() => {}} />);

  await waitFor(() => {
    expect(screen.getByTestId('settings-show-sync-status')).toBeTruthy();
  });
});
```

在 `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts` 新增失败断言：

```ts
expect(firstRequest.actions).toEqual(expect.arrayContaining([
  expect.objectContaining({ label: '修复异常媒体', testID: 'error-feedback-action-repair-media' }),
  expect.objectContaining({ label: '立即同步', testID: 'error-feedback-action-sync-now' }),
]));
```

- [ ] **Step 6: Run the settings and sync status tests to verify they fail**

Run: `cd app && pnpm test -- --runTestsByPath src/components/__tests__/SettingsPage.test.tsx src/services/__tests__/showCloudSyncStatusAlert.test.ts --runInBand`

Expected: FAIL，因为“同步状态”按钮还没有稳定 `testID`，动作对象也还没有显式 `testID`。

- [ ] **Step 7: Implement the minimal settings and sync status anchor changes**

在 `app/src/components/settings-page/SettingsPageContent.tsx` 给“同步状态”按钮补：

```tsx
<SettingButton
  testID="settings-show-sync-status"
  icon="cloud-done"
  title="同步状态"
  ...
/>
```

在 `app/src/services/showCloudSyncStatusAlert.ts` 给两个动作补稳定 `testID`：

```ts
{
  label: '修复异常媒体',
  role: 'secondary',
  testID: 'error-feedback-action-repair-media',
  onPress: () => {
    showPhotoRepairPrompt();
  },
}
{
  label: '立即同步',
  role: 'primary',
  testID: 'error-feedback-action-sync-now',
  onPress: onSyncNow,
}
```

- [ ] **Step 8: Re-run the settings and sync status tests to verify they pass**

Run: `cd app && pnpm test -- --runTestsByPath src/components/__tests__/SettingsPage.test.tsx src/services/__tests__/showCloudSyncStatusAlert.test.ts --runInBand`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add app/src/store/errorFeedbackStore.ts app/src/components/ErrorFeedbackModal.tsx app/src/components/__tests__/ErrorFeedbackModal.test.tsx app/src/components/settings-page/SettingsPageContent.tsx app/src/components/__tests__/SettingsPage.test.tsx app/src/services/showCloudSyncStatusAlert.ts app/src/services/__tests__/showCloudSyncStatusAlert.test.ts
git commit -m "test(ui): add stable cloud sync maestro anchors"
```

### Task 2: Add E2E Sync Lab Fixture Injection To Settings

**Files:**
- Create: `app/src/services/e2eSyncLabService.ts`
- Create: `app/src/services/__tests__/e2eSyncLabService.test.ts`
- Create: `app/src/components/settings-page/SettingsE2ESyncLab.tsx`
- Modify: `app/src/components/settings-page/SettingsPageContent.tsx`
- Modify: `app/src/components/SettingsPage.tsx`
- Modify: `app/src/components/__tests__/SettingsPage.test.tsx`
- Test: `app/src/services/__tests__/e2eSyncLabService.test.ts`
- Test: `app/src/components/__tests__/SettingsPage.test.tsx`

- [ ] **Step 1: Write the failing service test for suspect fixture injection**

在 `app/src/services/__tests__/e2eSyncLabService.test.ts` 新增失败用例，覆盖 suspect fixture：

```ts
it('injects a suspect repairable media fixture into syncStore and mediaRepairStore', async () => {
  await createE2ESyncLabService(deps).injectSuspectRepairable();

  expect(mockSetMediaValidationSummary).toHaveBeenCalledWith(expect.objectContaining({
    status: 'partial',
    suspect: 1,
    repairable: 1,
  }));
  expect(mockReplaceIssues).toHaveBeenCalledWith([
    expect.objectContaining({
      integrityStatus: 'repair_prompt_required',
      entryId: 'e2e-sync-entry-1',
    }),
  ]);
});
```

- [ ] **Step 2: Run the service test to verify it fails**

Run: `cd app && pnpm test -- --runTestsByPath src/services/__tests__/e2eSyncLabService.test.ts --runInBand`

Expected: FAIL，因为 service 还不存在。

- [ ] **Step 3: Implement the minimal E2E sync lab service**

在 `app/src/services/e2eSyncLabService.ts` 实现：

```ts
export interface E2ESyncLabService {
  injectSuspectRepairable: () => Promise<void>;
  injectRepairPending: () => Promise<void>;
  clearFixtures: () => Promise<void>;
  showRepairPrompt: () => void;
}
```

最小依赖：

- `useSyncStore.getState().setMediaValidationSummary(...)`
- `useMediaRepairStore.getState().replaceIssues(...)`
- `useMediaRepairStore.getState().clearIssues()`
- 可选：`DB.restoreEntries(...)` 或 `DB.deleteEntry(...)`
- `showPhotoRepairPrompt()`

`injectSuspectRepairable()` 需要至少写入：

```ts
{
  status: 'partial',
  total: 1,
  downloaded: 1,
  missing: 0,
  failed: 0,
  suspect: 1,
  repairable: 1,
  lastError: 'cloud hash mismatch while local original is still healthy',
  lastValidatedAt: Date.now(),
}
```

以及一条带 `repair_prompt_required` 的 issue。

`injectRepairPending()` 需要写入：

```ts
{
  status: 'partial',
  total: 1,
  downloaded: 1,
  missing: 0,
  failed: 0,
  suspect: 1,
  repairable: 0,
  lastError: 'waiting for sync confirmation after user-approved repair',
  lastValidatedAt: Date.now(),
}
```

`clearFixtures()` 需要清掉摘要和 issue。

- [ ] **Step 4: Re-run the service test to verify it passes**

Run: `cd app && pnpm test -- --runTestsByPath src/services/__tests__/e2eSyncLabService.test.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Write the failing settings test for the E2E Sync Lab**

在 `app/src/components/__tests__/SettingsPage.test.tsx` 新增失败用例：

```tsx
it('shows the E2E Sync Lab when EXPO_PUBLIC_E2E_SYNC_LAB=1', async () => {
  process.env.EXPO_PUBLIC_E2E_SYNC_LAB = '1';

  const screen = render(<SettingsPage visible onClose={() => {}} />);

  await waitFor(() => {
    expect(screen.getByTestId('e2e-sync-lab-root')).toBeTruthy();
  });
});
```

以及交互断言：

```tsx
fireEvent.press(screen.getByTestId('e2e-sync-fixture-suspect'));
expect(mockInjectSuspectRepairable).toHaveBeenCalledTimes(1);
```

- [ ] **Step 6: Run the settings test to verify it fails**

Run: `cd app && pnpm test -- --runTestsByPath src/components/__tests__/SettingsPage.test.tsx --runInBand`

Expected: FAIL，因为 `SettingsE2ESyncLab` 还不存在，设置页也没有接入这个测试区域。

- [ ] **Step 7: Implement the minimal settings E2E sync lab UI**

新建 `app/src/components/settings-page/SettingsE2ESyncLab.tsx`，只做按钮区渲染：

```tsx
export function SettingsE2ESyncLab(props: {
  onInjectSuspectRepairable: () => void | Promise<void>;
  onInjectRepairPending: () => void | Promise<void>;
  onClearFixtures: () => void | Promise<void>;
  onShowRepairPrompt: () => void;
}) {
  return (
    <SettingsSection title="E2E Sync Lab">
      <View testID="e2e-sync-lab-root">
        <SettingButton testID="e2e-sync-fixture-suspect" ... />
        <SettingButton testID="e2e-sync-fixture-repair-pending" ... />
        <SettingButton testID="e2e-sync-fixture-clear" ... />
        <SettingButton testID="e2e-sync-show-repair-prompt" ... />
      </View>
    </SettingsSection>
  );
}
```

在 `app/src/components/settings-page/SettingsPageContent.tsx` 增加：

```tsx
showE2ESyncLab?: boolean;
onInjectSuspectRepairable?: () => void | Promise<void>;
onInjectRepairPending?: () => void | Promise<void>;
onClearSyncFixtures?: () => void | Promise<void>;
onShowSyncRepairPrompt?: () => void;
```

并在 JSX 底部按 `showE2ESyncLab` 条件渲染 `SettingsE2ESyncLab`。

在 `app/src/components/SettingsPage.tsx` 里用：

```ts
const showE2ESyncLab = process.env.EXPO_PUBLIC_E2E_SYNC_LAB === '1';
const e2eSyncLab = createE2ESyncLabService();
```

把 4 个 handler 传入 `SettingsPageContent`。

- [ ] **Step 8: Re-run the settings test to verify it passes**

Run: `cd app && pnpm test -- --runTestsByPath src/components/__tests__/SettingsPage.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add app/src/services/e2eSyncLabService.ts app/src/services/__tests__/e2eSyncLabService.test.ts app/src/components/settings-page/SettingsE2ESyncLab.tsx app/src/components/settings-page/SettingsPageContent.tsx app/src/components/SettingsPage.tsx app/src/components/__tests__/SettingsPage.test.tsx
git commit -m "test(ui): add e2e sync lab fixtures for android maestro"
```

### Task 3: Extend Maestro Workspace And Common Cloud Sync Flows

**Files:**
- Modify: `app/.maestro/README.md`
- Create: `app/.maestro/env/android-dev.yaml`
- Create: `app/.maestro/common/launch-app.yaml`
- Create: `app/.maestro/common/open-sync-status.yaml`
- Create: `app/.maestro/common/open-e2e-sync-lab.yaml`
- Create: `app/.maestro/common/clear-e2e-sync-fixture.yaml`
- Verify: `app/.maestro/common/launch-app.yaml`
- Verify: `app/.maestro/common/open-sync-status.yaml`
- Verify: `app/.maestro/common/open-e2e-sync-lab.yaml`
- Verify: `app/.maestro/common/clear-e2e-sync-fixture.yaml`

- [ ] **Step 1: Update README with cloud sync prerequisites and commands**

在 `app/.maestro/README.md` 补充：

- Android app 包名：`com.memorycapsule.app`
- 运行前提：模拟器已启动，执行 `cd app && pnpm run android`
- 环境变量：`EXPO_PUBLIC_E2E_SYNC_LAB=1`
- 真实后端 happy path 所需测试账号、测试数据
- 单条执行命令
- 目录批量执行命令
- 哪些 flow 会注入本地状态，以及如何清理

- [ ] **Step 2: Create the environment stub file**

在 `app/.maestro/env/android-dev.yaml` 写入示例环境变量：

```yaml
appId: com.memorycapsule.app
env:
  E2E_ACCOUNT_EMAIL: test@example.com
  E2E_ACCOUNT_PASSWORD: changeme
```

只提供样例键，不把真实账号写进仓库。

- [ ] **Step 3: Create the launch and navigation common flows**

在 `app/.maestro/common/launch-app.yaml`：

```yaml
appId: com.memorycapsule.app
---
- launchApp:
    clearState: false
- assertVisible:
    id: home-screen-root
```

在 `app/.maestro/common/open-sync-status.yaml`：

```yaml
appId: com.memorycapsule.app
---
- runFlow: ../common/open-settings.yaml
- tapOn:
    id: settings-show-sync-status
- assertVisible:
    id: error-feedback-card
```

在 `app/.maestro/common/open-e2e-sync-lab.yaml`：

```yaml
appId: com.memorycapsule.app
---
- runFlow: ../common/open-settings.yaml
- scrollUntilVisible:
    element:
      id: e2e-sync-lab-root
    direction: DOWN
- assertVisible:
    id: e2e-sync-lab-root
```

在 `app/.maestro/common/clear-e2e-sync-fixture.yaml`：

```yaml
appId: com.memorycapsule.app
---
- runFlow: ../common/open-e2e-sync-lab.yaml
- tapOn:
    id: e2e-sync-fixture-clear
- assertVisible:
    id: e2e-sync-lab-root
```

- [ ] **Step 4: Validate the common flow syntax**

Run: 用 Maestro 语法校验工具分别检查 4 个 YAML 文件

Expected: 全部通过语法校验

- [ ] **Step 5: Commit**

```bash
git add app/.maestro/README.md app/.maestro/env/android-dev.yaml app/.maestro/common/launch-app.yaml app/.maestro/common/open-sync-status.yaml app/.maestro/common/open-e2e-sync-lab.yaml app/.maestro/common/clear-e2e-sync-fixture.yaml
git commit -m "test(ui): extend maestro workspace for cloud sync flows"
```

### Task 4: Add The Five Android Maestro Cloud Sync Flows

**Files:**
- Create: `app/.maestro/flows/cloud-sync/happy-path-restore.yaml`
- Create: `app/.maestro/flows/cloud-sync/status-from-settings.yaml`
- Create: `app/.maestro/flows/cloud-sync/suspect-media.yaml`
- Create: `app/.maestro/flows/cloud-sync/repair-confirm.yaml`
- Create: `app/.maestro/flows/cloud-sync/repair-later.yaml`
- Reference: `app/.maestro/common/launch-app.yaml`
- Reference: `app/.maestro/common/open-settings.yaml`
- Reference: `app/.maestro/common/open-sync-status.yaml`
- Reference: `app/.maestro/common/open-e2e-sync-lab.yaml`
- Reference: `app/.maestro/common/clear-e2e-sync-fixture.yaml`

- [ ] **Step 1: Write the happy-path restore flow**

在 `app/.maestro/flows/cloud-sync/happy-path-restore.yaml` 中实现：

```yaml
appId: com.memorycapsule.app
---
- runFlow: ../../common/launch-app.yaml
- runFlow: ../../common/open-settings.yaml
- assertVisible:
    id: settings-page-root
- tapOn:
    id: settings-show-sync-status
- assertVisible:
    id: error-feedback-card
- assertVisible: "媒体同步状态"
- assertVisible: "本地数据"
- assertVisible: "云端数据"
```

如果当前真实后端路径里需要先启用云端模式，再在 flow 中补最小点击路径，但不要在第一版里混入账号输入逻辑。

- [ ] **Step 2: Write the status-from-settings flow**

在 `app/.maestro/flows/cloud-sync/status-from-settings.yaml` 中实现：

```yaml
appId: com.memorycapsule.app
---
- runFlow: ../../common/launch-app.yaml
- runFlow: ../../common/open-sync-status.yaml
- assertVisible: "待同步条数"
- assertVisible: "待上传媒体"
- assertVisible: "最近媒体错误"
```

- [ ] **Step 3: Write the suspect-media flow**

在 `app/.maestro/flows/cloud-sync/suspect-media.yaml` 中实现：

```yaml
appId: com.memorycapsule.app
---
- runFlow: ../../common/launch-app.yaml
- runFlow: ../../common/open-e2e-sync-lab.yaml
- tapOn:
    id: e2e-sync-fixture-suspect
- runFlow: ../../common/open-sync-status.yaml
- assertVisible: "异常媒体数"
- assertVisible: "可修复媒体数"
- assertVisible:
    id: error-feedback-action-repair-media
- runFlow: ../../common/clear-e2e-sync-fixture.yaml
```

- [ ] **Step 4: Write the repair-confirm flow**

在 `app/.maestro/flows/cloud-sync/repair-confirm.yaml` 中实现：

```yaml
appId: com.memorycapsule.app
---
- runFlow: ../../common/launch-app.yaml
- runFlow: ../../common/open-e2e-sync-lab.yaml
- tapOn:
    id: e2e-sync-fixture-suspect
- tapOn:
    id: e2e-sync-show-repair-prompt
- assertVisible: "发现云端媒体异常"
- tapOn: "立即修复"
- assertNotVisible: "发现云端媒体异常"
- runFlow: ../../common/open-sync-status.yaml
- assertVisible: "可修复媒体数"
- runFlow: ../../common/clear-e2e-sync-fixture.yaml
```

第一版断言只要求“修复提示关闭 + 状态页可重新打开 + 计数变化存在”，不要过度依赖具体文案排列。

- [ ] **Step 5: Write the repair-later flow**

在 `app/.maestro/flows/cloud-sync/repair-later.yaml` 中实现：

```yaml
appId: com.memorycapsule.app
---
- runFlow: ../../common/launch-app.yaml
- runFlow: ../../common/open-e2e-sync-lab.yaml
- tapOn:
    id: e2e-sync-fixture-suspect
- tapOn:
    id: e2e-sync-show-repair-prompt
- assertVisible: "发现云端媒体异常"
- tapOn: "稍后处理"
- assertNotVisible: "发现云端媒体异常"
- runFlow: ../../common/open-sync-status.yaml
- tapOn:
    id: error-feedback-action-repair-media
- assertVisible: "发现云端媒体异常"
- runFlow: ../../common/clear-e2e-sync-fixture.yaml
```

- [ ] **Step 6: Validate the five cloud sync flow files**

Run: 用 Maestro 语法校验工具检查 `app/.maestro/flows/cloud-sync/*.yaml`

Expected: 全部通过语法校验

- [ ] **Step 7: Commit**

```bash
git add app/.maestro/flows/cloud-sync/happy-path-restore.yaml app/.maestro/flows/cloud-sync/status-from-settings.yaml app/.maestro/flows/cloud-sync/suspect-media.yaml app/.maestro/flows/cloud-sync/repair-confirm.yaml app/.maestro/flows/cloud-sync/repair-later.yaml
git commit -m "test(ui): add android maestro cloud sync flows"
```

### Task 5: Verify The Android Maestro Flows End-To-End

**Files:**
- Verify: `app/.maestro/common/launch-app.yaml`
- Verify: `app/.maestro/common/open-sync-status.yaml`
- Verify: `app/.maestro/common/open-e2e-sync-lab.yaml`
- Verify: `app/.maestro/common/clear-e2e-sync-fixture.yaml`
- Verify: `app/.maestro/flows/cloud-sync/happy-path-restore.yaml`
- Verify: `app/.maestro/flows/cloud-sync/status-from-settings.yaml`
- Verify: `app/.maestro/flows/cloud-sync/suspect-media.yaml`
- Verify: `app/.maestro/flows/cloud-sync/repair-confirm.yaml`
- Verify: `app/.maestro/flows/cloud-sync/repair-later.yaml`
- Test: `app/src/components/__tests__/ErrorFeedbackModal.test.tsx`
- Test: `app/src/components/__tests__/SettingsPage.test.tsx`
- Test: `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts`
- Test: `app/src/services/__tests__/showPhotoRepairPrompt.test.ts`
- Test: `app/src/services/__tests__/photoRepairService.test.ts`
- Test: `app/src/services/__tests__/e2eSyncLabService.test.ts`

- [ ] **Step 1: Verify Android device and app availability**

Run:

- 用 Maestro 设备列表工具确认有 Android 模拟器
- 如未启动，则启动 Android 模拟器
- 确认 `com.memorycapsule.app` 已安装

Expected: Android 模拟器在线，app 可启动。

- [ ] **Step 2: Run the focused Jest regression suite**

Run:

```bash
cd app && pnpm test --runInBand --runTestsByPath src/components/__tests__/ErrorFeedbackModal.test.tsx src/components/__tests__/SettingsPage.test.tsx src/services/__tests__/showCloudSyncStatusAlert.test.ts src/services/__tests__/showPhotoRepairPrompt.test.ts src/services/__tests__/photoRepairService.test.ts src/services/__tests__/e2eSyncLabService.test.ts
```

Expected: PASS

- [ ] **Step 3: Run the common Maestro flows individually**

Run:

- `maestro test app/.maestro/common/launch-app.yaml`
- `maestro test app/.maestro/common/open-sync-status.yaml`
- `maestro test app/.maestro/common/open-e2e-sync-lab.yaml`

Expected: 公共步骤都能在 Android 模拟器上稳定完成。

- [ ] **Step 4: Run the five cloud sync flows individually**

按这个顺序跑并修正时序：

1. `status-from-settings.yaml`
2. `suspect-media.yaml`
3. `repair-later.yaml`
4. `repair-confirm.yaml`
5. `happy-path-restore.yaml`

如果失败：

- 优先调整 `id`
- 其次在切页点补 `extendedWaitUntil`
- 最后再考虑补少量测试锚点
- 不引入固定长 `wait`

- [ ] **Step 5: Run the cloud sync flow directory in batch**

Run:

```bash
maestro test app/.maestro/flows/cloud-sync
```

Expected: 目录级批量执行通过。

- [ ] **Step 6: Re-run one cold-start pass**

操作：

- 重启 Android 模拟器或终止 app 后重新启动
- 再跑一次 `status-from-settings.yaml` 和 `suspect-media.yaml`

Expected: 冷启动后仍通过，说明 flow 没有偷偷依赖前序状态。

- [ ] **Step 7: Commit**

```bash
git add app/.maestro/README.md app/.maestro/env/android-dev.yaml app/.maestro/common/launch-app.yaml app/.maestro/common/open-sync-status.yaml app/.maestro/common/open-e2e-sync-lab.yaml app/.maestro/common/clear-e2e-sync-fixture.yaml app/.maestro/flows/cloud-sync/happy-path-restore.yaml app/.maestro/flows/cloud-sync/status-from-settings.yaml app/.maestro/flows/cloud-sync/suspect-media.yaml app/.maestro/flows/cloud-sync/repair-confirm.yaml app/.maestro/flows/cloud-sync/repair-later.yaml
git commit -m "test(ui): verify android maestro cloud sync flows"
```
