# 账号切换重启 Bootstrap + WorkspaceService 去 Store 依赖 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 登出时重跑完整 bootstrap 实现账号切换数据隔离，并让 workspaceService 从 MMKV 读 userId 而非依赖 authStore。

**Architecture:** 新建 `appLifecycleStore.ts` 提供 `needsRestart` 信号；`authStore` 的 `login/loadAuth` 在成功后将 userId 写入 MMKV，`logout` 清空 userId 并触发 `triggerRestart()`；`workspaceService` 删除 `useAuthStore` 依赖，改从 MMKV 读取 userId；根组件 `_layout.tsx` 监听 `needsRestart`，为 true 时重跑 `runAppBootstrap()`。

**Tech Stack:** React Native / Expo, Zustand 5.0, React Native MMKV, expo-sqlite, Jest

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 新建 | `app/src/store/appLifecycleStore.ts` | `needsRestart` 信号 store |
| 修改 | `app/src/store/authStore.ts` | login/loadAuth 写 userId；logout 清 userId + triggerRestart |
| 修改 | `app/src/services/workspaceService.ts` | 删除 useAuthStore，从 MMKV 读 userId |
| 修改 | `app/app/_layout.tsx` | 监听 needsRestart，重跑 bootstrap |
| 修改 | `app/src/store/__tests__/authStore.test.ts` | 新增 userId 写入和 triggerRestart 测试 |
| 新建 | `app/src/services/__tests__/workspaceService.test.ts` | workspaceService 单元测试 |

---

## Task 1：新建 `appLifecycleStore.ts`

**Files:**
- Create: `app/src/store/appLifecycleStore.ts`
- Test: `app/src/store/__tests__/appLifecycleStore.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `app/src/store/__tests__/appLifecycleStore.test.ts`：

```typescript
import { useAppLifecycleStore } from '../appLifecycleStore';

const resetStore = () =>
  useAppLifecycleStore.setState({ needsRestart: false });

beforeEach(() => {
  resetStore();
});

describe('appLifecycleStore', () => {
  it('initial state has needsRestart false', () => {
    expect(useAppLifecycleStore.getState().needsRestart).toBe(false);
  });

  it('triggerRestart sets needsRestart to true', () => {
    useAppLifecycleStore.getState().triggerRestart();
    expect(useAppLifecycleStore.getState().needsRestart).toBe(true);
  });

  it('clearRestart sets needsRestart to false', () => {
    useAppLifecycleStore.setState({ needsRestart: true });
    useAppLifecycleStore.getState().clearRestart();
    expect(useAppLifecycleStore.getState().needsRestart).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd app && npx jest --runInBand src/store/__tests__/appLifecycleStore.test.ts 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../appLifecycleStore'`

- [ ] **Step 3: 创建 store 文件**

创建 `app/src/store/appLifecycleStore.ts`：

```typescript
import { create } from 'zustand';

interface AppLifecycleState {
  needsRestart: boolean;
  triggerRestart: () => void;
  clearRestart: () => void;
}

export const useAppLifecycleStore = create<AppLifecycleState>((set) => ({
  needsRestart: false,
  triggerRestart: () => set({ needsRestart: true }),
  clearRestart: () => set({ needsRestart: false }),
}));
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd app && npx jest --runInBand src/store/__tests__/appLifecycleStore.test.ts 2>&1 | tail -10
```

Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add app/src/store/appLifecycleStore.ts app/src/store/__tests__/appLifecycleStore.test.ts
git commit -m "feat(lifecycle): 新增 appLifecycleStore，提供 needsRestart 重启信号"
```

---

## Task 2：更新 `authStore.ts` — 写入/清除 userId + triggerRestart

**Files:**
- Modify: `app/src/store/authStore.ts`
- Modify: `app/src/store/__tests__/authStore.test.ts`

### 背景

`login()` 和 `loadAuth()` 成功后，需要将 userId 写入 MMKV：
- key：`${getServerKey(serverUrl)}:workspace:currentUserId`（server-level scope）
- value：userId string

`logout()` 需要清空该 key，并调用 `useAppLifecycleStore.getState().triggerRestart()`。

- [ ] **Step 1: 写失败测试**

在 `app/src/store/__tests__/authStore.test.ts` 文件顶部，在已有 mock 之后、import 之前，新增 appLifecycleStore mock：

```typescript
const mockTriggerRestart = jest.fn();
jest.mock('@/src/store/appLifecycleStore', () => ({
  useAppLifecycleStore: {
    getState: () => ({ triggerRestart: mockTriggerRestart }),
  },
}));
```

在 `beforeEach` 中添加：

```typescript
mockTriggerRestart.mockClear();
```

新增以下测试用例（添加到现有 `describe('authStore', ...)` 块内）：

```typescript
  it('login writes userId to MMKV workspace key', async () => {
    mockPost.mockResolvedValueOnce({
      user: { id: 'u1', email: 'test@test.com', createdAt: '2026-01-01' },
      token: 'access-123',
      refreshToken: 'refresh-456',
    });

    await useAuthStore.getState().login('test@test.com', 'Password1');

    expect(Storage.setString).toHaveBeenCalledWith(
      scopedKey(SERVER_A_SCOPE, 'workspace:currentUserId'),
      'u1',
    );
  });

  it('loadAuth writes userId to MMKV workspace key on success', async () => {
    (Storage.getString as jest.Mock).mockImplementation((key: string) => {
      if (key === scopedKey(SERVER_A_SCOPE, 'auth:token')) return Promise.resolve('tok');
      if (key === scopedKey(SERVER_A_SCOPE, 'auth:refreshToken')) return Promise.resolve('rt');
      return Promise.resolve(null);
    });
    (Storage.getObject as jest.Mock).mockImplementation((key: string) => {
      if (key === scopedKey(SERVER_A_SCOPE, 'auth:user')) {
        return Promise.resolve({ id: 'u99', email: 'x@test.com' });
      }
      return Promise.resolve(null);
    });

    await useAuthStore.getState().loadAuth();

    expect(Storage.setString).toHaveBeenCalledWith(
      scopedKey(SERVER_A_SCOPE, 'workspace:currentUserId'),
      'u99',
    );
  });

  it('logout clears userId MMKV key and triggers restart', async () => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'test@test.com' },
      token: 'tok',
      refreshToken: 'rt',
      isAuthenticated: true,
    });

    await useAuthStore.getState().logout();

    expect(Storage.delete).toHaveBeenCalledWith(
      scopedKey(SERVER_A_SCOPE, 'workspace:currentUserId'),
    );
    expect(mockTriggerRestart).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd app && npx jest --runInBand src/store/__tests__/authStore.test.ts 2>&1 | tail -15
```

Expected: 3 new tests FAIL

- [ ] **Step 3: 修改 authStore.ts**

在 `authStore.ts` 顶部导入新增依赖：

```typescript
import { useAppLifecycleStore } from '@/src/store/appLifecycleStore';
```

新增写入 userId 的辅助函数（放在 `clearTokens` 之后）：

```typescript
const persistWorkspaceUserId = async (userId: string) => {
  const serverUrl = await getCurrentServerUrl();
  const key = withScope(getServerKey(serverUrl), 'workspace:currentUserId');
  await Storage.setString(key, userId);
};

const clearWorkspaceUserId = async () => {
  const serverUrl = await getCurrentServerUrl();
  const key = withScope(getServerKey(serverUrl), 'workspace:currentUserId');
  await Storage.delete(key);
};
```

在 `login` action 的 `await persistTokens(...)` 之后添加：

```typescript
    await persistWorkspaceUserId(user.id);
```

在 `loadAuth` action 的 `set({ user, token, refreshToken, isAuthenticated: true });` 之后（仅在 `if (token && user)` 分支内）添加：

```typescript
      await persistWorkspaceUserId(user.id);
```

在 `logout` action 的 `await clearTokens();` 之后添加：

```typescript
    await clearWorkspaceUserId();
    useAppLifecycleStore.getState().triggerRestart();
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd app && npx jest --runInBand src/store/__tests__/authStore.test.ts 2>&1 | tail -10
```

Expected: 8 tests pass（原有 5 个 + 新增 3 个）

- [ ] **Step 5: Commit**

```bash
git add app/src/store/authStore.ts app/src/store/__tests__/authStore.test.ts
git commit -m "feat(workspace): authStore login/loadAuth 写入 userId，logout 清除并触发重启信号"
```

---

## Task 3：更新 `workspaceService.ts` — 去 store 依赖

**Files:**
- Modify: `app/src/services/workspaceService.ts`
- Create: `app/src/services/__tests__/workspaceService.test.ts`

### 背景

`workspaceService` 目前调用 `useAuthStore.getState().user?.id`，违反项目规范。改为直接从 MMKV 读取 `workspace:currentUserId` key。

- [ ] **Step 1: 写失败测试**

创建 `app/src/services/__tests__/workspaceService.test.ts`：

```typescript
jest.mock('@/src/services/backendEnvironmentService', () => ({
  getCurrentServerUrl: jest.fn().mockResolvedValue('https://server-a.example.com'),
  getCurrentServerUrlSync: jest.fn(() => 'https://server-a.example.com'),
  getServerKey: jest.fn((url: string) => 'env_https_server_a_example_com'),
}));

jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getString: jest.fn().mockResolvedValue(null),
    getStringSync: jest.fn(() => null),
    setString: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  },
  withScope: jest.fn((scope: string, key: string) => `${scope}:${key}`),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
  buildDataScopeKey,
  getCurrentDataScopeKey,
  getCurrentDataScopeKeySync,
} from '../workspaceService';
import { Storage } from '@/src/utils/storage';
import { getCurrentServerUrlSync } from '@/src/services/backendEnvironmentService';

const SERVER_A_SCOPE = 'env_https_server_a_example_com';
const scopedKey = (scope: string, key: string) => `${scope}:${key}`;

beforeEach(() => {
  jest.clearAllMocks();
  (getCurrentServerUrlSync as jest.Mock).mockReturnValue('https://server-a.example.com');
});

describe('buildDataScopeKey', () => {
  it('combines server key and userId', () => {
    expect(buildDataScopeKey('https://server-a.example.com', 'user-123')).toBe(
      'env_https_server_a_example_com_user-123',
    );
  });
});

describe('getCurrentDataScopeKeySync', () => {
  it('returns local when no serverUrl', () => {
    (getCurrentServerUrlSync as jest.Mock).mockReturnValue(null);
    expect(getCurrentDataScopeKeySync()).toBe('local');
  });

  it('returns local when no userId in MMKV', () => {
    (Storage.getStringSync as jest.Mock).mockReturnValue(null);
    expect(getCurrentDataScopeKeySync()).toBe('local');
  });

  it('returns scoped key when serverUrl and userId both present', () => {
    (Storage.getStringSync as jest.Mock).mockReturnValue('user-abc');
    expect(getCurrentDataScopeKeySync()).toBe('env_https_server_a_example_com_user-abc');
  });

  it('reads userId from correct MMKV key', () => {
    (Storage.getStringSync as jest.Mock).mockReturnValue('user-abc');
    getCurrentDataScopeKeySync();
    expect(Storage.getStringSync).toHaveBeenCalledWith(
      scopedKey(SERVER_A_SCOPE, 'workspace:currentUserId'),
    );
  });
});

describe('getCurrentDataScopeKey', () => {
  it('returns local when no userId in MMKV', async () => {
    (Storage.getString as jest.Mock).mockResolvedValue(null);
    await expect(getCurrentDataScopeKey()).resolves.toBe('local');
  });

  it('returns scoped key when userId present', async () => {
    (Storage.getString as jest.Mock).mockResolvedValue('user-xyz');
    await expect(getCurrentDataScopeKey()).resolves.toBe('env_https_server_a_example_com_user-xyz');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd app && npx jest --runInBand src/services/__tests__/workspaceService.test.ts 2>&1 | tail -15
```

Expected: FAIL — 当前实现从 authStore 读取，而非 MMKV

- [ ] **Step 3: 重写 workspaceService.ts**

```typescript
// app/src/services/workspaceService.ts
import {
  getCurrentServerUrl,
  getCurrentServerUrlSync,
  getServerKey,
} from '@/src/services/backendEnvironmentService';
import { Storage, withScope } from '@/src/utils/storage';

const LOCAL_SCOPE = 'local';

const getUserIdKey = (serverUrl: string): string =>
  withScope(getServerKey(serverUrl), 'workspace:currentUserId');

export function buildDataScopeKey(serverUrl: string, userId: string): string {
  return `${getServerKey(serverUrl)}_${userId}`;
}

export function getCurrentDataScopeKeySync(): string {
  const serverUrl = getCurrentServerUrlSync();
  if (!serverUrl) return LOCAL_SCOPE;
  const userId = Storage.getStringSync(getUserIdKey(serverUrl));
  if (!userId) return LOCAL_SCOPE;
  return buildDataScopeKey(serverUrl, userId);
}

export async function getCurrentDataScopeKey(): Promise<string> {
  const serverUrl = await getCurrentServerUrl();
  if (!serverUrl) return LOCAL_SCOPE;
  const userId = await Storage.getString(getUserIdKey(serverUrl));
  if (!userId) return LOCAL_SCOPE;
  return buildDataScopeKey(serverUrl, userId);
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd app && npx jest --runInBand src/services/__tests__/workspaceService.test.ts 2>&1 | tail -10
```

Expected: 8 tests pass

- [ ] **Step 5: 确认 TS 无报错**

```bash
cd app && npx tsc --noEmit --skipLibCheck 2>&1 | grep workspaceService || echo "no errors"
```

- [ ] **Step 6: Commit**

```bash
git add app/src/services/workspaceService.ts app/src/services/__tests__/workspaceService.test.ts
git commit -m "feat(workspace): workspaceService 去除 authStore 依赖，改从 MMKV 读取 userId"
```

---

## Task 4：更新 `_layout.tsx` — 监听 needsRestart 重跑 bootstrap

**Files:**
- Modify: `app/app/_layout.tsx`

### 背景

根组件 `RootLayout` 目前在 `useEffect([], [])` 中只调用一次 `runAppBootstrap()`。需要监听 `useAppLifecycleStore` 的 `needsRestart`，为 true 时：
1. 重置各 store 内存状态（`useSyncStore`、`useSettingsStore`、`useEntryStore`）
2. 重跑 `runAppBootstrap()`
3. 调用 `clearRestart()`

注意：`useAuthStore` 的内存状态已由 `logout()` 自己清空，无需在这里重置。

- [ ] **Step 1: 修改 `_layout.tsx`**

在已有 import 下方新增：

```typescript
import { useAppLifecycleStore } from '@/src/store/appLifecycleStore';
import { useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';
```

在 `RootLayout` 组件内，将原有的一次性 bootstrap `useEffect`：

```typescript
  useEffect(() => {
    void runAppBootstrap({
      refreshCloudSyncIndicator,
      onInitializationFailed: () => {
        showErrorFeedback(buildAppInitializationFailedFeedback());
      },
    });
  }, []);
```

替换为：

```typescript
  const needsRestart = useAppLifecycleStore((s) => s.needsRestart);
  const clearRestart = useAppLifecycleStore((s) => s.clearRestart);

  const runBootstrap = useCallback(async () => {
    await runAppBootstrap({
      refreshCloudSyncIndicator,
      onInitializationFailed: () => {
        showErrorFeedback(buildAppInitializationFailedFeedback());
      },
    });
  }, [refreshCloudSyncIndicator]);

  // 初次启动
  useEffect(() => {
    void runBootstrap();
  }, [runBootstrap]);

  // 账号切换后重跑 bootstrap
  useEffect(() => {
    if (!needsRestart) return;
    useSyncStore.setState({ isLoaded: false });
    useSettingsStore.setState({ isLoaded: false });
    useEntryStore.getState().invalidateActiveQueries();
    void runBootstrap().then(() => clearRestart());
  }, [needsRestart, runBootstrap, clearRestart]);
```

同时在文件顶部添加 `useCallback` import（如果尚未有）：

```typescript
import { useCallback, useEffect, useRef } from 'react';
```

- [ ] **Step 2: 确认 TS 无报错**

```bash
cd app && npx tsc --noEmit --skipLibCheck 2>&1 | grep "_layout\|appLifecycle\|entryStore\|settingsStore" | head -10 || echo "no errors"
```

如有报错，检查 `useEntryStore` 和 `useSettingsStore` 是否有 `isLoaded` 字段（可能字段名不同，查看 store 定义调整）。

- [ ] **Step 3: Commit**

```bash
git add app/app/_layout.tsx
git commit -m "feat(lifecycle): _layout 监听 needsRestart，账号切换后重跑 bootstrap"
```

---

## Task 5：全量验证与回归测试

**Files:**
- 运行验证，无代码修改

- [ ] **Step 1: 更新受 workspaceService 变化影响的测试 mock**

由于 `workspaceService` 不再导入 `useAuthStore`，之前在其他测试中为避免 MMKV 崩溃而添加的 `authStore` mock 可能可以简化，但无需主动修改——只要测试通过即可。

运行核心测试套件：

```bash
cd app && npx jest --runInBand --testPathPattern="workspaceService|appLifecycle|authStore|settingsStore|syncStore|fileSystem|sqlite|appBootstrap|settings-page" 2>&1 | tail -10
```

Expected: All pass

- [ ] **Step 2: 全量 TS 检查**

```bash
cd app && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```

Expected: 仅有已知的 `ImageViewerScene.tsx` contentFit 报错，无新增报错

- [ ] **Step 3: 手动验证账号切换**

1. 启动 App，登录账号 A，创建一条记录
2. 进入设置页，点击退出登录
3. 确认 App 回到登录页（经过 loading 画面）
4. 登录账号 B，确认看不到账号 A 的记录
5. 重启 App，确认账号 B 的数据正常显示

- [ ] **Step 4: 最终 Commit（如有遗漏文件）**

```bash
cd app && npx jest --runInBand --testPathPattern="workspaceService|appLifecycle|authStore" 2>&1 | tail -5
```

---

## 全量验证命令速查

```bash
# 核心相关测试
cd app && npx jest --runInBand --testPathPattern="workspaceService|appLifecycle|authStore|settingsStore|syncStore|fileSystem|sqlite|appBootstrap|settings-page" 2>&1 | tail -10

# TS 检查
cd app && npx tsc --noEmit --skipLibCheck 2>&1 | head -10
```
