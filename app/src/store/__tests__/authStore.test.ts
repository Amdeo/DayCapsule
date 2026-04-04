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

const mockGetCurrentServerUrl = jest.fn().mockResolvedValue('https://server-a.example.com');
const mockGetCurrentServerUrlSync = jest.fn(() => 'https://server-a.example.com');
const mockIsServerUrlNotConfiguredError = jest.fn((error: unknown) =>
  error instanceof Error && error.message === 'No server URL configured'
);

jest.mock('@/src/services/backendEnvironmentService', () => ({
  getCurrentServerUrl: (...args: unknown[]) => mockGetCurrentServerUrl(...args),
  getCurrentServerUrlSync: (...args: unknown[]) => mockGetCurrentServerUrlSync(...args),
  isServerUrlNotConfiguredError: (...args: unknown[]) => mockIsServerUrlNotConfiguredError(...args),
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

const mockGetActiveAccountRef = jest.fn().mockResolvedValue(null);
const mockGetAccountTokens = jest.fn().mockResolvedValue({ token: null, refreshToken: null });

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
  getActiveAccountRef: () => mockGetActiveAccountRef(),
}));

const mockRollbackActivation = jest.fn(async () => undefined);
const mockActivateAuthenticatedAccount = jest.fn().mockImplementation(
  async ({ user, token, refreshToken, commitAuthState }: any) => {
    commitAuthState({ user, token, refreshToken, isAuthenticated: true });
    return { rollback: mockRollbackActivation };
  },
);

jest.mock('@/src/services/authActivationService', () => ({
  activateAuthenticatedAccount: (...args: unknown[]) => mockActivateAuthenticatedAccount(...args),
}));

const mockRestoreAccountScopeFromPersistedAuth = jest.fn(async () => undefined);
const mockReturnToLocalScopeAfterLogout = jest.fn(async () => undefined);
const mockSwitchActiveAccountScope = jest.fn(async () => undefined);

jest.mock('@/src/services/workspaceSessionTransitionService', () => ({
  restoreAccountScopeFromPersistedAuth: (...args: unknown[]) => mockRestoreAccountScopeFromPersistedAuth(...args),
  returnToLocalScopeAfterLogout: (...args: unknown[]) => mockReturnToLocalScopeAfterLogout(...args),
  switchActiveAccountScope: (...args: unknown[]) => mockSwitchActiveAccountScope(...args),
}));

import { useAuthStore } from '../authStore';
import { Storage } from '@/src/utils/storage';
import { SERVER_URL_REQUIRED_MESSAGE } from '@/src/services/backendEnvironmentService';

const SERVER_A = 'https://server-a.example.com';
const SERVER_B = 'https://server-b.example.com';
const SERVER_A_SCOPE = 'env_https_server_a_example_com';
const SERVER_B_SCOPE = 'env_https_server_b_example_com';

const userScopedKey = (serverScope: string, userId: string, key: string) =>
  `${serverScope}_${userId}:${key}`;

const resetStore = () => useAuthStore.setState({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentServerUrl.mockResolvedValue(SERVER_A);
  mockGetCurrentServerUrlSync.mockReturnValue(SERVER_A);
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

  it('login delegates activation and leaves scope transition to activation service', async () => {
    mockPost.mockResolvedValueOnce({
      user: { id: 'u1', email: 'test@test.com', createdAt: '2026-01-01' },
      token: 'access-123',
      refreshToken: 'refresh-456',
    });

    await useAuthStore.getState().login('test@test.com', 'Password1');

    const state = useAuthStore.getState();
    expect(state).toMatchObject({
      isAuthenticated: true,
      user: { id: 'u1', email: 'test@test.com' },
      token: 'access-123',
      refreshToken: 'refresh-456',
    });
    expect(mockActivateAuthenticatedAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        serverUrl: SERVER_A,
        user: { id: 'u1', email: 'test@test.com' },
      }),
    );
    expect(mockRestoreAccountScopeFromPersistedAuth).not.toHaveBeenCalled();
  });

  it('register stores user through activation service', async () => {
    mockPost.mockResolvedValueOnce({
      user: { id: 'u2', email: 'new@test.com', createdAt: '2026-01-01' },
      token: 'access-789',
      refreshToken: 'refresh-012',
    });

    await useAuthStore.getState().register('new@test.com', 'Password1');

    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: true,
      user: { id: 'u2', email: 'new@test.com' },
      token: 'access-789',
      refreshToken: 'refresh-012',
    });
    expect(mockActivateAuthenticatedAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        serverUrl: SERVER_A,
        user: { id: 'u2', email: 'new@test.com' },
      }),
    );
  });

  it('propagates activation failure during login', async () => {
    mockPost.mockResolvedValueOnce({
      user: { id: 'u1', email: 'test@test.com', createdAt: '2026-01-01' },
      token: 'access-123',
      refreshToken: 'refresh-456',
    });
    mockActivateAuthenticatedAccount.mockRejectedValueOnce(new Error('enter failed'));

    await expect(useAuthStore.getState().login('test@test.com', 'Password1')).rejects.toThrow('enter failed');

    expect(mockRollbackActivation).not.toHaveBeenCalled();
  });

  it('login throws a friendly error when server url is not configured', async () => {
    mockGetCurrentServerUrl.mockRejectedValueOnce(new Error('No server URL configured'));

    await expect(useAuthStore.getState().login('test@test.com', 'Password1')).rejects.toThrow(
      SERVER_URL_REQUIRED_MESSAGE,
    );

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('register throws a friendly error when server url is not configured', async () => {
    mockGetCurrentServerUrl.mockRejectedValueOnce(new Error('No server URL configured'));

    await expect(useAuthStore.getState().register('new@test.com', 'Password1')).rejects.toThrow(
      SERVER_URL_REQUIRED_MESSAGE,
    );

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('logout clears in-memory auth state and returns to local scope without deleting account cache', async () => {
    mockGetActiveAccountRef.mockResolvedValue({ serverUrl: SERVER_A, userId: 'u1' });
    useAuthStore.setState({
      user: { id: 'u1', email: 'test@test.com' },
      token: 'tok',
      refreshToken: 'rt',
      isAuthenticated: true,
    });

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    expect(mockReturnToLocalScopeAfterLogout).toHaveBeenCalledTimes(1);
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

    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: true,
      token: 'saved-token',
      refreshToken: 'saved-refresh',
      user: { id: 'u1', email: 'saved@test.com' },
    });
    expect(mockRestoreAccountScopeFromPersistedAuth).toHaveBeenCalledWith({
      serverUrl: SERVER_A,
      userId: 'u1',
      onFailureResetAuthState: expect.any(Function),
    });
  });

  it('loadAuth returns unauthenticated when no activeRef', async () => {
    mockGetActiveAccountRef.mockResolvedValue(null);

    await useAuthStore.getState().loadAuth();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('switchAccount updates auth state and delegates scope transition', async () => {
    mockGetAccountTokens.mockResolvedValue({ token: 'tok-b', refreshToken: 'rt-b' });
    (Storage.getObject as jest.Mock).mockImplementation((key: string) => {
      if (key === userScopedKey(SERVER_B_SCOPE, 'u2', 'auth:user')) {
        return Promise.resolve({ id: 'u2', email: 'user-b@test.com' });
      }
      return Promise.resolve(null);
    });

    await useAuthStore.getState().switchAccount(SERVER_B, 'u2');

    expect(mockSwitchActiveAccountScope).toHaveBeenCalledWith({
      serverUrl: SERVER_B,
      userId: 'u2',
      onFailureRestoreAuthState: expect.any(Function),
    });
    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: true,
      token: 'tok-b',
      refreshToken: 'rt-b',
      user: { id: 'u2', email: 'user-b@test.com' },
    });
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
