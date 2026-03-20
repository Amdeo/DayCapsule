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

const mockPost = jest.fn();
jest.mock('@/src/services/apiClient', () => ({
  getApiClient: () => ({
    post: mockPost,
    get: jest.fn(),
  }),
}));

import { useAuthStore } from '../authStore';
import { Storage } from '@/src/utils/storage';

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
    expect(Storage.setString).toHaveBeenCalledWith('auth:token', 'access-123');
    expect(Storage.setString).toHaveBeenCalledWith('auth:refreshToken', 'refresh-456');
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
