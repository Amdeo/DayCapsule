import { waitFor } from '@testing-library/react-native';

const mockShouldBackup = jest.fn(async () => false);
const mockCreateBackup = jest.fn(async () => undefined);
const mockSyncNow = jest.fn(async () => undefined);
const mockFlushPendingUploads = jest.fn(async () => undefined);
const mockGetNetworkStateAsync = jest.fn(async () => ({
  isConnected: true,
  isInternetReachable: true,
}));
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

let mockIsAuthenticated = false;
let mockCloudMode = false;
let mockEntries: Array<{ id: string }> = [];

jest.mock('@/src/services/backupService', () => ({
  BackupService: {
    shouldBackup: (...args: unknown[]) => mockShouldBackup(...args),
    createBackup: (...args: unknown[]) => mockCreateBackup(...args),
  },
}));

jest.mock('@/src/services/cloudSyncService', () => ({
  createCloudSyncService: () => ({
    syncNow: (...args: unknown[]) => mockSyncNow(...args),
  }),
}));

jest.mock('@/src/services/uploadQueueRecoveryService', () => ({
  createUploadQueueRecoveryService: () => ({
    flushPendingUploads: (...args: unknown[]) => mockFlushPendingUploads(...args),
  }),
}));

jest.mock('expo-network', () => ({
  getNetworkStateAsync: (...args: unknown[]) => mockGetNetworkStateAsync(...args),
}));

jest.mock('@/src/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      isAuthenticated: mockIsAuthenticated,
    }),
  },
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      cloudMode: mockCloudMode,
    }),
  },
}));

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: {
    getState: () => ({
      entries: mockEntries,
    }),
  },
}));

jest.mock('@/src/utils/logger', () => ({
  logger: {
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

import {
  createCloudRecoveryRunner,
  handleAppStateChange,
} from '../appLifecycleService';

describe('appLifecycleService', () => {
  const refreshCloudSyncIndicator = jest.fn(async () => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = false;
    mockCloudMode = false;
    mockEntries = [];
    mockShouldBackup.mockResolvedValue(false);
    mockCreateBackup.mockResolvedValue(undefined);
    mockSyncNow.mockResolvedValue(undefined);
    mockFlushPendingUploads.mockResolvedValue(undefined);
    mockGetNetworkStateAsync.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
  });

  it('runs cloud recovery steps in order and refreshes indicator with the post-action label', async () => {
    mockIsAuthenticated = true;
    mockCloudMode = true;

    const runRecovery = createCloudRecoveryRunner({ refreshCloudSyncIndicator });

    await runRecovery('网络恢复时');

    expect(mockSyncNow).toHaveBeenCalledTimes(1);
    expect(mockFlushPendingUploads).toHaveBeenCalledTimes(1);
    expect(refreshCloudSyncIndicator).toHaveBeenCalledWith('网络恢复时后');
    expect(mockSyncNow.mock.invocationCallOrder[0]).toBeLessThan(
      mockFlushPendingUploads.mock.invocationCallOrder[0]
    );
    expect(mockFlushPendingUploads.mock.invocationCallOrder[0]).toBeLessThan(
      refreshCloudSyncIndicator.mock.invocationCallOrder[0]
    );
  });

  it('reuses the in-flight recovery promise so concurrent triggers only run once', async () => {
    mockIsAuthenticated = true;
    mockCloudMode = true;

    let resolveSync: (() => void) | undefined;
    mockSyncNow.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSync = resolve;
        })
    );

    const runRecovery = createCloudRecoveryRunner({ refreshCloudSyncIndicator });

    const first = runRecovery('回到前台时');
    const second = runRecovery('网络恢复时');

    expect(mockSyncNow).toHaveBeenCalledTimes(1);

    resolveSync?.();
    await Promise.all([first, second]);

    expect(mockFlushPendingUploads).toHaveBeenCalledTimes(1);
    expect(refreshCloudSyncIndicator).toHaveBeenCalledTimes(1);
  });

  it('creates an auto backup when entering background and backup is due', async () => {
    mockEntries = [{ id: 'entry-1' }];
    mockShouldBackup.mockResolvedValueOnce(true);
    const runRecovery = jest.fn(async () => undefined);

    await handleAppStateChange('active', 'background', runRecovery);

    expect(mockShouldBackup).toHaveBeenCalledTimes(1);
    expect(mockCreateBackup).toHaveBeenCalledWith(mockEntries);
    expect(runRecovery).not.toHaveBeenCalled();
  });

  it('runs recovery when returning to active state', async () => {
    const runRecovery = jest.fn(async () => undefined);

    await handleAppStateChange('background', 'active', runRecovery);

    expect(runRecovery).toHaveBeenCalledWith('回到前台时');
    expect(mockShouldBackup).not.toHaveBeenCalled();
  });

  it('logs and swallows shouldBackup failures during background transition', async () => {
    const error = new Error('shouldBackup failed');
    mockShouldBackup.mockRejectedValueOnce(error);

    await expect(
      handleAppStateChange('active', 'background', jest.fn(async () => undefined))
    ).resolves.toBeUndefined();

    expect(mockLoggerError).toHaveBeenCalledWith('❌ 自动备份检查失败:', error);
  });

  it('logs and swallows recovery failures when returning to active state', async () => {
    const error = new Error('recovery failed');
    const runRecovery = jest.fn(async () => {
      throw error;
    });

    await expect(handleAppStateChange('background', 'active', runRecovery)).resolves.toBeUndefined();

    expect(mockLoggerError).toHaveBeenCalledWith('❌ 回到前台恢复失败:', error);
  });

  it('initializes cached network reachability when creating the recovery runner', async () => {
    const reachabilityRef = { current: null as boolean | null };

    createCloudRecoveryRunner({
      refreshCloudSyncIndicator,
      wasNetworkReachableRef: reachabilityRef,
    });

    await waitFor(() => {
      expect(reachabilityRef.current).toBe(true);
    });
  });

  it('logs a warning when initial network reachability lookup fails during runner setup', async () => {
    const reachabilityRef = { current: null as boolean | null };
    const error = new Error('lookup failed');
    mockGetNetworkStateAsync.mockRejectedValueOnce(error);

    createCloudRecoveryRunner({
      refreshCloudSyncIndicator,
      wasNetworkReachableRef: reachabilityRef,
    });

    await waitFor(() => {
      expect(mockLoggerWarn).toHaveBeenCalledWith('⚠️ 初始化网络状态监听失败:', error);
    });
    expect(reachabilityRef.current).toBeNull();
  });
});
