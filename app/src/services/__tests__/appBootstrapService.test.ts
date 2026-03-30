const mockInitializeFileSystem = jest.fn(async () => undefined);
const mockInitializeAudio = jest.fn(async () => undefined);
const mockInitDatabase = jest.fn(async () => true);
const mockMigrateFromAsyncStorage = jest.fn(async () => ({ success: true, migratedCount: 0 }));
const mockMigrateTagsToNormalized = jest.fn(async () => undefined);
const mockMigrateMediaMetadataColumns = jest.fn(async () => undefined);
const mockMigrateToMediaJson = jest.fn(async () => undefined);
const mockMigrateSyncStatusColumn = jest.fn(async () => undefined);
const mockMigrateCloudSyncCoreColumns = jest.fn(async () => undefined);
const mockMigrateLocalReadyStateColumn = jest.fn(async () => undefined);
const mockCleanupIncompleteLocalEntries = jest.fn(async () => undefined);
const mockLoadAuth = jest.fn(async () => undefined);
const mockLoadSync = jest.fn(async () => undefined);
const mockSetInitialSyncState = jest.fn(async () => undefined);
const mockStorageGetString = jest.fn(async () => 'false');
const mockStorageSetString = jest.fn(async () => undefined);
const mockInspectInitialState = jest.fn(async () => ({}));
const mockBuildInitialFlow = jest.fn(() => ({ type: 'idle' }));
const mockRunInitialFlow = jest.fn(async () => undefined);
const mockCloudSyncNow = jest.fn(async () => undefined);
const mockRunCloudRecoveryFlow = jest.fn(
  async (deps: { refreshCloudSyncIndicator: () => Promise<void>; syncNow: () => Promise<void> }) => {
    await deps.refreshCloudSyncIndicator();
    return {
      syncError: null,
      queueRecovery: { voiceError: null, photoError: null },
      refreshError: null,
    };
  }
);
const mockAlert = jest.fn();
const mockLoggerLog = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

let mockIsAuthenticated = false;

jest.mock('react-native', () => ({
  Alert: { alert: (...args: unknown[]) => mockAlert(...args) },
}));

jest.mock('@/src/utils/logger', () => ({
  logger: {
    log: (...args: unknown[]) => mockLoggerLog(...args),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

jest.mock('@/src/utils/fileSystem', () => ({
  initializeFileSystem: (...args: unknown[]) => mockInitializeFileSystem(...args),
}));

jest.mock('@/src/services/voiceService', () => ({
  VoiceService: {
    initializeAudio: (...args: unknown[]) => mockInitializeAudio(...args),
  },
}));

jest.mock('@/src/database/sqlite', () => ({
  initDatabase: (...args: unknown[]) => mockInitDatabase(...args),
}));

jest.mock('@/src/database/migration', () => ({
  migrateFromAsyncStorage: (...args: unknown[]) => mockMigrateFromAsyncStorage(...args),
  migrateTagsToNormalized: (...args: unknown[]) => mockMigrateTagsToNormalized(...args),
  migrateMediaMetadataColumns: (...args: unknown[]) => mockMigrateMediaMetadataColumns(...args),
  migrateToMediaJson: (...args: unknown[]) => mockMigrateToMediaJson(...args),
  migrateSyncStatusColumn: (...args: unknown[]) => mockMigrateSyncStatusColumn(...args),
  migrateCloudSyncCoreColumns: (...args: unknown[]) => mockMigrateCloudSyncCoreColumns(...args),
  migrateLocalReadyStateColumn: (...args: unknown[]) => mockMigrateLocalReadyStateColumn(...args),
}));

jest.mock('@/src/services/localEntryRecoveryService', () => ({
  cleanupIncompleteLocalEntries: (...args: unknown[]) => mockCleanupIncompleteLocalEntries(...args),
}));

jest.mock('@/src/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      isAuthenticated: mockIsAuthenticated,
      loadAuth: mockLoadAuth,
    }),
  },
}));

jest.mock('@/src/store/syncStore', () => ({
  useSyncStore: {
    getState: () => ({
      load: mockLoadSync,
      setInitialSyncState: mockSetInitialSyncState,
    }),
  },
}));

jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getString: (...args: unknown[]) => mockStorageGetString(...args),
    setString: (...args: unknown[]) => mockStorageSetString(...args),
  },
}));

jest.mock('@/src/services/syncBootstrapService', () => ({
  createSyncBootstrapService: () => ({
    inspectInitialState: mockInspectInitialState,
    buildInitialFlow: mockBuildInitialFlow,
    runInitialFlow: mockRunInitialFlow,
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

jest.mock('@/src/services/cloudRecoveryFlowService', () => ({
  createCloudRecoveryFlowService: (deps: unknown) => ({
    run: () => mockRunCloudRecoveryFlow(deps as { refreshCloudSyncIndicator: () => Promise<void> }),
  }),
}));

import { runAppBootstrap } from '../appBootstrapService';

describe('runAppBootstrap', () => {
  const refreshCloudSyncIndicator = jest.fn(async () => undefined);
  const onInitializationFailed = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = false;
    mockInitDatabase.mockResolvedValue(true);
    mockMigrateFromAsyncStorage.mockResolvedValue({ success: true, migratedCount: 0 });
    mockStorageGetString.mockResolvedValue('false');
    mockBuildInitialFlow.mockReturnValue({ type: 'idle' });
    mockRunCloudRecoveryFlow.mockImplementation(
      async (deps: { refreshCloudSyncIndicator: () => Promise<void>; syncNow: () => Promise<void> }) => {
        await deps.refreshCloudSyncIndicator();
        return {
          syncError: null,
          queueRecovery: { voiceError: null, photoError: null },
          refreshError: null,
        };
      }
    );
  });

  it('runs startup dependencies and recovery steps in order before refreshing the indicator', async () => {
    await runAppBootstrap({
      refreshCloudSyncIndicator,
      onInitializationFailed,
    });

    expect(mockInitializeFileSystem).toHaveBeenCalledTimes(1);
    expect(mockInitializeAudio).toHaveBeenCalledTimes(1);
    expect(mockInitDatabase).toHaveBeenCalledTimes(1);
    expect(mockCleanupIncompleteLocalEntries).toHaveBeenCalledTimes(1);
    expect(mockLoadAuth).toHaveBeenCalledTimes(1);
    expect(mockLoadSync).toHaveBeenCalledTimes(1);
    expect(mockRunCloudRecoveryFlow).toHaveBeenCalledTimes(1);
    expect(onInitializationFailed).not.toHaveBeenCalled();

    expect(mockInitDatabase.mock.invocationCallOrder[0]).toBeGreaterThan(
      mockInitializeFileSystem.mock.invocationCallOrder[0]
    );
    expect(mockInitDatabase.mock.invocationCallOrder[0]).toBeGreaterThan(
      mockInitializeAudio.mock.invocationCallOrder[0]
    );
    expect(mockMigrateLocalReadyStateColumn.mock.invocationCallOrder[0]).toBeLessThan(
      mockCleanupIncompleteLocalEntries.mock.invocationCallOrder[0]
    );
    expect(mockCleanupIncompleteLocalEntries.mock.invocationCallOrder[0]).toBeLessThan(
      mockLoadAuth.mock.invocationCallOrder[0]
    );
    expect(mockLoadSync.mock.invocationCallOrder[0]).toBeLessThan(
      mockRunCloudRecoveryFlow.mock.invocationCallOrder[0]
    );
  });

  it('shows a migration warning alert and still completes bootstrap when migration reports partial failure', async () => {
    mockMigrateFromAsyncStorage.mockResolvedValueOnce({
      success: false,
      error: 'partial failure',
      migratedCount: 0,
    });

    await runAppBootstrap({
      refreshCloudSyncIndicator,
      onInitializationFailed,
    });

    expect(mockAlert).toHaveBeenCalledWith(
      '数据迁移警告',
      '部分数据可能未正确导入，但应用可以正常使用'
    );
    expect(refreshCloudSyncIndicator).toHaveBeenCalledWith('启动后');
    expect(onInitializationFailed).not.toHaveBeenCalled();
  });

  it('resets interrupted cloud mode switching back to offline mode', async () => {
    mockStorageGetString.mockResolvedValueOnce('switching');

    await runAppBootstrap({
      refreshCloudSyncIndicator,
      onInitializationFailed,
    });

    expect(mockStorageSetString).toHaveBeenCalledWith('settings:cloudMode', 'false');
    expect(mockAlert).toHaveBeenCalledWith(
      '提示',
      '上次云端模式切换未完成，已恢复为离线模式。您可以在设置中重新切换。'
    );
    expect(mockRunCloudRecoveryFlow).toHaveBeenCalledTimes(1);
  });

  it('marks initial sync as needs-decision without triggering cloud sync', async () => {
    mockIsAuthenticated = true;
    mockStorageGetString.mockResolvedValueOnce('true');
    mockBuildInitialFlow.mockReturnValueOnce({ type: 'needs-decision' });

    await runAppBootstrap({
      refreshCloudSyncIndicator,
      onInitializationFailed,
    });

    expect(mockInspectInitialState).toHaveBeenCalledTimes(1);
    expect(mockSetInitialSyncState).toHaveBeenCalledWith('needs-decision');
    expect(mockRunInitialFlow).not.toHaveBeenCalled();
    expect(mockRunCloudRecoveryFlow).toHaveBeenCalledTimes(1);
  });

  it('passes a syncNow caller that becomes a no-op when bootstrap reaches needs-decision', async () => {
    mockIsAuthenticated = true;
    mockStorageGetString.mockResolvedValueOnce('true');
    mockBuildInitialFlow.mockReturnValueOnce({ type: 'needs-decision' });

    let capturedSyncNow: (() => Promise<void>) | undefined;
    mockRunCloudRecoveryFlow.mockImplementationOnce(
      async (deps: { refreshCloudSyncIndicator: () => Promise<void>; syncNow: () => Promise<void> }) => {
        capturedSyncNow = deps.syncNow;
        await deps.refreshCloudSyncIndicator();
        return {
          syncError: null,
          queueRecovery: { voiceError: null, photoError: null },
          refreshError: null,
        };
      }
    );

    await runAppBootstrap({
      refreshCloudSyncIndicator,
      onInitializationFailed,
    });

    expect(capturedSyncNow).toBeDefined();
    await capturedSyncNow?.();

    expect(mockSetInitialSyncState).toHaveBeenCalledWith('needs-decision');
    expect(mockCloudSyncNow).not.toHaveBeenCalled();
    expect(onInitializationFailed).not.toHaveBeenCalled();
  });

  it('reports initialization failure when database initialization fails', async () => {
    mockInitDatabase.mockResolvedValueOnce(false);

    await runAppBootstrap({
      refreshCloudSyncIndicator,
      onInitializationFailed,
    });

    expect(onInitializationFailed).toHaveBeenCalledTimes(1);
    expect(refreshCloudSyncIndicator).not.toHaveBeenCalled();
  });

  it('reports initialization failure when recovery flow returns a refresh error', async () => {
    const refreshError = new Error('refresh failed');
    mockRunCloudRecoveryFlow.mockImplementationOnce(
      async (deps: { refreshCloudSyncIndicator: () => Promise<void>; syncNow: () => Promise<void> }) => {
        await deps.refreshCloudSyncIndicator();
        return {
          syncError: null,
          queueRecovery: { voiceError: null, photoError: null },
          refreshError,
        };
      }
    );

    await runAppBootstrap({
      refreshCloudSyncIndicator,
      onInitializationFailed,
    });

    expect(refreshCloudSyncIndicator).toHaveBeenCalledWith('启动后');
    expect(onInitializationFailed).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith('❌ 应用初始化失败:', refreshError);
  });

  it('logs queue-specific warnings when pending upload recovery reports queue failures', async () => {
    const voiceError = new Error('voice queue failed');
    const photoError = new Error('photo queue failed');
    mockRunCloudRecoveryFlow.mockImplementationOnce(
      async (deps: { refreshCloudSyncIndicator: () => Promise<void>; syncNow: () => Promise<void> }) => {
        await deps.refreshCloudSyncIndicator();
        return {
          syncError: null,
          queueRecovery: { voiceError, photoError },
          refreshError: null,
        };
      }
    );

    await runAppBootstrap({
      refreshCloudSyncIndicator,
      onInitializationFailed,
    });

    expect(mockLoggerWarn).toHaveBeenCalledWith('⚠️ 启动时补传待上传语音失败:', voiceError);
    expect(mockLoggerWarn).toHaveBeenCalledWith('⚠️ 启动时补传待上传照片失败:', photoError);
    expect(refreshCloudSyncIndicator).toHaveBeenCalledWith('启动后');
  });
});
