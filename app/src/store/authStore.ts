/**
 * Auth Store — 用户认证状态管理
 * token 持久化到 MMKV（user-scoped），启动时自动恢复
 */

import { create } from 'zustand';
import { Storage, withScope } from '@/src/utils/storage';
import { getApiClient } from '@/src/services/apiClient';
import { logger } from '@/src/utils/logger';
import { getCurrentServerUrl, getServerKey } from '@/src/services/backendEnvironmentService';
import { activateAuthenticatedAccount } from '@/src/services/authActivationService';
import {
  getUserAuthKeys,
  getAccountTokens,
  getActiveAccountRef,
} from '@/src/services/accountRegistryService';
import {
  restoreAccountScopeFromPersistedAuth,
  returnToLocalScopeAfterLogout,
  switchActiveAccountScope,
} from '@/src/services/workspaceSessionTransitionService';

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
    logger.warn('[authStore] getAuthKeys: 无 activeRef，使用 server-scoped fallback');
    const scope = getServerKey(serverUrl ?? '');
    return {
      tokenKey: withScope(scope, 'auth:token'),
      refreshTokenKey: withScope(scope, 'auth:refreshToken'),
      userKey: withScope(scope, 'auth:user'),
    };
  }
  return getUserAuthKeys(serverUrl ?? '', activeRef.userId);
};

const EMPTY_AUTH_STATE = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
} as const;

const clearTokens = async () => {
  const { tokenKey, refreshTokenKey, userKey } = await getAuthKeys();
  await Promise.all([
    Storage.delete(tokenKey),
    Storage.delete(refreshTokenKey),
    Storage.delete(userKey),
  ]);
};

export const useAuthStore = create<AuthState>((set, get) => ({
  ...EMPTY_AUTH_STATE,

  login: async (email, password) => {
    const client = getApiClient();
    const serverUrl = await getCurrentServerUrl();
    const data = await client.post<AuthResponse>('/auth/login', { email, password });
    const user: AuthUser = { id: data.user.id, email: data.user.email };
    const previousState = get();

    await activateAuthenticatedAccount({
      serverUrl,
      user,
      token: data.token,
      refreshToken: data.refreshToken,
      previousAuthState: previousState,
      commitAuthState: (nextState) => set(nextState),
      restoreAuthState: (restoredState) => set(restoredState),
    });
    logger.log('✅ 登录成功:', email);
  },

  register: async (email, password) => {
    const client = getApiClient();
    const serverUrl = await getCurrentServerUrl();
    const data = await client.post<AuthResponse>('/auth/register', { email, password });
    const user: AuthUser = { id: data.user.id, email: data.user.email };
    const previousState = get();

    await activateAuthenticatedAccount({
      serverUrl,
      user,
      token: data.token,
      refreshToken: data.refreshToken,
      previousAuthState: previousState,
      commitAuthState: (nextState) => set(nextState),
      restoreAuthState: (restoredState) => set(restoredState),
    });
    logger.log('✅ 注册成功:', email);
  },

  logout: async () => {
    set(EMPTY_AUTH_STATE);
    await returnToLocalScopeAfterLogout();
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
    const activeRef = await getActiveAccountRef();
    if (!activeRef?.userId) {
      set(EMPTY_AUTH_STATE);
      await returnToLocalScopeAfterLogout();
      return;
    }
    const { token, refreshToken } = await getAccountTokens(activeRef.serverUrl, activeRef.userId);
    const { userKey } = getUserAuthKeys(activeRef.serverUrl, activeRef.userId);
    const user = await Storage.getObject<AuthUser>(userKey);

    if (token && user) {
      set({ user, token, refreshToken, isAuthenticated: true });
      await restoreAccountScopeFromPersistedAuth({
        serverUrl: activeRef.serverUrl,
        userId: user.id,
        onFailureResetAuthState: () => set(EMPTY_AUTH_STATE),
      });
      logger.log('✅ 已恢复登录状态:', user.email);
      return;
    }

    set(EMPTY_AUTH_STATE);
    await returnToLocalScopeAfterLogout();
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

    const previousState = get();
    set({
      user,
      token,
      refreshToken: refreshToken ?? null,
      isAuthenticated: true,
    });

    await switchActiveAccountScope({
      serverUrl,
      userId,
      onFailureRestoreAuthState: () => set(previousState),
    });
  },
}));
