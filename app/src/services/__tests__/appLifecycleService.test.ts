import { waitFor } from '@testing-library/react-native';

const mockShouldBackup = jest.fn(async () => false);
const mockCreateBackup = jest.fn(async () => undefined);
const mockCloudSyncNow = jest.fn(async () => undefined);
const mockRunCloudRecoveryFlow = jest.fn(
  async (deps: {
    syncNow: () => Promise<void>;
    refreshCloudSyncIndicator: () => Promise<void>;
  }) => {
    await deps.refreshCloudSyncIndicator();
    return {
      syncError: null,
      queueRecovery: { voiceError: null, photoError: null },
      refreshError: null,
    };
  }
);
const mockGetNetworkStateAsync = jest.fn(async () => ({
  isConnected: true,
  isInternetReachable: true,
}));
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

let mockIsAuthenticated = false;
let mockSessionState = {
  currentScopeKey: 'local',
  isAuthenticated: false,
  isTransitioning: false,
  isAccountScopeActive: false,
  isCloudProtectionEnabled: false,
  canRunCloudSync: false,
};
let mockEntries: Array<{ id: string }> = [];

jest.mock('@/src/services/backupService', () => ({
  BackupService: {
    shouldBackup: (...args: unknown[]) => mockShouldBackup(...args),
    createBackup: (...args: unknown[]) => mockCreateBackup(...args),
  },
}));

jest.mock('@/src/services/cloudRecoveryFlowService', () => ({
  createCloudRecoveryFlowService: (deps: unknown) => ({
    run: () =>
      mockRunCloudRecoveryFlow(
        deps as {
          syncNow: () => Promise<void>;
          refreshCloudSyncIndicator: () => Promise<void>;
        }
      ),
  }),
}));

jest.mock('@/src/services/cloudSyncService', () => ({
  createCloudSyncService: () => ({
    syncNow: (...args: unknown[]) => mockCloudSyncNow(...args),
  }),
}));

jest.mock('@/src/services/uploadQueueRecoveryService', () => ({
  createUploadQueueRecoveryService: () => ({
    flushPendingUploads: jest.fn(async () => ({ voiceError: null, photoError: null })),
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

jest.mock('@/src/services/workspaceSessionState', () => ({
  buildWorkspaceSessionSnapshot: () => mockSessionState,
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
    mockSessionState = {
      currentScopeKey: 'local',
      isAuthenticated: false,
      isTransitioning: false,
      isAccountScopeActive: false,
      isCloudProtectionEnabled: false,
      canRunCloudSync: false,
    };
    mockEntries = [];
    mockShouldBackup.mockResolvedValue(false);
    mockCreateBackup.mockResolvedValue(undefined);
    mockCloudSyncNow.mockResolvedValue(undefined);
    mockRunCloudRecoveryFlow.mockImplementation(
      async (deps: {
        syncNow: () => Promise<void>;
        refreshCloudSyncIndicator: () => Promise<void>;
      }) => {
        await deps.refreshCloudSyncIndicator();
        return {
          syncError: null,
          queueRecovery: { voiceError: null, photoError: null },
          refreshError: null,
        };
      }
    );
    mockGetNetworkStateAsync.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
  });

  it('runs cloud recovery steps in order and refreshes indicator with the post-action label', async () => {
    mockIsAuthenticated = true;
    mockSessionState = {
      currentScopeKey: 'account:user-1',
      isAuthenticated: true,
      isTransitioning: false,
      isAccountScopeActive: true,
      isCloudProtectionEnabled: true,
      canRunCloudSync: true,
    };

    const runRecovery = createCloudRecoveryRunner({ refreshCloudSyncIndicator });

    await runRecovery('网络恢复时');

    expect(mockRunCloudRecoveryFlow).toHaveBeenCalledTimes(1);
  });

  it('passes a gated syncNow closure into the shared flow so cloud sync is skipped without an active account scope', async () => {
    mockRunCloudRecoveryFlow.mockImplementationOnce(
      async (deps: {
        syncNow: () => Promise<void>;
        refreshCloudSyncIndicator: () => Promise<void>;
      }) => {
        await deps.syncNow();
        await deps.refreshCloudSyncIndicator();
        return {
          syncError: null,
          queueRecovery: { voiceError: null, photoError: null },
          refreshError: null,
        };
      }
    );

    const runRecovery = createCloudRecoveryRunner({ refreshCloudSyncIndicator });

    await runRecovery('回到前台时');

    expect(mockRunCloudRecoveryFlow).toHaveBeenCalledTimes(1);
    expect(mockCloudSyncNow).not.toHaveBeenCalled();
    expect(refreshCloudSyncIndicator).toHaveBeenCalledWith('回到前台时后');
  });

  it('rethrows refreshError from the shared flow result', async () => {
    const refreshError = new Error('refresh failed');
    mockRunCloudRecoveryFlow.mockImplementationOnce(
      async (deps: {
        syncNow: () => Promise<void>;
        refreshCloudSyncIndicator: () => Promise<void>;
      }) => {
        await deps.refreshCloudSyncIndicator();
        return {
          syncError: null,
          queueRecovery: { voiceError: null, photoError: null },
          refreshError,
        };
      }
    );

    const runRecovery = createCloudRecoveryRunner({ refreshCloudSyncIndicator });

    await expect(runRecovery('回到前台时')).rejects.toBe(refreshError);
  });

  it('reuses the in-flight recovery promise so concurrent triggers only run once', async () => {
    mockIsAuthenticated = true;
    mockSessionState = {
      currentScopeKey: 'account:user-1',
      isAuthenticated: true,
      isTransitioning: false,
      isAccountScopeActive: true,
      isCloudProtectionEnabled: true,
      canRunCloudSync: true,
    };

    let resolveFlow: (() => void) | undefined;
    mockRunCloudRecoveryFlow.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFlow = resolve;
        })
    );

    const runRecovery = createCloudRecoveryRunner({ refreshCloudSyncIndicator });

    const first = runRecovery('回到前台时');
    const second = runRecovery('网络恢复时');

    expect(mockRunCloudRecoveryFlow).toHaveBeenCalledTimes(1);

    resolveFlow?.({
      syncError: null,
      queueRecovery: { voiceError: null, photoError: null },
      refreshError: null,
    });
    await Promise.all([first, second]);

    expect(mockRunCloudRecoveryFlow).toHaveBeenCalledTimes(1);
  });

  it('skips cloud sync when authenticated account scope has not enabled cloud protection', async () => {
    mockIsAuthenticated = true;
    mockSessionState = {
      currentScopeKey: 'account:user-1',
      isAuthenticated: true,
      isTransitioning: false,
      isAccountScopeActive: true,
      isCloudProtectionEnabled: false,
      canRunCloudSync: false,
    };

    mockRunCloudRecoveryFlow.mockImplementationOnce(
      async (deps: {
        syncNow: () => Promise<void>;
        refreshCloudSyncIndicator: () => Promise<void>;
      }) => {
        await deps.syncNow();
        await deps.refreshCloudSyncIndicator();
        return {
          syncError: null,
          queueRecovery: { voiceError: null, photoError: null },
          refreshError: null,
        };
      }
    );

    const runRecovery = createCloudRecoveryRunner({ refreshCloudSyncIndicator });

    await runRecovery('回到前台时');

    expect(mockCloudSyncNow).not.toHaveBeenCalled();
    expect(refreshCloudSyncIndicator).toHaveBeenCalledWith('回到前台时后');
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

  it('logs queue-specific warnings when pending upload recovery reports queue failures', async () => {
    const voiceError = new Error('voice queue failed');
    const photoError = new Error('photo queue failed');
    mockRunCloudRecoveryFlow.mockImplementationOnce(
      async (deps: {
        syncNow: () => Promise<void>;
        refreshCloudSyncIndicator: () => Promise<void>;
      }) => {
        await deps.refreshCloudSyncIndicator();
        return {
          syncError: null,
          queueRecovery: { voiceError, photoError },
          refreshError: null,
        };
      }
    );

    const runRecovery = createCloudRecoveryRunner({ refreshCloudSyncIndicator });

    await runRecovery('回到前台时');

    expect(mockLoggerWarn).toHaveBeenCalledWith('⚠️ 回到前台时补传待上传语音失败:', voiceError);
    expect(mockLoggerWarn).toHaveBeenCalledWith('⚠️ 回到前台时补传待上传照片失败:', photoError);
    expect(refreshCloudSyncIndicator).toHaveBeenCalledWith('回到前台时后');
  });
});
