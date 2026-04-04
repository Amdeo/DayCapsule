const mockRegisterAccount = jest.fn().mockResolvedValue(undefined);
const mockUnregisterAccount = jest.fn().mockResolvedValue(undefined);
const mockStorageSetString = jest.fn().mockResolvedValue(undefined);
const mockStorageSetObject = jest.fn().mockResolvedValue(undefined);
const mockStorageDelete = jest.fn().mockResolvedValue(undefined);

jest.mock('@/src/services/accountRegistryService', () => ({
  getUserAuthKeys: jest.fn((serverUrl: string, userId: string) => ({
    tokenKey: `${serverUrl}:${userId}:token`,
    refreshTokenKey: `${serverUrl}:${userId}:refresh`,
    userKey: `${serverUrl}:${userId}:user`,
  })),
  registerAccount: (...args: unknown[]) => mockRegisterAccount(...args),
  unregisterAccount: (...args: unknown[]) => mockUnregisterAccount(...args),
}));

jest.mock('@/src/utils/storage', () => ({
  Storage: {
    setString: (...args: unknown[]) => mockStorageSetString(...args),
    setObject: (...args: unknown[]) => mockStorageSetObject(...args),
    delete: (...args: unknown[]) => mockStorageDelete(...args),
  },
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
  });

  it('persists auth state and registry data in order', async () => {
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

    expect(commitAuthState).toHaveBeenCalledWith({
      user,
      token: 'token-1',
      refreshToken: 'refresh-1',
      isAuthenticated: true,
    });
    expect(mockRegisterAccount).toHaveBeenCalledWith(
      expect.objectContaining({ serverUrl, userId: 'u1', email: 'tester@example.com' })
    );
    expect(restoreAuthState).not.toHaveBeenCalled();
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
  });
});
