# Workspace Scope 隔离与云端模式简化 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将数据 scope key 从 `env_{server}` 扩展为 `env_{server}_{userId}`，实现同服务器不同账号数据完全隔离，同时简化云端模式切换流程（云端永远是 source of truth，去除"选方向"对话框）。

**Architecture:** 新增 `workspaceService.ts` 统一计算数据 scope key；所有 store/DB/filesystem 改用此 service；bootstrap 中将 `loadAuth()` 提前到 `initDatabase()` 之前，确保打开 DB 时 userId 已知；禁用云端模式改为简单确认弹窗，启用云端模式在两边有数据时默认用云端数据。

**Tech Stack:** React Native / Expo, Zustand, MMKV (react-native-mmkv), expo-sqlite, Jest / @testing-library/react-native

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 新建 | `app/src/services/workspaceService.ts` | 统一计算数据 scope key |
| 修改 | `app/src/store/settingsStore.ts` | 改用 workspaceService |
| 修改 | `app/src/store/syncStore.ts` | 改用 workspaceService |
| 修改 | `app/src/database/sqlite.ts` | 改用 workspaceService |
| 修改 | `app/src/utils/fileSystem.ts` | 改用 workspaceService |
| 修改 | `app/src/services/appBootstrapService.ts` | loadAuth 提前 + needs-decision 简化 |
| 重写 | `app/src/components/settings-page/useSettingsPageDisableCloudMode.ts` | 简单确认弹窗 |
| 修改 | `app/src/components/settings-page/useSettingsPageCloudMode.ts` | 去除 needs-decision 对话框 |
| 修改 | `app/src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx` | 更新测试 |

---

## Task 1：新建 `workspaceService.ts`

**Files:**
- Create: `app/src/services/workspaceService.ts`

- [ ] **Step 1: 创建文件**

```typescript
// app/src/services/workspaceService.ts
import {
  getCurrentServerUrl,
  getCurrentServerUrlSync,
  getServerKey,
} from '@/src/services/backendEnvironmentService';
import { useAuthStore } from '@/src/store/authStore';

const LOCAL_SCOPE = 'local';

export function buildDataScopeKey(serverUrl: string, userId: string): string {
  return `${getServerKey(serverUrl)}_${userId}`;
}

export function getCurrentDataScopeKeySync(): string {
  const serverUrl = getCurrentServerUrlSync();
  const userId = useAuthStore.getState().user?.id;
  if (!serverUrl || !userId) return LOCAL_SCOPE;
  return buildDataScopeKey(serverUrl, userId);
}

export async function getCurrentDataScopeKey(): Promise<string> {
  const serverUrl = await getCurrentServerUrl();
  const userId = useAuthStore.getState().user?.id;
  if (!serverUrl || !userId) return LOCAL_SCOPE;
  return buildDataScopeKey(serverUrl, userId);
}
```

- [ ] **Step 2: 验证文件无 TS 错误**

```bash
cd app && npx tsc --noEmit --skipLibCheck 2>&1 | grep workspaceService || echo "no errors"
```

- [ ] **Step 3: Commit**

```bash
git add app/src/services/workspaceService.ts
git commit -m "feat(workspace): 新增 workspaceService，统一计算数据 scope key"
```

---

## Task 2：更新 `settingsStore.ts`

**Files:**
- Modify: `app/src/store/settingsStore.ts`

- [ ] **Step 1: 替换 import 和 getScopedSettingsKey**

在文件顶部，将：
```typescript
import { getCurrentServerUrl, getServerKey } from '@/src/services/backendEnvironmentService';
```
改为：
```typescript
import { getCurrentDataScopeKey } from '@/src/services/workspaceService';
```

然后将：
```typescript
const getScopedSettingsKey = async (key: string): Promise<string> => {
  const serverUrl = await getCurrentServerUrl();
  return withScope(getServerKey(serverUrl), key);
};
```
改为：
```typescript
const getScopedSettingsKey = async (key: string): Promise<string> => {
  const scope = await getCurrentDataScopeKey();
  return withScope(scope, key);
};
```

- [ ] **Step 2: 确认 TS 无报错**

```bash
cd app && npx tsc --noEmit --skipLibCheck 2>&1 | grep settingsStore || echo "no errors"
```

- [ ] **Step 3: Commit**

```bash
git add app/src/store/settingsStore.ts
git commit -m "feat(workspace): settingsStore 改用 workspaceService 计算 scope key"
```

---

## Task 3：更新 `syncStore.ts`

**Files:**
- Modify: `app/src/store/syncStore.ts`

- [ ] **Step 1: 替换 import 和 getScopedSyncKey**

将：
```typescript
import { getCurrentServerUrl, getServerKey } from '@/src/services/backendEnvironmentService';
```
改为：
```typescript
import { getCurrentDataScopeKey } from '@/src/services/workspaceService';
```

将：
```typescript
const getScopedSyncKey = async (key: string): Promise<string> => {
  const serverUrl = await getCurrentServerUrl();
  return withScope(getServerKey(serverUrl), key);
};
```
改为：
```typescript
const getScopedSyncKey = async (key: string): Promise<string> => {
  const scope = await getCurrentDataScopeKey();
  return withScope(scope, key);
};
```

- [ ] **Step 2: 确认 TS 无报错**

```bash
cd app && npx tsc --noEmit --skipLibCheck 2>&1 | grep syncStore || echo "no errors"
```

- [ ] **Step 3: Commit**

```bash
git add app/src/store/syncStore.ts
git commit -m "feat(workspace): syncStore 改用 workspaceService 计算 scope key"
```

---

## Task 4：更新 `sqlite.ts`

**Files:**
- Modify: `app/src/database/sqlite.ts`

- [ ] **Step 1: 替换 import 和 getDatabaseName**

将：
```typescript
import { getCurrentServerUrlSync, getServerKey } from '@/src/services/backendEnvironmentService';
```
改为：
```typescript
import { getCurrentDataScopeKeySync } from '@/src/services/workspaceService';
```

删除：
```typescript
const DB_NAME_PREFIX = 'MemoryCapsule';
const DEFAULT_SERVER_SCOPE = 'env_default';

const getCurrentServerScope = (): string => {
  const serverUrl = getCurrentServerUrlSync();
  return serverUrl ? getServerKey(serverUrl) : DEFAULT_SERVER_SCOPE;
};

export const getDatabaseName = (): string => `${DB_NAME_PREFIX}-${getCurrentServerScope()}.db`;
```

替换为：
```typescript
const DB_NAME_PREFIX = 'MemoryCapsule';

export const getDatabaseName = (): string =>
  `${DB_NAME_PREFIX}-${getCurrentDataScopeKeySync()}.db`;
```

- [ ] **Step 2: 确认 TS 无报错**

```bash
cd app && npx tsc --noEmit --skipLibCheck 2>&1 | grep sqlite || echo "no errors"
```

- [ ] **Step 3: Commit**

```bash
git add app/src/database/sqlite.ts
git commit -m "feat(workspace): sqlite DB 文件名改用 workspaceService scope key"
```

---

## Task 5：更新 `fileSystem.ts`

**Files:**
- Modify: `app/src/utils/fileSystem.ts`

- [ ] **Step 1: 替换 import 和 scope 获取**

将：
```typescript
import { getCurrentServerUrlSync, getServerKey } from '@/src/services/backendEnvironmentService';
```
改为：
```typescript
import { getCurrentDataScopeKeySync } from '@/src/services/workspaceService';
```

删除：
```typescript
const DEFAULT_SERVER_SCOPE = 'env_default';

const getCurrentServerScope = (): string => {
  const serverUrl = getCurrentServerUrlSync();
  return serverUrl ? getServerKey(serverUrl) : DEFAULT_SERVER_SCOPE;
};
```

在 `getMediaPaths()` 中，将：
```typescript
const scope = getCurrentServerScope();
```
改为：
```typescript
const scope = getCurrentDataScopeKeySync();
```

- [ ] **Step 2: 确认 TS 无报错**

```bash
cd app && npx tsc --noEmit --skipLibCheck 2>&1 | grep fileSystem || echo "no errors"
```

- [ ] **Step 3: Commit**

```bash
git add app/src/utils/fileSystem.ts
git commit -m "feat(workspace): fileSystem 目录路径改用 workspaceService scope key"
```

---

## Task 6：更新 `appBootstrapService.ts` — loadAuth 提前

**Files:**
- Modify: `app/src/services/appBootstrapService.ts`

- [ ] **Step 1: 将 loadAuth 移到 initDatabase 之前**

当前代码中，先调用 `initDatabase()` 再调用 `loadAuth()`。需要将它们对调。

找到这段（位于 `try` 块内，数据库初始化和迁移结束之后）：
```typescript
    const dbSuccess = await initDatabase();
    if (!dbSuccess) {
      throw new Error('数据库初始化失败');
    }
    logger.log('✅ SQLite 数据库初始化成功');

    const migrationResult = await migrateFromAsyncStorage();
```

在整个 `try` 块开头（在 `await Promise.all([initializeFileSystem...])` 和 db 初始化之间）插入：
```typescript
    await useAuthStore.getState().loadAuth();
    logger.log('✅ 认证状态已加载');
```

然后删除后面原来的 `loadAuth` 调用：
```typescript
    await useAuthStore.getState().loadAuth();
    await useSyncStore.getState().load();
    await useSettingsStore.getState().loadSettings();
```
改为：
```typescript
    await useSyncStore.getState().load();
    await useSettingsStore.getState().loadSettings();
```

最终 bootstrap 中的关键顺序变为：
```typescript
    // 1. 文件系统 + 音频初始化（并行）
    await Promise.all([
      initializeFileSystem()...,
      VoiceService.initializeAudio()...,
    ]);

    // 2. 先加载 auth → userId 已知，后续 DB 可用正确 scope
    await useAuthStore.getState().loadAuth();
    logger.log('✅ 认证状态已加载');

    // 3. 打开正确 scope 的 DB
    const dbSuccess = await initDatabase();
    if (!dbSuccess) {
      throw new Error('数据库初始化失败');
    }

    // 4. 所有迁移...
    // 5. load stores
    await useSyncStore.getState().load();
    await useSettingsStore.getState().loadSettings();
```

- [ ] **Step 2: 简化 needs-decision 处理**

找到：
```typescript
      if (flow.type === 'restoring') {
        await bootstrap.runInitialFlow('cloud');
      } else if (flow.type === 'backing-up') {
        await bootstrap.runInitialFlow('local');
      } else if (flow.type === 'needs-decision') {
        await useSyncStore.getState().setInitialSyncState('needs-decision');
      }
      if (flow.type !== 'needs-decision') {
        shouldSyncCloud = true;
      }
```

替换为：
```typescript
      if (flow.type === 'restoring') {
        await bootstrap.runInitialFlow('cloud');
      }
      // backing-up / needs-decision / ready → 正常增量同步即可
      shouldSyncCloud = true;
```

- [ ] **Step 3: 确认 TS 无报错**

```bash
cd app && npx tsc --noEmit --skipLibCheck 2>&1 | grep appBootstrap || echo "no errors"
```

- [ ] **Step 4: Commit**

```bash
git add app/src/services/appBootstrapService.ts
git commit -m "feat(workspace): bootstrap 中 loadAuth 提前到 initDatabase 之前，简化 needs-decision 处理"
```

---

## Task 7：重写 `useSettingsPageDisableCloudMode.ts`

**Files:**
- Modify: `app/src/components/settings-page/useSettingsPageDisableCloudMode.ts`

- [ ] **Step 1: 完整替换文件内容**

```typescript
import { useCallback } from 'react';
import { showConfirmDialog } from '@/src/services/showConfirmDialog';

interface UseSettingsPageDisableCloudModeOptions {
  setCloudMode: (value: boolean | 'switching') => Promise<void>;
}

export function useSettingsPageDisableCloudMode({
  setCloudMode,
}: UseSettingsPageDisableCloudModeOptions) {
  return useCallback(async () => {
    const shown = showConfirmDialog({
      title: '切换到离线模式',
      dismissible: false,
      message: '本地数据将保留，云端数据不受影响。是否继续？',
      actions: [
        {
          label: '切换到离线',
          role: 'primary',
          onPress: () => {
            void setCloudMode(false);
          },
        },
        {
          label: '取消',
          role: 'secondary',
          onPress: () => {
            void setCloudMode(true);
          },
        },
      ],
    });
    if (!shown) {
      await setCloudMode(true);
    }
  }, [setCloudMode]);
}
```

- [ ] **Step 2: 确认 TS 无报错**

```bash
cd app && npx tsc --noEmit --skipLibCheck 2>&1 | grep useSettingsPageDisable || echo "no errors"
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/settings-page/useSettingsPageDisableCloudMode.ts
git commit -m "feat(workspace): 关闭云端模式改为简单确认弹窗，移除数据方向选择"
```

---

## Task 8：简化 `useSettingsPageCloudMode.ts` 的 enableCloudMode

**Files:**
- Modify: `app/src/components/settings-page/useSettingsPageCloudMode.ts`

- [ ] **Step 1: 替换 enableCloudMode 函数**

将现有的 `enableCloudMode` 函数（第 49-83 行）替换为：

```typescript
  const enableCloudMode = useCallback(async () => {
    setIsSwitchingMode(true);
    try {
      await setCloudMode('switching');
      const bootstrap = createSyncBootstrapService();
      const inspection = await bootstrap.inspectInitialState();
      const flow = bootstrap.buildInitialFlow(inspection);

      if (flow.type === 'restoring' || flow.type === 'needs-decision') {
        // 云端有数据 → 云端 wins，从云端恢复
        await finishEnableCloud('cloud');
      } else {
        // 云端为空（backing-up 或 ready）→ 直接连接，后续新增内容自动同步
        await useEntryStore.getState().loadEntries();
        await setCloudMode(true);
        await createCloudSyncService().syncNow().catch((error) => {
          logger.warn('[Settings] 初次启用云同步后的首轮同步失败:', error);
          showErrorFeedback({
            title: '同步未完成',
            message: '云同步已开启，但首次同步失败，请稍后重试。',
            actions: [{ label: '知道了', role: 'primary' }],
          });
        });
      }
    } catch (e: unknown) {
      showErrorFeedback(buildCloudModeToggleFailedFeedback(e, '请检查网络连接'));
      await setCloudMode(false);
    } finally {
      setIsSwitchingMode(false);
    }
  }, [finishEnableCloud, setCloudMode]);
```

- [ ] **Step 2: 移除不再使用的 showConfirmDialog import**

检查文件顶部 import，如果 `showConfirmDialog` 不再被使用则删除：
```typescript
import { showConfirmDialog } from '@/src/services/showConfirmDialog';
```

- [ ] **Step 3: 确认 TS 无报错**

```bash
cd app && npx tsc --noEmit --skipLibCheck 2>&1 | grep useSettingsPageCloud || echo "no errors"
```

- [ ] **Step 4: Commit**

```bash
git add app/src/components/settings-page/useSettingsPageCloudMode.ts
git commit -m "feat(workspace): 启用云端模式去除方向选择弹窗，needs-decision 默认使用云端数据"
```

---

## Task 9：更新测试文件

**Files:**
- Modify: `app/src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx`

- [ ] **Step 1: 替换关闭云端模式测试**

将原来测试"云端为空时保留本地数据切回离线"的用例（第 34-69 行）替换为新行为的测试：

```typescript
  it('shows simple confirmation dialog when disabling cloud mode', async () => {
    const { screen, mocks } = await renderSettingsPage({
      cloudMode: true,
      authenticated: true,
      userEmail: 'mobile3@test.com',
    });

    const cloudModeSwitch = await screen.findByTestId('settings-switch-cloud-mode');
    fireEvent(cloudModeSwitch, 'valueChange', false);

    await waitFor(() => {
      expect(mocks.showConfirmDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '切换到离线模式',
          message: '本地数据将保留，云端数据不受影响。是否继续？',
        }),
      );
    });

    // 不应发起任何 API 请求
    expect(mocks.apiClient.get).not.toHaveBeenCalled();

    const actions = mocks.showConfirmDialog.mock.calls[0][0].actions as Array<{
      label?: string;
      onPress?: () => void;
    }>;
    const confirmAction = actions.find((a) => a.label === '切换到离线');
    expect(confirmAction).toBeTruthy();

    await act(async () => {
      await confirmAction?.onPress?.();
    });

    expect(mocks.settings.setCloudMode).toHaveBeenCalledWith(false);
  });
```

- [ ] **Step 2: 运行 cloud-mode 测试，确认通过**

```bash
cd app && npx jest --runInBand --runTestsByPath src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx
```

Expected: 3 tests pass (1 modified + 2 existing)

- [ ] **Step 3: 运行全部 settings 测试确认无回归**

```bash
cd app && npm run test:frontend:settings
```

Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add app/src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx
git commit -m "test(workspace): 更新云端模式切换测试，反映简化后的确认弹窗行为"
```

---

## 全量验证

- [ ] **全量 TS 检查**

```bash
cd app && npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

Expected: 无报错

- [ ] **全量测试**

```bash
cd app && npx jest --runInBand 2>&1 | tail -20
```

Expected: All test suites pass

- [ ] **手动验证 scope 隔离**

1. 登录账号 A → 创建若干记录
2. 退出登录 → 登录账号 B
3. 确认 B 看不到 A 的记录

- [ ] **手动验证云端模式切换**

1. 开启云端模式（云端有数据）→ 自动下载，无方向选择弹窗
2. 关闭云端模式 → 简单确认弹窗 → 确认后关闭
3. 重启 App → 不卡在"切换中..."
