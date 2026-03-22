# Error Feedback and Visual Language Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 app 建立第一套可复用的视觉语言 token，并落地一套全局品牌化错误弹层，替换第一批关键业务错误场景中的分散 `Alert.alert(...)`。

**Architecture:** 先新增一层轻量视觉语言与错误反馈基础设施：`visualLanguage` token 文件负责沉淀“温润纸感记忆册”配色和圆角层级，`errorFeedbackStore + showErrorFeedback()` 负责全局状态与去重，`FeedbackHost + ErrorFeedbackModal` 挂在根布局统一渲染。页面层只负责在明确的业务失败分支调用预设好的反馈配置，不让 service 直接弹 UI；第一批只迁登录/初始化/云同步/备份/权限引导等高价值错误，不改确认框与 crash 兜底。

**Tech Stack:** React Native, Expo Router, Zustand, React Native Reanimated, Jest, React Native Testing Library, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-23-error-feedback-and-visual-language-design.md`

---

## 变更记录

- 2026-03-23：基于已批准 spec 创建实现计划，范围锁定为“视觉语言 token + 全局错误弹层 + 第一批关键错误迁移”。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 plan review 改为本地结构化 review，并在文档中留痕。
- 2026-03-23：记录当前仓库已知基线问题：`cd app && npm test -- --runInBand --watchAll=false` 目前会在 `src/__tests__/runtime-regressions.test.ts` 因过时断言失败；执行本计划时不要把该失败误判为本需求引入。
- 2026-03-23：已修正 `src/__tests__/runtime-regressions.test.ts` 的过时断言，全量测试恢复通过。

## 执行状态

| Task | 状态 | 说明 |
|------|------|------|
| Task 1 | 已完成 | 已新增视觉 token、错误反馈 store、统一入口与预设文案，目标测试通过 |
| Task 2 | 已完成 | 已新增 `ErrorFeedbackModal`、`FeedbackHost` 并挂到根布局，目标测试通过 |
| Task 3 | 已完成 | 已迁移初始化失败、登录失败与云同步失败场景，目标测试通过 |
| Task 4 | 已完成 | 已迁移设置页与备份页第一批关键错误，确认框与成功提示保持原样 |
| Task 5 | 已完成 | 类型检查、相关测试与全量测试均已通过 |

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `app/src/theme/visualLanguage.ts` | 定义本轮确认的视觉 token：暖米白表面、暖灰文字、陶土错误强调色、`文字/照片/语音` 类型色、圆角和阴影节奏 |
| `app/src/store/errorFeedbackStore.ts` | 管理全局错误反馈当前请求、去重键、显示/关闭逻辑，供非 React 调用方通过 store 触发 |
| `app/src/store/__tests__/errorFeedbackStore.test.ts` | 锁定显示、关闭、重复错误去重和新错误替换行为 |
| `app/src/services/showErrorFeedback.ts` | 暴露统一 `showErrorFeedback()` 入口，供页面层在明确错误分支里触发全局反馈 |
| `app/src/services/errorFeedbackPresets.ts` | 封装第一批场景的文案与动作预设，统一标题、说明、主次按钮与去重 key |
| `app/src/services/__tests__/errorFeedbackPresets.test.ts` | 锁定预设文案、去设置按钮和错误文案降级规则 |
| `app/src/components/ErrorFeedbackModal.tsx` | 渲染品牌化错误弹层 UI，应用视觉 token，支持 2-3 个按钮和轻动效 |
| `app/src/components/FeedbackHost.tsx` | 订阅 `errorFeedbackStore` 并在根布局统一渲染 `ErrorFeedbackModal` |
| `app/src/components/__tests__/ErrorFeedbackModal.test.tsx` | 锁定弹层结构、按钮顺序、关闭行为和关键样式 token 应用 |
| `app/src/components/__tests__/FeedbackHost.test.tsx` | 锁定 store 更新后 host 会显示/隐藏对应弹层 |

### Modified Files

| File | Change |
|------|--------|
| `app/app/_layout.tsx` | 挂载 `FeedbackHost`，并把初始化失败从原生 `Alert` 切到统一错误反馈 |
| `app/app/__tests__/_layout.photo-upload.test.tsx` | 为根布局新增 `FeedbackHost` mock 或断言，锁定初始化失败路径改走统一入口 |
| `app/src/components/LoginPage.tsx` | 登录/注册失败改为调用统一错误反馈，保留输入校验的现有轻提示或后续再议 |
| `app/src/components/__tests__/LoginPage.test.tsx` | 新增登录失败场景测试，断言统一反馈入口被调用 |
| `app/src/services/showCloudSyncStatusAlert.ts` | 仅保留“同步状态”信息弹窗；获取状态失败和手动同步失败改为统一错误反馈 |
| `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts` | 锁定状态成功仍走状态弹窗，失败分支改走统一错误反馈 |
| `app/src/components/SettingsPage.tsx` | 云端切换失败、同步失败、通知权限引导去设置改走统一错误反馈；删除/退出登录等确认框继续保留原生 Alert |
| `app/src/components/__tests__/SettingsPage.test.tsx` | 锁定新的统一反馈调用与“去设置”动作；确认框类测试不改语义 |
| `app/src/components/BackupPage.tsx` | 导出/导入失败改走统一错误反馈，成功提示继续保留现有行为 |
| `app/src/components/__tests__/BackupPage.test.tsx` | 锁定导入/导出失败改走统一入口，保存成功提示仍保留 |
| `docs/superpowers/specs/2026-03-23-error-feedback-and-visual-language-design.md` | 实现完成后更新状态、实现结果和偏差说明 |
| `docs/superpowers/plans/2026-03-23-error-feedback-and-visual-language.md` | 执行过程中勾选步骤、记录验证结果与范围偏差 |

## 执行约束

- 第一批只迁“错误反馈”，不顺手重做整页视觉，不把现有成功提示也统一成新组件。
- 原生确认框继续保留在“删除确认 / 退出登录确认 / 恢复默认设置确认”这类非错误场景中。
- `ErrorBoundary` 继续负责 crash 级别兜底，不纳入本轮自定义错误弹层体系。
- 页面层负责决定何时提示；service 层可以返回错误或被页面包裹，但不能自己 import 弹层组件。
- `showCloudSyncStatusAlert()` 的状态展示仍可使用原生 `Alert`，但其中的失败分支必须切到统一错误反馈。
- 本轮不引入 `react-native-paper`、`react-native-toast-message`、`react-native-flash-message` 之类新 UI 依赖。
- 所有新视觉值优先从 `visualLanguage.ts` 读取，不在新弹层里再写一组散落的 magic color。

## Chunk 1: 视觉 token 与全局错误反馈状态

### Task 1: 建立视觉语言 token、错误反馈 store 和统一入口

**Files:**
- Create: `app/src/theme/visualLanguage.ts`
- Create: `app/src/store/errorFeedbackStore.ts`
- Create: `app/src/store/__tests__/errorFeedbackStore.test.ts`
- Create: `app/src/services/showErrorFeedback.ts`
- Create: `app/src/services/errorFeedbackPresets.ts`
- Create: `app/src/services/__tests__/errorFeedbackPresets.test.ts`

- [x] **Step 1: 先写失败测试，锁定 store 行为和预设文案**

在 `app/src/store/__tests__/errorFeedbackStore.test.ts` 新增至少这些用例：

```ts
it('shows and dismisses a feedback request', () => {
  const store = useErrorFeedbackStore.getState();

  store.show({
    title: '同步失败',
    message: '请检查网络连接后重试。',
    dedupeKey: 'sync-failed',
    actions: [{ label: '重试', role: 'primary' }],
  });

  expect(useErrorFeedbackStore.getState().current?.title).toBe('同步失败');

  store.dismiss();
  expect(useErrorFeedbackStore.getState().current).toBeNull();
});

it('dedupes repeated requests with the same dedupeKey while visible', () => {
  const store = useErrorFeedbackStore.getState();
  store.show({ title: 'A', message: 'A', dedupeKey: 'same', actions: [] });
  store.show({ title: 'B', message: 'B', dedupeKey: 'same', actions: [] });

  expect(useErrorFeedbackStore.getState().current?.title).toBe('A');
});
```

在 `app/src/services/__tests__/errorFeedbackPresets.test.ts` 新增至少这些用例：

```ts
it('builds notification permission feedback with a go-to-settings action', () => {
  const feedback = buildNotificationPermissionFeedback();
  expect(feedback.title).toBe('权限不足');
  expect(feedback.actions.map((action) => action.label)).toContain('去设置');
});

it('falls back to product copy instead of leaking empty raw error text', () => {
  const feedback = buildBackupImportFailedFeedback(new Error(''));
  expect(feedback.message).toBe('无法解析备份文件，请确认格式正确。');
});
```

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath src/store/__tests__/errorFeedbackStore.test.ts src/services/__tests__/errorFeedbackPresets.test.ts
```

Expected: FAIL，原因是 `errorFeedbackStore`、`showErrorFeedback` 和预设文件尚不存在。

- [x] **Step 3: 写最小实现，先把状态和文案基础设施搭起来**

在 `app/src/theme/visualLanguage.ts` 新增最小 token 结构：

```ts
export const visualLanguage = {
  surface: {
    page: '#FAF6EF',
    card: '#FFF9F2',
    modal: '#FFF8F0',
    backdrop: 'rgba(34, 26, 20, 0.42)',
  },
  text: {
    primary: '#3F332A',
    secondary: '#6F6257',
    tertiary: '#9E9084',
  },
  accent: {
    error: '#B96A57',
    errorPressed: '#9E5646',
  },
  entryType: {
    text: '#8F7AC8',
    photo: '#77C9D4',
    voice: '#F0A53A',
  },
  radius: {
    control: 14,
    card: 20,
    modal: 24,
  },
} as const;
```

在 `app/src/store/errorFeedbackStore.ts` 定义统一类型和 store：

```ts
export type ErrorFeedbackAction = {
  label: string;
  role: 'primary' | 'secondary';
  onPress?: () => void | Promise<void>;
};

export type ErrorFeedbackRequest = {
  title: string;
  message: string;
  dedupeKey?: string;
  actions: ErrorFeedbackAction[];
};
```

并提供最小 API：

```ts
show(request)
dismiss()
```

在 `app/src/services/showErrorFeedback.ts` 中暴露：

```ts
export function showErrorFeedback(request: ErrorFeedbackRequest): void {
  useErrorFeedbackStore.getState().show(request);
}
```

在 `app/src/services/errorFeedbackPresets.ts` 中只收第一批明确需要的预设：

- `buildAppInitializationFailedFeedback()`
- `buildLoginFailedFeedback(error)`
- `buildCloudSyncFailedFeedback(error)`
- `buildNotificationPermissionFeedback()`
- `buildBackupExportFailedFeedback()`
- `buildBackupImportFailedFeedback(error)`

- [x] **Step 4: 重新运行测试，确认基础设施通过**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath src/store/__tests__/errorFeedbackStore.test.ts src/services/__tests__/errorFeedbackPresets.test.ts
```

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/src/theme/visualLanguage.ts app/src/store/errorFeedbackStore.ts app/src/store/__tests__/errorFeedbackStore.test.ts app/src/services/showErrorFeedback.ts app/src/services/errorFeedbackPresets.ts app/src/services/__tests__/errorFeedbackPresets.test.ts
git commit -m "feat: add global error feedback foundation"
```

## Chunk 2: 品牌化错误弹层 UI 与根布局宿主

### Task 2: 实现 `ErrorFeedbackModal` 和 `FeedbackHost`，并挂到根布局

**Files:**
- Create: `app/src/components/ErrorFeedbackModal.tsx`
- Create: `app/src/components/FeedbackHost.tsx`
- Create: `app/src/components/__tests__/ErrorFeedbackModal.test.tsx`
- Create: `app/src/components/__tests__/FeedbackHost.test.tsx`
- Modify: `app/app/_layout.tsx`
- Modify: `app/app/__tests__/_layout.photo-upload.test.tsx`

- [x] **Step 1: 先写失败测试，锁定弹层结构、按钮顺序和 host 订阅**

在 `app/src/components/__tests__/ErrorFeedbackModal.test.tsx` 新增：

```tsx
it('renders title, message and actions in the expected order', () => {
  const screen = render(
    <ErrorFeedbackModal
      visible
      request={{
        title: '同步失败',
        message: '请检查网络连接后重试。',
        actions: [
          { label: '稍后', role: 'secondary' },
          { label: '重试', role: 'primary' },
        ],
      }}
      onDismiss={jest.fn()}
    />
  );

  expect(screen.getByText('同步失败')).toBeTruthy();
  expect(screen.getByText('请检查网络连接后重试。')).toBeTruthy();
  expect(screen.getAllByTestId(/error-feedback-action-/).map((node) => node.props.children)).toEqual(['稍后', '重试']);
});

it('calls onDismiss when backdrop is pressed', () => {
  const onDismiss = jest.fn();
  const screen = render(<ErrorFeedbackModal visible request={request} onDismiss={onDismiss} />);
  fireEvent.press(screen.getByTestId('error-feedback-backdrop'));
  expect(onDismiss).toHaveBeenCalled();
});
```

在 `app/src/components/__tests__/FeedbackHost.test.tsx` 新增：

```tsx
it('renders the current feedback request from store state', () => {
  useErrorFeedbackStore.getState().show({
    title: '初始化失败',
    message: '应用启动遇到问题，请重启应用。',
    actions: [{ label: '知道了', role: 'primary' }],
  });

  const screen = render(<FeedbackHost />);
  expect(screen.getByText('初始化失败')).toBeTruthy();
});
```

在 `app/app/__tests__/_layout.photo-upload.test.tsx` 中补一条断言，确认根布局渲染时新宿主已被挂载但不影响原有启动/前后台逻辑。

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/ErrorFeedbackModal.test.tsx src/components/__tests__/FeedbackHost.test.tsx app/__tests__/_layout.photo-upload.test.tsx
```

Expected: FAIL，原因是 modal、host 和根布局接线尚不存在。

- [x] **Step 3: 写最小 UI 实现，并挂到根布局**

在 `app/src/components/ErrorFeedbackModal.tsx` 中：

- 使用 `Modal` + 暖色遮罩
- 应用 `visualLanguage` token
- 提供这些测试标识：
  - `error-feedback-backdrop`
  - `error-feedback-card`
  - `error-feedback-action-0`
  - `error-feedback-action-1`
- 按钮规则保持“左次右主”
- 最多支持 3 个动作，超过 3 个直接在调用层裁剪，不在 UI 层发散设计

在 `app/src/components/FeedbackHost.tsx` 中：

- 从 `useErrorFeedbackStore()` 读取 `current`
- 当 `current === null` 时返回 `null`
- `dismiss()` 后关闭当前弹层
- 按钮点击顺序统一为：
  - 先 `dismiss()`
  - 再执行 action 的 `onPress`

在 `app/app/_layout.tsx` 中：

- 将 `<FeedbackHost />` 挂在应用根布局树里
- 不改现有 `ErrorBoundary` 角色

- [x] **Step 4: 重新运行测试，确认 UI 宿主通过**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/ErrorFeedbackModal.test.tsx src/components/__tests__/FeedbackHost.test.tsx app/__tests__/_layout.photo-upload.test.tsx
```

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/src/components/ErrorFeedbackModal.tsx app/src/components/FeedbackHost.tsx app/src/components/__tests__/ErrorFeedbackModal.test.tsx app/src/components/__tests__/FeedbackHost.test.tsx app/app/_layout.tsx app/app/__tests__/_layout.photo-upload.test.tsx
git commit -m "feat: add branded error feedback modal host"
```

## Chunk 3: 迁移启动、认证和云同步失败场景

### Task 3: 让初始化失败、登录失败和云同步失败走统一错误反馈

**Files:**
- Modify: `app/app/_layout.tsx`
- Modify: `app/app/__tests__/_layout.photo-upload.test.tsx`
- Modify: `app/src/components/LoginPage.tsx`
- Modify: `app/src/components/__tests__/LoginPage.test.tsx`
- Modify: `app/src/services/showCloudSyncStatusAlert.ts`
- Modify: `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts`

- [x] **Step 1: 先写失败测试，锁定第一批错误分支不再直接使用 Alert**

在 `app/src/components/__tests__/LoginPage.test.tsx` 新增：

```tsx
jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

it('shows branded feedback when login fails', async () => {
  mockLogin.mockRejectedValueOnce(new Error('401'));
  const { getByPlaceholderText, getByText } = render(
    <LoginPage visible={true} onClose={jest.fn()} onSuccess={jest.fn()} />
  );

  fireEvent.changeText(getByPlaceholderText('邮箱'), 'test@test.com');
  fireEvent.changeText(getByPlaceholderText('密码'), 'Password1');
  fireEvent.press(getByText('登录'));

  await waitFor(() => {
    expect(showErrorFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ title: '登录失败', dedupeKey: 'auth-login-failed' })
    );
  });
});
```

在 `app/app/__tests__/_layout.photo-upload.test.tsx` 增加一个初始化失败分支测试：

```tsx
it('shows branded feedback when app initialization fails', async () => {
  initDatabase.mockResolvedValueOnce(false);
  render(<RootLayout />);
  await flushPromises();
  expect(showErrorFeedback).toHaveBeenCalledWith(
    expect.objectContaining({ title: '初始化失败' })
  );
});
```

在 `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts` 补充：

```ts
it('uses branded feedback when syncNow fails inside the status alert action', async () => {})
it('uses branded feedback when getStatus fails', async () => {})
```

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/LoginPage.test.tsx app/__tests__/_layout.photo-upload.test.tsx src/services/__tests__/showCloudSyncStatusAlert.test.ts
```

Expected: FAIL，原因是这些分支目前仍然直接走 `Alert.alert(...)`。

- [x] **Step 3: 写最小迁移实现**

在 `app/src/components/LoginPage.tsx` 中：

- 保留“空邮箱/密码”“两次密码不一致”的现有轻提示行为
- 仅把真正的登录/注册 catch 分支迁为：

```ts
showErrorFeedback(buildLoginFailedFeedback(e, isRegister));
```

在 `app/app/_layout.tsx` 中：

- 仅把初始化总 catch 分支迁为统一错误反馈
- 不改变数据迁移警告、云端切换恢复提示这类信息性 `Alert`

在 `app/src/services/showCloudSyncStatusAlert.ts` 中：

- 成功获取状态后仍保留当前状态信息 Alert
- 当 `syncNow()` 失败或 `getStatus()` 失败时改为：

```ts
showErrorFeedback(buildCloudSyncFailedFeedback(error));
```

- [x] **Step 4: 重新运行测试，确认第一批迁移通过**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/LoginPage.test.tsx app/__tests__/_layout.photo-upload.test.tsx src/services/__tests__/showCloudSyncStatusAlert.test.ts
```

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/app/_layout.tsx app/app/__tests__/_layout.photo-upload.test.tsx app/src/components/LoginPage.tsx app/src/components/__tests__/LoginPage.test.tsx app/src/services/showCloudSyncStatusAlert.ts app/src/services/__tests__/showCloudSyncStatusAlert.test.ts
git commit -m "feat: migrate auth and sync errors to feedback modal"
```

## Chunk 4: 迁移设置页与备份页的第一批关键错误

### Task 4: 让云端切换失败、通知权限失败和备份导入导出失败走统一错误反馈

**Files:**
- Modify: `app/src/components/SettingsPage.tsx`
- Modify: `app/src/components/__tests__/SettingsPage.test.tsx`
- Modify: `app/src/components/BackupPage.tsx`
- Modify: `app/src/components/__tests__/BackupPage.test.tsx`

- [x] **Step 1: 先写失败测试，锁定哪些 Alert 要保留、哪些要迁移**

在 `app/src/components/__tests__/SettingsPage.test.tsx` 中：

- 保留原来的“退出登录确认”之类确认框断言
- 新增失败路径断言：

```tsx
it('shows branded feedback when enabling cloud mode fails', async () => {
  mockInspectInitialState.mockRejectedValueOnce(new Error('network down'));
  ...
  expect(showErrorFeedback).toHaveBeenCalledWith(
    expect.objectContaining({ title: '切换失败', dedupeKey: 'cloud-mode-toggle-failed' })
  );
});

it('shows go-to-settings feedback when notification permission is denied', async () => {
  NotificationService.requestPermission.mockResolvedValueOnce(false);
  ...
  expect(showErrorFeedback).toHaveBeenCalledWith(
    expect.objectContaining({ title: '权限不足' })
  );
});
```

在 `app/src/components/__tests__/BackupPage.test.tsx` 中新增：

```tsx
it('shows branded feedback when export save fails', async () => {
  BackupService.saveBackupToUserDirectory.mockResolvedValueOnce({
    saved: false,
    canceled: false,
    fileName: 'latest.zip',
  });
  ...
  expect(showErrorFeedback).toHaveBeenCalledWith(
    expect.objectContaining({ title: '保存失败', dedupeKey: 'backup-export-save-failed' })
  );
});

it('shows branded feedback when import parsing fails', async () => {
  SyncService.pickAndParseBackup.mockRejectedValueOnce(new Error('bad zip'));
  ...
  expect(showErrorFeedback).toHaveBeenCalledWith(
    expect.objectContaining({ title: '导入失败' })
  );
});
```

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/BackupPage.test.tsx
```

Expected: FAIL，原因是 `SettingsPage` 和 `BackupPage` 的这些失败路径当前仍然直接 `Alert.alert(...)`。

- [x] **Step 3: 写最小迁移实现，严格保留确认框和成功提示边界**

在 `app/src/components/SettingsPage.tsx` 中：

- 把这些失败路径迁到统一反馈：
  - 云端切换失败
  - 同步失败
  - 通知权限不足且需要去设置
- 保留这些原生确认框：
  - 退出登录确认
  - 清空缓存确认
  - 重置设置确认
  - 云端/本地数据源选择确认

在 `app/src/components/BackupPage.tsx` 中：

- 把这些失败路径迁到统一反馈：
  - 导出失败
  - 保存到文件失败
  - 导入失败
- 保留成功提示：
  - `保存成功`
  - `导入成功`

尽量统一改成：

```ts
showErrorFeedback(buildBackupExportFailedFeedback());
showErrorFeedback(buildBackupImportFailedFeedback(error));
```

- [x] **Step 4: 重新运行测试，确认设置页和备份页通过**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/BackupPage.test.tsx
```

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/src/components/SettingsPage.tsx app/src/components/__tests__/SettingsPage.test.tsx app/src/components/BackupPage.tsx app/src/components/__tests__/BackupPage.test.tsx
git commit -m "feat: migrate settings and backup errors to feedback modal"
```

## Chunk 5: 验证与文档收口

### Task 5: 跑相关验证，更新 spec / plan 状态并记录已知基线

**Files:**
- Modify: `docs/superpowers/specs/2026-03-23-error-feedback-and-visual-language-design.md`
- Modify: `docs/superpowers/plans/2026-03-23-error-feedback-and-visual-language.md`

- [x] **Step 1: 运行类型检查**

Run:

```bash
cd app && npm run typecheck
```

Expected: PASS

- [x] **Step 2: 运行本轮相关测试集**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath \
  src/store/__tests__/errorFeedbackStore.test.ts \
  src/services/__tests__/errorFeedbackPresets.test.ts \
  src/components/__tests__/ErrorFeedbackModal.test.tsx \
  src/components/__tests__/FeedbackHost.test.tsx \
  src/components/__tests__/LoginPage.test.tsx \
  src/components/__tests__/SettingsPage.test.tsx \
  src/components/__tests__/BackupPage.test.tsx \
  src/services/__tests__/showCloudSyncStatusAlert.test.ts \
  app/__tests__/_layout.photo-upload.test.tsx
```

Expected: PASS

- [x] **Step 3: 运行一次全量测试，并把已知基线失败单独记录**

Run:

```bash
cd app && npm test -- --runInBand --watchAll=false
```

Expected:

- 理想情况：PASS
- 如果仍然只剩既有的 `src/__tests__/runtime-regressions.test.ts` 失败，记录为计划创建时就存在的基线问题，不把它归因到本轮改动

- [x] **Step 4: 手动回归**

手动验证这些路径：

1. 启动时模拟初始化失败，确认出现品牌化错误弹层
2. 登录失败，确认出现统一错误弹层而不是系统 Alert
3. 设置页开启云端失败，确认出现统一错误弹层
4. 设置页通知权限拒绝，确认按钮包含“去设置”
5. 备份导出保存失败，确认出现统一错误弹层
6. 设置页“退出登录”“重置设置”等确认框仍然保留系统确认样式

- [x] **Step 5: 更新文档状态并提交收口**

把 `docs/superpowers/specs/2026-03-23-error-feedback-and-visual-language-design.md` 更新为：

- 当前状态：已实现
- 实现日期
- 实现结果
- 与 spec 的偏差（如果有）

同时勾选本计划已完成步骤并记录验证结果。

```bash
git add docs/superpowers/specs/2026-03-23-error-feedback-and-visual-language-design.md docs/superpowers/plans/2026-03-23-error-feedback-and-visual-language.md
git commit -m "docs: finalize error feedback rollout notes"
```
