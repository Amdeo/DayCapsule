const mockInvalidateActiveQueries = jest.fn();
const mockGetActiveAccountRef = jest.fn().mockResolvedValue(null);
const mockRegisterAccount = jest.fn().mockResolvedValue(undefined);
const mockSetActiveAccount = jest.fn().mockResolvedValue(undefined);
const mockClearActiveAccount = jest.fn().mockResolvedValue(undefined);
const mockUnregisterAccount = jest.fn().mockResolvedValue(undefined);
const mockPrepareScopeRuntime = jest.fn().mockResolvedValue({
  prepared: true,
  targetScopeKey: 'scope:server:u1',
  logLabel: 'scope-runtime-ready',
});

const mockStorageGetString = jest.fn().mockResolvedValue(null);
const mockStorageSetString = jest.fn().mockResolvedValue(undefined);
const mockStorageSetObject = jest.fn().mockResolvedValue(undefined);
const mockStorageDelete = jest.fn().mockResolvedValue(undefined);

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: {
    getState: () => ({
      invalidateActiveQueries: mockInvalidateActiveQueries,
    }),
  },
}));

jest.mock('@/src/services/accountRegistryService', () => ({
  getActiveAccountRef: (...args: unknown[]) => mockGetActiveAccountRef(...args),
  getUserAuthKeys: jest.fn((serverUrl: string, userId: string) => ({
    tokenKey: `${serverUrl}:${userId}:token`,
    refreshTokenKey: `${serverUrl}:${userId}:refresh`,
    userKey: `${serverUrl}:${userId}:user`,
  })),
  registerAccount: (...args: unknown[]) => mockRegisterAccount(...args),
  setActiveAccount: (...args: unknown[]) => mockSetActiveAccount(...args),
  clearActiveAccount: (...args: unknown[]) => mockClearActiveAccount(...args),
  unregisterAccount: (...args: unknown[]) => mockUnregisterAccount(...args),
}));

jest.mock('@/src/services/scopeRuntimeService', () => ({
  prepareScopeRuntime: (...args: unknown[]) => mockPrepareScopeRuntime(...args),
}));

jest.mock('@/src/services/backendEnvironmentService', () => ({
  getServerKey: jest.fn((serverUrl: string) => `scope:${serverUrl}`),
}));

jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getString: (...args: unknown[]) => mockStorageGetString(...args),
    setString: (...args: unknown[]) => mockStorageSetString(...args),
    setObject: (...args: unknown[]) => mockStorageSetObject(...args),
    delete: (...args: unknown[]) => mockStorageDelete(...args),
  },
  withScope: jest.fn((scope: string, key: string) => `${scope}:${key}`),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() },
}));

import { activateAuthenticatedAccount } from '../authActivationService';

describe('authActivationService', () => {
  const serverUrl = 'https://server-a.example.com';
  const user = { id: 'u1', email: 'tester@example.com' };
  const previousState = {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrepareScopeRuntime.mockResolvedValue({
      prepared: true,
      targetScopeKey: 'scope:server:u1',
      logLabel: 'scope-runtime-ready',
    });
  });

  it('prepares the target scope, invalidates queries, and commits in order', async () => {
    const commitAuthState = jest.fn();
    const restoreAuthState = jest.fn();

    await activateAuthenticatedAccount({
      serverUrl,
      user,
      token: 'token-1',
      refreshToken: 'refresh-1',
      previousAuthState: previousState,
      commitAuthState,
      restoreAuthState,
    });

    expect(mockPrepareScopeRuntime).toHaveBeenCalledWith({ serverUrl, userId: 'u1' });
    expect(mockInvalidateActiveQueries).toHaveBeenCalledTimes(1);
    expect(commitAuthState).toHaveBeenCalledWith({
      user,
      token: 'token-1',
      refreshToken: 'refresh-1',
      isAuthenticated: true,
    });
    expect(mockRegisterAccount).toHaveBeenCalledWith(
      expect.objectContaining({ serverUrl, userId: 'u1', email: 'tester@example.com' })
    );
    expect(mockSetActiveAccount).toHaveBeenCalledWith(serverUrl, 'u1');
    expect(mockStorageSetString).toHaveBeenCalledWith(
      'scope:https://server-a.example.com:workspace:currentUserId',
      'u1',
    );
    expect(restoreAuthState).not.toHaveBeenCalled();
  });

  it('throws before committing auth state when target scope preparation fails', async () => {
    const commitAuthState = jest.fn();
    const restoreAuthState = jest.fn();
    mockPrepareScopeRuntime.mockResolvedValueOnce({
      prepared: false,
      targetScopeKey: 'scope:server:u1',
      failureReason: '初始化失败',
      logLabel: 'scope-runtime-init-failed',
    });

    await expect(activateAuthenticatedAccount({
      serverUrl,
      user,
      token: 'token-1',
      refreshToken: 'refresh-1',
      previousAuthState: previousState,
      commitAuthState,
      restoreAuthState,
    })).rejects.toThrow('初始化失败');

    expect(commitAuthState).not.toHaveBeenCalled();
    expect(mockInvalidateActiveQueries).not.toHaveBeenCalled();
  });

  it('compensates when second-phase commit fails after token persistence', async () => {
    const commitAuthState = jest.fn();
    const restoreAuthState = jest.fn();
    mockRegisterAccount.mockRejectedValueOnce(new Error('registry failed'));

    await expect(activateAuthenticatedAccount({
      serverUrl,
      user,
      token: 'token-1',
      refreshToken: 'refresh-1',
      previousAuthState: previousState,
      commitAuthState,
      restoreAuthState,
    })).rejects.toThrow('registry failed');

    expect(commitAuthState).toHaveBeenCalledTimes(1);
    expect(restoreAuthState).toHaveBeenCalledWith(previousState);
    expect(mockStorageDelete).toHaveBeenCalledWith(`${serverUrl}:u1:token`);
    expect(mockStorageDelete).toHaveBeenCalledWith(`${serverUrl}:u1:refresh`);
    expect(mockStorageDelete).toHaveBeenCalledWith(`${serverUrl}:u1:user`);
    expect(mockSetActiveAccount).not.toHaveBeenCalled();
    expect(mockStorageSetString).not.toHaveBeenCalledWith(
      'scope:https://server-a.example.com:workspace:currentUserId',
      'u1',
    );
  });
});
