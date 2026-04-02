# Login And Account Auth Test Granularity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `LoginPage`、设置页账户区和 1 条 Android 账户入口 smoke 补齐细粒度自动化测试，锁定登录校验、账户分支、云端 gating 和退出登录联动。

**Architecture:** 这批实现继续以 `Jest + React Native Testing Library` 为主，把登录页内部行为和设置页账户区联动拆成两个清晰的测试面。设置页层只验证“账户入口、认证状态分支、登录成功回调语义、退出登录确认和云端 gating”，登录页内部表单校验和 loading 语义留在 `LoginPage.test.tsx`；`Maestro` 只新增一条轻量 smoke，验证设置页进入登录页并返回的真实导航。

**Tech Stack:** React Native, Jest, React Native Testing Library, Maestro YAML, Android emulator

---

## Scope Note

本 plan 只覆盖以下范围：

- `LoginPage` 的细粒度页面/控制器测试
- 设置页账户区的未登录 / 已登录、登录入口、云端 gating、退出登录确认测试
- 1 条 Android `Maestro` 账户入口 smoke

以下内容不在本 plan 中实现：

- 真实账号登录 E2E
- `authStore` 底层持久化逻辑扩展
- 备份 / 恢复、权限、后端环境等其他设置子域
- 完整云同步回归

## File Structure

- Modify: `app/src/components/__tests__/LoginPage.test.tsx`
  Purpose: 扩展登录页表单校验、成功/失败回流、模式切换和 loading 覆盖。
- Modify: `app/src/components/SettingsPage.tsx`
  Purpose: 把“普通账户入口登录”与“云端 gating 登录”分流到不同的打开意图，供账户专项测试锁定 AC-09 / AC-10。
- Modify: `app/src/components/settings-page/useSettingsPageController.ts`
  Purpose: 为登录弹窗维护最小的 `loginIntent` 状态，并让 `handleLoginSuccess` 只在云端 gating 场景触发 `enableCloudMode`。
- Modify: `app/src/components/__tests__/helpers/renderSettingsPage.tsx`
  Purpose: 为账户区测试提供更可控的 auth / login-dialog mock 面，能驱动最新登录弹窗回调，并在测试间重置状态。
- Create: `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`
  Purpose: 承接设置页账户区专项测试，避免把 `SettingsPage.test.tsx` 继续做大。
- Modify: `app/src/components/__tests__/SettingsPage.test.tsx`
  Purpose: 保留总装配和基础入口 smoke，只补最小的账户入口稳定断言。
- Create: `app/.maestro/flows/smoke/settings-to-login.yaml`
  Purpose: 验证首页进入设置、设置进入登录页、返回设置页的真实导航。
- Modify: `app/.maestro/README.md`
  Purpose: 记录新的 smoke flow 和运行命令。
- Modify: `app/package.json`
  Purpose: 增加本批账户相关测试分组脚本，方便反复回归。

### Task 1: Expand LoginPage Form Coverage

**Files:**
- Modify: `app/src/components/__tests__/LoginPage.test.tsx`
- Test: `app/src/components/__tests__/LoginPage.test.tsx`

- [ ] **Step 1: Write the failing validation and success-flow tests**

在 `app/src/components/__tests__/LoginPage.test.tsx` 新增失败用例：

```tsx
it('alerts when email or password is missing and does not call login', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  const screen = render(<LoginPage visible onClose={jest.fn()} onSuccess={jest.fn()} />);

  fireEvent.press(screen.getByText('登录'));

  expect(alertSpy).toHaveBeenCalledWith('提示', '请填写邮箱和密码');
  expect(mockLogin).not.toHaveBeenCalled();
});

it('calls onSuccess and clears inputs after a successful login', async () => {
  mockLogin.mockResolvedValueOnce(undefined);
  const onSuccess = jest.fn();
  const screen = render(<LoginPage visible onClose={jest.fn()} onSuccess={onSuccess} />);

  fireEvent.changeText(screen.getByPlaceholderText('邮箱'), ' user@test.com ');
  fireEvent.changeText(screen.getByPlaceholderText('密码'), 'Password1');
  fireEvent.press(screen.getByText('登录'));

  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  expect(screen.getByPlaceholderText('邮箱')).toHaveProp('value', '');
});
```

再补注册态密码不一致、注册成功、注册失败、切换模式清空确认密码和 loading 态禁用的失败用例。

- [ ] **Step 2: Run the targeted suite to verify it fails**

Run: `cd app && pnpm test -- --runTestsByPath src/components/__tests__/LoginPage.test.tsx --runInBand`

Expected: FAIL，因为当前测试文件还没有这些场景，且至少一部分断言会暴露成功回流和 loading 态的覆盖缺口。

- [ ] **Step 3: Implement the minimal test-only changes**

只修改测试文件，按现有 `LoginPage` / `useLoginPageController` 真实语义补齐：

```tsx
it('shows register-specific feedback when register fails', async () => {
  mockRegister.mockRejectedValueOnce(new Error('409'));
  ...
  expect(showErrorFeedback).toHaveBeenCalledWith(
    expect.objectContaining({ title: '注册失败', dedupeKey: 'auth-register-failed' })
  );
});
```

对 loading 态，使用一个 pending promise：

```tsx
let resolveLogin: () => void;
mockLogin.mockImplementationOnce(
  () => new Promise<void>((resolve) => { resolveLogin = resolve; })
);
```

然后断言按钮显示 `ActivityIndicator` 或提交文本消失，并且重复点击不再触发第二次提交。

- [ ] **Step 4: Re-run the LoginPage suite to verify it passes**

Run: `cd app && pnpm test -- --runTestsByPath src/components/__tests__/LoginPage.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/components/__tests__/LoginPage.test.tsx
git commit -m "test(auth): expand login page coverage"
```

### Task 2: Add Settings Account Auth Intent, Harness And Suites

**Files:**
- Modify: `app/src/components/SettingsPage.tsx`
- Modify: `app/src/components/settings-page/useSettingsPageController.ts`
- Modify: `app/src/components/__tests__/helpers/renderSettingsPage.tsx`
- Create: `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`
- Modify: `app/src/components/__tests__/SettingsPage.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`
- Test: `app/src/components/__tests__/SettingsPage.test.tsx`

- [ ] **Step 1: Write the failing account-auth tests**

新建 `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`，先写失败用例：

```tsx
it('shows only the login entry when unauthenticated', async () => {
  const { screen } = renderSettingsPage({ authenticated: false });

  await waitFor(() => expect(screen.getByText('登录 / 注册')).toBeTruthy());
  expect(screen.queryByText('退出登录')).toBeNull();
  expect(screen.queryByTestId('settings-show-sync-status')).toBeNull();
});

it('opens the login dialog instead of enabling cloud mode when unauthenticated users toggle cloud mode on', async () => {
  const { screen } = renderSettingsPage({ authenticated: false, cloudMode: false });

  fireEvent(screen.getByTestId('settings-switch-cloud-mode'), 'valueChange', true);

  expect(await screen.findByTestId('settings-login-dialog')).toBeTruthy();
});
```

再补：

- 已登录显示邮箱 / 同步状态 / 退出登录
- 退出登录取消不调用 `logout`
- 离线模式下确认退出只调用 `logout`
- 云端模式下确认退出先 `setCloudMode(false)`、`loadEntries()`，再 `logout`
- `cloudMode='switching'` 时开关禁用
- 普通“登录 / 注册”入口成功后只关闭弹窗
- 云端 gating 拉起的登录成功后关闭弹窗并调用 `enableCloudMode`

同时在 `SettingsPage.test.tsx` 保留总装配 smoke，并加一条最小账户入口稳定断言。

- [ ] **Step 2: Run the targeted settings suites to verify they fail**

Run: `cd app && pnpm test -- --runTestsByPath src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/settings-page/settings-page.account-auth.test.tsx --runInBand`

Expected: FAIL，因为当前 `handleLoginSuccess` 会无条件 `enableCloudMode()`，还不满足普通入口成功只关闭弹窗的语义；同时测试 helper 也还没有稳定暴露登录弹窗 props 供测试驱动。

- [ ] **Step 3: Implement the minimal source-aware login flow**

在 `app/src/components/settings-page/useSettingsPageController.ts` 中增加最小状态：

```tsx
const [loginIntent, setLoginIntent] = useState<'account' | 'cloud-gating' | null>(null);

const openLogin = useCallback((intent: 'account' | 'cloud-gating' = 'account') => {
  setLoginIntent(intent);
  setShowLogin(true);
}, []);
```

并把登录成功语义改成：

```tsx
const handleLoginSuccess = useCallback(async () => {
  const intent = loginIntent;
  setShowLogin(false);
  setLoginIntent(null);
  if (intent === 'cloud-gating') {
    await enableCloudMode();
  }
}, [enableCloudMode, loginIntent]);
```

同时在 `closeLogin()` 中清空 `loginIntent`，并在 `app/src/components/SettingsPage.tsx` 接线：

- `useSettingsPageCloudMode({ onRequireLogin: () => openLogin('cloud-gating') })`
- `SettingsPageContent` 保持现有 props，不新增 `onRequireLogin`，只把 `onShowLogin={() => openLogin('account')}` 传给账户入口

这样 Task 2 的专项测试才能真实区分 AC-09 与 AC-10。

- [ ] **Step 4: Extend renderSettingsPage helper minimally**

在 `app/src/components/__tests__/helpers/renderSettingsPage.tsx` 中：

1. 把 `LoginPage` mock 从纯文本节点改成“可见时渲染 testID + 暴露最新 props”：

```tsx
type MockLoginPageProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

let latestLoginPageProps: MockLoginPageProps | null = null;

jest.mock('../../LoginPage', () => ({
  LoginPage: (props: MockLoginPageProps) => {
    latestLoginPageProps = props;
    ...
  },
}));
```

2. 导出 helper：

```tsx
export function triggerLatestLoginSuccess() {
  return latestLoginPageProps?.onSuccess?.();
}
```

3. 在 `resetRenderSettingsPageMocks()` 里把 `latestLoginPageProps = null`，避免测试间串数据。
4. 保持现有 tag-management/login dialog 的可见性 mock，不去真实渲染 `LoginPage` 表单。

- [ ] **Step 5: Implement the account-auth tests and verify them**

在 `settings-page.account-auth.test.tsx` 中用 `Alert.alert.mock.calls` 取确认按钮：

```tsx
function pressLatestAlertButton(text: string) {
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] ?? [];
  buttons.find((button: { text?: string }) => button.text === text)?.onPress?.();
}
```

对云端模式下退出登录顺序，显式验证：

```tsx
expect(mocks.settings.setCloudMode).toHaveBeenNthCalledWith(1, false);
const setCloudModeOrder = (mocks.settings.setCloudMode as jest.Mock).mock.invocationCallOrder[0];
const loadEntriesOrder = mocks.entries.loadEntries.mock.invocationCallOrder[0];
const logoutOrder = mocks.auth.logout.mock.invocationCallOrder[0];

expect(setCloudModeOrder).toBeLessThan(loadEntriesOrder);
expect(loadEntriesOrder).toBeLessThan(logoutOrder);
```

对普通入口成功和 gating 成功，分别通过：

- 先点“登录 / 注册”后调用 `triggerLatestLoginSuccess()`
- 先切换云端模式为开，再调用 `triggerLatestLoginSuccess()`

然后断言两种路径语义不同：

- 普通入口成功后登录弹窗关闭，但 `enableCloudMode` 路径不被触发
- gating 成功后登录弹窗关闭，并进入 `setCloudMode('switching')` / `enableCloudMode` 链路

同时在 `SettingsPage.test.tsx` 只保留一条最小账户入口稳定断言，避免和专项文件重复覆盖。

- [ ] **Step 6: Re-run the settings suites to verify they pass**

Run: `cd app && pnpm test -- --runTestsByPath src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/settings-page/settings-page.account-auth.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/src/components/SettingsPage.tsx app/src/components/settings-page/useSettingsPageController.ts app/src/components/__tests__/helpers/renderSettingsPage.tsx app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx app/src/components/__tests__/SettingsPage.test.tsx
git commit -m "test(auth): cover settings account auth states"
```

### Task 3: Add Android Settings-To-Login Smoke And Auth Test Script

**Files:**
- Create: `app/.maestro/flows/smoke/settings-to-login.yaml`
- Modify: `app/.maestro/README.md`
- Modify: `app/package.json`
- Test: `app/.maestro/flows/smoke/settings-to-login.yaml`

- [ ] **Step 1: Write the failing Maestro smoke flow and auth script**

新建 `app/.maestro/flows/smoke/settings-to-login.yaml`：

```yaml
appId: com.memorycapsule.app
---
- runFlow: ../../common/open-settings.yaml
- tapOn:
    text: 登录 / 注册
- assertVisible:
    id: login-page-root
- tapOn:
    id: detail-page-back-button
- assertVisible:
    id: settings-page-root
```

在 `app/package.json` 先加分组脚本：

```json
"test:frontend:auth": "jest --runInBand --runTestsByPath src/components/__tests__/LoginPage.test.tsx src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/settings-page/settings-page.account-auth.test.tsx"
```

- [ ] **Step 2: Run the grouped auth Jest script and Maestro flow to surface failures**

Run: `cd app && pnpm run test:frontend:auth`
Expected: PASS 或暴露脚本路径错误；如果脚本命令本身失败，先修正脚本。

Run: `cd app && maestro test .maestro/flows/smoke/settings-to-login.yaml`
Expected: 初次可能 FAIL，常见原因是设置页落点不稳定或登录入口需要滚动到可见。

- [ ] **Step 3: Implement the minimal Maestro stabilization and docs update**

如果登录入口在当前设备上可能离屏，按已有 `settings-to-tag-management.yaml` 的模式最小补：

```yaml
- scrollUntilVisible:
    element:
      text: 登录 / 注册
    direction: UP
    timeout: 10000
```

在 `app/.maestro/README.md` 增加：

- 新 smoke flow `settings-to-login.yaml`
- 单条执行命令
- 当前覆盖说明增加“设置页进入登录页并返回”

- [ ] **Step 4: Re-run the auth script and Maestro smoke to verify they pass**

Run: `cd app && pnpm run test:frontend:auth`
Expected: PASS

Run: `cd app && maestro test .maestro/flows/smoke/settings-to-login.yaml`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/.maestro/flows/smoke/settings-to-login.yaml app/.maestro/README.md app/package.json
git commit -m "test(auth): add settings login smoke flow"
```

### Task 4: Run Final Verification For The Whole Auth Batch

**Files:**
- Verify: `app/src/components/__tests__/LoginPage.test.tsx`
- Verify: `app/src/components/__tests__/SettingsPage.test.tsx`
- Verify: `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`
- Verify: `app/.maestro/flows/smoke/settings-to-login.yaml`

- [ ] **Step 1: Run the grouped auth Jest suite fresh**

Run: `cd app && pnpm run test:frontend:auth`

Expected: PASS

- [ ] **Step 2: Run the fresh Android settings-to-login smoke**

Run: `cd app && maestro test .maestro/flows/smoke/settings-to-login.yaml`

Expected: PASS

- [ ] **Step 3: Inspect git status before handoff**

Run: `git status --short`

Expected: 只剩本批计划内修改；如果有额外脏文件，先确认是否来自同一批工作。

- [ ] **Step 4: Handoff**

记录最终验证结果，并在执行阶段结束时引用：

- `pnpm run test:frontend:auth`
- `maestro test .maestro/flows/smoke/settings-to-login.yaml`

作为完成依据。
