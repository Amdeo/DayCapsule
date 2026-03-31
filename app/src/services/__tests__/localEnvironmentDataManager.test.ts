jest.mock('@/src/services/backendEnvironmentService', () => ({
  getCurrentServerUrl: jest.fn().mockResolvedValue('https://server-a.example.com'),
  normalizeServerUrl: jest.fn((url: string) => url.trim().replace(/\/+$/, '')),
  rememberServerUrl: jest.fn().mockResolvedValue(undefined),
  clearCurrentServerUrl: jest.fn().mockResolvedValue(undefined),
  setCurrentServerUrl: jest.fn().mockResolvedValue(undefined),
}));

const mockResetApiClient = jest.fn();
jest.mock('@/src/services/apiClient', () => ({
  resetApiClient: () => mockResetApiClient(),
}));

const mockResetDatabase = jest.fn();
const mockInitDatabase = jest.fn().mockResolvedValue(true);
jest.mock('@/src/database/sqlite', () => ({
  resetDatabase: () => mockResetDatabase(),
  initDatabase: () => mockInitDatabase(),
}));

const mockMigrateToMediaJson = jest.fn().mockResolvedValue(undefined);
const mockMigrateLocalReadyStateColumn = jest.fn().mockResolvedValue(undefined);
const mockMigrateSyncStatusColumn = jest.fn().mockResolvedValue(undefined);
const mockMigrateCloudSyncCoreColumns = jest.fn().mockResolvedValue(undefined);
jest.mock('@/src/database/migration', () => ({
  migrateToMediaJson: () => mockMigrateToMediaJson(),
  migrateLocalReadyStateColumn: () => mockMigrateLocalReadyStateColumn(),
  migrateSyncStatusColumn: () => mockMigrateSyncStatusColumn(),
  migrateCloudSyncCoreColumns: () => mockMigrateCloudSyncCoreColumns(),
}));

const mockEnsureDirectories = jest.fn().mockResolvedValue(undefined);
jest.mock('@/src/utils/fileSystem', () => ({
  ensureDirectories: () => mockEnsureDirectories(),
}));

const mockAuthLogout = jest.fn().mockResolvedValue(undefined);
const mockAuthLoadAuth = jest.fn().mockResolvedValue(undefined);
jest.mock('@/src/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      isAuthenticated: true,
      logout: mockAuthLogout,
      loadAuth: mockAuthLoadAuth,
    }),
  },
}));

const mockSettingsLoad = jest.fn().mockResolvedValue(undefined);
jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      loadSettings: mockSettingsLoad,
    }),
  },
}));

const mockSyncLoad = jest.fn().mockResolvedValue(undefined);
jest.mock('@/src/store/syncStore', () => ({
  useSyncStore: {
    getState: () => ({
      load: mockSyncLoad,
    }),
  },
}));

const mockEntryLoad = jest.fn().mockResolvedValue(undefined);
jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: {
    getState: () => ({
      loadEntries: mockEntryLoad,
    }),
  },
}));

import {
  clearCurrentServerUrl,
  getCurrentServerUrl,
  rememberServerUrl,
  setCurrentServerUrl,
} from '@/src/services/backendEnvironmentService';
import { switchBackendEnvironment } from '../localEnvironmentDataManager';

describe('localEnvironmentDataManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentServerUrl as jest.Mock).mockResolvedValue('https://server-a.example.com');
  });

  it('switches runtime dependencies and reloads environment state', async () => {
    await switchBackendEnvironment('https://server-b.example.com/');

    expect(setCurrentServerUrl).toHaveBeenCalledWith('https://server-b.example.com');
    expect(rememberServerUrl).toHaveBeenCalledWith('https://server-b.example.com');
    expect(mockResetApiClient).toHaveBeenCalledTimes(1);
    expect(mockResetDatabase).toHaveBeenCalledTimes(1);
    expect(mockInitDatabase).toHaveBeenCalledTimes(1);
    expect(mockMigrateToMediaJson).toHaveBeenCalledTimes(1);
    expect(mockMigrateLocalReadyStateColumn).toHaveBeenCalledTimes(1);
    expect(mockMigrateSyncStatusColumn).toHaveBeenCalledTimes(1);
    expect(mockMigrateCloudSyncCoreColumns).toHaveBeenCalledTimes(1);
    expect(mockEnsureDirectories).toHaveBeenCalledTimes(1);
    expect(mockMigrateToMediaJson.mock.invocationCallOrder[0]).toBeLessThan(
      mockMigrateLocalReadyStateColumn.mock.invocationCallOrder[0]
    );
    expect(mockMigrateLocalReadyStateColumn.mock.invocationCallOrder[0]).toBeLessThan(
      mockMigrateSyncStatusColumn.mock.invocationCallOrder[0]
    );
    expect(mockMigrateSyncStatusColumn.mock.invocationCallOrder[0]).toBeLessThan(
      mockMigrateCloudSyncCoreColumns.mock.invocationCallOrder[0]
    );
    expect(mockMigrateCloudSyncCoreColumns.mock.invocationCallOrder[0]).toBeLessThan(
      mockEnsureDirectories.mock.invocationCallOrder[0]
    );
    expect(mockAuthLoadAuth).toHaveBeenCalledTimes(1);
    expect(mockSettingsLoad).toHaveBeenCalledTimes(1);
    expect(mockSyncLoad).toHaveBeenCalledTimes(1);
    expect(mockEntryLoad).toHaveBeenCalledTimes(1);
  });

  it('only refreshes recent history when saving the current server again', async () => {
    await switchBackendEnvironment('https://server-a.example.com');

    expect(setCurrentServerUrl).not.toHaveBeenCalled();
    expect(mockResetApiClient).not.toHaveBeenCalled();
    expect(rememberServerUrl).toHaveBeenCalledWith('https://server-a.example.com');
  });

  it('allows first-time server save when no current server is configured yet', async () => {
    (getCurrentServerUrl as jest.Mock).mockRejectedValueOnce(new Error('No server URL configured'));

    await expect(switchBackendEnvironment('https://server-b.example.com/')).resolves.toEqual({
      switched: true,
      currentServerUrl: 'https://server-b.example.com',
    });

    expect(setCurrentServerUrl).toHaveBeenCalledWith('https://server-b.example.com');
    expect(clearCurrentServerUrl).not.toHaveBeenCalled();
    expect(rememberServerUrl).toHaveBeenCalledWith('https://server-b.example.com');
  });

  it('rolls back to unconfigured state when first-time save fails during initialization', async () => {
    (getCurrentServerUrl as jest.Mock).mockRejectedValueOnce(new Error('No server URL configured'));
    mockInitDatabase.mockResolvedValueOnce(false);

    await expect(switchBackendEnvironment('https://server-b.example.com/')).rejects.toThrow(
      '初始化数据库失败'
    );

    expect(setCurrentServerUrl).toHaveBeenCalledWith('https://server-b.example.com');
    expect(clearCurrentServerUrl).toHaveBeenCalledTimes(1);
  });
});
