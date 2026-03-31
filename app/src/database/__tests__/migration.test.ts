const mockDb = {
  getAllAsync: jest.fn(),
  runAsync: jest.fn(),
  withTransactionAsync: jest.fn(),
};
const mockGetAllAsync = mockDb.getAllAsync;
const mockRunAsync = mockDb.runAsync;

const mockMmkvState = new Map<string, string>();
const mockInvalidateColumnCache = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(() => ({
    getString: (key: string) => mockMmkvState.get(key),
    set: (key: string, value: string) => {
      mockMmkvState.set(key, value);
    },
    remove: (key: string) => {
      mockMmkvState.delete(key);
    },
  })),
}));

jest.mock('@/src/database/sqlite', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

jest.mock('../operations', () => ({
  clearAllEntries: jest.fn(),
  restoreEntries: jest.fn(),
  invalidateColumnCache: mockInvalidateColumnCache,
}));

jest.mock('@/src/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  migrateEntriesContentToFts,
  migrateCloudSyncCoreColumns,
  migrateLocalReadyStateColumn,
  migrateSyncStatusColumn,
  migrateToMediaJson,
} from '../migration';

describe('database/migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMmkvState.clear();
    mockDb.getAllAsync.mockReset();
    mockDb.runAsync.mockReset();
    mockDb.withTransactionAsync.mockReset();
    mockInvalidateColumnCache.mockReset();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.runAsync.mockResolvedValue(undefined);
    mockDb.withTransactionAsync.mockImplementation(async (callback: () => Promise<void>) => callback());
  });

  it('应该在标记已迁移时仍补齐缺失的 media_json 列', async () => {
    mockMmkvState.set('media_json_migrated', 'true');
    mockDb.getAllAsync
      .mockResolvedValueOnce([
        { name: 'id' },
        { name: 'type' },
        { name: 'media_uri' },
      ])
      .mockResolvedValueOnce([]);

    await migrateToMediaJson();

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      `ALTER TABLE entries ADD COLUMN media_json TEXT`
    );
  });

  it('应该把旧 media_uri 行迁移成 media_json 数组', async () => {
    mockDb.getAllAsync
      .mockResolvedValueOnce([
        { name: 'id' },
        { name: 'type' },
        { name: 'media_uri' },
        { name: 'media_json' },
      ])
      .mockResolvedValueOnce([
        {
          id: 'entry-1',
          media_uri: 'file:///photo-1.jpg',
          media_type: 'image/jpeg',
          media_duration: null,
          media_thumbnail: 'file:///thumb-1.jpg',
          media_metadata: JSON.stringify({ aspectRatio: 1.5, createdAt: 1, modifiedAt: 2 }),
        },
      ]);

    await migrateToMediaJson();

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      `UPDATE entries SET media_json = ? WHERE id = ?`,
      [
        JSON.stringify([
          {
            uri: 'file:///photo-1.jpg',
            mimeType: 'image/jpeg',
            size: 0,
            duration: undefined,
            thumbnail: 'file:///thumb-1.jpg',
            metadata: { aspectRatio: 1.5, createdAt: 1, modifiedAt: 2 },
          },
        ]),
        'entry-1',
      ]
    );
  });

  it('应该在标记已迁移时仍补齐缺失的 sync_op 列', async () => {
    mockMmkvState.set('sync_status_column_added', 'true');
    mockDb.getAllAsync.mockResolvedValue([
      { name: 'id' },
      { name: 'type' },
      { name: 'sync_status' },
    ]);

    await migrateSyncStatusColumn();

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      `ALTER TABLE entries ADD COLUMN sync_op TEXT DEFAULT 'update'`
    );
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      `ALTER TABLE entries ADD COLUMN conflicted_copy_of TEXT`
    );
    expect(mockMmkvState.get('sync_status_column_added')).toBe('true');
  });

  it('应该在 sync_status 列存在后创建 sync_status 索引', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      { name: 'id' },
      { name: 'type' },
      { name: 'sync_status' },
      { name: 'sync_op' },
      { name: 'conflicted_copy_of' },
    ]);

    await migrateSyncStatusColumn();

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      `CREATE INDEX IF NOT EXISTS idx_entries_sync_status ON entries(sync_status)`
    );
  });

  it('应该在标记已迁移时仍补齐缺失的 cloud sync core 列', async () => {
    mockMmkvState.set('cloud_sync_core_columns_added', 'true');
    mockDb.getAllAsync.mockResolvedValue([
      { name: 'id' },
      { name: 'type' },
      { name: 'base_updated_at' },
    ]);

    await migrateCloudSyncCoreColumns();

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      `ALTER TABLE entries ADD COLUMN user_id TEXT`
    );
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      `ALTER TABLE entries ADD COLUMN deleted INTEGER DEFAULT 0`
    );
    expect(mockMmkvState.get('cloud_sync_core_columns_added')).toBe('true');
  });

  it('adds local_ready_state column when missing', async () => {
    mockGetAllAsync.mockResolvedValueOnce([{ name: 'id' }, { name: 'sync_status' }]);
    await migrateLocalReadyStateColumn();
    expect(mockRunAsync).toHaveBeenCalledWith(
      `ALTER TABLE entries ADD COLUMN local_ready_state TEXT DEFAULT 'ready'`
    );
  });

  it('backfills NULL local_ready_state whenever the column exists', async () => {
    mockMmkvState.set('local_ready_state_column_added', 'true');
    mockGetAllAsync.mockResolvedValueOnce([{ name: 'id' }, { name: 'local_ready_state' }]);

    await migrateLocalReadyStateColumn();

    expect(mockRunAsync).toHaveBeenCalledWith(
      `UPDATE entries SET local_ready_state = 'ready' WHERE local_ready_state IS NULL`
    );
  });

  it('creates entries_fts and backfills existing entry content', async () => {
    await migrateEntriesContentToFts();

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5')
    );
    expect(mockDb.runAsync).toHaveBeenCalledWith(`DELETE FROM entries_fts`);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      `INSERT INTO entries_fts (entry_id, content) SELECT id, content FROM entries`
    );
  });

  it('runs entries_fts delete and backfill inside one transaction', async () => {
    const transactionQueries: string[] = [];
    let inTransaction = false;

    mockDb.withTransactionAsync.mockImplementation(async (callback: () => Promise<void>) => {
      inTransaction = true;
      try {
        await callback();
      } finally {
        inTransaction = false;
      }
    });

    mockDb.runAsync.mockImplementation(async (sql: string) => {
      if (inTransaction) {
        transactionQueries.push(sql);
      }
      return undefined;
    });

    await migrateEntriesContentToFts();

    expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(transactionQueries).toEqual([
      'DELETE FROM entries_fts',
      'INSERT INTO entries_fts (entry_id, content) SELECT id, content FROM entries',
    ]);
  });

  it('repeats entries_fts backfill idempotently', async () => {
    await migrateEntriesContentToFts();
    await migrateEntriesContentToFts();

    expect(mockDb.runAsync.mock.calls.filter(([sql]) =>
      String(sql).includes('CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5')
    )).toHaveLength(2);
    expect(mockDb.runAsync.mock.calls.filter(([sql]) => sql === 'DELETE FROM entries_fts')).toHaveLength(2);
    expect(mockDb.runAsync.mock.calls.filter(([sql]) =>
      sql === 'INSERT INTO entries_fts (entry_id, content) SELECT id, content FROM entries'
    )).toHaveLength(2);
  });
});
