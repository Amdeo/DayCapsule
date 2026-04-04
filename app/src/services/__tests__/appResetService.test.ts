jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getAllKeys: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/src/utils/fileSystem', () => ({
  MEDIA_DIRS: {
    documents: 'file:///documents/',
    cache: 'file:///cache/',
    temp: 'file:///cache/',
  },
  deleteDirectory: jest.fn().mockResolvedValue(undefined),
  ensureDirectories: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/services/workspaceService', () => ({
  getCurrentDataScopeKeySync: jest.fn(),
}));

jest.mock('@/src/services/workspaceCleanupService', () => ({
  cleanupOrphanWorkspaces: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/services/apiClient', () => ({
  resetApiClient: jest.fn(),
}));

const mockRestoreCurrentServerUrlFromRecent = jest.fn(async () => 'https://recent.example.com');
jest.mock('@/src/services/backendEnvironmentService', () => ({
  restoreCurrentServerUrlFromRecent: (...args: unknown[]) => mockRestoreCurrentServerUrlFromRecent(...args),
}));

jest.mock('@/src/database/sqlite', () => ({
  initDatabase: jest.fn().mockResolvedValue(true),
  resetDatabase: jest.fn(),
  clearDatabaseForScope: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: {
    getState: () => ({
      invalidateActiveQueries: mockInvalidateActiveQueries,
    }),
  },
}));

jest.mock('@/src/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      loadAuth: mockLoadAuth,
    }),
  },
}));

jest.mock('@/src/store/commonTagsStore', () => ({
  useCommonTagsStore: {
    getState: () => ({
      loadCommonTags: mockLoadCommonTags,
    }),
  },
}));

const mockInvalidateActiveQueries = jest.fn();
const mockLoadAuth = jest.fn(async () => undefined);
const mockLoadCommonTags = jest.fn(async () => undefined);

import { Storage } from '@/src/utils/storage';
import { deleteDirectory, ensureDirectories } from '@/src/utils/fileSystem';
import { getCurrentDataScopeKeySync } from '@/src/services/workspaceService';
import { cleanupOrphanWorkspaces } from '@/src/services/workspaceCleanupService';
import { resetApiClient } from '@/src/services/apiClient';
import { initDatabase, resetDatabase, clearDatabaseForScope } from '@/src/database/sqlite';
import { resetAppToInitialState } from '../appResetService';

describe('appResetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentDataScopeKeySync as jest.Mock).mockReturnValue('env_https_server_a_example_com_user_1');
    (Storage.getAllKeys as jest.Mock).mockResolvedValue([
      'backend:recentServerUrls',
      'backend:currentServerUrl',
      'accounts:active',
      'accounts:registry',
      'env_https_server_a_example_com_user_1:auth:token',
      'local:settings:notifications',
      'common_tags',
    ]);
    (initDatabase as jest.Mock).mockResolvedValue(true);
    mockLoadAuth.mockResolvedValue(undefined);
    mockLoadCommonTags.mockResolvedValue(undefined);
    mockRestoreCurrentServerUrlFromRecent.mockResolvedValue('https://recent.example.com');
  });

  it('clears all persisted state except recent server urls and reloads runtime state', async () => {
    await resetAppToInitialState();

    expect(resetApiClient).toHaveBeenCalledTimes(1);
    expect(resetDatabase).toHaveBeenCalledTimes(1);
    expect(clearDatabaseForScope).toHaveBeenCalledWith('local');
    expect(clearDatabaseForScope).toHaveBeenCalledWith('env_https_server_a_example_com_user_1');
    expect(deleteDirectory).toHaveBeenCalledWith('file:///documents/environments/local/');
    expect(deleteDirectory).toHaveBeenCalledWith('file:///cache/environments/local/');
    expect(deleteDirectory).toHaveBeenCalledWith('file:///documents/environments/env_https_server_a_example_com_user_1/');
    expect(deleteDirectory).toHaveBeenCalledWith('file:///cache/environments/env_https_server_a_example_com_user_1/');
    expect(Storage.delete).toHaveBeenCalledWith('backend:currentServerUrl');
    expect(Storage.delete).toHaveBeenCalledWith('accounts:active');
    expect(Storage.delete).toHaveBeenCalledWith('accounts:registry');
    expect(Storage.delete).toHaveBeenCalledWith('env_https_server_a_example_com_user_1:auth:token');
    expect(Storage.delete).toHaveBeenCalledWith('local:settings:notifications');
    expect(Storage.delete).toHaveBeenCalledWith('common_tags');
    expect(Storage.delete).not.toHaveBeenCalledWith('backend:recentServerUrls');
    expect(mockRestoreCurrentServerUrlFromRecent).toHaveBeenCalledTimes(1);
    expect(cleanupOrphanWorkspaces).toHaveBeenCalledWith(['local']);
    expect(initDatabase).toHaveBeenCalledTimes(1);
    expect(ensureDirectories).toHaveBeenCalledTimes(1);
    expect(mockInvalidateActiveQueries).toHaveBeenCalledTimes(1);
    expect(mockLoadAuth).toHaveBeenCalledTimes(1);
    expect(mockLoadCommonTags).toHaveBeenCalledTimes(1);
  });

  it('deduplicates local scope when the current scope is already local', async () => {
    (getCurrentDataScopeKeySync as jest.Mock).mockReturnValue('local');

    await resetAppToInitialState();

    expect(deleteDirectory).toHaveBeenCalledTimes(2);
    expect(clearDatabaseForScope).toHaveBeenCalledTimes(1);
    expect(clearDatabaseForScope).toHaveBeenCalledWith('local');
    expect(deleteDirectory).toHaveBeenCalledWith('file:///documents/environments/local/');
    expect(deleteDirectory).toHaveBeenCalledWith('file:///cache/environments/local/');
  });

  it('throws when local database reinitialization fails', async () => {
    (initDatabase as jest.Mock).mockResolvedValue(false);

    await expect(resetAppToInitialState()).rejects.toThrow('初始化数据库失败');

    expect(mockLoadAuth).not.toHaveBeenCalled();
    expect(mockLoadCommonTags).not.toHaveBeenCalled();
  });

  it('still succeeds when no server url can be restored after reset', async () => {
    mockRestoreCurrentServerUrlFromRecent.mockResolvedValueOnce(null);

    await expect(resetAppToInitialState()).resolves.toBeUndefined();

    expect(mockRestoreCurrentServerUrlFromRecent).toHaveBeenCalledTimes(1);
    expect(mockLoadAuth).toHaveBeenCalledTimes(1);
    expect(mockLoadCommonTags).toHaveBeenCalledTimes(1);
  });
});
