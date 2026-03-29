const mockDb = {
  getAllAsync: jest.fn(),
  runAsync: jest.fn(),
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
    mockInvalidateColumnCache.mockReset();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.runAsync.mockResolvedValue(undefined);
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

  it('backfills NULL local_ready_state even when marker is already set', async () => {
    mockMmkvState.set('local_ready_state_column_added', 'true');
    mockGetAllAsync.mockResolvedValueOnce([{ name: 'id' }, { name: 'local_ready_state' }]);

    await migrateLocalReadyStateColumn();

    expect(mockRunAsync).toHaveBeenCalledWith(
      `UPDATE entries SET local_ready_state = 'ready' WHERE local_ready_state IS NULL`
    );
  });
});
