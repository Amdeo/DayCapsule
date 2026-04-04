const mockOpenDatabaseSync = jest.fn();

jest.mock('expo-sqlite', () => ({
  __esModule: true,
  openDatabaseSync: (...args: unknown[]) => mockOpenDatabaseSync(...args),
}));

jest.mock('@/src/services/workspaceService', () => ({
  getCurrentDataScopeKeySync: jest.fn(() => 'env_https_server_a_example_com'),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), error: jest.fn() },
}));

import { getCurrentDataScopeKeySync } from '@/src/services/workspaceService';
import {
  getDatabaseName,
  getDatabaseNameForScope,
  getDatabaseScopeKey,
  initDatabase,
  initDatabaseForScope,
  openDatabase,
  openDatabaseForScope,
  resetDatabase,
} from '../sqlite';

describe('sqlite environment isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentDataScopeKeySync as jest.Mock).mockReturnValue('env_https_server_a_example_com');
    mockOpenDatabaseSync.mockImplementation((name: string) => ({
      name,
      closeSync: jest.fn(),
      execAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_uri' },
        { name: 'media_type' },
        { name: 'media_duration' },
        { name: 'media_thumbnail' },
        { name: 'media_metadata' },
        { name: 'media_json' },
        { name: 'recording_status' },
        { name: 'recording_duration' },
        { name: 'sync_status' },
        { name: 'sync_op' },
        { name: 'conflicted_copy_of' },
        { name: 'base_updated_at' },
        { name: 'user_id' },
        { name: 'deleted' },
        { name: 'local_ready_state' },
        { name: 'created_at' },
        { name: 'updated_at' },
      ]),
    }));
    resetDatabase();
  });

  it('builds the database name from the current backend environment', () => {
    expect(getDatabaseName()).toBe('MemoryCapsule-env_https_server_a_example_com.db');
  });

  it('builds the database name for an explicit scope', () => {
    expect(getDatabaseNameForScope('env_https_server_b_example_com_user-1')).toBe(
      'MemoryCapsule-env_https_server_b_example_com_user-1.db'
    );
  });

  it('reopens the database when backend environment changes', () => {
    const dbA = openDatabase();

    (getCurrentDataScopeKeySync as jest.Mock).mockReturnValue('env_https_server_b_example_com');
    const dbB = openDatabase();

    expect(mockOpenDatabaseSync).toHaveBeenNthCalledWith(1, 'MemoryCapsule-env_https_server_a_example_com.db');
    expect(mockOpenDatabaseSync).toHaveBeenNthCalledWith(2, 'MemoryCapsule-env_https_server_b_example_com.db');
    expect(dbA).not.toBe(dbB);
  });

  it('opens an explicit target-scope database without relying on ambient scope', () => {
    const db = openDatabaseForScope('env_https_server_b_example_com_user-1');

    expect(mockOpenDatabaseSync).toHaveBeenCalledWith(
      'MemoryCapsule-env_https_server_b_example_com_user-1.db'
    );
    expect(getDatabaseScopeKey(db as any)).toBe('env_https_server_b_example_com_user-1');
  });

  it('switching environment should not synchronously close the previous database handle', () => {
    const dbA = openDatabase() as { closeSync?: jest.Mock };

    (getCurrentDataScopeKeySync as jest.Mock).mockReturnValue('env_https_server_b_example_com');
    openDatabase();

    expect(dbA.closeSync).not.toHaveBeenCalled();
  });

  it('resetDatabase should drop the singleton reference without calling closeSync', () => {
    const db = openDatabase() as { closeSync?: jest.Mock };

    resetDatabase();

    expect(db.closeSync).not.toHaveBeenCalled();
  });

  it('creates entries table with media_json in the base schema', async () => {
    await initDatabase();

    const db = openDatabase() as { execAsync: jest.Mock };
    const createEntriesSql = db.execAsync.mock.calls[0][0] as string;

    expect(createEntriesSql).toContain('media_json TEXT');
  });

  it('creates entries table with local_ready_state in the base schema', async () => {
    await initDatabase();
    const db = openDatabase() as { execAsync: jest.Mock };
    const createEntriesSql = db.execAsync.mock.calls[0][0] as string;
    expect(createEntriesSql).toContain('local_ready_state TEXT DEFAULT \'ready\'');
  });

  it('creates an index for sync_status in the base schema', async () => {
    await initDatabase();

    const db = openDatabase() as { execAsync: jest.Mock };
    const createIndexSql = db.execAsync.mock.calls
      .map(([sql]) => sql as string)
      .find((sql) => sql.includes('idx_entries_sync_status ON entries(sync_status)'));

    expect(createIndexSql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_entries_sync_status ON entries(sync_status);'
    );
  });

  it('creates the entries_fts virtual table in the base schema', async () => {
    await initDatabase();

    const db = openDatabase() as { execAsync: jest.Mock };
    const createFtsSql = db.execAsync.mock.calls
      .map(([sql]) => sql as string)
      .find((sql) => sql.includes('CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5'));

    expect(createFtsSql).toContain('entry_id UNINDEXED');
    expect(createFtsSql).toContain('content');
  });

  it('does not try to create sync_status index before the column exists on old schemas', async () => {
    await initDatabase();

    const oldSchemaDb = openDatabase() as {
      execAsync: jest.Mock;
      getAllAsync: jest.Mock;
    };
    oldSchemaDb.getAllAsync.mockResolvedValueOnce([
      { name: 'id' },
      { name: 'type' },
      { name: 'content' },
      { name: 'timestamp' },
      { name: 'tags' },
      { name: 'media_uri' },
      { name: 'media_type' },
      { name: 'media_duration' },
      { name: 'media_thumbnail' },
      { name: 'media_metadata' },
      { name: 'media_json' },
      { name: 'recording_status' },
      { name: 'recording_duration' },
    ]);

    oldSchemaDb.execAsync.mockClear();
    const initResult = await initDatabase();

    expect(initResult).toBe(true);
    expect(oldSchemaDb.execAsync).toHaveBeenCalledTimes(4);
    expect(oldSchemaDb.execAsync.mock.calls.some(([sql]) =>
      String(sql).includes('idx_entries_sync_status ON entries(sync_status)')
    )).toBe(false);
  });

  it('can initialize an explicit target-scope database', async () => {
    const initResult = await initDatabaseForScope('env_https_server_b_example_com_user-2');

    expect(initResult).toBe(true);
    expect(mockOpenDatabaseSync).toHaveBeenCalledWith(
      'MemoryCapsule-env_https_server_b_example_com_user-2.db'
    );
  });
});
