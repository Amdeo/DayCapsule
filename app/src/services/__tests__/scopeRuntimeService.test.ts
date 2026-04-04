const mockInitDatabaseForScope = jest.fn().mockResolvedValue(true);
const mockOpenDatabaseForScope = jest.fn();
const mockInvalidateColumnCache = jest.fn();
const mockMigrateToMediaJson = jest.fn().mockResolvedValue(undefined);
const mockMigrateEntriesContentToFts = jest.fn().mockResolvedValue(undefined);
const mockMigrateLocalReadyStateColumn = jest.fn().mockResolvedValue(undefined);
const mockMigrateSyncStatusColumn = jest.fn().mockResolvedValue(undefined);
const mockMigrateCloudSyncCoreColumns = jest.fn().mockResolvedValue(undefined);

jest.mock('@/src/database/sqlite', () => ({
  initDatabaseForScope: (...args: unknown[]) => mockInitDatabaseForScope(...args),
  openDatabaseForScope: (...args: unknown[]) => mockOpenDatabaseForScope(...args),
}));

jest.mock('@/src/database/operations', () => ({
  invalidateColumnCache: (...args: unknown[]) => mockInvalidateColumnCache(...args),
}));

jest.mock('@/src/database/migration', () => ({
  migrateToMediaJson: (...args: unknown[]) => mockMigrateToMediaJson(...args),
  migrateEntriesContentToFts: (...args: unknown[]) => mockMigrateEntriesContentToFts(...args),
  migrateLocalReadyStateColumn: (...args: unknown[]) => mockMigrateLocalReadyStateColumn(...args),
  migrateSyncStatusColumn: (...args: unknown[]) => mockMigrateSyncStatusColumn(...args),
  migrateCloudSyncCoreColumns: (...args: unknown[]) => mockMigrateCloudSyncCoreColumns(...args),
}));

jest.mock('@/src/services/workspaceService', () => ({
  buildDataScopeKey: jest.fn((serverUrl: string, userId: string) => `scope:${serverUrl}:${userId}`),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { error: jest.fn(), log: jest.fn(), warn: jest.fn() },
}));

import { prepareScopeRuntime } from '../scopeRuntimeService';

describe('scopeRuntimeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenDatabaseForScope.mockReturnValue({ name: 'db-scope' });
  });

  it('prepares the explicit target scope and runs migrations in order', async () => {
    const result = await prepareScopeRuntime({ scopeKey: 'scope:user-1' });

    expect(result).toEqual({
      prepared: true,
      targetScopeKey: 'scope:user-1',
      logLabel: 'scope-runtime-ready',
    });
    expect(mockInitDatabaseForScope).toHaveBeenCalledWith('scope:user-1');
    expect(mockOpenDatabaseForScope).toHaveBeenCalledWith('scope:user-1');
    expect(mockInvalidateColumnCache).toHaveBeenNthCalledWith(1, 'scope:user-1');
    expect(mockMigrateToMediaJson.mock.invocationCallOrder[0]).toBeLessThan(
      mockMigrateEntriesContentToFts.mock.invocationCallOrder[0]
    );
    expect(mockMigrateEntriesContentToFts.mock.invocationCallOrder[0]).toBeLessThan(
      mockMigrateLocalReadyStateColumn.mock.invocationCallOrder[0]
    );
    expect(mockMigrateLocalReadyStateColumn.mock.invocationCallOrder[0]).toBeLessThan(
      mockMigrateSyncStatusColumn.mock.invocationCallOrder[0]
    );
    expect(mockMigrateSyncStatusColumn.mock.invocationCallOrder[0]).toBeLessThan(
      mockMigrateCloudSyncCoreColumns.mock.invocationCallOrder[0]
    );
    expect(mockInvalidateColumnCache).toHaveBeenLastCalledWith('scope:user-1');
  });

  it('builds a target scope from serverUrl and userId', async () => {
    const result = await prepareScopeRuntime({
      serverUrl: 'https://server-a.example.com',
      userId: 'u1',
    });

    expect(result.targetScopeKey).toBe('scope:https://server-a.example.com:u1');
    expect(mockInitDatabaseForScope).toHaveBeenCalledWith('scope:https://server-a.example.com:u1');
  });

  it('returns a structured failure when target scope initialization fails', async () => {
    mockInitDatabaseForScope.mockResolvedValueOnce(false);

    const result = await prepareScopeRuntime({ scopeKey: 'scope:user-2' });

    expect(result).toEqual({
      prepared: false,
      targetScopeKey: 'scope:user-2',
      failureReason: '初始化目标 scope 数据库失败',
      logLabel: 'scope-runtime-init-failed',
    });
    expect(mockMigrateToMediaJson).not.toHaveBeenCalled();
  });
});
