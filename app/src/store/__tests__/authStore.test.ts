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
  withScope: jest.fn((scope: string, key: string) => `${scope}:${key}`),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/src/services/backendEnvironmentService', () => ({
  getCurrentServerUrl: jest.fn().mockResolvedValue('https://server-a.example.com'),
  getServerKey: jest.fn((url: string) =>
    url === 'https://server-b.example.com'
      ? 'env_https_server_b_example_com'
      : 'env_https_server_a_example_com'
  ),
}));

const mockPost = jest.fn();
jest.mock('@/src/services/apiClient', () => ({
  getApiClient: () => ({
    post: mockPost,
    get: jest.fn(),
  }),
}));

import { useAuthStore } from '../authStore';
import { Storage } from '@/src/utils/storage';
import { getCurrentServerUrl } from '@/src/services/backendEnvironmentService';

const SERVER_A_SCOPE = 'env_https_server_a_example_com';
const SERVER_B_SCOPE = 'env_https_server_b_example_com';
const scopedKey = (scope: string, key: string) => `${scope}:${key}`;

const resetStore = () => useAuthStore.setState({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
});

beforeEach(() => {
  jest.clearAllMocks();
  (getCurrentServerUrl as jest.Mock).mockResolvedValue('https://server-a.example.com');
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
    mockPost.mockResolvedValueOnce({
      user: { id: 'u1', email: 'test@test.com', createdAt: '2026-01-01' },
      token: 'access-123',
      refreshToken: 'refresh-456',
    });

    await useAuthStore.getState().login('test@test.com', 'Password1');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual({ id: 'u1', email: 'test@test.com' });
    expect(state.token).toBe('access-123');
    expect(Storage.setString).toHaveBeenCalledWith(scopedKey(SERVER_A_SCOPE, 'auth:token'), 'access-123');
    expect(Storage.setString).toHaveBeenCalledWith(scopedKey(SERVER_A_SCOPE, 'auth:refreshToken'), 'refresh-456');
  });

  it('register stores user and tokens', async () => {
    mockPost.mockResolvedValueOnce({
      user: { id: 'u2', email: 'new@test.com', createdAt: '2026-01-01' },
      token: 'access-789',
      refreshToken: 'refresh-012',
    });

    await useAuthStore.getState().register('new@test.com', 'Password1');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe('new@test.com');
  });

  it('logout clears state and MMKV', async () => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'test@test.com' },
      token: 'tok',
      refreshToken: 'rt',
      isAuthenticated: true,
    });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(Storage.delete).toHaveBeenCalledWith(scopedKey(SERVER_A_SCOPE, 'auth:token'));
    expect(Storage.delete).toHaveBeenCalledWith(scopedKey(SERVER_A_SCOPE, 'auth:refreshToken'));
    expect(Storage.delete).toHaveBeenCalledWith(scopedKey(SERVER_A_SCOPE, 'auth:user'));
  });

  it('loadAuth restores from MMKV', async () => {
    (Storage.getString as jest.Mock).mockImplementation((key: string) => {
      if (key === scopedKey(SERVER_A_SCOPE, 'auth:token')) return Promise.resolve('saved-token');
      if (key === scopedKey(SERVER_A_SCOPE, 'auth:refreshToken')) return Promise.resolve('saved-refresh');
      return Promise.resolve(null);
    });
    (Storage.getObject as jest.Mock).mockImplementation((key: string) => {
      if (key === scopedKey(SERVER_A_SCOPE, 'auth:user')) {
        return Promise.resolve({ id: 'u1', email: 'saved@test.com' });
      }
      return Promise.resolve(null);
    });

    await useAuthStore.getState().loadAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('saved-token');
    expect(state.user?.email).toBe('saved@test.com');
  });

  it('loadAuth only restores auth for the current backend environment', async () => {
    (getCurrentServerUrl as jest.Mock).mockResolvedValue('https://server-b.example.com');
    (Storage.getString as jest.Mock).mockImplementation((key: string) => {
      if (key === scopedKey(SERVER_A_SCOPE, 'auth:token')) return Promise.resolve('token-a');
      if (key === scopedKey(SERVER_A_SCOPE, 'auth:refreshToken')) return Promise.resolve('refresh-a');
      if (key === scopedKey(SERVER_B_SCOPE, 'auth:token')) return Promise.resolve('token-b');
      if (key === scopedKey(SERVER_B_SCOPE, 'auth:refreshToken')) return Promise.resolve('refresh-b');
      return Promise.resolve(null);
    });
    (Storage.getObject as jest.Mock).mockImplementation((key: string) => {
      if (key === scopedKey(SERVER_A_SCOPE, 'auth:user')) {
        return Promise.resolve({ id: 'u1', email: 'saved-a@test.com' });
      }
      if (key === scopedKey(SERVER_B_SCOPE, 'auth:user')) {
        return Promise.resolve({ id: 'u2', email: 'saved-b@test.com' });
      }
      return Promise.resolve(null);
    });

    await useAuthStore.getState().loadAuth();

    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: true,
      token: 'token-b',
      refreshToken: 'refresh-b',
      user: { id: 'u2', email: 'saved-b@test.com' },
    });
  });
});
