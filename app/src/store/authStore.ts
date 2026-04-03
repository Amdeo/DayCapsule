/**
 * Auth Store — 用户认证状态管理
 * token 持久化到 MMKV（user-scoped），启动时自动恢复
 */

import { create } from 'zustand';
import { Storage, withScope } from '@/src/utils/storage';
import { getApiClient } from '@/src/services/apiClient';
import { logger } from '@/src/utils/logger';
import {
  getCurrentServerUrl,
  getServerKey,
  setCurrentServerUrl,
} from '@/src/services/backendEnvironmentService';
import { useAppLifecycleStore } from '@/src/store/appLifecycleStore';
import {
  getUserAuthKeys,
  getAccountTokens,
  registerAccount,
  setActiveAccount,
  removeAccount,
  getActiveAccountRef,
} from '@/src/services/accountRegistryService';

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
  logout(): Promise<void>;
  refreshAuth(): Promise<boolean>;
  loadAuth(): Promise<void>;
  switchAccount(serverUrl: string, userId: string): Promise<void>;
}

interface AuthResponse {
  user: { id: string; email: string; createdAt: string };
  token: string;
  refreshToken: string;
}

const getAuthKeys = async () => {
  const serverUrl = await getCurrentServerUrl();
  const activeRef = await getActiveAccountRef();
  if (!activeRef?.userId) {
    const scope = getServerKey(serverUrl ?? '');
    return {
      tokenKey: withScope(scope, 'auth:token'),
      refreshTokenKey: withScope(scope, 'auth:refreshToken'),
      userKey: withScope(scope, 'auth:user'),
    };
  }
  return getUserAuthKeys(serverUrl ?? '', activeRef.userId);
};

const persistTokens = async (token: string, refreshToken: string, user: AuthUser) => {
  const serverUrl = await getCurrentServerUrl();
  const { tokenKey, refreshTokenKey, userKey } = getUserAuthKeys(serverUrl, user.id);
  await Promise.all([
    Storage.setString(tokenKey, token),
    Storage.setString(refreshTokenKey, refreshToken),
    Storage.setObject(userKey, user),
  ]);
  await registerAccount({ serverUrl, userId: user.id, email: user.email, addedAt: Date.now() });
  await setActiveAccount(serverUrl, user.id);
};

const clearTokens = async () => {
  const { tokenKey, refreshTokenKey, userKey } = await getAuthKeys();
  await Promise.all([
    Storage.delete(tokenKey),
    Storage.delete(refreshTokenKey),
    Storage.delete(userKey),
  ]);
};

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
    await persistWorkspaceUserId(user.id);
    logger.log('✅ 登录成功:', email);
  },

  register: async (email, password) => {
    const client = getApiClient();
    const data = await client.post<AuthResponse>('/auth/register', { email, password });
    const user: AuthUser = { id: data.user.id, email: data.user.email };

    set({ user, token: data.token, refreshToken: data.refreshToken, isAuthenticated: true });
    await persistTokens(data.token, data.refreshToken, user);
    await persistWorkspaceUserId(user.id);
    logger.log('✅ 注册成功:', email);
  },

  logout: async () => {
    const activeRef = await getActiveAccountRef();
    if (activeRef) {
      await removeAccount(activeRef.serverUrl, activeRef.userId);
    }
    await Storage.delete('accounts:active');
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
    await clearTokens();
    await clearWorkspaceUserId();
    useAppLifecycleStore.getState().triggerRestart();
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
      const { tokenKey, refreshTokenKey } = await getAuthKeys();
      await Storage.setString(tokenKey, data.token);
      await Storage.setString(refreshTokenKey, data.refreshToken);
      return true;
    } catch {
      await get().logout();
      return false;
    }
  },

  loadAuth: async () => {
    const serverUrl = await getCurrentServerUrl();
    const activeRef = await getActiveAccountRef();
    if (!activeRef?.userId) {
      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      return;
    }
    const { token, refreshToken } = await getAccountTokens(serverUrl, activeRef.userId);
    const { userKey } = getUserAuthKeys(serverUrl, activeRef.userId);
    const user = await Storage.getObject<AuthUser>(userKey);

    if (token && user) {
      set({ user, token, refreshToken, isAuthenticated: true });
      await persistWorkspaceUserId(user.id);
      logger.log('✅ 已恢复登录状态:', user.email);
      return;
    }

    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },

  switchAccount: async (serverUrl: string, userId: string) => {
    const { token, refreshToken } = await getAccountTokens(serverUrl, userId);
    if (!token) {
      throw new Error('该账号凭证已失效，请重新登录');
    }
    const { userKey } = getUserAuthKeys(serverUrl, userId);
    const user = await Storage.getObject<AuthUser>(userKey);
    if (!user) {
      throw new Error('账号信息不存在');
    }

    const currentServerUrl = await getCurrentServerUrl();
    if (serverUrl !== currentServerUrl) {
      await setCurrentServerUrl(serverUrl);
    }

    await setActiveAccount(serverUrl, userId);
    await persistWorkspaceUserId(userId);

    set({
      user,
      token,
      refreshToken: refreshToken ?? null,
      isAuthenticated: true,
    });

    useAppLifecycleStore.getState().triggerRestart();
  },
}));
