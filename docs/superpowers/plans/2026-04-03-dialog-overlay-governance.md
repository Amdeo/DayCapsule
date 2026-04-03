# Dialog Overlay Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收敛 DayCapsule 的全局弹窗 / 全局提示体系，统一根层宿主、统一触发入口、分批替换全局语义的原生 Alert，并通过回归测试降低后续回归风险。

**Architecture:** 维持现有 `service -> store -> host -> modal` 分层，不做大一统 overlay store 重构。先盘点所有全局弹窗与原生 Alert，再统一把全局 host 固定到 `app/app/_layout.tsx`，随后收口触发入口到 `showXxx` service，最后仅迁移语义上属于全局 confirm / feedback 的原生 Alert。

**Tech Stack:** Expo Router 6、React Native、TypeScript、Zustand、Jest、React Native Testing Library

---

## File Map

### Existing files to modify
- `app/app/_layout.tsx` — 根布局，全局 host 唯一挂载点
- `app/src/__tests__/runtime-regressions.test.ts` — 根布局存在性回归测试
- `app/src/components/settings-page/SettingsPageDialogs.tsx` — 需要移除不应在页面级挂载的全局 host
- `app/src/components/FeedbackHost.tsx` — 全局错误反馈 host
- `app/src/components/ConfirmDialogHost.tsx` — 全局确认对话框 host
- `app/src/components/cloud-sync-monitor/CloudSyncMonitorHost.tsx` — 全局同步监视器 host
- `app/src/services/showErrorFeedback.ts` — 全局错误反馈触发入口
- `app/src/services/showConfirmDialog.ts` — 全局确认触发入口
- `app/src/services/showCloudSyncMonitor.ts` — 全局同步监视器触发入口
- `app/src/services/showPhotoRepairPrompt.ts` — 依赖 confirm 的派生提示入口，需纳入触发链检查
- `app/src/components/SettingsPage.tsx` — 设置页触发同步监视器的入口
- `app/src/components/timeline-v2/TimelineCloudSyncStatusAction.tsx` — 首页同步按钮触发入口

### Existing test files to modify
- `app/src/components/__tests__/CloudSyncMonitorHost.test.tsx` — 同步监视器 host 行为测试
- `app/src/components/__tests__/FeedbackHost.test.tsx` — 错误反馈 host 行为测试
- `app/src/components/__tests__/ConfirmDialogHost.test.tsx` — 确认对话框 host 行为测试
- `app/src/services/__tests__/showCloudSyncMonitor.test.ts` — 同步监视器触发入口测试
- `app/src/services/__tests__/showPhotoRepairPrompt.test.ts`（若存在则修改；若不存在则新增）— 派生提示触发链测试

### New files to create
- `app/src/ui/dialog-overlay/dialogOverlayInventory.ts` — 弹窗/提示清单定义与分类常量
- `app/src/ui/dialog-overlay/__tests__/dialogOverlayInventory.test.ts` — 清单规则测试，保证分类不回退
- `docs/superpowers/plans/2026-04-03-dialog-overlay-governance.md` — 本计划文件

---

### Task 1: 建立全局弹窗清单与分类边界

**Files:**
- Create: `app/src/ui/dialog-overlay/dialogOverlayInventory.ts`
- Test: `app/src/ui/dialog-overlay/__tests__/dialogOverlayInventory.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {
  DIALOG_OVERLAY_INVENTORY,
  getGlobalOverlayIds,
  getNativeAlertsToMigrate,
} from '../dialogOverlayInventory';

describe('dialogOverlayInventory', () => {
  it('tracks the approved global overlays and native alerts to migrate', () => {
    expect(getGlobalOverlayIds()).toEqual([
      'feedback',
      'confirm-dialog',
      'cloud-sync-monitor',
    ]);

    expect(getNativeAlertsToMigrate()).toEqual([
      'photo-repair-prompt',
    ]);

    expect(DIALOG_OVERLAY_INVENTORY.find((item) => item.id === 'login-page')?.classification)
      .toBe('page-local-overlay');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance/app && pnpm test --runInBand --runTestsByPath src/ui/dialog-overlay/__tests__/dialogOverlayInventory.test.ts
```
Expected: FAIL，提示 `dialogOverlayInventory` 模块或导出不存在。

- [ ] **Step 3: Write minimal implementation**

```ts
export type DialogOverlayClassification =
  | 'global-overlay'
  | 'page-local-overlay'
  | 'native-alert-to-migrate'
  | 'native-alert-keep';

export type DialogOverlayInventoryItem = {
  id: string;
  classification: DialogOverlayClassification;
  owner: string;
  notes: string;
};

export const DIALOG_OVERLAY_INVENTORY: DialogOverlayInventoryItem[] = [
  {
    id: 'feedback',
    classification: 'global-overlay',
    owner: 'FeedbackHost',
    notes: 'Global error feedback driven by showErrorFeedback',
  },
  {
    id: 'confirm-dialog',
    classification: 'global-overlay',
    owner: 'ConfirmDialogHost',
    notes: 'Global confirm dialog driven by showConfirmDialog',
  },
  {
    id: 'cloud-sync-monitor',
    classification: 'global-overlay',
    owner: 'CloudSyncMonitorHost',
    notes: 'Global sync monitor driven by showCloudSyncMonitor',
  },
  {
    id: 'photo-repair-prompt',
    classification: 'native-alert-to-migrate',
    owner: 'showPhotoRepairPrompt',
    notes: 'Global decision prompt built on confirm flow semantics',
  },
  {
    id: 'login-page',
    classification: 'page-local-overlay',
    owner: 'LoginPage',
    notes: 'Page-level full-screen dialog, not part of global overlay governance',
  },
  {
    id: 'help-page',
    classification: 'page-local-overlay',
    owner: 'HelpPage',
    notes: 'Page-level help surface, intentionally excluded from this plan',
  },
  {
    id: 'about-page',
    classification: 'page-local-overlay',
    owner: 'AboutPage',
    notes: 'Page-level about surface, intentionally excluded from this plan',
  },
  {
    id: 'tag-management-page',
    classification: 'page-local-overlay',
    owner: 'TagManagementPage',
    notes: 'Page-level management flow, intentionally excluded from this plan',
  },
];

export function getGlobalOverlayIds(): string[] {
  return DIALOG_OVERLAY_INVENTORY
    .filter((item) => item.classification === 'global-overlay')
    .map((item) => item.id);
}

export function getNativeAlertsToMigrate(): string[] {
  return DIALOG_OVERLAY_INVENTORY
    .filter((item) => item.classification === 'native-alert-to-migrate')
    .map((item) => item.id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance/app && pnpm test --runInBand --runTestsByPath src/ui/dialog-overlay/__tests__/dialogOverlayInventory.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance add app/src/ui/dialog-overlay/dialogOverlayInventory.ts app/src/ui/dialog-overlay/__tests__/dialogOverlayInventory.test.ts
git -C /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance commit -m "test: codify dialog overlay inventory"
```

### Task 2: 固定全局 host 只在根布局挂载

**Files:**
- Modify: `app/app/_layout.tsx:21-23`
- Modify: `app/app/_layout.tsx:149-151`
- Modify: `app/src/components/settings-page/SettingsPageDialogs.tsx:1-42`
- Test: `app/src/__tests__/runtime-regressions.test.ts:4-5`
- Test: `app/src/__tests__/runtime-regressions.test.ts:323-332`

- [ ] **Step 1: Write the failing test**

在 `app/src/__tests__/runtime-regressions.test.ts` 的根布局断言中加入：

```ts
expect(mockFeedbackHost).toHaveBeenCalled();
expect(mockCloudSyncMonitorHost).toHaveBeenCalled();
```

并保留根布局渲染逻辑：

```ts
const screen = render(React.createElement(RootLayout));
await waitFor(() => {
  expect(mockRunAppBootstrap).toHaveBeenCalledTimes(1);
});
expect(screen.getByTestId('root-layout-shell')).toBeTruthy();
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance/app && pnpm test --runInBand --runTestsByPath src/__tests__/runtime-regressions.test.ts -t "keeps the app layout root shell renderable inside the gesture handler wrapper"
```
Expected: FAIL，`mockCloudSyncMonitorHost` 未被调用。

- [ ] **Step 3: Write minimal implementation**

在 `app/app/_layout.tsx` 中引入并挂载 `CloudSyncMonitorHost`：

```ts
import { FeedbackHost } from '@/src/components/FeedbackHost';
import { ConfirmDialogHost } from '@/src/components/ConfirmDialogHost';
import { CloudSyncMonitorHost } from '@/src/components/cloud-sync-monitor/CloudSyncMonitorHost';
```

```tsx
<FeedbackHost />
<ConfirmDialogHost />
<CloudSyncMonitorHost />
```

在 `app/src/components/settings-page/SettingsPageDialogs.tsx` 中移除：

```tsx
<CloudSyncMonitorHost />
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance/app && pnpm test --runInBand --runTestsByPath src/__tests__/runtime-regressions.test.ts -t "keeps the app layout root shell renderable inside the gesture handler wrapper"
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance add app/app/_layout.tsx app/src/components/settings-page/SettingsPageDialogs.tsx app/src/__tests__/runtime-regressions.test.ts
git -C /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance commit -m "fix: mount cloud sync monitor at root"
```

### Task 3: 守住每个全局 host 的行为契约

**Files:**
- Test: `app/src/components/__tests__/CloudSyncMonitorHost.test.tsx`
- Test: `app/src/components/__tests__/FeedbackHost.test.tsx`
- Test: `app/src/components/__tests__/ConfirmDialogHost.test.tsx`
- Modify: `app/src/components/FeedbackHost.tsx`
- Modify: `app/src/components/ConfirmDialogHost.tsx`
- Modify: `app/src/components/cloud-sync-monitor/CloudSyncMonitorHost.tsx`

- [ ] **Step 1: Write the failing tests**

在 3 个 host 测试里对齐以下断言模式：

```ts
it('renders nothing when hidden', () => {
  const screen = render(<CloudSyncMonitorHost />);
  expect(screen.queryByTestId('cloud-sync-monitor-modal')).toBeNull();
});
```

```ts
it('hides the modal when dismissed', () => {
  useCloudSyncMonitorStore.setState({ isVisible: true });
  const screen = render(<CloudSyncMonitorHost />);
  fireEvent.press(screen.getByTestId('cloud-sync-monitor-dismiss'));
  expect(useCloudSyncMonitorStore.getState().isVisible).toBe(false);
});
```

对 `FeedbackHost` / `ConfirmDialogHost` 增加“action 抛错时仍 dismiss 且记录日志”的测试：

```ts
it('dismisses before running a failing action', async () => {
  const actionError = new Error('boom');
  useConfirmDialogStore.getState().show({
    title: '确认',
    message: '测试',
    actions: [{ label: '继续', variant: 'primary', onPress: async () => { throw actionError; } }],
  });

  const screen = render(<ConfirmDialogHost />);
  fireEvent.press(screen.getByText('继续'));

  await waitFor(() => {
    expect(useConfirmDialogStore.getState().current).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance/app && pnpm test --runInBand --runTestsByPath src/components/__tests__/CloudSyncMonitorHost.test.tsx src/components/__tests__/FeedbackHost.test.tsx src/components/__tests__/ConfirmDialogHost.test.tsx
```
Expected: FAIL，至少有一条缺少 dismiss / action failure 契约断言。

- [ ] **Step 3: Write minimal implementation**

若现有 host 已满足行为，只补测试，不改生产代码。若测试暴露缺口，保持 host 最小实现：

```ts
if (!current) {
  return null;
}

return (
  <ConfirmDialogModal
    visible
    request={{
      ...current,
      actions: current.actions.map((action) => ({
        ...action,
        onPress: async () => {
          dismiss();
          try {
            await action.onPress?.();
          } catch (error) {
            logger.error('[ConfirmDialogHost] dialog action failed:', error);
          }
        },
      })),
    }}
    onDismiss={dismiss}
  />
);
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance/app && pnpm test --runInBand --runTestsByPath src/components/__tests__/CloudSyncMonitorHost.test.tsx src/components/__tests__/FeedbackHost.test.tsx src/components/__tests__/ConfirmDialogHost.test.tsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance add app/src/components/__tests__/CloudSyncMonitorHost.test.tsx app/src/components/__tests__/FeedbackHost.test.tsx app/src/components/__tests__/ConfirmDialogHost.test.tsx app/src/components/FeedbackHost.tsx app/src/components/ConfirmDialogHost.tsx app/src/components/cloud-sync-monitor/CloudSyncMonitorHost.tsx
git -C /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance commit -m "test: lock global host behavior"
```

### Task 4: 收口全局弹窗触发入口到 service

**Files:**
- Modify: `app/src/services/showErrorFeedback.ts:1-5`
- Modify: `app/src/services/showConfirmDialog.ts:1-5`
- Modify: `app/src/services/showCloudSyncMonitor.ts:1-9`
- Modify: `app/src/services/showPhotoRepairPrompt.ts`
- Test: `app/src/services/__tests__/showCloudSyncMonitor.test.ts`
- Test: `app/src/services/__tests__/showPhotoRepairPrompt.test.ts`

- [ ] **Step 1: Write the failing tests**

给 `showCloudSyncMonitor` 保留直接触发 store 的契约测试：

```ts
it('shows the monitor through the store facade', () => {
  useCloudSyncMonitorStore.setState({ isVisible: false, activeRun: null, lastRunSummary: null });
  showCloudSyncMonitor();
  expect(useCloudSyncMonitorStore.getState().isVisible).toBe(true);
});
```

给 `showPhotoRepairPrompt` 增加“必须走 confirm service”的测试：

```ts
import { showConfirmDialog } from '../showConfirmDialog';

jest.mock('../showConfirmDialog', () => ({
  showConfirmDialog: jest.fn(() => true),
}));

it('delegates the repair prompt to showConfirmDialog', () => {
  showPhotoRepairPrompt({
    entryId: 'entry-1',
    onRepairNow: jest.fn(),
    onLater: jest.fn(),
  });

  expect(showConfirmDialog).toHaveBeenCalledWith(
    expect.objectContaining({
      title: expect.any(String),
      actions: expect.any(Array),
    }),
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance/app && pnpm test --runInBand --runTestsByPath src/services/__tests__/showCloudSyncMonitor.test.ts src/services/__tests__/showPhotoRepairPrompt.test.ts
```
Expected: FAIL，至少一条服务层契约未覆盖或当前实现未通过。

- [ ] **Step 3: Write minimal implementation**

保持 service 只做触发，不承载 UI：

```ts
import { useCloudSyncMonitorStore } from '@/src/store/cloudSyncMonitorStore';

export function showCloudSyncMonitor(): void {
  useCloudSyncMonitorStore.getState().show();
}

export function hideCloudSyncMonitor(): void {
  useCloudSyncMonitorStore.getState().hide();
}
```

保持 confirm / feedback 触发入口最薄：

```ts
export function showConfirmDialog(request: ConfirmDialogRequest): boolean {
  return useConfirmDialogStore.getState().show(request);
}
```

```ts
export function showErrorFeedback(request: ErrorFeedbackRequest): void {
  useErrorFeedbackStore.getState().show(request);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance/app && pnpm test --runInBand --runTestsByPath src/services/__tests__/showCloudSyncMonitor.test.ts src/services/__tests__/showPhotoRepairPrompt.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance add app/src/services/showErrorFeedback.ts app/src/services/showConfirmDialog.ts app/src/services/showCloudSyncMonitor.ts app/src/services/showPhotoRepairPrompt.ts app/src/services/__tests__/showCloudSyncMonitor.test.ts app/src/services/__tests__/showPhotoRepairPrompt.test.ts
git -C /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance commit -m "refactor: standardize global dialog trigger services"
```

### Task 5: 分批迁移全局语义的原生 Alert

**Files:**
- Modify: `app/src/services/showPhotoRepairPrompt.ts`
- Modify: 通过 grep 找到的第一个全局语义 `Alert.alert` 使用点
- Test: 对应服务或组件测试文件

- [ ] **Step 1: Write the failing test**

以 `showPhotoRepairPrompt` 为第一批迁移对象，写一条“不再直接依赖原生 Alert”的测试：

```ts
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

it('does not call Alert.alert for the repair prompt path', () => {
  showPhotoRepairPrompt({
    entryId: 'entry-1',
    onRepairNow: jest.fn(),
    onLater: jest.fn(),
  });

  expect(Alert.alert).not.toHaveBeenCalled();
  expect(showConfirmDialog).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance/app && pnpm test --runInBand --runTestsByPath src/services/__tests__/showPhotoRepairPrompt.test.ts -t "does not call Alert.alert for the repair prompt path"
```
Expected: FAIL，当前实现仍直接调用 `Alert.alert` 或未完全通过 `showConfirmDialog`。

- [ ] **Step 3: Write minimal implementation**

把 `showPhotoRepairPrompt` 统一改为通过 `showConfirmDialog`：

```ts
const shown = showConfirmDialog({
  title: '检测到需要修复的图片',
  message: '该图片存在完整性异常，是否现在开始修复？',
  actions: [
    {
      label: '稍后处理',
      variant: 'secondary',
      onPress: async () => {
        await onLater();
      },
    },
    {
      label: '立即修复',
      variant: 'primary',
      onPress: async () => {
        await onRepairNow();
      },
    },
  ],
});

return shown;
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance/app && pnpm test --runInBand --runTestsByPath src/services/__tests__/showPhotoRepairPrompt.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance add app/src/services/showPhotoRepairPrompt.ts app/src/services/__tests__/showPhotoRepairPrompt.test.ts
git -C /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance commit -m "refactor: replace repair prompt alert with confirm dialog"
```

### Task 6: 验证关键入口的触发链不再依赖页面宿主

**Files:**
- Modify: `app/src/components/timeline-v2/TimelineCloudSyncStatusAction.tsx`
- Modify: `app/src/components/SettingsPage.tsx`
- Test: `app/src/__tests__/runtime-regressions.test.ts`
- Test: 相关首页 / 设置页测试文件（若已有则扩充）

- [ ] **Step 1: Write the failing tests**

为首页同步按钮补“点击后调用 `showCloudSyncMonitor`”测试：

```ts
jest.mock('@/src/services/showCloudSyncMonitor', () => ({
  showCloudSyncMonitor: jest.fn(),
}));

it('opens the cloud sync monitor from the timeline status action', () => {
  useCloudSyncIndicatorStore.setState({ uiState: 'syncing' } as any);
  const screen = render(<TimelineCloudSyncStatusAction />);
  fireEvent.press(screen.getByTestId('cloud-sync-button'));
  expect(showCloudSyncMonitor).toHaveBeenCalledTimes(1);
});
```

为设置页入口补同类测试：

```ts
it('opens the cloud sync monitor from settings', async () => {
  render(<SettingsPage visible onClose={jest.fn()} />);
  fireEvent.press(await screen.findByText('查看同步状态'));
  expect(showCloudSyncMonitor).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance/app && pnpm test --runInBand --runTestsByPath src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/SettingsPage.test.tsx
```
Expected: FAIL，至少有一条入口测试未覆盖或当前断言不成立。

- [ ] **Step 3: Write minimal implementation**

保持组件层只负责调用 service：

```tsx
<CloudSyncStatusButton
  uiState={cloudSyncUiState}
  onPress={() => {
    showCloudSyncMonitor();
  }}
/>
```

```tsx
onShowSyncStatus={() => {
  showCloudSyncMonitor();
}}
```

如果实现已满足，只补测试，不额外修改生产代码。

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance/app && pnpm test --runInBand --runTestsByPath src/components/__tests__/timeline/timeline.home.sync-status.test.tsx src/components/__tests__/SettingsPage.test.tsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance add app/src/components/timeline-v2/TimelineCloudSyncStatusAction.tsx app/src/components/SettingsPage.tsx app/src/components/__tests__/timeline/timeline.home.sync-status.test.tsx app/src/components/__tests__/SettingsPage.test.tsx app/src/__tests__/runtime-regressions.test.ts
git -C /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance commit -m "test: cover global dialog trigger paths"
```

### Task 7: 做一次最小闭环验证

**Files:**
- Modify: 无
- Test: `app/src/__tests__/runtime-regressions.test.ts`
- Test: `app/src/components/__tests__/CloudSyncMonitorHost.test.tsx`
- Test: `app/src/components/__tests__/FeedbackHost.test.tsx`
- Test: `app/src/components/__tests__/ConfirmDialogHost.test.tsx`
- Test: `app/src/services/__tests__/showCloudSyncMonitor.test.ts`
- Test: `app/src/services/__tests__/showPhotoRepairPrompt.test.ts`

- [ ] **Step 1: Run focused regression suite**

Run:
```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance/app && pnpm test --runInBand --runTestsByPath src/__tests__/runtime-regressions.test.ts src/components/__tests__/CloudSyncMonitorHost.test.tsx src/components/__tests__/FeedbackHost.test.tsx src/components/__tests__/ConfirmDialogHost.test.tsx src/services/__tests__/showCloudSyncMonitor.test.ts src/services/__tests__/showPhotoRepairPrompt.test.ts
```
Expected: PASS，0 failures。

- [ ] **Step 2: Run typecheck**

Run:
```bash
cd /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance/app && pnpm run typecheck
```
Expected: PASS，退出码 0。

- [ ] **Step 3: Commit verification-only checkpoint**

```bash
git -C /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance status --short
```
Expected: 工作树干净；若仍有未提交文件，先回到对应任务完成提交，再继续。

- [ ] **Step 4: Summarize shipped scope**

记录本批次实际完成项：

```md
- 全局 host 已固定到根布局
- 全局触发入口已统一到 service
- 第一批全局语义 Alert 已迁移
- 根布局与关键触发链回归测试已补齐
```

- [ ] **Step 5: Commit**

```bash
git -C /Users/cooper/Documents/code/MemoryCapsule/.worktrees/dialog-overlay-governance commit --allow-empty -m "chore: verify dialog overlay governance batch"
```

## Self-Review

### Spec coverage
- 根布局统一承载：Task 2
- 页面不再偷偷挂全局 host：Task 2
- 全局弹窗通过 service 触发：Task 4、Task 6
- 从首页/设置页等入口行为一致：Task 6
- 原生 Alert 分批迁移：Task 5
- 回归测试守住层级与触发链：Task 2、Task 3、Task 6、Task 7

### Placeholder scan
- 计划中未使用 TBD / TODO / implement later。
- 所有代码步骤都给出了具体代码块。
- 所有测试与命令都给出了精确路径和预期结果。

### Type consistency
- 全局触发入口统一使用 `showErrorFeedback` / `showConfirmDialog` / `showCloudSyncMonitor`
- Host 名称统一使用 `FeedbackHost` / `ConfirmDialogHost` / `CloudSyncMonitorHost`
- inventory 分类统一使用 `global-overlay` / `page-local-overlay` / `native-alert-to-migrate` / `native-alert-keep`
