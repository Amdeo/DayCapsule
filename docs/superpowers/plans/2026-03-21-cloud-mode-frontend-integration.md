# 云端模式前端集成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 DayCapsule 添加云端模式开关，让用户可在离线/云端模式间切换，云端模式下数据读写走后端 API。

**Architecture:** 通过 DataSource 抽象层解耦 entryStore 与数据来源。LocalDataSource 包装现有 SQLite 操作，RemoteDataSource 走 API。settingsStore 管理 cloudMode 状态，切换时执行数据迁移。

**Tech Stack:** Expo SDK 54, TypeScript, Zustand, MMKV, fetch API

**Spec:** `docs/superpowers/specs/2026-03-21-cloud-mode-frontend-integration-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `app/src/services/apiClient.ts` | HTTP client with auth headers, token refresh lock, timeout, error normalization |
| `app/src/services/__tests__/apiClient.test.ts` | apiClient unit tests |
| `app/src/store/authStore.ts` | Auth state (user, tokens), login/register/logout, MMKV persistence |
| `app/src/store/__tests__/authStore.test.ts` | authStore unit tests |
| `app/src/database/dataSource.ts` | DataSource interface + LocalDataSource + RemoteDataSource |
| `app/src/database/__tests__/dataSource.test.ts` | DataSource unit tests |
| `app/src/components/LoginPage.tsx` | Login/register UI (DetailPageShell) |
| `app/src/components/__tests__/LoginPage.test.tsx` | LoginPage unit tests |

### Modified Files
| File | Change |
|------|--------|
| `app/src/types/entry.ts` | Extract `EntryFilters` type here (from `database/operations.ts`) |
| `app/src/database/operations.ts` | Re-export `EntryFilters` from `types/entry.ts` for backward compat |
| `app/src/store/entryStore.ts` | Replace `DB.*` calls with `activeDataSource.*`, expose `switchDataSource` |
| `app/src/store/settingsStore.ts` | Add `cloudMode` state (`false | 'switching' | true`) |
| `app/src/components/SettingsPage.tsx` | Add account section + cloud mode toggle |
| `app/app/_layout.tsx` | Add cloudMode startup recovery check |

---

## Task 1: Extract EntryFilters type to types/entry.ts

**Files:**
- Modify: `app/src/types/entry.ts`
- Modify: `app/src/database/operations.ts`

- [ ] **Step 1: Add EntryFilters to types/entry.ts**

In `app/src/types/entry.ts`, add at the end of the file:

```typescript
export interface EntryFilters {
  type?: 'text' | 'photo' | 'voice';
  startTime?: number;
  search?: string;
  tags?: string[];
}
```

- [ ] **Step 2: Update operations.ts to re-export from types**

In `app/src/database/operations.ts`, replace the `EntryFilters` interface (lines 383-388) with:

```typescript
// Re-export for backward compatibility
export type { EntryFilters } from '@/src/types/entry';
import type { EntryFilters } from '@/src/types/entry';
```

- [ ] **Step 3: Run existing tests to verify no breakage**

Run: `cd app && npx jest --run-in-band 2>&1 | tail -20`
Expected: All existing tests pass

- [ ] **Step 4: Commit**

```bash
git add app/src/types/entry.ts app/src/database/operations.ts
git commit -m "refactor: extract EntryFilters type to types/entry.ts"
```

---

## Task 2: API Client

**Files:**
- Create: `app/src/services/apiClient.ts`
- Create: `app/src/services/__tests__/apiClient.test.ts`

- [ ] **Step 1: Write failing tests for apiClient**

Create `app/src/services/__tests__/apiClient.test.ts`:

```typescript
/**
 * apiClient unit tests
 */

// Mock Storage before importing apiClient
jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getString: jest.fn().mockResolvedValue(null),
    setString: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

import { createApiClient, ApiError } from '../apiClient';
import { Storage } from '@/src/utils/storage';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('apiClient', () => {
  const client = createApiClient('https://api.test.com');

  it('GET request with params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: [1, 2, 3] }),
    });

    const result = await client.get<number[]>('/entries', { limit: '20' });
    expect(result).toEqual([1, 2, 3]);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/entries?limit=20',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('POST request with body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ success: true, data: { id: '1' } }),
    });

    const result = await client.post<{ id: string }>('/entries', { content: 'hello' });
    expect(result).toEqual({ id: '1' });
  });

  it('attaches Authorization header when token exists', async () => {
    (Storage.getString as jest.Mock).mockResolvedValueOnce('test-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: {} }),
    });

    await client.get('/me');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('throws ApiError on non-success response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'bad input' },
      }),
    });

    await expect(client.post('/entries', {})).rejects.toThrow(ApiError);
    await expect(client.post('/entries', {})).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
    });
  });

  it('refreshes token on 401 and retries', async () => {
    // Mock Storage.getString to return values based on key
    (Storage.getString as jest.Mock).mockImplementation((key: string) => {
      if (key === 'auth:token') return Promise.resolve('expired-token');
      if (key === 'auth:refreshToken') return Promise.resolve('refresh-token-1');
      return Promise.resolve(null);
    });

    // 401 response
    mockFetch.mockResolvedValueOnce({
      ok: false, status: 401,
      json: () => Promise.resolve({ success: false, error: { code: 'UNAUTHORIZED', message: '' } }),
    });
    // refresh response
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: () => Promise.resolve({
        success: true,
        data: { token: 'new-token', refreshToken: 'new-refresh' },
      }),
    });
    // retry response (after refresh, getString('auth:token') returns new-token)
    (Storage.getString as jest.Mock).mockImplementation((key: string) => {
      if (key === 'auth:token') return Promise.resolve('new-token');
      if (key === 'auth:refreshToken') return Promise.resolve('new-refresh');
      return Promise.resolve(null);
    });
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: () => Promise.resolve({ success: true, data: { ok: true } }),
    });

    const result = await client.get<{ ok: boolean }>('/me');
    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx jest services/__tests__/apiClient.test.ts --no-coverage 2>&1 | tail -10`
Expected: FAIL — module not found

- [ ] **Step 3: Implement apiClient**

Create `app/src/services/apiClient.ts`:

```typescript
/**
 * HTTP API Client
 * fetch-based, auto auth headers, token refresh with lock, timeout, error normalization
 */

import { Storage } from '@/src/utils/storage';
import { logger } from '@/src/utils/logger';

const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface ApiClient {
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
  uploadFile(path: string, fileUri: string, fieldName: string): Promise<{ id: string; url: string }>;
}

// Token refresh lock: prevents concurrent refresh calls
// Scoped inside createApiClient to avoid shared state across instances

export function createApiClient(baseURL: string): ApiClient {
  let refreshPromise: Promise<boolean> | null = null;

  const buildUrl = (path: string, params?: Record<string, string>): string => {
    const url = `${baseURL}${path}`;
    if (!params || Object.keys(params).length === 0) return url;
    const qs = new URLSearchParams(params).toString();
    return `${url}?${qs}`;
  };

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const token = await Storage.getString('auth:token');
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const rt = await Storage.getString('auth:refreshToken');
      if (!rt) return false;

      const res = await fetch(`${baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });

      if (!res.ok) return false;

      const json: ApiResponse<{ token: string; refreshToken: string }> = await res.json();
      if (!json.success || !json.data) return false;

      await Storage.setString('auth:token', json.data.token);
      await Storage.setString('auth:refreshToken', json.data.refreshToken);
      return true;
    } catch (e) {
      logger.error('[apiClient] Token refresh failed:', e);
      return false;
    }
  };

  const refreshWithLock = (): Promise<boolean> => {
    if (refreshPromise) return refreshPromise;
    refreshPromise = refreshToken().finally(() => { refreshPromise = null; });
    return refreshPromise;
  };

  const request = async <T>(
    method: string,
    path: string,
    body?: unknown,
    isRetry = false,
  ): Promise<T> => {
    const authHeaders = await getAuthHeaders();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authHeaders,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(buildUrl(path), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const json: ApiResponse<T> = await res.json();

      if (res.ok && json.success) {
        return json.data as T;
      }

      // Handle 401: try refresh once
      if (res.status === 401 && !isRetry) {
        const refreshed = await refreshWithLock();
        if (refreshed) {
          return request<T>(method, path, body, true);
        }
      }

      throw new ApiError(
        json.error?.code ?? 'UNKNOWN_ERROR',
        json.error?.message ?? 'Request failed',
        res.status,
      );
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if ((e as Error).name === 'AbortError') {
        throw new ApiError('TIMEOUT', 'Request timed out', 0);
      }
      throw new ApiError('NETWORK_ERROR', (e as Error).message, 0);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const requestWithParams = async <T>(
    method: string,
    path: string,
    params?: Record<string, string>,
  ): Promise<T> => {
    const authHeaders = await getAuthHeaders();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authHeaders,
    };

    const url = buildUrl(path, params);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, { method, headers, signal: controller.signal });
      const json: ApiResponse<T> = await res.json();

      if (res.ok && json.success) return json.data as T;

      if (res.status === 401) {
        const refreshed = await refreshWithLock();
        if (refreshed) return requestWithParams<T>(method, path, params);
      }

      throw new ApiError(
        json.error?.code ?? 'UNKNOWN_ERROR',
        json.error?.message ?? 'Request failed',
        res.status,
      );
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if ((e as Error).name === 'AbortError') throw new ApiError('TIMEOUT', 'Request timed out', 0);
      throw new ApiError('NETWORK_ERROR', (e as Error).message, 0);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  return {
    get: <T>(path: string, params?: Record<string, string>) =>
      requestWithParams<T>('GET', path, params),

    post: <T>(path: string, body: unknown) => request<T>('POST', path, body),

    put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),

    delete: <T>(path: string) => request<T>('DELETE', path),

    uploadFile: async (path: string, fileUri: string, fieldName: string) => {
      const authHeaders = await getAuthHeaders();
      const formData = new FormData();
      const filename = fileUri.split('/').pop() ?? 'file';
      formData.append(fieldName, { uri: fileUri, name: filename, type: 'application/octet-stream' } as any);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000); // 60s for uploads

      try {
        const res = await fetch(`${baseURL}${path}`, {
          method: 'POST',
          headers: { ...authHeaders },
          body: formData,
          signal: controller.signal,
        });

        const json: ApiResponse<{ id: string; url: string }> = await res.json();
        if (res.ok && json.success && json.data) return json.data;

        throw new ApiError(
          json.error?.code ?? 'UPLOAD_FAILED',
          json.error?.message ?? 'Upload failed',
          res.status,
        );
      } finally {
        clearTimeout(timeoutId);
      }
    },
  };
}

/** Singleton instance — initialized lazily from env var */
let _client: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!_client) {
    const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';
    _client = createApiClient(baseURL);
  }
  return _client;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx jest services/__tests__/apiClient.test.ts --no-coverage 2>&1 | tail -10`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/services/apiClient.ts app/src/services/__tests__/apiClient.test.ts
git commit -m "feat: add API client with auth headers and token refresh lock"
```

---

## Task 3: AuthStore

**Files:**
- Create: `app/src/store/authStore.ts`
- Create: `app/src/store/__tests__/authStore.test.ts`

- [ ] **Step 1: Write failing tests for authStore**

Create `app/src/store/__tests__/authStore.test.ts`:

```typescript
/**
 * authStore unit tests
 */

jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getString: jest.fn().mockResolvedValue(null),
    setString: jest.fn().mockResolvedValue(undefined),
    setObject: jest.fn().mockResolvedValue(undefined),
    getObject: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/src/services/apiClient', () => ({
  getApiClient: () => ({
    post: jest.fn(),
    get: jest.fn(),
  }),
}));

import { useAuthStore } from '../authStore';
import { Storage } from '@/src/utils/storage';
import { getApiClient } from '@/src/services/apiClient';

const resetStore = () => useAuthStore.setState({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
});

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('authStore', () => {
  it('initial state is unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('login stores user and tokens', async () => {
    const client = getApiClient();
    (client.post as jest.Mock).mockResolvedValueOnce({
      user: { id: 'u1', email: 'test@test.com', createdAt: '2026-01-01' },
      token: 'access-123',
      refreshToken: 'refresh-456',
    });

    await useAuthStore.getState().login('test@test.com', 'Password1');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual({ id: 'u1', email: 'test@test.com' });
    expect(state.token).toBe('access-123');
    expect(Storage.setString).toHaveBeenCalledWith('auth:token', 'access-123');
    expect(Storage.setString).toHaveBeenCalledWith('auth:refreshToken', 'refresh-456');
  });

  it('register stores user and tokens', async () => {
    const client = getApiClient();
    (client.post as jest.Mock).mockResolvedValueOnce({
      user: { id: 'u2', email: 'new@test.com', createdAt: '2026-01-01' },
      token: 'access-789',
      refreshToken: 'refresh-012',
    });

    await useAuthStore.getState().register('new@test.com', 'Password1');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe('new@test.com');
  });

  it('logout clears state and MMKV', () => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'test@test.com' },
      token: 'tok',
      refreshToken: 'rt',
      isAuthenticated: true,
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(Storage.delete).toHaveBeenCalledWith('auth:token');
    expect(Storage.delete).toHaveBeenCalledWith('auth:refreshToken');
    expect(Storage.delete).toHaveBeenCalledWith('auth:user');
  });

  it('loadAuth restores from MMKV', async () => {
    (Storage.getString as jest.Mock)
      .mockResolvedValueOnce('saved-token')
      .mockResolvedValueOnce('saved-refresh');
    (Storage.getObject as jest.Mock)
      .mockResolvedValueOnce({ id: 'u1', email: 'saved@test.com' });

    await useAuthStore.getState().loadAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('saved-token');
    expect(state.user?.email).toBe('saved@test.com');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx jest store/__tests__/authStore.test.ts --no-coverage 2>&1 | tail -10`
Expected: FAIL — module not found

- [ ] **Step 3: Implement authStore**

Create `app/src/store/authStore.ts`:

```typescript
/**
 * Auth Store — 用户认证状态管理
 * token 持久化到 MMKV，启动时自动恢复
 */

import { create } from 'zustand';
import { Storage } from '@/src/utils/storage';
import { getApiClient } from '@/src/services/apiClient';
import { logger } from '@/src/utils/logger';

interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  login(email: string, password: string): Promise<void>;
  register(email: string, password: string): Promise<void>;
  logout(): void;
  refreshAuth(): Promise<boolean>;
  loadAuth(): Promise<void>;
}

interface AuthResponse {
  user: { id: string; email: string; createdAt: string };
  token: string;
  refreshToken: string;
}

const persistTokens = async (token: string, refreshToken: string, user: AuthUser) => {
  await Promise.all([
    Storage.setString('auth:token', token),
    Storage.setString('auth:refreshToken', refreshToken),
    Storage.setObject('auth:user', user),
  ]);
};

const clearTokens = async () => {
  await Promise.all([
    Storage.delete('auth:token'),
    Storage.delete('auth:refreshToken'),
    Storage.delete('auth:user'),
  ]);
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,

  login: async (email, password) => {
    const client = getApiClient();
    const data = await client.post<AuthResponse>('/auth/login', { email, password });
    const user: AuthUser = { id: data.user.id, email: data.user.email };

    set({ user, token: data.token, refreshToken: data.refreshToken, isAuthenticated: true });
    await persistTokens(data.token, data.refreshToken, user);
    logger.log('✅ 登录成功:', email);
  },

  register: async (email, password) => {
    const client = getApiClient();
    const data = await client.post<AuthResponse>('/auth/register', { email, password });
    const user: AuthUser = { id: data.user.id, email: data.user.email };

    set({ user, token: data.token, refreshToken: data.refreshToken, isAuthenticated: true });
    await persistTokens(data.token, data.refreshToken, user);
    logger.log('✅ 注册成功:', email);
  },

  logout: () => {
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
    clearTokens();
    logger.log('✅ 已退出登录');
  },

  refreshAuth: async () => {
    const rt = get().refreshToken;
    if (!rt) return false;

    try {
      const client = getApiClient();
      const data = await client.post<{ token: string; refreshToken: string }>('/auth/refresh', {
        refreshToken: rt,
      });
      set({ token: data.token, refreshToken: data.refreshToken });
      await Storage.setString('auth:token', data.token);
      await Storage.setString('auth:refreshToken', data.refreshToken);
      return true;
    } catch {
      get().logout();
      return false;
    }
  },

  loadAuth: async () => {
    const [token, refreshToken, user] = await Promise.all([
      Storage.getString('auth:token'),
      Storage.getString('auth:refreshToken'),
      Storage.getObject<AuthUser>('auth:user'),
    ]);

    if (token && user) {
      set({ user, token, refreshToken, isAuthenticated: true });
      logger.log('✅ 已恢复登录状态:', user.email);
    }
  },
}));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx jest store/__tests__/authStore.test.ts --no-coverage 2>&1 | tail -10`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/store/authStore.ts app/src/store/__tests__/authStore.test.ts
git commit -m "feat: add authStore with login/register/logout and MMKV persistence"
```

---

## Task 4: DataSource Interface + LocalDataSource

**Files:**
- Create: `app/src/database/dataSource.ts`
- Create: `app/src/database/__tests__/dataSource.test.ts`

- [ ] **Step 1: Write failing tests for DataSource interface and LocalDataSource**

Create `app/src/database/__tests__/dataSource.test.ts`:

```typescript
/**
 * DataSource unit tests
 */

jest.mock('@/src/database/operations', () => ({
  getEntriesPage: jest.fn().mockResolvedValue([]),
  getEntriesCount: jest.fn().mockResolvedValue(0),
  addEntry: jest.fn().mockImplementation((entry) =>
    Promise.resolve({ ...entry, id: 'new-1', timestamp: 1000, syncStatus: 'synced' })
  ),
  updateEntry: jest.fn().mockResolvedValue(undefined),
  deleteEntry: jest.fn().mockResolvedValue(undefined),
  getAllTags: jest.fn().mockResolvedValue(['tag1', 'tag2']),
  restoreEntries: jest.fn().mockResolvedValue(['id1']),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { localDataSource } from '../dataSource';
import * as DB from '@/src/database/operations';

beforeEach(() => jest.clearAllMocks());

describe('LocalDataSource', () => {
  it('getEntriesPage delegates to DB.getEntriesPage', async () => {
    await localDataSource.getEntriesPage({}, 20);
    expect(DB.getEntriesPage).toHaveBeenCalledWith({}, 20, undefined);
  });

  it('getEntryCount delegates to DB.getEntriesCount', async () => {
    await localDataSource.getEntryCount();
    expect(DB.getEntriesCount).toHaveBeenCalled();
  });

  it('addEntry delegates to DB.addEntry', async () => {
    const entry = { type: 'text' as const, content: 'hi', syncStatus: 'synced' as const };
    const result = await localDataSource.addEntry(entry);
    expect(result.id).toBe('new-1');
    expect(DB.addEntry).toHaveBeenCalledWith(entry);
  });

  it('deleteEntry delegates to DB.deleteEntry', async () => {
    await localDataSource.deleteEntry('x');
    expect(DB.deleteEntry).toHaveBeenCalledWith('x');
  });

  it('getAllTags delegates to DB.getAllTags', async () => {
    const tags = await localDataSource.getAllTags();
    expect(tags).toEqual(['tag1', 'tag2']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx jest database/__tests__/dataSource.test.ts --no-coverage 2>&1 | tail -10`
Expected: FAIL — module not found

- [ ] **Step 3: Implement DataSource interface and LocalDataSource**

Create `app/src/database/dataSource.ts`:

```typescript
/**
 * DataSource 抽象层
 * entryStore 通过此接口访问数据，不直接依赖 DB 或 API
 */

import type { Entry, EntryFilters } from '@/src/types/entry';
import * as DB from './operations';

export interface DataSource {
  getEntriesPage(filters: EntryFilters, pageSize: number, cursor?: number): Promise<Entry[]>;
  getEntryCount(): Promise<number>;
  addEntry(entry: Omit<Entry, 'id' | 'timestamp'>): Promise<Entry>;
  updateEntry(id: string, updates: Partial<Entry>): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  getAllTags(): Promise<string[]>;
  restoreEntries(entries: Entry[]): Promise<string[]>;
}

/** LocalDataSource — wraps existing SQLite operations */
export const localDataSource: DataSource = {
  getEntriesPage: (filters, pageSize, cursor) =>
    DB.getEntriesPage(filters, pageSize, cursor),

  getEntryCount: () => DB.getEntriesCount(),

  addEntry: (entry) => DB.addEntry(entry),

  updateEntry: (id, updates) => DB.updateEntry(id, updates),

  deleteEntry: (id) => DB.deleteEntry(id),

  getAllTags: () => DB.getAllTags(),

  restoreEntries: (entries) => DB.restoreEntries(entries),
};

/** Active data source — switched by cloud mode toggle */
let _activeDataSource: DataSource = localDataSource;

export function getActiveDataSource(): DataSource {
  return _activeDataSource;
}

export function switchDataSource(ds: DataSource): void {
  _activeDataSource = ds;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx jest database/__tests__/dataSource.test.ts --no-coverage 2>&1 | tail -10`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/database/dataSource.ts app/src/database/__tests__/dataSource.test.ts
git commit -m "feat: add DataSource interface and LocalDataSource wrapper"
```

---

## Task 5: RemoteDataSource

**Files:**
- Modify: `app/src/database/dataSource.ts` (add RemoteDataSource)
- Modify: `app/src/database/__tests__/dataSource.test.ts` (add RemoteDS tests)

- [ ] **Step 1: Add failing tests for RemoteDataSource**

Restructure `app/src/database/__tests__/dataSource.test.ts`: add `mockApiClient` and its `jest.mock` at the very top of the file (before the existing `jest.mock('@/src/database/operations')`), because jest hoists `jest.mock` but the variable must be declared before the factory references it:

```typescript
// Add at very top of file
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  uploadFile: jest.fn(),
};

jest.mock('@/src/services/apiClient', () => ({
  getApiClient: () => mockApiClient,
}));

// ... existing jest.mock('@/src/database/operations') follows ...
```

Then append the RemoteDataSource test suite at the end of the file:

```typescript
};

import { createRemoteDataSource } from '../dataSource';

describe('RemoteDataSource', () => {
  const remoteDS = createRemoteDataSource();

  beforeEach(() => {
    Object.values(mockApiClient).forEach((fn) => (fn as jest.Mock).mockReset());
  });

  it('getEntriesPage calls GET /entries with query params', async () => {
    mockApiClient.get.mockResolvedValueOnce([]);
    await remoteDS.getEntriesPage({ type: 'text' }, 20, 1000);
    expect(mockApiClient.get).toHaveBeenCalledWith('/entries', {
      limit: '20',
      cursor: '1000',
      type: 'text',
    });
  });

  it('addEntry without media calls POST /entries', async () => {
    mockApiClient.post.mockResolvedValueOnce({ id: 'r1', timestamp: 2000 });
    const result = await remoteDS.addEntry({
      type: 'text',
      content: 'hello',
      syncStatus: 'synced',
    });
    expect(result.id).toBe('r1');
    expect(mockApiClient.uploadFile).not.toHaveBeenCalled();
  });

  it('addEntry with media uploads file first', async () => {
    mockApiClient.uploadFile.mockResolvedValueOnce({ id: 'media-1', url: 'https://cdn/media-1' });
    mockApiClient.post.mockResolvedValueOnce({
      id: 'r2',
      timestamp: 3000,
      type: 'photo',
      content: '',
      media: [{ uri: 'https://cdn/media-1', mimeType: 'image/jpeg', size: 100 }],
      syncStatus: 'synced',
    });

    const result = await remoteDS.addEntry({
      type: 'photo',
      content: '',
      media: [{ uri: 'file:///local/photo.jpg', mimeType: 'image/jpeg', size: 100 }],
      syncStatus: 'synced',
    });

    expect(mockApiClient.uploadFile).toHaveBeenCalledWith('/media/upload', 'file:///local/photo.jpg', 'file');
    expect(result.id).toBe('r2');
  });

  it('deleteEntry calls DELETE /entries/:id', async () => {
    mockApiClient.delete.mockResolvedValueOnce(undefined);
    await remoteDS.deleteEntry('r1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/entries/r1');
  });

  it('getEntryCount calls GET /sync/status', async () => {
    mockApiClient.get.mockResolvedValueOnce({ hasBackup: true, entryCount: 42 });
    const count = await remoteDS.getEntryCount();
    expect(count).toBe(42);
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `cd app && npx jest database/__tests__/dataSource.test.ts --no-coverage 2>&1 | tail -10`
Expected: FAIL — `createRemoteDataSource` not found

- [ ] **Step 3: Implement RemoteDataSource**

Add to `app/src/database/dataSource.ts`:

```typescript
import { getApiClient } from '@/src/services/apiClient';
import { logger } from '@/src/utils/logger';

/** RemoteDataSource — all operations go through backend API */
export function createRemoteDataSource(): DataSource {
  const client = getApiClient();

  return {
    getEntriesPage: async (filters, pageSize, cursor) => {
      const params: Record<string, string> = { limit: String(pageSize) };
      if (cursor) params.cursor = String(cursor);
      if (filters.type) params.type = filters.type;
      if (filters.startTime) params.startTime = String(filters.startTime);
      if (filters.search) params.search = filters.search;
      if (filters.tags?.length) params.tags = filters.tags.join(',');
      return client.get<Entry[]>('/entries', params);
    },

    getEntryCount: async () => {
      const status = await client.get<{ hasBackup: boolean; entryCount: number }>('/sync/status');
      return status.entryCount ?? 0;
    },

    addEntry: async (entry) => {
      // Upload media files first if present
      let mediaIds: string[] | undefined;
      if (entry.media?.length) {
        const uploads = await Promise.all(
          entry.media.map((m) => client.uploadFile('/media/upload', m.uri, 'file'))
        );
        mediaIds = uploads.map((u) => u.id);
      }

      return client.post<Entry>('/entries', {
        type: entry.type,
        content: entry.content,
        tags: entry.tags,
        mediaIds,
        recordingStatus: entry.recordingStatus,
        recordingDuration: entry.recordingDuration,
      });
    },

    updateEntry: async (id, updates) => {
      await client.put(`/entries/${id}`, updates);
    },

    deleteEntry: async (id) => {
      await client.delete(`/entries/${id}`);
    },

    getAllTags: () => client.get<string[]>('/tags'),

    restoreEntries: async (entries) => {
      // Use existing bulk sync upload
      const hash = String(Date.now());
      await client.post('/sync/upload', {
        data: { entries, tags: [], version: 1 },
        hash,
        entryCount: entries.length,
        deviceName: 'DayCapsule App',
        encrypted: false,
        encryptionVersion: 0,
      });
      return entries.map((e) => e.id);
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx jest database/__tests__/dataSource.test.ts --no-coverage 2>&1 | tail -10`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/database/dataSource.ts app/src/database/__tests__/dataSource.test.ts
git commit -m "feat: add RemoteDataSource with media upload support"
```

---

## Task 6: Refactor entryStore to use DataSource

**Files:**
- Modify: `app/src/store/entryStore.ts`
- Modify: `app/src/store/__tests__/entryStore.test.ts`

- [ ] **Step 1: Update entryStore.test.ts mock to use dataSource**

In `app/src/store/__tests__/entryStore.test.ts`, replace the `jest.mock('@/src/database/operations')` block (lines 5-20) with:

```typescript
const mockDataSource = {
  getEntriesPage: jest.fn().mockResolvedValue([]),
  getEntryCount: jest.fn().mockResolvedValue(0),
  addEntry: jest.fn().mockImplementation((entry) =>
    Promise.resolve({
      ...entry,
      id: 'test-id-1',
      timestamp: 1700000000000,
      syncStatus: 'synced',
    })
  ),
  updateEntry: jest.fn().mockResolvedValue(undefined),
  deleteEntry: jest.fn().mockResolvedValue(undefined),
  getAllTags: jest.fn().mockResolvedValue([]),
  restoreEntries: jest.fn().mockResolvedValue([]),
};

jest.mock('@/src/database/dataSource', () => ({
  getActiveDataSource: () => mockDataSource,
  localDataSource: mockDataSource,
  switchDataSource: jest.fn(),
}));

// Keep operations mock for backward compat (removeBrokenRecordingEntries may still reference)
jest.mock('@/src/database/operations', () => ({
  getEntriesPage: jest.fn().mockResolvedValue([]),
  getAllEntries: jest.fn().mockResolvedValue([]),
  addEntry: jest.fn(),
  updateEntry: jest.fn(),
  deleteEntry: jest.fn(),
  searchEntries: jest.fn().mockResolvedValue([]),
  getAllTags: jest.fn().mockResolvedValue([]),
}));
```

Update test references: replace `DB.getEntriesPage` with `mockDataSource.getEntriesPage`, `DB.addEntry` with `mockDataSource.addEntry`, etc. throughout the test file.

- [ ] **Step 2: Run tests to verify they fail (entryStore still uses DB directly)**

Run: `cd app && npx jest store/__tests__/entryStore.test.ts --no-coverage 2>&1 | tail -10`
Expected: Tests may fail or pass depending on mock setup — this verifies the test changes compile

- [ ] **Step 3: Refactor entryStore.ts to use DataSource**

In `app/src/store/entryStore.ts`:

Replace the import:
```typescript
import * as DB from '@/src/database/operations';
import { EntryFilters } from '@/src/database/operations';
```

With:
```typescript
import { getActiveDataSource } from '@/src/database/dataSource';
import type { EntryFilters } from '@/src/types/entry';
```

Then replace all `DB.*` calls:
- `DB.getEntriesPage(filters, PAGE_SIZE)` → `getActiveDataSource().getEntriesPage(filters, PAGE_SIZE)`
- `DB.getEntriesPage(filters, PAGE_SIZE, cursor)` → `getActiveDataSource().getEntriesPage(filters, PAGE_SIZE, cursor)`
- `DB.addEntry(entry)` → `getActiveDataSource().addEntry(entry)`
- `DB.updateEntry(id, updates)` → `getActiveDataSource().updateEntry(id, updates)`
- `DB.deleteEntry(id)` → `getActiveDataSource().deleteEntry(id)` (including inside `removeBrokenRecordingEntries`)
- `DB.getAllTags()` → `getActiveDataSource().getAllTags()`
- `DB.restoreEntries(entries)` → `getActiveDataSource().restoreEntries(entries)`

- [ ] **Step 4: Run all tests to verify nothing is broken**

Run: `cd app && npx jest --run-in-band 2>&1 | tail -20`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/store/entryStore.ts app/src/store/__tests__/entryStore.test.ts
git commit -m "refactor: entryStore uses DataSource abstraction instead of direct DB calls"
```

---

## Task 7: Add cloudMode to settingsStore

**Files:**
- Modify: `app/src/store/settingsStore.ts`
- Modify: `app/src/store/__tests__/settingsStore.test.ts`

- [ ] **Step 1: Add cloudMode test cases to settingsStore.test.ts**

Append to `app/src/store/__tests__/settingsStore.test.ts`:

```typescript
describe('cloudMode', () => {
  it('defaults to false', () => {
    expect(useSettingsStore.getState().cloudMode).toBe(false);
  });

  it('setCloudMode persists to MMKV', async () => {
    await useSettingsStore.getState().setCloudMode('switching');
    expect(Storage.setString).toHaveBeenCalledWith('settings:cloudMode', 'switching');
    expect(useSettingsStore.getState().cloudMode).toBe('switching');

    await useSettingsStore.getState().setCloudMode(true);
    expect(Storage.setString).toHaveBeenCalledWith('settings:cloudMode', 'true');
    expect(useSettingsStore.getState().cloudMode).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx jest store/__tests__/settingsStore.test.ts --no-coverage 2>&1 | tail -10`
Expected: FAIL — `cloudMode` property not found

- [ ] **Step 3: Add cloudMode to settingsStore**

In `app/src/store/settingsStore.ts`:

Add to `SettingsState` interface:
```typescript
cloudMode: boolean | 'switching';
setCloudMode: (value: boolean | 'switching') => Promise<void>;
```

Add to `SETTINGS_KEYS`:
```typescript
cloudMode: 'settings:cloudMode',
```

Add to `DEFAULT_SETTINGS`:
```typescript
cloudMode: false as boolean | 'switching',
```

Add `cloudMode` to the existing `Promise.all` in `loadSettings` (add as 8th element):
```typescript
// In loadSettings, add to the Promise.all array:
Storage.getString(SETTINGS_KEYS.cloudMode),
// And update destructuring:
const [notif, backup, hq, spacing, ph, density, lat, cm] = await Promise.all([...]);
```

Add cloudMode parsing in `loadSettings` set():
```typescript
cloudMode: cm === 'true' ? true : cm === 'switching' ? 'switching' : false,
```

Add method in store:
```typescript
setCloudMode: async (value) => {
  await Storage.setString(SETTINGS_KEYS.cloudMode, String(value));
  set({ cloudMode: value });
},
```

Add to `resetSettings`:
```typescript
Storage.delete(SETTINGS_KEYS.cloudMode),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx jest store/__tests__/settingsStore.test.ts --no-coverage 2>&1 | tail -10`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/store/settingsStore.ts app/src/store/__tests__/settingsStore.test.ts
git commit -m "feat: add cloudMode state to settingsStore with MMKV persistence"
```

---

## Task 8: LoginPage Component

**Files:**
- Create: `app/src/components/LoginPage.tsx`
- Create: `app/src/components/__tests__/LoginPage.test.tsx`

- [ ] **Step 1: Write failing test for LoginPage**

Create `app/src/components/__tests__/LoginPage.test.tsx`:

```typescript
jest.mock('@/src/store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

// Mock DetailPageShell to avoid native module dependencies
jest.mock('../DetailPageShell', () => ({
  DetailPageShell: ({ children, visible }: any) =>
    visible ? children : null,
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginPage } from '../LoginPage';
import { useAuthStore } from '@/src/store/authStore';

const mockLogin = jest.fn();
const mockRegister = jest.fn();

(useAuthStore as unknown as jest.Mock).mockReturnValue({
  login: mockLogin,
  register: mockRegister,
  isAuthenticated: false,
});

beforeEach(() => jest.clearAllMocks());

describe('LoginPage', () => {
  it('renders login form by default', () => {
    const { getByPlaceholderText, getByText } = render(
      <LoginPage visible={true} onClose={jest.fn()} onSuccess={jest.fn()} />
    );
    expect(getByPlaceholderText('邮箱')).toBeTruthy();
    expect(getByPlaceholderText('密码')).toBeTruthy();
    expect(getByText('登录')).toBeTruthy();
  });

  it('calls login on submit', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const onSuccess = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <LoginPage visible={true} onClose={jest.fn()} onSuccess={onSuccess} />
    );

    fireEvent.changeText(getByPlaceholderText('邮箱'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('密码'), 'Password1');
    fireEvent.press(getByText('登录'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'Password1');
    });
  });

  it('switches to register mode', () => {
    const { getByText, getByPlaceholderText } = render(
      <LoginPage visible={true} onClose={jest.fn()} onSuccess={jest.fn()} />
    );

    fireEvent.press(getByText('没有账户？注册'));
    expect(getByPlaceholderText('确认密码')).toBeTruthy();
    expect(getByText('注册')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx jest components/__tests__/LoginPage.test.tsx --no-coverage 2>&1 | tail -10`
Expected: FAIL — module not found

- [ ] **Step 3: Implement LoginPage**

Create `app/src/components/LoginPage.tsx`:

```typescript
/**
 * 登录/注册页面
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/src/store/authStore';
import { DetailPageShell } from './DetailPageShell';
import { logger } from '@/src/utils/logger';

interface LoginPageProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LoginPage({ visible, onClose, onSuccess }: LoginPageProps) {
  const { login, register } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('提示', '请填写邮箱和密码');
      return;
    }

    if (isRegister && password !== confirmPassword) {
      Alert.alert('提示', '两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegister) {
        await register(email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      resetForm();
      onSuccess();
    } catch (e: any) {
      logger.error('[LoginPage] Auth failed:', e);
      Alert.alert(
        isRegister ? '注册失败' : '登录失败',
        e?.message ?? '请检查网络连接后重试',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DetailPageShell visible={visible} title={isRegister ? '注册' : '登录'} onClose={onClose}>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="邮箱"
          placeholderTextColor="#A3A3A3"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="密码"
          placeholderTextColor="#A3A3A3"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {isRegister && (
          <TextInput
            style={styles.input}
            placeholder="确认密码"
            placeholderTextColor="#A3A3A3"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        )}

        {isRegister && (
          <Text style={styles.hint}>密码要求：8-64位，含大小写字母和数字</Text>
        )}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>{isRegister ? '注册' : '登录'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => {
            setIsRegister(!isRegister);
            setConfirmPassword('');
          }}
        >
          <Text style={styles.switchText}>
            {isRegister ? '已有账户？登录' : '没有账户？注册'}
          </Text>
        </TouchableOpacity>
      </View>
    </DetailPageShell>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: 24, gap: 16 },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#4A4A4A',
  },
  hint: { fontSize: 12, color: '#A3A3A3', paddingHorizontal: 4 },
  button: {
    backgroundColor: '#6A89CC',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: '#D1D1D1' },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  switchButton: { alignItems: 'center', paddingVertical: 12 },
  switchText: { fontSize: 14, color: '#6A89CC' },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx jest components/__tests__/LoginPage.test.tsx --no-coverage 2>&1 | tail -10`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/components/LoginPage.tsx app/src/components/__tests__/LoginPage.test.tsx
git commit -m "feat: add LoginPage component with login/register forms"
```

---

## Task 9: SettingsPage — Account Section + Cloud Mode Toggle

**Files:**
- Modify: `app/src/components/SettingsPage.tsx`

- [ ] **Step 1: Add account section and cloud mode toggle to SettingsPage**

In `app/src/components/SettingsPage.tsx`:

Add imports:
```typescript
import { useAuthStore } from '@/src/store/authStore';
import { LoginPage } from './LoginPage';
import { switchDataSource, localDataSource, createRemoteDataSource } from '@/src/database/dataSource';
import { getApiClient } from '@/src/services/apiClient';
import * as DB from '@/src/database/operations';
```

Add state inside `SettingsPage` function:
```typescript
const { user, isAuthenticated, logout } = useAuthStore();
const { cloudMode, setCloudMode } = useSettingsStore();
const [showLogin, setShowLogin] = useState(false);
const [isSwitchingMode, setIsSwitchingMode] = useState(false);
```

Add cloud mode toggle handler:
```typescript
const handleCloudModeToggle = async (enable: boolean) => {
  if (enable) {
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }
    await enableCloudMode();
  } else {
    await disableCloudMode();
  }
};

const enableCloudMode = async () => {
  setIsSwitchingMode(true);
  try {
    await setCloudMode('switching');
    const client = getApiClient();
    const status = await client.get<{ hasBackup: boolean; entryCount: number }>('/sync/status');

    if (status.hasBackup && status.entryCount > 0) {
      const localCount = await DB.getEntriesCount();
      Alert.alert(
        '数据同步',
        `云端 ${status.entryCount} 条记录\n本地 ${localCount} 条记录\n\n请选择数据来源：`,
        [
          { text: '使用云端数据', onPress: () => finishEnableCloud('cloud') },
          { text: '上传本地数据', onPress: () => finishEnableCloud('local') },
          { text: '取消', style: 'cancel', onPress: () => setCloudMode(false) },
        ],
      );
    } else {
      await finishEnableCloud('local');
    }
  } catch (e: any) {
    Alert.alert('切换失败', e?.message ?? '请检查网络连接');
    await setCloudMode(false);
  } finally {
    setIsSwitchingMode(false);
  }
};

const finishEnableCloud = async (source: 'cloud' | 'local') => {
  try {
    if (source === 'local') {
      // Upload local data to cloud
      const allEntries = await DB.getAllEntries();
      const client = getApiClient();
      const hash = String(Date.now());
      await client.post('/sync/upload', {
        data: { entries: allEntries, tags: [], version: 1 },
        hash,
        entryCount: allEntries.length,
        deviceName: 'DayCapsule App',
        encrypted: false,
        encryptionVersion: 0,
      });
    }
    switchDataSource(createRemoteDataSource());
    await useEntryStore.getState().loadEntries();
    await setCloudMode(true);
  } catch (e: any) {
    Alert.alert('切换失败', e?.message ?? '操作失败');
    await setCloudMode(false);
    switchDataSource(localDataSource);
  }
};

const disableCloudMode = async () => {
  setIsSwitchingMode(true);
  try {
    await setCloudMode('switching');
    const client = getApiClient();
    const status = await client.get<{ hasBackup: boolean; entryCount: number; updatedAt: string }>('/sync/status');
    const localCount = await DB.getEntriesCount();

    Alert.alert(
      '切换到离线模式',
      `云端 ${status.entryCount} 条记录\n本地 ${localCount} 条记录\n\n请选择数据保留方向：`,
      [
        {
          text: '云端 → 本地',
          onPress: async () => {
            try {
              const data = await client.get<{ data: { entries: any[] } }>('/sync/download');
              await DB.clearAllEntries();
              await DB.restoreEntries(data.data.entries);
              switchDataSource(localDataSource);
              await useEntryStore.getState().loadEntries();
              await setCloudMode(false);
            } catch (e: any) {
              Alert.alert('同步失败', e?.message);
              await setCloudMode(true);
            }
          },
        },
        {
          text: '本地 → 云端',
          onPress: async () => {
            try {
              const allEntries = await DB.getAllEntries();
              const hash = String(Date.now());
              await client.post('/sync/upload', {
                data: { entries: allEntries, tags: [], version: 1 },
                hash,
                entryCount: allEntries.length,
                deviceName: 'DayCapsule App',
                encrypted: false,
                encryptionVersion: 0,
              });
              switchDataSource(localDataSource);
              await useEntryStore.getState().loadEntries();
              await setCloudMode(false);
            } catch (e: any) {
              Alert.alert('同步失败', e?.message);
              await setCloudMode(true);
            }
          },
        },
        { text: '取消', style: 'cancel', onPress: () => setCloudMode(true) },
      ],
    );
  } catch (e: any) {
    Alert.alert('操作失败', e?.message);
    await setCloudMode(true);
  } finally {
    setIsSwitchingMode(false);
  }
};

const handleLoginSuccess = async () => {
  setShowLogin(false);
  await enableCloudMode();
};

const handleLogout = () => {
  Alert.alert('退出登录', '确定要退出登录吗？如果当前是云端模式，将自动切换到离线模式。', [
    { text: '取消', style: 'cancel' },
    {
      text: '退出',
      style: 'destructive',
      onPress: async () => {
        if (cloudMode === true) {
          switchDataSource(localDataSource);
          await setCloudMode(false);
          await useEntryStore.getState().loadEntries();
        }
        logout();
      },
    },
  ]);
};
```

Add account section JSX before the notifications section:
```tsx
{/* 账户 */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>账户</Text>
  {isAuthenticated ? (
    <>
      <View style={styles.settingItem}>
        <View style={styles.settingIcon}>
          <Ionicons name="person" size={20} color="#6A89CC" />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{user?.email}</Text>
          <Text style={styles.settingSubtitle}>已登录</Text>
        </View>
      </View>
      <SettingItem
        icon="cloud"
        title="云端模式"
        subtitle={cloudMode === 'switching' ? '切换中...' : cloudMode ? '数据存储在云端' : '数据存储在本地'}
        rightComponent={
          <Switch
            value={cloudMode === true}
            onValueChange={handleCloudModeToggle}
            disabled={cloudMode === 'switching' || isSwitchingMode}
            trackColor={{ false: '#D1D1D1', true: '#6A89CC' }}
            thumbColor="#FFFFFF"
          />
        }
      />
      <SettingButton
        icon="log-out"
        title="退出登录"
        subtitle="退出当前账户"
        onPress={handleLogout}
        danger
      />
    </>
  ) : (
    <SettingButton
      icon="person-add"
      title="登录 / 注册"
      subtitle="登录后可使用云端同步功能"
      onPress={() => setShowLogin(true)}
    />
  )}
</View>
```

Add LoginPage at the end (before closing `</DetailPageShell>`):
```tsx
<LoginPage
  visible={showLogin}
  onClose={() => setShowLogin(false)}
  onSuccess={handleLoginSuccess}
/>
```

- [ ] **Step 2: Run all tests to verify nothing is broken**

Run: `cd app && npx jest --run-in-band 2>&1 | tail -20`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add app/src/components/SettingsPage.tsx
git commit -m "feat: add account section and cloud mode toggle to SettingsPage"
```

---

## Task 10: Startup Recovery for cloudMode='switching'

**Files:**
- Modify: `app/app/_layout.tsx`

- [ ] **Step 1: Add cloudMode recovery check to _layout.tsx**

In `app/app/_layout.tsx`:

First, add imports at the top of the file (alongside existing imports):
```typescript
import { useAuthStore } from '@/src/store/authStore';
```

Then inside the `initializeApp` function (after all migrations complete), add:

```typescript
// 恢复登录状态
await useAuthStore.getState().loadAuth();

// 检查 cloudMode 中断恢复
const cloudModeRaw = await Storage.getString('settings:cloudMode');
if (cloudModeRaw === 'switching') {
  logger.warn('⚠️ 检测到上次云端模式切换未完成，重置为离线模式');
  await Storage.setString('settings:cloudMode', 'false');
  Alert.alert('提示', '上次云端模式切换未完成，已恢复为离线模式。您可以在设置中重新切换。');
}
```

- [ ] **Step 2: Run all tests**

Run: `cd app && npx jest --run-in-band 2>&1 | tail -20`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add app/app/_layout.tsx
git commit -m "feat: add cloudMode startup recovery check in _layout.tsx"
```

---

## Task 11: Full Integration Test

- [ ] **Step 1: Run all tests**

Run: `cd app && npx jest --run-in-band --coverage 2>&1 | tail -30`
Expected: All tests PASS, no regressions

- [ ] **Step 2: TypeScript check**

Run: `cd app && npx tsc --noEmit 2>&1 | tail -20`
Expected: Zero errors

- [ ] **Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "test: verify full integration of cloud mode frontend"
```
