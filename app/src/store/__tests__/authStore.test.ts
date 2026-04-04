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
  setCurrentServerUrl: jest.fn().mockResolvedValue(undefined),
}));

const mockPost = jest.fn();
jest.mock('@/src/services/apiClient', () => ({
  getApiClient: () => ({
    post: mockPost,
    get: jest.fn(),
  }),
}));

const mockTriggerRestart = jest.fn();
jest.mock('@/src/store/appLifecycleStore', () => ({
  useAppLifecycleStore: {
    getState: () => ({ triggerRestart: mockTriggerRestart }),
  },
}));

const mockGetActiveAccountRef = jest.fn().mockResolvedValue(null);
const mockGetAccountTokens = jest.fn().mockResolvedValue({ token: null, refreshToken: null });
const mockSetActiveAccount = jest.fn().mockResolvedValue(undefined);
const mockRemoveAccount = jest.fn().mockResolvedValue(undefined);
const mockActivateAuthenticatedAccount = jest.fn().mockImplementation(
  async ({ user, token, refreshToken, commitAuthState }: any) => {
    commitAuthState({ user, token, refreshToken, isAuthenticated: true });
    return `scope:${user.id}`;
  },
);

jest.mock('@/src/services/accountRegistryService', () => ({
  getUserAuthKeys: jest.fn((serverUrl: string, userId: string) => {
    const scope =
      serverUrl === 'https://server-b.example.com'
        ? `env_https_server_b_example_com_${userId}`
        : `env_https_server_a_example_com_${userId}`;
    return {
      tokenKey: `${scope}:auth:token`,
      refreshTokenKey: `${scope}:auth:refreshToken`,
      userKey: `${scope}:auth:user`,
    };
  }),
  getAccountTokens: (...args: unknown[]) => mockGetAccountTokens(...args),
  setActiveAccount: (...args: unknown[]) => mockSetActiveAccount(...args),
  removeAccount: (...args: unknown[]) => mockRemoveAccount(...args),
  getActiveAccountRef: () => mockGetActiveAccountRef(),
}));

jest.mock('@/src/services/authActivationService', () => ({
  activateAuthenticatedAccount: (...args: unknown[]) => mockActivateAuthenticatedAccount(...args),
}));

import { useAuthStore } from '../authStore';
import { Storage } from '@/src/utils/storage';
import { getCurrentServerUrl } from '@/src/services/backendEnvironmentService';

const SERVER_A = 'https://server-a.example.com';
const SERVER_B = 'https://server-b.example.com';
const SERVER_A_SCOPE = 'env_https_server_a_example_com';
const SERVER_B_SCOPE = 'env_https_server_b_example_com';

const userScopedKey = (serverScope: string, userId: string, key: string) =>
  `${serverScope}_${userId}:${key}`;
const scopedKey = (scope: string, key: string) => `${scope}:${key}`;

const resetStore = () => useAuthStore.setState({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockTriggerRestart.mockClear();
  (getCurrentServerUrl as jest.Mock).mockResolvedValue(SERVER_A);
  mockGetActiveAccountRef.mockResolvedValue(null);
  mockGetAccountTokens.mockResolvedValue({ token: null, refreshToken: null });
  resetStore();
});

describe('authStore', () => {
  it('initial state is unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('login stores user and tokens with user-scoped keys', async () => {
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
    expect(mockActivateAuthenticatedAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        serverUrl: SERVER_A,
        user: { id: 'u1', email: 'test@test.com' },
        token: 'access-123',
        refreshToken: 'refresh-456',
      }),
    );
  });

  it('login delegates account activation to authActivationService', async () => {
    mockPost.mockResolvedValueOnce({
      user: { id: 'u1', email: 'test@test.com', createdAt: '2026-01-01' },
      token: 'access-123',
      refreshToken: 'refresh-456',
    });

    await useAuthStore.getState().login('test@test.com', 'Password1');

    expect(mockActivateAuthenticatedAccount).toHaveBeenCalledTimes(1);
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
    expect(mockActivateAuthenticatedAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        serverUrl: SERVER_A,
        user: { id: 'u2', email: 'new@test.com' },
      }),
    );
  });

  it('keeps previous auth state when activation fails during login', async () => {
    mockPost.mockResolvedValueOnce({
      user: { id: 'u1', email: 'test@test.com', createdAt: '2026-01-01' },
      token: 'access-123',
      refreshToken: 'refresh-456',
    });
    mockActivateAuthenticatedAccount.mockRejectedValueOnce(new Error('prepare failed'));

    await expect(useAuthStore.getState().login('test@test.com', 'Password1')).rejects.toThrow(
      'prepare failed',
    );

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  it('logout clears state, removes account from registry, and deletes accounts:active', async () => {
    mockGetActiveAccountRef.mockResolvedValue({ serverUrl: SERVER_A, userId: 'u1' });
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
    expect(mockRemoveAccount).toHaveBeenCalledWith(SERVER_A, 'u1');
    expect(Storage.delete).toHaveBeenCalledWith('accounts:active');
  });

  it('logout clears userId MMKV key and triggers restart', async () => {
    mockGetActiveAccountRef.mockResolvedValue({ serverUrl: SERVER_A, userId: 'u1' });
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

  it('loadAuth restores from account registry using activeRef', async () => {
    mockGetActiveAccountRef.mockResolvedValue({ serverUrl: SERVER_A, userId: 'u1' });
    mockGetAccountTokens.mockResolvedValue({ token: 'saved-token', refreshToken: 'saved-refresh' });
    (Storage.getObject as jest.Mock).mockImplementation((key: string) => {
      if (key === userScopedKey(SERVER_A_SCOPE, 'u1', 'auth:user')) {
        return Promise.resolve({ id: 'u1', email: 'saved@test.com' });
      }
      return Promise.resolve(null);
    });

    await useAuthStore.getState().loadAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('saved-token');
    expect(state.user?.email).toBe('saved@test.com');
    expect(mockGetAccountTokens).toHaveBeenCalledWith(SERVER_A, 'u1');
  });

  it('loadAuth returns unauthenticated when no activeRef', async () => {
    mockGetActiveAccountRef.mockResolvedValue(null);

    await useAuthStore.getState().loadAuth();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('loadAuth only restores auth for the active account (server-b)', async () => {
    (getCurrentServerUrl as jest.Mock).mockResolvedValue(SERVER_B);
    mockGetActiveAccountRef.mockResolvedValue({ serverUrl: SERVER_B, userId: 'u2' });
    mockGetAccountTokens.mockResolvedValue({ token: 'token-b', refreshToken: 'refresh-b' });
    (Storage.getObject as jest.Mock).mockImplementation((key: string) => {
      if (key === userScopedKey(SERVER_B_SCOPE, 'u2', 'auth:user')) {
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

  it('passes previous auth state into auth activation service during login', async () => {
    mockPost.mockResolvedValueOnce({
      user: { id: 'u1', email: 'test@test.com', createdAt: '2026-01-01' },
      token: 'access-123',
      refreshToken: 'refresh-456',
    });

    await useAuthStore.getState().login('test@test.com', 'Password1');

    expect(mockActivateAuthenticatedAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        previousAuthState: expect.objectContaining({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
      }),
    );
  });

  it('loadAuth writes userId to MMKV workspace key on success', async () => {
    mockGetActiveAccountRef.mockResolvedValue({ serverUrl: SERVER_A, userId: 'u99' });
    mockGetAccountTokens.mockResolvedValue({ token: 'tok', refreshToken: 'rt' });
    (Storage.getObject as jest.Mock).mockImplementation((key: string) => {
      if (key === userScopedKey(SERVER_A_SCOPE, 'u99', 'auth:user')) {
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

  it('switchAccount sets active account and updates state', async () => {
    mockGetAccountTokens.mockResolvedValue({ token: 'tok-b', refreshToken: 'rt-b' });
    (Storage.getObject as jest.Mock).mockImplementation((key: string) => {
      if (key === userScopedKey(SERVER_B_SCOPE, 'u2', 'auth:user')) {
        return Promise.resolve({ id: 'u2', email: 'user-b@test.com' });
      }
      return Promise.resolve(null);
    });

    await useAuthStore.getState().switchAccount(SERVER_B, 'u2');

    expect(mockSetActiveAccount).toHaveBeenCalledWith(SERVER_B, 'u2');
    expect(mockTriggerRestart).toHaveBeenCalledTimes(1);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual({ id: 'u2', email: 'user-b@test.com' });
    expect(state.token).toBe('tok-b');
  });

  it('switchAccount throws if token is missing', async () => {
    mockGetAccountTokens.mockResolvedValue({ token: null, refreshToken: null });

    await expect(useAuthStore.getState().switchAccount(SERVER_B, 'u2')).rejects.toThrow(
      '该账号凭证已失效，请重新登录',
    );
  });

  it('switchAccount throws if user info is missing', async () => {
    mockGetAccountTokens.mockResolvedValue({ token: 'tok', refreshToken: null });
    (Storage.getObject as jest.Mock).mockResolvedValue(null);

    await expect(useAuthStore.getState().switchAccount(SERVER_B, 'u2')).rejects.toThrow(
      '账号信息不存在',
    );
  });
});
