# Backup And Sync Test Granularity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在当前分支已有 backup/sync 测试基线之上，补齐 `BackupPage` 剩余导出边界场景，并为 `CloudSyncStatusButton` 新增动画生命周期测试，使备份与同步状态 UI 的高风险回归都能被细粒度自动化锁定。

**Architecture:** 这轮不从零重写测试，而是直接建立在当前已落地的基线上推进。`BackupPage` 继续集中在现有 `BackupPage.test.tsx` 中补完剩余导出分支；`CloudSyncStatusButton` 保留现有内容/交互测试，并新建独立动画测试文件，只验证 `Animated.loop/start/stop` 与 reset/cleanup 语义，不把动画断言塞回原有渲染测试文件。

**Tech Stack:** React Native, Expo, Jest, React Native Testing Library, TypeScript, Animated API mocks

---

## Scope Note

本 plan 对应 spec：

- `docs/superpowers/specs/2026-03-26-backup-sync-test-granularity-design.md`

当前分支已经具备的基线：

- `BackupPage.test.tsx`
  - 无本地备份时不渲染备份历史
  - 仅展示最新三条本地备份
  - iCloud 可用文案
  - 导出归档创建失败反馈
  - 导入取消静默返回
  - 媒体解压失败时“部分恢复”
  - 无新记录时跳过媒体恢复
  - 媒体路径回写
- `BackupExportSheet.test.tsx`
  - `visible=false` 时返回 `null`
  - 遮罩点击关闭
- `CloudSyncStatusButton.test.tsx`
  - `syncing` 与非 `syncing` 的结构差异
  - 点击回调与无障碍 role

因此这轮只做剩余缺口，不重复实现已经在分支上的测试。

## File Structure

- Modify: `app/src/components/__tests__/BackupPage.test.tsx`
  Purpose: 补齐“保存到文件取消”和“保存到文件抛异常”的回归测试。
- Create: `app/src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx`
  Purpose: 独立验证 `useCloudSyncStatusButtonAnimation()` 在 `syncing`、状态切换、卸载时的动画生命周期。
- Modify: `app/src/components/cloud-sync-status-button/useCloudSyncStatusButtonAnimation.ts`
  Purpose: 仅当新动画测试暴露真实缺口时，做最小修复；如果现有实现已满足测试，不做生产代码改动。
- Test: `app/src/components/__tests__/BackupPage.test.tsx`
- Test: `app/src/components/__tests__/CloudSyncStatusButton.test.tsx`
- Test: `app/src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx`

## Task 1: Finish Remaining BackupPage Export Edge Coverage

**Files:**
- Modify: `app/src/components/__tests__/BackupPage.test.tsx`
- Test: `app/src/components/__tests__/BackupPage.test.tsx`

- [ ] **Step 1: Add the missing export-edge regression tests**

在 `app/src/components/__tests__/BackupPage.test.tsx` 追加两个场景：

```tsx
it('keeps the export sheet open when saving to files is canceled', async () => {
  (BackupService.saveBackupToUserDirectory as jest.Mock).mockResolvedValueOnce({
    saved: false,
    canceled: true,
    fileName: undefined,
  });

  const { getByText, findByTestId, queryByTestId } = render(
    <BackupPage visible onClose={jest.fn()} />
  );

  fireEvent.press(getByText('导出'));
  fireEvent.press(await findByTestId('backup-export-save'));

  await waitFor(() => {
    expect(BackupService.saveBackupToUserDirectory).toHaveBeenCalledWith(
      'file:///exports/latest.zip',
      'latest.zip',
    );
  });

  expect(showErrorFeedback).not.toHaveBeenCalled();
  expect(queryByTestId('backup-export-sheet')).toBeTruthy();
});
```

```tsx
it('shows branded feedback when saving backup to files throws', async () => {
  (BackupService.saveBackupToUserDirectory as jest.Mock).mockRejectedValueOnce(
    new Error('disk unavailable')
  );

  const { getByText, findByTestId } = render(
    <BackupPage visible onClose={jest.fn()} />
  );

  fireEvent.press(getByText('导出'));
  fireEvent.press(await findByTestId('backup-export-save'));

  await waitFor(() => {
    expect(showErrorFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '保存失败',
        dedupeKey: 'backup-export-save-failed',
      })
    );
  });
});
```

- [ ] **Step 2: Run the targeted BackupPage suite and record the current behavior**

Run:

```bash
cd app && npm test -- --runTestsByPath src/components/__tests__/BackupPage.test.tsx --runInBand
```

Expected:

- 理想情况：PASS，说明生产逻辑已满足语义，只是之前缺少回归测试
- 如果 FAIL：失败信息应直接指向“取消后错误关闭 sheet”或“异常未展示保存失败反馈”等真实缺口

- [ ] **Step 3: Only if the new tests fail, apply the smallest production fix in `useBackupPageController.ts`**

如果 Step 2 失败，只允许在 `app/src/components/backup-page/useBackupPageController.ts` 做最小修复，目标语义必须与下面保持一致：

```ts
const result = await BackupService.saveBackupToUserDirectory(
  exportTarget.uri,
  exportTarget.name,
);

if (result.canceled) {
  return;
}

if (result.saved && result.fileName) {
  Alert.alert('保存成功', `备份已保存为 ${result.fileName}`);
  closeExportSheet();
  return;
}

showErrorFeedback(buildBackupExportFailedFeedback());
```

以及异常分支：

```ts
} catch {
  showErrorFeedback(buildBackupExportFailedFeedback());
}
```

不要顺手改其他导入/导出逻辑，不要改动文案和 UI 布局。

- [ ] **Step 4: Re-run the BackupPage suite to verify all backup scenarios are green**

Run:

```bash
cd app && npm test -- --runTestsByPath src/components/__tests__/BackupPage.test.tsx --runInBand
```

Expected:

- PASS
- 包含既有 backup 场景和本轮新增的两个导出边界场景

- [ ] **Step 5: Commit the BackupPage coverage**

```bash
git add app/src/components/__tests__/BackupPage.test.tsx app/src/components/backup-page/useBackupPageController.ts
git commit -m "test(backup): cover export save edge cases"
```

如果没有生产代码改动，`git add` 里只保留测试文件。

## Task 2: Add CloudSyncStatusButton Animation Lifecycle Tests

**Files:**
- Create: `app/src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx`
- Modify: `app/src/components/cloud-sync-status-button/useCloudSyncStatusButtonAnimation.ts`
- Test: `app/src/components/__tests__/CloudSyncStatusButton.test.tsx`
- Test: `app/src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx`

- [ ] **Step 1: Create the animation test file with deterministic Animated spies**

创建 `app/src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx`，使用 `Animated.loop` 和 `Animated.Value.prototype` 的 spy，而不是 mock 整个 hook：

```tsx
import React from 'react';
import { Animated } from 'react-native';
import { render } from '@testing-library/react-native';
import { CloudSyncStatusButton } from '../../CloudSyncStatusButton';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

describe('CloudSyncStatusButton animation lifecycle', () => {
  const loopInstances = [
    { start: jest.fn(), stop: jest.fn() },
    { start: jest.fn(), stop: jest.fn() },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    loopInstances[0].start.mockClear();
    loopInstances[0].stop.mockClear();
    loopInstances[1].start.mockClear();
    loopInstances[1].stop.mockClear();

    jest.spyOn(Animated, 'loop').mockImplementation(
      () => loopInstances.shift() as unknown as Animated.CompositeAnimation
    );
    jest.spyOn(Animated.Value.prototype, 'stopAnimation').mockImplementation(() => undefined);
    jest.spyOn(Animated.Value.prototype, 'setValue');
  });
});
```

注意：不要 mock 整个 `react-native` 模块，也不要对 `interpolate()` 返回值做快照。

- [ ] **Step 2: Add the three lifecycle behaviors as failing-first assertions**

在新文件中补齐 3 个核心断言：

```tsx
it('starts two loop animations when entering syncing state', () => {
  render(<CloudSyncStatusButton uiState="syncing" onPress={jest.fn()} />);

  expect(Animated.loop).toHaveBeenCalledTimes(2);
  expect(firstLoop.start).toHaveBeenCalledTimes(1);
  expect(secondLoop.start).toHaveBeenCalledTimes(1);
});
```

```tsx
it('stops both loops and resets animated values when leaving syncing state', () => {
  const { rerender } = render(
    <CloudSyncStatusButton uiState="syncing" onPress={jest.fn()} />
  );

  rerender(<CloudSyncStatusButton uiState="synced" onPress={jest.fn()} />);

  expect(firstLoop.stop).toHaveBeenCalledTimes(1);
  expect(secondLoop.stop).toHaveBeenCalledTimes(1);
  expect(Animated.Value.prototype.setValue).toHaveBeenCalledWith(1);
  expect(Animated.Value.prototype.setValue).toHaveBeenCalledWith(0);
});
```

```tsx
it('cleans up animation resources on unmount', () => {
  const screen = render(
    <CloudSyncStatusButton uiState="syncing" onPress={jest.fn()} />
  );

  screen.unmount();

  expect(firstLoop.stop).toHaveBeenCalledTimes(1);
  expect(secondLoop.stop).toHaveBeenCalledTimes(1);
  expect(Animated.Value.prototype.stopAnimation).toHaveBeenCalled();
});
```

为避免 `shift()` 导致后续用例取空，实际实现时请在 `beforeEach` 里重新构造两个 loop 实例，并把它们保存到局部变量供断言使用。

- [ ] **Step 3: Run the focused cloud sync button suites and inspect the result**

Run:

```bash
cd app && npm test -- --runTestsByPath \
  src/components/__tests__/CloudSyncStatusButton.test.tsx \
  src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx \
  --runInBand
```

Expected:

- 新 animation suite 先暴露真实差距或 mock 问题
- 现有 `CloudSyncStatusButton.test.tsx` 继续保持 PASS

- [ ] **Step 4: If the animation suite fails for real lifecycle reasons, make the smallest fix in `useCloudSyncStatusButtonAnimation.ts`**

`app/src/components/cloud-sync-status-button/useCloudSyncStatusButtonAnimation.ts` 的目标语义必须保持为：

```ts
if (uiState !== 'syncing') {
  resetScaleAnimation(breathe);
  resetAnimation(spin);
  return;
}
```

以及 cleanup：

```ts
return () => {
  breatheLoop.stop();
  spinLoop.stop();
  resetScaleAnimation(breathe);
  resetAnimation(spin);
};
```

如果失败只是测试 mock 本身不稳定，就只修测试，不动生产代码。

- [ ] **Step 5: Re-run the cloud sync button suites until both are green**

Run:

```bash
cd app && npm test -- --runTestsByPath \
  src/components/__tests__/CloudSyncStatusButton.test.tsx \
  src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx \
  --runInBand
```

Expected:

- PASS
- 不输出新的 `act(...)`、Animated 或 console warning 噪音

- [ ] **Step 6: Commit the cloud sync button lifecycle coverage**

```bash
git add app/src/components/__tests__/CloudSyncStatusButton.test.tsx app/src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx app/src/components/cloud-sync-status-button/useCloudSyncStatusButtonAnimation.ts
git commit -m "test(sync): cover cloud status animation lifecycle"
```

如果 `CloudSyncStatusButton.test.tsx` 未改或生产代码未改，`git add` 里删掉未变更文件。

## Task 3: Final Verification And Handoff

**Files:**
- No file changes required

- [ ] **Step 1: Run the backup + sync focused verification command**

Run:

```bash
cd app && npm test -- --runTestsByPath \
  src/components/__tests__/BackupExportSheet.test.tsx \
  src/components/__tests__/BackupPage.test.tsx \
  src/components/__tests__/CloudSyncStatusButton.test.tsx \
  src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx \
  --runInBand
```

Expected:

- PASS
- `BackupExportSheet`、`BackupPage`、`CloudSyncStatusButton` 三块用例全部通过

- [ ] **Step 2: Run the home sync-status regression to confirm the button contract still holds**

Run:

```bash
cd app && npm test -- --runTestsByPath \
  src/components/__tests__/timeline/timeline.home.sync-status.test.tsx \
  src/components/__tests__/CloudSyncStatusButton.test.tsx \
  src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx \
  --runInBand
```

Expected:

- PASS
- 首页云同步入口与 `CloudSyncStatusButton` 的契约没有被新的动画测试改坏

- [ ] **Step 3: Verify the worktree is clean and summarize actual outputs**

Run:

```bash
git status --short
git log --oneline -3
```

Expected:

- `git status --short` 无输出
- 最近提交至少包含：
  - `test(backup): cover export save edge cases`
  - `test(sync): cover cloud status animation lifecycle`

## Notes For Executor

- 本轮是“细化测试覆盖”，不是功能开发。优先新增/收紧测试，只有在测试暴露真实缺口时才改生产代码。
- `BackupPage.test.tsx` 已经在当前分支累积了多条新场景，不要覆盖或回退这些既有测试。
- 动画测试禁止使用脆弱快照；只断言 loop/start/stop/reset 这些稳定语义。
- 如果 `Animated.Value.prototype` 的 spy 引发全局污染，务必在 `afterEach` 中 `mockRestore()`，不要把副作用带进别的测试文件。
