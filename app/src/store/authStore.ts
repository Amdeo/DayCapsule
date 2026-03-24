/**
 * Auth Store — 用户认证状态管理
 * token 持久化到 MMKV，启动时自动恢复
 */

import { create } from 'zustand';
import { Storage, withScope } from '@/src/utils/storage';
import { getApiClient } from '@/src/services/apiClient';
import { logger } from '@/src/utils/logger';
import { getCurrentServerUrl, getServerKey } from '@/src/services/backendEnvironmentService';

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
}

interface AuthResponse {
  user: { id: string; email: string; createdAt: string };
  token: string;
  refreshToken: string;
}

const getScopedAuthKey = async (key: string): Promise<string> => {
  const serverUrl = await getCurrentServerUrl();
  return withScope(getServerKey(serverUrl), key);
};

const persistTokens = async (token: string, refreshToken: string, user: AuthUser) => {
  const [tokenKey, refreshTokenKey, userKey] = await Promise.all([
    getScopedAuthKey('auth:token'),
    getScopedAuthKey('auth:refreshToken'),
    getScopedAuthKey('auth:user'),
  ]);
  await Promise.all([
    Storage.setString(tokenKey, token),
    Storage.setString(refreshTokenKey, refreshToken),
    Storage.setObject(userKey, user),
  ]);
};

const clearTokens = async () => {
  const [tokenKey, refreshTokenKey, userKey] = await Promise.all([
    getScopedAuthKey('auth:token'),
    getScopedAuthKey('auth:refreshToken'),
    getScopedAuthKey('auth:user'),
  ]);
  await Promise.all([
    Storage.delete(tokenKey),
    Storage.delete(refreshTokenKey),
    Storage.delete(userKey),
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

  logout: async () => {
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
    await clearTokens();
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
      const [tokenKey, refreshTokenKey] = await Promise.all([
        getScopedAuthKey('auth:token'),
        getScopedAuthKey('auth:refreshToken'),
      ]);
      await Storage.setString(tokenKey, data.token);
      await Storage.setString(refreshTokenKey, data.refreshToken);
      return true;
    } catch {
      await get().logout();
      return false;
    }
  },

  loadAuth: async () => {
    const [tokenKey, refreshTokenKey, userKey] = await Promise.all([
      getScopedAuthKey('auth:token'),
      getScopedAuthKey('auth:refreshToken'),
      getScopedAuthKey('auth:user'),
    ]);
    const [token, refreshToken, user] = await Promise.all([
      Storage.getString(tokenKey),
      Storage.getString(refreshTokenKey),
      Storage.getObject<AuthUser>(userKey),
    ]);

    if (token && user) {
      set({ user, token, refreshToken, isAuthenticated: true });
      logger.log('✅ 已恢复登录状态:', user.email);
      return;
    }

    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },
}));
