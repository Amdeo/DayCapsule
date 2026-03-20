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
