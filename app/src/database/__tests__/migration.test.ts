const mockDb = {
  getAllAsync: jest.fn(),
  runAsync: jest.fn(),
};

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

import { migrateCloudSyncCoreColumns, migrateSyncStatusColumn } from '../migration';

describe('database/migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMmkvState.clear();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.runAsync.mockResolvedValue(undefined);
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
});
