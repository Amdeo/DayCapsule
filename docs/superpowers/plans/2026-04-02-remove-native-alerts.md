# Remove Native Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除 app 业务代码中的所有原生 `Alert.alert(...)`，将信息提示迁移到现有全局反馈宿主，将确认交互迁移到新的全局确认弹窗宿主。

**Architecture:** 保留现有 `showErrorFeedback -> errorFeedbackStore -> FeedbackHost -> ErrorFeedbackModal` 链路承接单按钮提示。新增并行的 `showConfirmDialog -> confirmDialogStore -> ConfirmDialogHost -> ConfirmDialogModal` 链路承接确认类交互。按 TDD 先补基础设施测试，再逐批迁移原生 `Alert` 调用点并更新相关回归测试。

**Tech Stack:** React Native, Expo Router, Zustand, Jest, @testing-library/react-native, TypeScript

---

## File Map

### New files

- `app/src/store/confirmDialogStore.ts`
  - 全局确认弹窗状态、去重逻辑、显示与关闭 API
- `app/src/services/showConfirmDialog.ts`
  - 面向调用方的确认弹窗入口
- `app/src/components/ConfirmDialogModal.tsx`
  - 非原生确认弹窗 UI
- `app/src/components/ConfirmDialogHost.tsx`
  - 从 store 读取当前确认请求并包装 action 执行
- `app/src/store/__tests__/confirmDialogStore.test.ts`
  - store 行为测试
- `app/src/components/__tests__/ConfirmDialogModal.test.tsx`
  - 组件渲染与交互测试
- `app/src/components/__tests__/ConfirmDialogHost.test.tsx`
  - host 包装行为测试

### Existing files to modify

- `app/app/_layout.tsx`
  - 根布局挂载 `ConfirmDialogHost`
- `app/src/services/showPhotoRepairPrompt.ts`
  - 用 `showConfirmDialog` 替换修复确认原生弹窗
- `app/src/services/__tests__/showPhotoRepairPrompt.test.ts`
  - 改为断言 `showConfirmDialog`
- `app/src/components/settings-page/useSettingsPageStorage.ts`
  - 清缓存确认改为 confirm dialog，结果提示改为 error feedback
- `app/src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx`
  - 从 spy `Alert.alert` 改为 mock 服务入口
- `app/src/components/entry-editor/useEntryEditorController.ts`
  - 放弃修改确认改为 confirm dialog；保存失败改为 error feedback
- `app/src/components/__tests__/editor/entry-editor.leave-guard.test.tsx`
  - 改为断言 `showConfirmDialog`
- `app/src/components/login-page/useLoginPageController.ts`
  - 表单缺失等提示改为 error feedback
- `app/src/components/tag-management-page/useTagManagementController.ts`
  - 删除/重置确认改为 confirm dialog；上限/失败提示改为 error feedback
- `app/src/components/settings-page/useSettingsPageCloudMode.ts`
  - 云端模式相关确认改为 confirm dialog；单按钮提示改为 error feedback
- `app/src/components/settings-page/useSettingsPageDisableCloudMode.ts`
  - 数据保留确认改为 confirm dialog
- `app/src/components/settings-page/useSettingsPageController.ts`
  - 重置设置确认改为 confirm dialog；结果提示改为 error feedback
- `app/src/services/appBootstrapService.ts`
  - 启动阶段原生提示改为 error feedback
- `app/src/components/voice-recorder/useVoiceRecorderController.ts`
  - 录音失败、保存失败改为 error feedback
- `app/src/components/backup-page/useBackupPageController.ts`
  - 成功/失败提示改为 error feedback；若存在确认分支则改为 confirm dialog
- `app/src/components/image-viewer/useImageViewerActions.ts`
  - 保存结果提示改为 error feedback
- `app/src/components/entry-card/useEntryCardAudio.ts`
  - 播放失败提示改为 error feedback
- `app/app/(tabs)/index.tsx`
  - 首页仍残留的原生提示改为 error feedback 或 confirm dialog

### Existing tests likely to touch later

- `app/src/components/__tests__/LoginPage.test.tsx`
- `app/src/components/__tests__/TagManagementPage.test.tsx`
- `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`
- `app/src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx`
- `app/src/components/__tests__/BackupPage.test.tsx`
- `app/src/components/__tests__/VoiceRecorder.test.tsx`
- `app/src/components/__tests__/image/image-viewer.actions.test.ts`
- `app/src/components/__tests__/EntryCard.test.tsx`

### Verification commands

- Targeted store test: `./node_modules/.bin/jest --runInBand --runTestsByPath src/store/__tests__/confirmDialogStore.test.ts`
- Targeted component tests: `./node_modules/.bin/jest --runInBand --runTestsByPath src/components/__tests__/ConfirmDialogModal.test.tsx src/components/__tests__/ConfirmDialogHost.test.tsx`
- Targeted feature tests:
  - `./node_modules/.bin/jest --runInBand --runTestsByPath src/services/__tests__/showPhotoRepairPrompt.test.ts`
  - `./node_modules/.bin/jest --runInBand --runTestsByPath src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx`
  - `./node_modules/.bin/jest --runInBand --runTestsByPath src/components/__tests__/editor/entry-editor.leave-guard.test.tsx`
- Typecheck: `npm run typecheck`

### Task 1: Confirm Dialog Store

**Files:**
- Create: `app/src/store/confirmDialogStore.ts`
- Test: `app/src/store/__tests__/confirmDialogStore.test.ts`

- [ ] **Step 1: 写失败测试，覆盖显示、去重和关闭行为**

```ts
import { useConfirmDialogStore } from '../confirmDialogStore';

describe('confirmDialogStore', () => {
  beforeEach(() => {
    useConfirmDialogStore.setState({
      current: null,
      activeDedupeKey: null,
    });
  });

  it('stores the latest request when show is called', () => {
    useConfirmDialogStore.getState().show({
      title: '删除标签',
      message: '确认删除吗？',
      actions: [{ label: '删除', role: 'danger' }],
    });

    expect(useConfirmDialogStore.getState().current).toMatchObject({
      title: '删除标签',
      message: '确认删除吗？',
    });
  });

  it('ignores a request with the same dedupe key while one is active', () => {
    useConfirmDialogStore.getState().show({
      title: '第一次',
      dedupeKey: 'same-key',
      actions: [{ label: '知道了', role: 'primary' }],
    });

    useConfirmDialogStore.getState().show({
      title: '第二次',
      dedupeKey: 'same-key',
      actions: [{ label: '知道了', role: 'primary' }],
    });

    expect(useConfirmDialogStore.getState().current?.title).toBe('第一次');
  });

  it('clears current request and dedupe key on dismiss', () => {
    useConfirmDialogStore.getState().show({
      title: '删除标签',
      dedupeKey: 'delete-tag',
      actions: [{ label: '删除', role: 'danger' }],
    });

    useConfirmDialogStore.getState().dismiss();

    expect(useConfirmDialogStore.getState().current).toBeNull();
    expect(useConfirmDialogStore.getState().activeDedupeKey).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `./node_modules/.bin/jest --runInBand --runTestsByPath src/store/__tests__/confirmDialogStore.test.ts`

Expected: FAIL，提示 `confirmDialogStore` 或 `useConfirmDialogStore` 不存在。

- [ ] **Step 3: 写最小实现**

```ts
import { create } from 'zustand';

export type ConfirmDialogAction = {
  label: string;
  role: 'primary' | 'secondary' | 'danger';
  onPress?: () => void | Promise<void>;
  testID?: string;
};

export type ConfirmDialogRequest = {
  title: string;
  message?: string;
  dedupeKey?: string;
  dismissible?: boolean;
  actions: ConfirmDialogAction[];
};

type ConfirmDialogState = {
  current: ConfirmDialogRequest | null;
  activeDedupeKey: string | null;
  show: (request: ConfirmDialogRequest) => void;
  dismiss: () => void;
};

export const useConfirmDialogStore = create<ConfirmDialogState>((set, get) => ({
  current: null,
  activeDedupeKey: null,
  show: (request) => {
    const nextDedupeKey = request.dedupeKey ?? null;
    const { current, activeDedupeKey } = get();

    if (current && nextDedupeKey && activeDedupeKey === nextDedupeKey) {
      return;
    }

    set({ current: request, activeDedupeKey: nextDedupeKey });
  },
  dismiss: () => {
    set({ current: null, activeDedupeKey: null });
  },
}));
```

- [ ] **Step 4: 运行测试确认通过**

Run: `./node_modules/.bin/jest --runInBand --runTestsByPath src/store/__tests__/confirmDialogStore.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交这一小步**

```bash
git add src/store/confirmDialogStore.ts src/store/__tests__/confirmDialogStore.test.ts
git commit -m "feat: add confirm dialog store"
```

### Task 2: Confirm Dialog UI And Host

**Files:**
- Create: `app/src/components/ConfirmDialogModal.tsx`
- Create: `app/src/components/ConfirmDialogHost.tsx`
- Create: `app/src/services/showConfirmDialog.ts`
- Modify: `app/app/_layout.tsx`
- Test: `app/src/components/__tests__/ConfirmDialogModal.test.tsx`
- Test: `app/src/components/__tests__/ConfirmDialogHost.test.tsx`

- [ ] **Step 1: 先写组件与 host 的失败测试**

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ConfirmDialogModal } from '../ConfirmDialogModal';

describe('ConfirmDialogModal', () => {
  it('renders title, message and action labels', () => {
    const screen = render(
      <ConfirmDialogModal
        visible
        request={{
          title: '删除标签',
          message: '确认删除「旅行」吗？',
          actions: [
            { label: '取消', role: 'secondary' },
            { label: '删除', role: 'danger' },
          ],
        }}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByText('删除标签')).toBeTruthy();
    expect(screen.getByText('确认删除「旅行」吗？')).toBeTruthy();
    expect(screen.getByText('取消')).toBeTruthy();
    expect(screen.getByText('删除')).toBeTruthy();
  });

  it('uses dismiss callback when backdrop is pressed for a dismissible dialog', () => {
    const onDismiss = jest.fn();
    const screen = render(
      <ConfirmDialogModal
        visible
        request={{
          title: '删除标签',
          dismissible: true,
          actions: [{ label: '取消', role: 'secondary' }],
        }}
        onDismiss={onDismiss}
      />
    );

    fireEvent.press(screen.getByTestId('confirm-dialog-backdrop'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
```

```tsx
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { useConfirmDialogStore } from '@/src/store/confirmDialogStore';
import { ConfirmDialogHost } from '../ConfirmDialogHost';

describe('ConfirmDialogHost', () => {
  beforeEach(() => {
    useConfirmDialogStore.setState({ current: null, activeDedupeKey: null });
  });

  it('dismisses current request before running the wrapped action', async () => {
    const actionSpy = jest.fn();
    useConfirmDialogStore.getState().show({
      title: '删除标签',
      actions: [{ label: '删除', role: 'danger', onPress: actionSpy }],
    });

    const screen = render(<ConfirmDialogHost />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-dialog-action-0'));
    });

    expect(actionSpy).toHaveBeenCalledTimes(1);
    expect(useConfirmDialogStore.getState().current).toBeNull();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `./node_modules/.bin/jest --runInBand --runTestsByPath src/components/__tests__/ConfirmDialogModal.test.tsx src/components/__tests__/ConfirmDialogHost.test.tsx`

Expected: FAIL，提示组件或服务不存在。

- [ ] **Step 3: 写最小 UI、host 和服务入口**

```ts
import { useConfirmDialogStore, type ConfirmDialogRequest } from '@/src/store/confirmDialogStore';

export function showConfirmDialog(request: ConfirmDialogRequest): void {
  useConfirmDialogStore.getState().show(request);
}
```

```tsx
import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { visualLanguage } from '@/src/theme/visualLanguage';
import type { ConfirmDialogRequest } from '@/src/store/confirmDialogStore';

interface ConfirmDialogModalProps {
  visible: boolean;
  request: ConfirmDialogRequest | null;
  onDismiss: () => void;
}

export function ConfirmDialogModal({ visible, request, onDismiss }: ConfirmDialogModalProps) {
  if (!visible || !request) {
    return null;
  }

  const isDismissible = request.dismissible !== false;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={isDismissible ? onDismiss : undefined}>
      <View className="flex-1 justify-center px-6">
        <Pressable
          testID="confirm-dialog-backdrop"
          className="absolute inset-0"
          style={{ backgroundColor: visualLanguage.surface.backdrop }}
          disabled={!isDismissible}
          onPress={onDismiss}
        />
        <View
          testID="confirm-dialog-card"
          className="px-5 py-[18px]"
          style={{ backgroundColor: visualLanguage.surface.modal, borderRadius: visualLanguage.radius.modal }}
        >
          <Text className="mb-2 text-[20px] font-bold" style={{ color: visualLanguage.text.primary }}>
            {request.title}
          </Text>
          {request.message ? (
            <Text className="mb-[18px] text-sm leading-5" style={{ color: visualLanguage.text.secondary }}>
              {request.message}
            </Text>
          ) : null}
          <View className="flex-row justify-end gap-2.5">
            {request.actions.map((action, index) => (
              <Pressable
                key={`${action.label}-${index}`}
                testID={action.testID ?? `confirm-dialog-action-${index}`}
                onPress={action.onPress}
                className="min-w-[92px] items-center justify-center px-4 py-[11px]"
              >
                <Text>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

```tsx
import React from 'react';
import { ConfirmDialogModal } from '@/src/components/ConfirmDialogModal';
import { useConfirmDialogStore } from '@/src/store/confirmDialogStore';
import { logger } from '@/src/utils/logger';

export function ConfirmDialogHost() {
  const current = useConfirmDialogStore((state) => state.current);
  const dismiss = useConfirmDialogStore((state) => state.dismiss);

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
}
```

在 `app/app/_layout.tsx` 中追加：

```tsx
import { ConfirmDialogHost } from '@/src/components/ConfirmDialogHost';

...

<>
  <Stack>
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
  </Stack>
  <FeedbackHost />
  <ConfirmDialogHost />
</>
```

- [ ] **Step 4: 跑组件测试确认通过**

Run: `./node_modules/.bin/jest --runInBand --runTestsByPath src/components/__tests__/ConfirmDialogModal.test.tsx src/components/__tests__/ConfirmDialogHost.test.tsx`

Expected: PASS。

- [ ] **Step 5: 提交这一小步**

```bash
git add app/_layout.tsx src/services/showConfirmDialog.ts src/components/ConfirmDialogModal.tsx src/components/ConfirmDialogHost.tsx src/components/__tests__/ConfirmDialogModal.test.tsx src/components/__tests__/ConfirmDialogHost.test.tsx
git commit -m "feat: add confirm dialog host"
```

### Task 3: Migrate Photo Repair Prompt

**Files:**
- Modify: `app/src/services/showPhotoRepairPrompt.ts`
- Modify: `app/src/services/__tests__/showPhotoRepairPrompt.test.ts`

- [ ] **Step 1: 先把服务测试改成失败版本，断言 `showConfirmDialog` 被调用**

```ts
const mockShowConfirmDialog = jest.fn();

jest.mock('../showConfirmDialog', () => ({
  showConfirmDialog: (...args: unknown[]) => mockShowConfirmDialog(...args),
}));

it('shows the repair confirmation prompt for the first repairable issue', () => {
  useMediaRepairStore.getState().replaceIssues([issue]);

  showPhotoRepairPrompt();

  expect(mockShowConfirmDialog).toHaveBeenCalledTimes(1);
  expect(mockShowConfirmDialog).toHaveBeenCalledWith(
    expect.objectContaining({
      title: '发现云端媒体异常',
      actions: expect.arrayContaining([
        expect.objectContaining({ label: '稍后处理' }),
        expect.objectContaining({ label: '立即修复' }),
      ]),
    })
  );
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `./node_modules/.bin/jest --runInBand --runTestsByPath src/services/__tests__/showPhotoRepairPrompt.test.ts`

Expected: FAIL，因为实现还在调用 `Alert.alert`。

- [ ] **Step 3: 写最小实现，把 `Alert.alert` 替换为 `showConfirmDialog`**

```ts
import { showConfirmDialog } from '@/src/services/showConfirmDialog';

showConfirmDialog({
  title: '发现云端媒体异常',
  message: '检测到云端图片内容异常，可使用本地原图重新上传修复。',
  dedupeKey: promptKey,
  dismissible: false,
  actions: [
    {
      label: '稍后处理',
      role: 'secondary',
      onPress: () => {
        releasePrompt();
      },
    },
    {
      label: '立即修复',
      role: 'primary',
      onPress: async () => {
        try {
          if (isE2ESyncLabIssue(issue)) {
            await createE2ESyncLabService().injectRepairPending();
          } else {
            await createPhotoRepairService().repair(issue);
          }
        } finally {
          resolveIssue();
        }
      },
    },
  ],
});
```

- [ ] **Step 4: 跑测试确认通过**

Run: `./node_modules/.bin/jest --runInBand --runTestsByPath src/services/__tests__/showPhotoRepairPrompt.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交这一小步**

```bash
git add src/services/showPhotoRepairPrompt.ts src/services/__tests__/showPhotoRepairPrompt.test.ts
git commit -m "refactor: replace photo repair native alert"
```

### Task 4: Migrate Settings Storage And Editor Leave Guard

**Files:**
- Modify: `app/src/components/settings-page/useSettingsPageStorage.ts`
- Modify: `app/src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx`
- Modify: `app/src/components/entry-editor/useEntryEditorController.ts`
- Modify: `app/src/components/__tests__/editor/entry-editor.leave-guard.test.tsx`

- [ ] **Step 1: 先改两个测试，让它们失败在新服务接口上**

```ts
const mockShowConfirmDialog = jest.fn();
const mockShowErrorFeedback = jest.fn();

jest.mock('@/src/services/showConfirmDialog', () => ({
  showConfirmDialog: (...args: unknown[]) => mockShowConfirmDialog(...args),
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: (...args: unknown[]) => mockShowErrorFeedback(...args),
}));

it('shows clear-cache confirmation and success feedback through service helpers', async () => {
  ...
  act(() => {
    result.current.handleClearCache();
  });

  const request = mockShowConfirmDialog.mock.calls[0]?.[0];
  const confirm = request.actions.find((action: { label: string }) => action.label === '清除');
  await act(async () => {
    await confirm?.onPress?.();
  });

  expect(mockShowErrorFeedback).toHaveBeenCalledWith(
    expect.objectContaining({ title: '成功', message: '本地数据已清除' })
  );
});
```

```ts
it('asks for confirmation before leaving a dirty editor through confirm dialog service', () => {
  ...
  fireEvent.press(screen.getByTestId('entry-editor-back-button'));

  expect(mockShowConfirmDialog).toHaveBeenCalledWith(
    expect.objectContaining({
      title: '放弃修改？',
      message: '未保存的修改将会丢失。',
      actions: expect.arrayContaining([
        expect.objectContaining({ label: '继续编辑' }),
        expect.objectContaining({ label: '放弃修改' }),
      ]),
    })
  );
});
```

- [ ] **Step 2: 跑这两个测试确认失败**

Run: `./node_modules/.bin/jest --runInBand --runTestsByPath src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx src/components/__tests__/editor/entry-editor.leave-guard.test.tsx`

Expected: FAIL，因为实现还在依赖 `Alert.alert`。

- [ ] **Step 3: 用最小实现迁移两个控制器**

在 `useSettingsPageStorage.ts` 中使用：

```ts
showConfirmDialog({
  title: '清除缓存',
  message: '确定要清除当前设备上的本地记录、媒体和缓存数据吗？后端数据不会受影响。',
  actions: [
    { label: '取消', role: 'secondary' },
    {
      label: '清除',
      role: 'danger',
      onPress: async () => {
        try {
          await clearLocalAppData();
          await useEntryStore.getState().loadEntries();
          showErrorFeedback({
            title: '成功',
            message: '本地数据已清除',
            actions: [{ label: '知道了', role: 'primary' }],
          });
        } catch {
          showErrorFeedback({
            title: '清除失败',
            message: '清理本地数据时发生错误',
            actions: [{ label: '知道了', role: 'primary' }],
          });
        } finally {
          await refreshStorageStats();
        }
      },
    },
  ],
});
```

在 `useEntryEditorController.ts` 中使用：

```ts
showConfirmDialog({
  title: '放弃修改？',
  message: '未保存的修改将会丢失。',
  actions: [
    { label: '继续编辑', role: 'secondary' },
    { label: '放弃修改', role: 'danger', onPress: onClose },
  ],
});
```

保存失败替换为：

```ts
showErrorFeedback({
  title: '保存失败',
  message: '保存内容失败，请重试',
  actions: [{ label: '知道了', role: 'primary' }],
});
```

- [ ] **Step 4: 跑测试确认通过**

Run: `./node_modules/.bin/jest --runInBand --runTestsByPath src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx src/components/__tests__/editor/entry-editor.leave-guard.test.tsx`

Expected: PASS。

- [ ] **Step 5: 提交这一小步**

```bash
git add src/components/settings-page/useSettingsPageStorage.ts src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx src/components/entry-editor/useEntryEditorController.ts src/components/__tests__/editor/entry-editor.leave-guard.test.tsx
git commit -m "refactor: migrate storage and editor alerts"
```

### Task 5: Migrate Remaining Alert Call Sites In Batches

**Files:**
- Modify: `app/src/components/login-page/useLoginPageController.ts`
- Modify: `app/src/components/tag-management-page/useTagManagementController.ts`
- Modify: `app/src/components/settings-page/useSettingsPageCloudMode.ts`
- Modify: `app/src/components/settings-page/useSettingsPageDisableCloudMode.ts`
- Modify: `app/src/components/settings-page/useSettingsPageController.ts`
- Modify: `app/src/services/appBootstrapService.ts`
- Modify: `app/src/components/voice-recorder/useVoiceRecorderController.ts`
- Modify: `app/src/components/backup-page/useBackupPageController.ts`
- Modify: `app/src/components/image-viewer/useImageViewerActions.ts`
- Modify: `app/src/components/entry-card/useEntryCardAudio.ts`
- Modify: `app/app/(tabs)/index.tsx`
- Modify matching tests listed in File Map

- [ ] **Step 1: 先挑一组代表性测试改成失败版本**

优先改这些测试文件中的断言，把 `Alert.alert` 替换成 `showErrorFeedback` 或 `showConfirmDialog`：

```ts
jest.mock('@/src/services/showConfirmDialog', () => ({
  showConfirmDialog: jest.fn(),
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));
```

代表性目标：

- `src/components/__tests__/LoginPage.test.tsx`
- `src/components/__tests__/TagManagementPage.test.tsx`
- `src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`
- `src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx`
- `src/components/__tests__/BackupPage.test.tsx`
- `src/components/__tests__/VoiceRecorder.test.tsx`
- `src/components/__tests__/image/image-viewer.actions.test.ts`
- `src/components/__tests__/EntryCard.test.tsx`
```

- [ ] **Step 2: 分批跑失败测试**

Run:

- `./node_modules/.bin/jest --runInBand --runTestsByPath src/components/__tests__/LoginPage.test.tsx src/components/__tests__/TagManagementPage.test.tsx`
- `./node_modules/.bin/jest --runInBand --runTestsByPath src/components/__tests__/settings-page/settings-page.account-auth.test.tsx src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx`
- `./node_modules/.bin/jest --runInBand --runTestsByPath src/components/__tests__/BackupPage.test.tsx src/components/__tests__/VoiceRecorder.test.tsx src/components/__tests__/image/image-viewer.actions.test.ts src/components/__tests__/EntryCard.test.tsx`

Expected: FAIL，原因是实现仍在调用 `Alert.alert` 或返回原旧行为。

- [ ] **Step 3: 最小实现迁移剩余调用点**

迁移规则固定如下：

```ts
showErrorFeedback({
  title,
  message,
  actions: [{ label: '知道了', role: 'primary' }],
});
```

```ts
showConfirmDialog({
  title,
  message,
  actions: [
    { label: '取消', role: 'secondary' },
    { label: '确认动作', role: 'primary', onPress: async () => { ... } },
  ],
});
```

对于危险操作：

```ts
{ label: '删除', role: 'danger', onPress: async () => { ... } }
```

对于原本 `cancelable: false` 的确认：

```ts
dismissible: false
```

- [ ] **Step 4: 跑分批测试确认通过**

Run 同 Step 2。

Expected: PASS。

- [ ] **Step 5: 提交这一大步**

```bash
git add src/components/login-page/useLoginPageController.ts src/components/tag-management-page/useTagManagementController.ts src/components/settings-page/useSettingsPageCloudMode.ts src/components/settings-page/useSettingsPageDisableCloudMode.ts src/components/settings-page/useSettingsPageController.ts src/services/appBootstrapService.ts src/components/voice-recorder/useVoiceRecorderController.ts src/components/backup-page/useBackupPageController.ts src/components/image-viewer/useImageViewerActions.ts src/components/entry-card/useEntryCardAudio.ts app/(tabs)/index.tsx src/components/__tests__/LoginPage.test.tsx src/components/__tests__/TagManagementPage.test.tsx src/components/__tests__/settings-page/settings-page.account-auth.test.tsx src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx src/components/__tests__/BackupPage.test.tsx src/components/__tests__/VoiceRecorder.test.tsx src/components/__tests__/image/image-viewer.actions.test.ts src/components/__tests__/EntryCard.test.tsx
git commit -m "refactor: replace remaining native alerts"
```

### Task 6: Final Verification And Native Alert Sweep

**Files:**
- Modify: only files needed to fix verification regressions

- [ ] **Step 1: 全局搜索确认业务代码中不再残留 `Alert.alert`**

Run: `rg "Alert\.alert" app/src app/app`

Expected: 只剩测试 mock 或框架级非业务代码；如果命中业务代码，继续迁移直到为零。

- [ ] **Step 2: 跑本轮最相关验证**

Run:

- `./node_modules/.bin/jest --runInBand --runTestsByPath src/store/__tests__/confirmDialogStore.test.ts src/components/__tests__/ConfirmDialogModal.test.tsx src/components/__tests__/ConfirmDialogHost.test.tsx src/services/__tests__/showPhotoRepairPrompt.test.ts src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx src/components/__tests__/editor/entry-editor.leave-guard.test.tsx`
- `npm run typecheck`

Expected: PASS。

- [ ] **Step 3: 如果基线允许，再补更大范围验证**

Run:

- `./node_modules/.bin/jest --runInBand --runTestsByPath src/components/__tests__/LoginPage.test.tsx src/components/__tests__/TagManagementPage.test.tsx src/components/__tests__/settings-page/settings-page.account-auth.test.tsx src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx src/components/__tests__/BackupPage.test.tsx src/components/__tests__/VoiceRecorder.test.tsx src/components/__tests__/image/image-viewer.actions.test.ts src/components/__tests__/EntryCard.test.tsx`

Expected: PASS，或者只暴露与本次迁移直接相关的问题。

- [ ] **Step 4: 提交最终验证修正**

```bash
git add .
git commit -m "test: verify non-native feedback migration"
```

- [ ] **Step 5: 记录结果并准备代码审查**

在最终说明中明确：

```md
- 新增全局确认弹窗链路
- 所有业务原生 Alert 已迁移
- 列出实际执行过的测试命令与结果
- 若 `npm test` 仍受 worktree shell 异常影响，注明已使用 `./node_modules/.bin/jest` 完成验证
```
