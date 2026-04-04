const mockGetCurrentServerUrl = jest.fn(async () => 'https://server-a.example.com');
const mockSetCurrentServerUrl = jest.fn(async () => undefined);
const mockStorageGetString = jest.fn(async () => null);
const mockStorageSetString = jest.fn(async () => undefined);
const mockStorageDelete = jest.fn(async () => undefined);
const mockGetActiveAccountRef = jest.fn(async () => null);
const mockSetActiveAccount = jest.fn(async () => undefined);
const mockClearActiveAccount = jest.fn(async () => undefined);
const mockPrepareScopeRuntime = jest.fn(async () => ({
  prepared: true,
  targetScopeKey: 'env_https_server_b_example_com_u2',
  logLabel: 'scope-runtime-ready',
}));
const mockSyncReset = jest.fn(async () => undefined);
const mockSyncLoad = jest.fn(async () => undefined);
const mockLoadSettings = jest.fn(async () => undefined);
const mockLoadEntries = jest.fn(async () => undefined);
const mockRefreshIndicator = jest.fn(async () => undefined);
const mockSetSessionTransitioning = jest.fn();

jest.mock('@/src/services/backendEnvironmentService', () => ({
  getCurrentServerUrl: (...args: unknown[]) => mockGetCurrentServerUrl(...args),
  setCurrentServerUrl: (...args: unknown[]) => mockSetCurrentServerUrl(...args),
  getServerKey: jest.fn((url: string) =>
    url === 'https://server-b.example.com'
      ? 'env_https_server_b_example_com'
      : 'env_https_server_a_example_com'
  ),
}));

jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getString: (...args: unknown[]) => mockStorageGetString(...args),
    setString: (...args: unknown[]) => mockStorageSetString(...args),
    delete: (...args: unknown[]) => mockStorageDelete(...args),
  },
  withScope: jest.fn((scope: string, key: string) => `${scope}:${key}`),
}));

jest.mock('@/src/services/accountRegistryService', () => ({
  getActiveAccountRef: (...args: unknown[]) => mockGetActiveAccountRef(...args),
  setActiveAccount: (...args: unknown[]) => mockSetActiveAccount(...args),
  clearActiveAccount: (...args: unknown[]) => mockClearActiveAccount(...args),
}));

jest.mock('@/src/services/scopeRuntimeService', () => ({
  prepareScopeRuntime: (...args: unknown[]) => mockPrepareScopeRuntime(...args),
}));

jest.mock('@/src/store/syncStore', () => ({
  useSyncStore: {
    getState: () => ({
      reset: mockSyncReset,
      load: mockSyncLoad,
    }),
  },
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      loadSettings: mockLoadSettings,
    }),
  },
}));

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: {
    getState: () => ({
      loadEntries: mockLoadEntries,
    }),
  },
}));

jest.mock('@/src/store/cloudSyncIndicatorStore', () => ({
  useCloudSyncIndicatorStore: {
    getState: () => ({
      refresh: mockRefreshIndicator,
    }),
  },
}));

jest.mock('@/src/services/workspaceSessionState', () => ({
  setSessionTransitioning: (...args: unknown[]) => mockSetSessionTransitioning(...args),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() },
}));

import {
  transitionToAccountScope,
  transitionToLocalScope,
} from '../workspaceSessionTransitionService';

describe('workspaceSessionTransitionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentServerUrl.mockResolvedValue('https://server-a.example.com');
    mockGetActiveAccountRef.mockResolvedValue({ serverUrl: 'https://server-a.example.com', userId: 'u1' });
    mockStorageGetString.mockResolvedValue(null);
    mockPrepareScopeRuntime.mockResolvedValue({
      prepared: true,
      targetScopeKey: 'env_https_server_b_example_com_u2',
      logLabel: 'scope-runtime-ready',
    });
  });

  it('prepares account scope and refreshes scoped runtime in order', async () => {
    await transitionToAccountScope({
      serverUrl: 'https://server-b.example.com',
      userId: 'u2',
    });

    expect(mockPrepareScopeRuntime).toHaveBeenCalledWith({
      serverUrl: 'https://server-b.example.com',
      userId: 'u2',
    });
    expect(mockSetSessionTransitioning).toHaveBeenNthCalledWith(1, true);
    expect(mockSetCurrentServerUrl).toHaveBeenCalledWith('https://server-b.example.com');
    expect(mockSetActiveAccount).toHaveBeenCalledWith('https://server-b.example.com', 'u2');
    expect(mockStorageSetString).toHaveBeenCalledWith(
      'env_https_server_b_example_com:workspace:currentUserId',
      'u2',
    );
    expect(mockSyncReset.mock.invocationCallOrder[0]).toBeLessThan(mockSyncLoad.mock.invocationCallOrder[0]);
    expect(mockSyncLoad.mock.invocationCallOrder[0]).toBeLessThan(mockLoadSettings.mock.invocationCallOrder[0]);
    expect(mockLoadSettings.mock.invocationCallOrder[0]).toBeLessThan(mockLoadEntries.mock.invocationCallOrder[0]);
    expect(mockLoadEntries.mock.invocationCallOrder[0]).toBeLessThan(mockRefreshIndicator.mock.invocationCallOrder[0]);
    expect(mockSetSessionTransitioning).toHaveBeenLastCalledWith(false);
  });

  it('restores previous account scope when scoped refresh fails', async () => {
    mockLoadEntries.mockRejectedValueOnce(new Error('load entries failed'));

    await expect(
      transitionToAccountScope({
        serverUrl: 'https://server-b.example.com',
        userId: 'u2',
      })
    ).rejects.toThrow('load entries failed');

    expect(mockSetCurrentServerUrl).toHaveBeenCalledWith('https://server-b.example.com');
    expect(mockSetCurrentServerUrl).toHaveBeenCalledWith('https://server-a.example.com');
    expect(mockSetActiveAccount).toHaveBeenCalledWith('https://server-a.example.com', 'u1');
    expect(mockSetSessionTransitioning).toHaveBeenLastCalledWith(false);
  });

  it('clears active account and workspace user id when returning to local scope', async () => {
    await transitionToLocalScope();

    expect(mockClearActiveAccount).toHaveBeenCalledTimes(1);
    expect(mockStorageDelete).toHaveBeenCalledWith(
      'env_https_server_a_example_com:workspace:currentUserId',
    );
    expect(mockSyncReset).toHaveBeenCalledTimes(1);
    expect(mockRefreshIndicator).toHaveBeenCalledTimes(1);
    expect(mockSetSessionTransitioning).toHaveBeenLastCalledWith(false);
  });
});
