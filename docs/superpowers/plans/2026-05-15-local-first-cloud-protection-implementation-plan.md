# Local-First Cloud Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 DayCapsule 从“已登录即账号同步”的粗糙表达，收口成“一个本地优先 App + 可显式开启的云保护层”。

**Architecture:** 延续现有本地优先与账号作用域结构，不重写同步协议，也不引入第二产品形态。实现上只做最小闭环：补一层“云保护是否已开启”的前端状态与文案，复用现有设置页、确认弹窗和同步概览入口，把 `auth`、`sync`、`settings` 的边界对齐到新 spec。

**Tech Stack:** Expo / React Native、TypeScript、Zustand、Jest、React Testing Library

---

## File Structure

### Existing files to modify

- `app/src/store/syncStore.ts`
  - 扩展同步 store，加入“云保护是否已启用”的持久化状态，作为前端产品语义来源。
- `app/src/components/SettingsPage.tsx`
  - 在登录成功后决定是否弹出“开启云同步”确认流；把新状态传给设置页内容。
- `app/src/components/settings-page/SettingsPageContent.tsx`
  - 调整 props，把“已登录”和“已开启云保护”拆开传递。
- `app/src/components/settings-page/SettingsProfileCard.tsx`
  - 收口顶部卡片文案，避免把已登录直接表达成“账号同步（本地优先）”。
- `app/src/components/settings-page/SettingsAccountSyncSection.tsx`
  - 把“账户与同步”改成“云同步与备份 + 账号”语义，补“已登录未开启保护”分支。
- `app/src/components/__tests__/helpers/renderSettingsPage.tsx`
  - 扩展测试 helper，让测试能独立控制“已登录”和“云保护是否已开启”。
- `app/src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx`
  - 重写为新的产品文案与状态断言，不再围绕历史 cloud-mode 心智。
- `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`
  - 收口登录入口、退出入口与登录成功后行为。
- `app/src/components/__tests__/settings-page/settings-page.sync-status.test.tsx`
  - 校验同步状态入口只在“已开启云保护”时展示。
- `app/src/components/__tests__/settings-page/settings-page.account-sync-section.test.tsx`
  - 直接覆盖设置页账户/同步区块的三态渲染。

### New files to create

- `app/src/services/cloudProtectionPromptService.ts`
  - 封装“登录成功后是否开启云同步”的确认弹窗逻辑，避免把文案与按钮行为散落在页面组件里。
- `app/src/services/__tests__/cloudProtectionPromptService.test.ts`
  - 锁定确认弹窗文案、按钮和启用逻辑。

## Task 1: 给同步 store 增加“云保护已启用”状态

**Files:**
- Modify: `app/src/store/syncStore.ts`
- Test: `app/src/store/__tests__/syncStore.test.ts`

- [ ] **Step 1: 写失败测试，证明 syncStore 还没有独立的云保护状态**

```ts
it('defaults cloud protection to disabled and persists enable/disable changes', async () => {
  const store = useSyncStore.getState();

  await store.load();
  expect(useSyncStore.getState().isCloudProtectionEnabled).toBe(false);

  await store.setCloudProtectionEnabled(true);
  expect(useSyncStore.getState().isCloudProtectionEnabled).toBe(true);

  await store.setCloudProtectionEnabled(false);
  expect(useSyncStore.getState().isCloudProtectionEnabled).toBe(false);
});
```

- [ ] **Step 2: 运行单测确认失败**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
rtk pnpm test --runInBand --runTestsByPath src/store/__tests__/syncStore.test.ts
```

Expected: FAIL，报 `isCloudProtectionEnabled` 或 `setCloudProtectionEnabled` 不存在。

- [ ] **Step 3: 在 syncStore 中加入最小实现**

```ts
export const SYNC_STORAGE_KEYS = {
  cursor: 'cloudSync:cursor',
  lastSyncAt: 'cloudSync:lastSyncAt',
  lastSyncError: 'cloudSync:lastSyncError',
  initialSyncState: 'cloudSync:initialSyncState',
  lastMediaValidationSummary: 'cloudSync:lastMediaValidationSummary',
  cloudProtectionEnabled: 'cloudSync:cloudProtectionEnabled',
} as const;

interface SyncStoreState {
  // ...
  isCloudProtectionEnabled: boolean;
  setCloudProtectionEnabled: (enabled: boolean) => Promise<void>;
}

const DEFAULT_SYNC_STATE = {
  // ...
  isCloudProtectionEnabled: false,
};

const parseBoolean = (raw: string | null): boolean => raw === 'true';

setCloudProtectionEnabled: async (enabled) => {
  await Storage.setString(
    await getScopedSyncKey(SYNC_STORAGE_KEYS.cloudProtectionEnabled),
    enabled ? 'true' : 'false'
  );
  set({ isCloudProtectionEnabled: enabled });
},
```

- [ ] **Step 4: 在 `load()` 和 `reset()` 路径中接入新字段**

```ts
const {
  cursorKey,
  lastSyncAtKey,
  lastSyncErrorKey,
  initialSyncStateKey,
  lastMediaValidationSummaryKey,
  cloudProtectionEnabledKey,
} = await getScopedSyncKeys();

const [
  cursorRaw,
  lastSyncAtRaw,
  lastSyncError,
  initialSyncStateRaw,
  mediaValidationRaw,
  cloudProtectionEnabledRaw,
] = await Promise.all([
  Storage.getString(cursorKey),
  Storage.getString(lastSyncAtKey),
  Storage.getString(lastSyncErrorKey),
  Storage.getString(initialSyncStateKey),
  Storage.getString(lastMediaValidationSummaryKey),
  Storage.getString(cloudProtectionEnabledKey),
]);

set({
  // ...
  isCloudProtectionEnabled: parseBoolean(cloudProtectionEnabledRaw),
});
```

- [ ] **Step 5: 运行单测确认通过**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
rtk pnpm test --runInBand --runTestsByPath src/store/__tests__/syncStore.test.ts
```

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule
rtk git add app/src/store/syncStore.ts app/src/store/__tests__/syncStore.test.ts
rtk git commit -m "Separate cloud protection state from auth state" \
  -m "Constraint: Must preserve existing local-first sync semantics while adding a product-level protection state" \
  -m "Confidence: medium" \
  -m "Scope-risk: narrow" \
  -m "Tested: syncStore unit test for cloud protection persistence"
```

## Task 2: 封装登录成功后的“开启云同步”确认流

**Files:**
- Create: `app/src/services/cloudProtectionPromptService.ts`
- Test: `app/src/services/__tests__/cloudProtectionPromptService.test.ts`

- [ ] **Step 1: 写失败测试，锁定提示文案和按钮行为**

```ts
it('shows a local-first protection prompt after login', async () => {
  const setCloudProtectionEnabled = jest.fn(async () => undefined);

  const shown = promptEnableCloudProtection({
    onEnable: setCloudProtectionEnabled,
    onSkip: jest.fn(),
  });

  expect(shown).toBe(true);
  expect(mockShowConfirmDialog).toHaveBeenCalledWith(
    expect.objectContaining({
      title: '开启云同步与备份',
      message: expect.stringContaining('当前数据仍以本机为主'),
      actions: expect.arrayContaining([
        expect.objectContaining({ label: '开启云同步', role: 'primary' }),
        expect.objectContaining({ label: '暂不启用', role: 'secondary' }),
      ]),
    })
  );
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
rtk pnpm test --runInBand --runTestsByPath src/services/__tests__/cloudProtectionPromptService.test.ts
```

Expected: FAIL，模块不存在。

- [ ] **Step 3: 写最小服务实现**

```ts
import { showConfirmDialog } from '@/src/services/showConfirmDialog';

interface PromptEnableCloudProtectionOptions {
  onEnable: () => void | Promise<void>;
  onSkip?: () => void | Promise<void>;
}

export function promptEnableCloudProtection({
  onEnable,
  onSkip,
}: PromptEnableCloudProtectionOptions): boolean {
  return showConfirmDialog({
    title: '开启云同步与备份',
    message:
      '当前数据仍以本机为主。开启后，会将当前本地内容备份到云端，并用于恢复和多设备同步。',
    dedupeKey: 'enable-cloud-protection',
    actions: [
      { label: '暂不启用', role: 'secondary', onPress: onSkip },
      { label: '开启云同步', role: 'primary', onPress: onEnable },
    ],
  });
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
rtk pnpm test --runInBand --runTestsByPath src/services/__tests__/cloudProtectionPromptService.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule
rtk git add app/src/services/cloudProtectionPromptService.ts app/src/services/__tests__/cloudProtectionPromptService.test.ts
rtk git commit -m "Add explicit cloud protection enable prompt" \
  -m "Constraint: Login must not imply automatic upload" \
  -m "Rejected: Dedicated onboarding screen | larger diff than needed for first closure" \
  -m "Confidence: high" \
  -m "Scope-risk: narrow" \
  -m "Tested: cloudProtectionPromptService unit test"
```

## Task 3: 在 SettingsPage 接入登录后确认流与新状态传递

**Files:**
- Modify: `app/src/components/SettingsPage.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`

- [ ] **Step 1: 写失败测试，证明登录成功后会出现确认流而不是直接进入同步文案**

```ts
it('shows the cloud protection prompt after login success', async () => {
  const { screen } = await renderSettingsPage({ authenticated: false });

  fireEvent.press(screen.getByTestId('settings-open-login'));
  await act(async () => {
    await triggerLatestLoginSuccess();
  });

  expect(mockShowConfirmDialog).toHaveBeenCalledWith(
    expect.objectContaining({ title: '开启云同步与备份' })
  );
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
rtk pnpm test --runInBand --runTestsByPath src/components/__tests__/settings-page/settings-page.account-auth.test.tsx
```

Expected: FAIL，确认弹窗未被触发。

- [ ] **Step 3: 在 SettingsPage 中引入新状态和提示服务**

```ts
const {
  isCloudProtectionEnabled,
  setCloudProtectionEnabled,
} = useSyncStore((state) => ({
  isCloudProtectionEnabled: state.isCloudProtectionEnabled,
  setCloudProtectionEnabled: state.setCloudProtectionEnabled,
}));

const handleLoginSuccess = React.useCallback(async () => {
  closeLogin();
  await refreshAccountSwitcher();

  if (!useSyncStore.getState().isCloudProtectionEnabled) {
    promptEnableCloudProtection({
      onEnable: async () => {
        await useSyncStore.getState().setCloudProtectionEnabled(true);
      },
    });
  }
}, [closeLogin, refreshAccountSwitcher]);
```

- [ ] **Step 4: 把新状态传入 SettingsPageContent**

```ts
<SettingsPageContent
  isAuthenticated={isAuthenticated}
  isCloudProtectionEnabled={isCloudProtectionEnabled}
  // ...
/>
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
rtk pnpm test --runInBand --runTestsByPath src/components/__tests__/settings-page/settings-page.account-auth.test.tsx
```

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule
rtk git add app/src/components/SettingsPage.tsx app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx
rtk git commit -m "Prompt before enabling cloud protection after login" \
  -m "Constraint: Must preserve existing login and account scope flow" \
  -m "Confidence: medium" \
  -m "Scope-risk: narrow" \
  -m "Tested: settings-page.account-auth test"
```

## Task 4: 收口设置页顶部卡片和同步区块文案

**Files:**
- Modify: `app/src/components/settings-page/SettingsProfileCard.tsx`
- Modify: `app/src/components/settings-page/SettingsAccountSyncSection.tsx`
- Modify: `app/src/components/settings-page/SettingsPageContent.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.account-sync-section.test.tsx`

- [ ] **Step 1: 写失败测试，覆盖未登录 / 已登录未开启保护 / 已开启保护三态**

```ts
it('shows local-first copy while signed in but cloud protection is disabled', async () => {
  const { screen } = await renderSettingsPage({
    authenticated: true,
    cloudProtectionEnabled: false,
  });

  expect(screen.getByText('当前数据仍仅保存在本机')).toBeTruthy();
  expect(screen.getByText('开启云同步')).toBeTruthy();
  expect(screen.queryByTestId('settings-show-sync-status')).toBeNull();
});
```

```ts
it('shows sync status only after cloud protection is enabled', () => {
  const screen = render(
    <SettingsAccountSyncSection
      isAuthenticated
      isCloudProtectionEnabled
      isAccountScopeActive
      isTransitioning={false}
      // ...
    />
  );

  expect(screen.getByTestId('settings-show-sync-status')).toBeTruthy();
  expect(screen.getByText('该设备正在同步，云端已保护当前记忆')).toBeTruthy();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
rtk pnpm test --runInBand --runTestsByPath \
  src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx \
  src/components/__tests__/settings-page/settings-page.account-sync-section.test.tsx
```

Expected: FAIL，组件 props 和文案不匹配。

- [ ] **Step 3: 给 SettingsPageContent 和子组件补新 props**

```ts
interface SettingsPageContentProps {
  isAuthenticated: boolean;
  isCloudProtectionEnabled: boolean;
  // ...
}

<SettingsProfileCard
  isAuthenticated={isAuthenticated}
  isCloudProtectionEnabled={isCloudProtectionEnabled}
  // ...
/>

<SettingsAccountSyncSection
  isAuthenticated={isAuthenticated}
  isCloudProtectionEnabled={isCloudProtectionEnabled}
  // ...
/>
```

- [ ] **Step 4: 收口 ProfileCard 文案**

```ts
{!isAuthenticated ? (
  <>
    <Text style={styles.unauthTitle}>未登录</Text>
    <Text style={styles.unauthSubtitle}>当前数据仅保存在本机</Text>
  </>
) : (
  <View style={styles.syncRow}>
    <View style={isCloudProtectionEnabled ? styles.syncDotActive : styles.syncDotIdle} />
    <Text style={styles.syncLabel}>
      {isCloudProtectionEnabled ? '云端已保护当前记忆' : '已登录，当前数据仍以本机为主'}
    </Text>
  </View>
)}
```

- [ ] **Step 5: 收口 AccountSyncSection 三态渲染**

```ts
{!isAuthenticated ? (
  <SettingButton
    icon="person-add"
    title="登录账号"
    subtitle="登录后可开启云备份与多设备同步"
    testID="settings-open-login"
    onPress={onShowLogin}
  />
) : isCloudProtectionEnabled ? (
  <>
    <SettingItem
      icon="cloud-done"
      title="云同步与备份"
      subtitle="该设备正在同步，云端已保护当前记忆"
    />
    <SettingButton
      icon="cloud-done"
      title="同步状态"
      testID="settings-show-sync-status"
      // ...
    />
  </>
) : (
  <>
    <SettingItem
      icon="shield-checkmark"
      title="云同步与备份"
      subtitle="账号已登录，当前数据仍仅保存在本机"
    />
    <SettingButton
      icon="cloud-upload"
      title="开启云同步"
      subtitle="为当前本地记忆建立云备份与恢复能力"
      testID="settings-enable-cloud-protection"
      onPress={onEnableCloudProtection}
    />
  </>
)}
```

- [ ] **Step 6: 运行测试确认通过**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
rtk pnpm test --runInBand --runTestsByPath \
  src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx \
  src/components/__tests__/settings-page/settings-page.account-sync-section.test.tsx
```

Expected: PASS。

- [ ] **Step 7: 提交**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule
rtk git add \
  app/src/components/settings-page/SettingsProfileCard.tsx \
  app/src/components/settings-page/SettingsAccountSyncSection.tsx \
  app/src/components/settings-page/SettingsPageContent.tsx \
  app/src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx \
  app/src/components/__tests__/settings-page/settings-page.account-sync-section.test.tsx
rtk git commit -m "Reframe settings copy around local data and cloud protection" \
  -m "Constraint: Keep one-app local-first positioning in settings UI" \
  -m "Confidence: medium" \
  -m "Scope-risk: narrow" \
  -m "Tested: settings-page copy and account-sync-section tests"
```

## Task 5: 把“同步状态”入口收紧到已开启保护时才出现

**Files:**
- Modify: `app/src/components/settings-page/SettingsAccountSyncSection.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.sync-status.test.tsx`

- [ ] **Step 1: 写失败测试，锁定“仅登录不显示同步状态”**

```ts
it('does not render sync status when authenticated but cloud protection is disabled', async () => {
  const { screen } = await renderSettingsPage({
    authenticated: true,
    cloudProtectionEnabled: false,
  });

  expect(screen.queryByTestId('settings-show-sync-status')).toBeNull();
  expect(screen.getByTestId('settings-enable-cloud-protection')).toBeTruthy();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
rtk pnpm test --runInBand --runTestsByPath src/components/__tests__/settings-page/settings-page.sync-status.test.tsx
```

Expected: FAIL，当前已登录即显示同步状态。

- [ ] **Step 3: 在 SettingsAccountSyncSection 中把同步状态入口放到保护已启用分支**

```ts
{isCloudProtectionEnabled ? (
  <SettingButton
    icon="cloud-done"
    title="同步状态"
    subtitle={
      isTransitioning
        ? '账号作用域切换中…'
        : isAccountScopeActive
          ? '查看最近同步时间和待同步条数'
          : '当前设备尚未进入可同步状态'
    }
    testID="settings-show-sync-status"
    onPress={isTransitioning ? () => undefined : onShowSyncStatus}
  />
) : null}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
rtk pnpm test --runInBand --runTestsByPath src/components/__tests__/settings-page/settings-page.sync-status.test.tsx
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule
rtk git add app/src/components/settings-page/SettingsAccountSyncSection.tsx app/src/components/__tests__/settings-page/settings-page.sync-status.test.tsx
rtk git commit -m "Gate sync status behind enabled cloud protection" \
  -m "Constraint: Sync status should represent active protection, not mere authentication" \
  -m "Confidence: high" \
  -m "Scope-risk: narrow" \
  -m "Tested: settings-page.sync-status test"
```

## Task 6: 更新设置页测试 helper 基线并跑回归

**Files:**
- Modify: `app/src/components/__tests__/helpers/renderSettingsPage.tsx`
- Test: `app/src/components/__tests__/helpers/renderSettingsPage.state.test.tsx`
- Test: `app/src/components/__tests__/SettingsPage.test.tsx`

- [ ] **Step 1: 扩展 helper 输入，支持独立控制云保护状态**

```ts
type RenderSettingsPageOptions = {
  authenticated?: boolean;
  cloudProtectionEnabled?: boolean;
  userEmail?: string;
};

await useSyncStore.getState().setCloudProtectionEnabled(
  options.cloudProtectionEnabled ?? false
);
```

- [ ] **Step 2: 写失败测试，证明 helper 已能表达“已登录但未开启保护”**

```ts
it('renders authenticated local-first state when cloud protection is disabled', async () => {
  const { screen } = await renderSettingsPage({
    authenticated: true,
    cloudProtectionEnabled: false,
  });

  expect(screen.getByText('账号已登录，当前数据仍仅保存在本机')).toBeTruthy();
});
```

- [ ] **Step 3: 运行 helper 与页面回归测试**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
rtk pnpm test --runInBand --runTestsByPath \
  src/components/__tests__/helpers/renderSettingsPage.state.test.tsx \
  src/components/__tests__/SettingsPage.test.tsx
```

Expected: 先 FAIL，再在 helper 调整后 PASS。

- [ ] **Step 4: 提交**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule
rtk git add \
  app/src/components/__tests__/helpers/renderSettingsPage.tsx \
  app/src/components/__tests__/helpers/renderSettingsPage.state.test.tsx \
  app/src/components/__tests__/SettingsPage.test.tsx
rtk git commit -m "Update settings test helpers for cloud protection state" \
  -m "Constraint: Tests must model auth state and protection state independently" \
  -m "Confidence: medium" \
  -m "Scope-risk: narrow" \
  -m "Tested: settings helper and page regression tests"
```

## Task 7: 跑聚合验证并更新文档状态

**Files:**
- Modify: `docs/superpowers/specs/2026-05-15-local-first-cloud-protection-positioning-design.md`
- Modify: `docs/superpowers/plans/2026-05-15-local-first-cloud-protection-implementation-plan.md`

- [ ] **Step 1: 运行设置页相关测试集合**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
rtk pnpm run test:frontend:settings
```

Expected: PASS。

- [ ] **Step 2: 跑 lint 和 typecheck**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
rtk pnpm run lint
rtk pnpm run typecheck
```

Expected: PASS。

- [ ] **Step 3: 搜索历史产品术语残留**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
rtk rg -n "登录 / 注册|账号同步（本地优先）|已启用，本地优先写入并在稍后同步|云端模式|联网版|本地版" \
  src/components src/services src/store
```

Expected: 只剩明确允许的历史测试名或注释；生产文案应收敛到新表达。

- [ ] **Step 4: 回写 spec 状态**

```md
## 状态

- 当前状态：已实现
- 用户确认日期：2026-05-15
- 实现完成日期：<实际完成日期>
```

- [ ] **Step 5: 最终提交**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule
rtk git add \
  docs/superpowers/specs/2026-05-15-local-first-cloud-protection-positioning-design.md \
  docs/superpowers/plans/2026-05-15-local-first-cloud-protection-implementation-plan.md
rtk git commit -m "Record implementation completion for cloud protection positioning" \
  -m "Constraint: Final report must include verification evidence and remaining risks" \
  -m "Confidence: medium" \
  -m "Scope-risk: narrow" \
  -m "Tested: settings frontend suite, lint, typecheck"
```

## Self-Review

### Spec coverage

- “一个 App，本地优先，云是保护层”：Task 4 收口设置页文案与展示结构。
- “登录不自动上传，需显式确认”：Task 2 和 Task 3 增加登录后确认流。
- “登录状态和保护状态拆开”：Task 1 与 Task 6 把 `isAuthenticated` 和 `isCloudProtectionEnabled` 分离建模。
- “同步状态只在真正受保护时展示”：Task 5 收口入口 gate。

### Placeholder scan

- 没有使用 `TODO`、`TBD`、`later` 之类占位。
- 每个任务都给了文件、命令和最小代码骨架。

### Type consistency

- 新状态统一命名为 `isCloudProtectionEnabled`。
- 登录后确认服务统一命名为 `promptEnableCloudProtection`。
- 设置页入口按钮统一命名测试 ID 为 `settings-enable-cloud-protection`。
