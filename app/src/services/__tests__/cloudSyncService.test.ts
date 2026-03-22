import { createCloudSyncService } from '../cloudSyncService';
import * as DB from '@/src/database/operations';
import { useSyncStore } from '@/src/store/syncStore';

jest.mock('@/src/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getString: jest.fn(async () => null),
    setString: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
  },
}));

jest.mock('@/src/database/sqlite', () => ({
  getDatabase: jest.fn(() => ({})),
}));

jest.mock('@/src/database/operations', () => ({
  getEntriesBySyncStatus: jest.fn(async () => []),
  getAllEntries: jest.fn(async () => []),
  getEntryById: jest.fn(async () => null),
  restoreEntries: jest.fn(async () => []),
  updateEntry: jest.fn(async () => undefined),
  deleteEntry: jest.fn(async () => undefined),
  addEntry: jest.fn(async () => ({ id: 'conflict-copy' })),
}));

const mockPost = jest.fn();
jest.mock('../apiClient', () => {
  class MockApiError extends Error {
    code: string;
    status: number;

    constructor(apiCode: string, message: string, apiStatus: number) {
      super(message);
      this.code = apiCode;
      this.status = apiStatus;
    }
  }

  return {
    getApiClient: jest.fn(() => ({ post: mockPost })),
    ApiError: MockApiError,
  };
});

describe('cloudSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSyncStore.setState({
      syncCursor: 0,
      lastSyncAt: null,
      lastSyncError: null,
      initialSyncState: 'idle',
      isLoaded: true,
    });
  });

  it('maps applied results to synced entries and advances cursor only after local apply succeeds', async () => {
    (DB.getEntriesBySyncStatus as jest.Mock).mockResolvedValueOnce([
      {
        id: 'entry-1',
        type: 'text',
        content: 'hello',
        timestamp: 1000,
        syncStatus: 'pending',
        syncOp: 'update',
        baseUpdatedAt: 1500,
        updatedAt: 2000,
      },
    ]);
    (DB.getEntryById as jest.Mock).mockResolvedValueOnce({
      id: 'entry-1',
      media: [],
      syncStatus: 'pending',
    });
    mockPost.mockResolvedValueOnce({
      newCursor: 10,
      results: [
        { changeId: 'change-1', status: 'applied', entryId: 'entry-1' },
      ],
      serverChanges: [
        {
          changeId: 10,
          op: 'update',
          entry: {
            id: 'entry-1',
            type: 'text',
            content: 'server copy',
            tags: ['工作'],
            createdAt: '2026-03-22T10:00:00Z',
            updatedAt: '2026-03-22T10:05:00Z',
          },
        },
      ],
      conflicts: [],
    });

    const service = createCloudSyncService();
    await service.syncNow();

    expect(mockPost).toHaveBeenCalledWith('/sync', expect.objectContaining({
      cursor: 0,
      clientChanges: [
        expect.objectContaining({
          changeId: expect.any(String),
          op: 'update',
          entry: expect.objectContaining({ id: 'entry-1', content: 'hello' }),
        }),
      ],
    }));
    expect(DB.updateEntry).toHaveBeenCalledWith('entry-1', expect.objectContaining({
      content: 'server copy',
      syncStatus: 'synced',
      baseUpdatedAt: new Date('2026-03-22T10:05:00Z').getTime(),
    }));
    expect(useSyncStore.getState().syncCursor).toBe(10);
  });

  it('replaces the main entry with serverEntry and creates a conflict-local-copy for conflicted results', async () => {
    mockPost.mockResolvedValueOnce({
      newCursor: 12,
      results: [
        { changeId: 'change-2', status: 'conflicted', entryId: 'entry-3' },
      ],
      serverChanges: [],
      conflicts: [
        {
          changeId: 'change-2',
          entryId: 'entry-3',
          serverEntry: {
            id: 'entry-3',
            type: 'text',
            content: 'server version',
            tags: ['a'],
            createdAt: '2026-03-22T10:00:00Z',
            updatedAt: '2026-03-22T10:05:00Z',
          },
          clientEntry: {
            id: 'entry-3',
            type: 'text',
            content: 'local version',
            tags: ['b'],
            updatedAt: '2026-03-22T10:04:00Z',
          },
        },
      ],
    });
    (DB.getEntryById as jest.Mock).mockResolvedValueOnce({ id: 'entry-3' });

    const service = createCloudSyncService();
    await service.syncNow();

    expect(DB.updateEntry).toHaveBeenCalledWith('entry-3', expect.objectContaining({
      content: 'server version',
      syncStatus: 'synced',
    }));
    expect(DB.addEntry).toHaveBeenCalledWith(expect.objectContaining({
      content: 'local version',
      syncStatus: 'conflict-local-copy',
      conflictedCopyOf: 'entry-3',
    }));
  });

  it('marks ignored delete results as locally settled without recreating pending rows', async () => {
    (DB.getEntriesBySyncStatus as jest.Mock).mockResolvedValueOnce([
      {
        id: 'entry-9',
        type: 'text',
        content: 'pending delete',
        timestamp: 1000,
        syncStatus: 'pending_delete',
        syncOp: 'delete',
        updatedAt: 2000,
      },
    ]);
    mockPost.mockResolvedValueOnce({
      newCursor: 14,
      results: [
        { changeId: 'change-9', status: 'ignored', entryId: 'entry-9' },
      ],
      serverChanges: [],
      conflicts: [],
    });

    const service = createCloudSyncService();
    await service.syncNow();

    expect(DB.deleteEntry).toHaveBeenCalledWith('entry-9');
  });

  it('reports sync store fields and conflict copy counts in sync status', async () => {
    useSyncStore.setState({
      syncCursor: 8,
      lastSyncAt: 1700000000000,
      lastSyncError: 'network timeout',
      initialSyncState: 'ready',
      isLoaded: true,
    });
    (DB.getAllEntries as jest.Mock).mockResolvedValueOnce([
      { id: 'a', type: 'text', content: '', timestamp: 1, syncStatus: 'synced' },
      { id: 'b', type: 'text', content: '', timestamp: 2, syncStatus: 'conflict-local-copy', conflictedCopyOf: 'a' },
    ]);
    (DB.getEntriesBySyncStatus as jest.Mock).mockResolvedValueOnce([
      { id: 'c', type: 'text', content: '', timestamp: 3, syncStatus: 'failed' },
    ]);

    const service = createCloudSyncService();
    const status = await service.getStatus();

    expect(status).toMatchObject({
      lastSyncAt: 1700000000000,
      lastSyncError: 'network timeout',
      initialSyncState: 'ready',
      failedEntries: 1,
      conflictCopies: 1,
    });
  });
});
