import { createCloudSyncService } from '../cloudSyncService';
import * as DB from '@/src/database/operations';
import { useMediaRepairStore } from '@/src/store/mediaRepairStore';
import { useSyncStore } from '@/src/store/syncStore';
import { getApiClient } from '@/src/services/apiClient';
import { createCloudMediaSyncService } from '../cloudMediaSyncService';

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

const mockRefreshIndicator = jest.fn(async () => undefined);
const mockMonitorStartRun = jest.fn();
const mockMonitorSetPhase = jest.fn();
const mockMonitorUpdateEntryProgress = jest.fn();
const mockMonitorUpdateMediaProgress = jest.fn();
const mockMonitorFinishRun = jest.fn();

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
  withScope: jest.fn((scope: string, key: string) => `${scope}:${key}`),
}));

jest.mock('@/src/services/backendEnvironmentService', () => ({
  getCurrentServerUrl: jest.fn().mockResolvedValue('https://server-a.example.com'),
  getServerKey: jest.fn(() => 'env_https_server_a_example_com'),
}));

jest.mock('@/src/database/sqlite', () => ({
  getDatabase: jest.fn(() => ({})),
}));

jest.mock('@/src/database/operations', () => ({
  getEntriesBySyncStatus: jest.fn(async () => []),
  getCloudSyncIndicatorSummary: jest.fn(async () => ({
    pendingEntries: 0,
    pendingUploads: 0,
    uploadingEntries: 0,
    failedEntries: 0,
  })),
  getAllEntries: jest.fn(async () => []),
  getEntryById: jest.fn(async () => null),
  restoreEntries: jest.fn(async () => []),
  updateEntry: jest.fn(async () => undefined),
  deleteEntry: jest.fn(async () => undefined),
  addEntry: jest.fn(async () => ({ id: 'conflict-copy' })),
}));

jest.mock('@/src/store/cloudSyncIndicatorStore', () => ({
  useCloudSyncIndicatorStore: {
    getState: () => ({
      refresh: mockRefreshIndicator,
    }),
  },
}));

jest.mock('@/src/store/cloudSyncMonitorStore', () => ({
  useCloudSyncMonitorStore: {
    getState: () => ({
      startRun: mockMonitorStartRun,
      setPhase: mockMonitorSetPhase,
      updateEntryProgress: mockMonitorUpdateEntryProgress,
      updateMediaProgress: mockMonitorUpdateMediaProgress,
      finishRun: mockMonitorFinishRun,
    }),
  },
}));

const mockPost = jest.fn();
jest.mock('@/src/services/apiClient', () => {
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

const mockValidateEntries = jest.fn();
const mockReplaceIssues = jest.fn();
const mockShowPhotoRepairPrompt = jest.fn();
jest.mock('../cloudMediaSyncService', () => ({
  createCloudMediaSyncService: jest.fn(() => ({
    validateEntries: mockValidateEntries,
  })),
}));

jest.mock('../showPhotoRepairPrompt', () => ({
  showPhotoRepairPrompt: (...args: unknown[]) => mockShowPhotoRepairPrompt(...args),
}));

jest.mock('@/src/store/mediaRepairStore', () => ({
  useMediaRepairStore: {
    getState: () => ({
      replaceIssues: mockReplaceIssues,
    }),
  },
}));

describe('cloudSyncService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRefreshIndicator.mockImplementation(async () => undefined);
    (getApiClient as jest.Mock).mockReturnValue({ post: mockPost });
    (createCloudMediaSyncService as jest.Mock).mockReturnValue({
      validateEntries: mockValidateEntries,
    });
    (DB.getEntriesBySyncStatus as jest.Mock).mockImplementation(async () => []);
    (DB.getCloudSyncIndicatorSummary as jest.Mock).mockImplementation(async () => ({
      pendingEntries: 0,
      pendingUploads: 0,
      uploadingEntries: 0,
      failedEntries: 0,
    }));
    (DB.getAllEntries as jest.Mock).mockImplementation(async () => []);
    (DB.getEntryById as jest.Mock).mockImplementation(async () => null);
    (DB.restoreEntries as jest.Mock).mockImplementation(async () => []);
    (DB.updateEntry as jest.Mock).mockImplementation(async () => undefined);
    (DB.deleteEntry as jest.Mock).mockImplementation(async () => undefined);
    (DB.addEntry as jest.Mock).mockImplementation(async () => ({ id: 'conflict-copy' }));
    useSyncStore.setState({
      syncCursor: 0,
      lastSyncAt: null,
      lastSyncError: null,
      initialSyncState: 'idle',
      lastMediaValidationSummary: null,
      isSyncing: false,
      isLoaded: true,
    });
  });

  it('batches sync requests in groups of five and reports entry progress after each batch', async () => {
    const pendingEntries = Array.from({ length: 6 }, (_, index) => ({
      id: `entry-${index + 1}`,
      type: 'text' as const,
      content: `content-${index + 1}`,
      timestamp: 1000 + index,
      syncStatus: 'pending' as const,
      syncOp: 'update' as const,
      updatedAt: 2000 + index,
      baseUpdatedAt: 1500 + index,
    }));

    (DB.getEntriesBySyncStatus as jest.Mock).mockResolvedValueOnce(pendingEntries);
    mockPost
      .mockResolvedValueOnce({
        newCursor: 10,
        results: pendingEntries.slice(0, 5).map((entry) => ({
          changeId: `${entry.id}:update:${entry.updatedAt}`,
          status: 'applied' as const,
          entryId: entry.id,
        })),
        serverChanges: [],
        conflicts: [],
      })
      .mockResolvedValueOnce({
        newCursor: 12,
        results: [
          {
            changeId: `${pendingEntries[5].id}:update:${pendingEntries[5].updatedAt}`,
            status: 'applied' as const,
            entryId: pendingEntries[5].id,
          },
        ],
        serverChanges: [],
        conflicts: [],
      });

    await createCloudSyncService().syncNow();

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost.mock.calls[0]?.[1]).toMatchObject({
      cursor: 0,
      clientChanges: pendingEntries.slice(0, 5).map((entry) => expect.objectContaining({
        changeId: `${entry.id}:update:${entry.updatedAt}`,
        entry: expect.objectContaining({ id: entry.id }),
      })),
    });
    expect(mockPost.mock.calls[1]?.[1]).toMatchObject({
      cursor: 10,
      clientChanges: [
        expect.objectContaining({
          changeId: `${pendingEntries[5].id}:update:${pendingEntries[5].updatedAt}`,
          entry: expect.objectContaining({ id: pendingEntries[5].id }),
        }),
      ],
    });
    expect(mockMonitorUpdateEntryProgress).toHaveBeenNthCalledWith(1, 5, 6, null);
    expect(mockMonitorUpdateEntryProgress).toHaveBeenNthCalledWith(2, 6, 6, null);
    expect(useSyncStore.getState().syncCursor).toBe(12);
  });

  it('reports monitor lifecycle on successful syncNow', async () => {
    mockPost.mockResolvedValueOnce({
      newCursor: 3,
      results: [],
      serverChanges: [],
      conflicts: [],
    });

    await createCloudSyncService().syncNow();

    expect(mockMonitorStartRun).toHaveBeenCalledWith(expect.stringMatching(/^sync-\d+$/));
    expect(mockMonitorSetPhase).toHaveBeenNthCalledWith(1, 'sync-entries', 2);
    expect(mockMonitorFinishRun).toHaveBeenCalledWith({
      status: 'success',
      failedPhase: null,
      failedItems: [],
    });
  });

  it('reports monitor lifecycle on failed syncNow', async () => {
    (DB.getEntriesBySyncStatus as jest.Mock).mockRejectedValueOnce(new Error('sync failed'));

    await expect(createCloudSyncService().syncNow()).rejects.toThrow('sync failed');

    expect(mockMonitorStartRun).toHaveBeenCalledWith(expect.stringMatching(/^sync-\d+$/));
    expect(mockMonitorSetPhase).toHaveBeenNthCalledWith(1, 'sync-entries', 2);
    expect(mockMonitorFinishRun).toHaveBeenCalledWith({
      status: 'failed',
      failedPhase: 'sync-entries',
      failedItems: [],
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
    (DB.getEntryById as jest.Mock).mockResolvedValue({
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

  it('applies the server version without creating a conflict-local-copy when local update is ignored', async () => {
    mockPost.mockResolvedValueOnce({
      newCursor: 12,
      results: [
        { changeId: 'change-2', status: 'ignored', entryId: 'entry-3' },
      ],
      serverChanges: [
        {
          changeId: 12,
          op: 'update',
          entry: {
            id: 'entry-3',
            type: 'text',
            content: 'server version',
            tags: ['a'],
            createdAt: '2026-03-22T10:00:00Z',
            updatedAt: '2026-03-22T10:05:00Z',
          },
        },
      ],
      conflicts: [],
    });
    (DB.getEntryById as jest.Mock).mockResolvedValue({ id: 'entry-3' });

    const service = createCloudSyncService();
    await service.syncNow();

    expect(DB.updateEntry).toHaveBeenCalledWith('entry-3', expect.objectContaining({
      content: 'server version',
      syncStatus: 'synced',
    }));
    expect(DB.addEntry).not.toHaveBeenCalled();
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
      isSyncing: false,
      isLoaded: true,
    });
    (DB.getCloudSyncIndicatorSummary as jest.Mock).mockResolvedValueOnce({
      pendingEntries: 2,
      pendingUploads: 3,
      uploadingEntries: 1,
      failedEntries: 1,
    });
    (DB.getAllEntries as jest.Mock).mockResolvedValueOnce([
      { id: 'a', type: 'text', content: '', timestamp: 1, syncStatus: 'synced' },
      { id: 'b', type: 'text', content: '', timestamp: 2, syncStatus: 'conflict-local-copy', conflictedCopyOf: 'a' },
    ]);

    const service = createCloudSyncService();
    const status = await service.getStatus();

    expect(status).toMatchObject({
      lastSyncAt: 1700000000000,
      lastSyncError: 'network timeout',
      initialSyncState: 'ready',
      pendingEntries: 2,
      pendingUploads: 3,
      uploadingEntries: 1,
      failedEntries: 1,
      conflictCopies: 1,
    });
  });

  it('normalizes stale local media uri to remoteUri when applying server changes', async () => {
    const serverChange = {
      changeId: 1,
      op: 'create' as const,
      entry: {
        id: 'entry-photo-normalize',
        type: 'photo' as const,
        content: '',
        media: JSON.stringify([
          {
            uri: 'file:///old-device/media/photos/original/photo.jpg',
            remoteUri: 'https://cdn.example.com/photo.jpg',
            mimeType: 'image/jpeg',
            size: 1000,
          },
        ]),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    mockPost.mockResolvedValueOnce({
      newCursor: 1,
      results: [],
      serverChanges: [serverChange],
      conflicts: [],
    });

    const service = createCloudSyncService();
    await service.syncNow();

    // restoreEntries 被调用时，media[0].uri 应已归一化
    const restoredEntries = (DB.restoreEntries as jest.Mock).mock.calls[0]?.[0];
    expect(restoredEntries?.[0]?.media?.[0]?.uri).toBe('https://cdn.example.com/photo.jpg');
  });

  it('stores a partial media summary when inbound server media fails validation', async () => {
    const photoServerChange = {
      changeId: 1,
      op: 'create' as const,
      entry: {
        id: 'entry-photo-validate',
        type: 'photo' as const,
        content: '',
        media: JSON.stringify([
          {
            uri: 'file:///old-device/media/photos/original/photo.jpg',
            remoteUri: 'https://cdn.example.com/photo.jpg',
            mimeType: 'image/jpeg',
            size: 1000,
          },
        ]),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    mockPost.mockResolvedValueOnce({
      newCursor: 10,
      results: [],
      serverChanges: [photoServerChange],
      conflicts: [],
    });

    mockValidateEntries.mockResolvedValueOnce({
      summary: {
        status: 'partial',
        total: 1,
        downloaded: 0,
        missing: 1,
        failed: 0,
        suspect: 1,
        repairable: 1,
        lastError: 'missing file',
        lastValidatedAt: 1234,
      },
      issues: [
        {
          entryId: 'entry-photo-validate',
          mediaIndex: 0,
          localMediaId: 'local-1',
          localUri: 'file:///documents/media/photos/original/photo.jpg',
          integrityStatus: 'repair_prompt_required',
          integrityReason: 'cloud hash mismatch while local original is still healthy',
        },
      ],
    });

    await createCloudSyncService().syncNow();

    expect(useSyncStore.getState().lastMediaValidationSummary?.status).toBe('partial');
    expect(useSyncStore.getState().lastMediaValidationSummary?.suspect).toBe(1);
    expect(mockReplaceIssues).toHaveBeenCalledWith([
      expect.objectContaining({
        entryId: 'entry-photo-validate',
      }),
    ]);
    expect(mockShowPhotoRepairPrompt).toHaveBeenCalledTimes(1);
  });

  it('includes conflicted server entries with remote media in media validation', async () => {
    const conflictPayload = {
      changeId: 'change-conflict-photo',
      entryId: 'entry-conflict-photo',
      reason: 'media conflict',
      serverEntry: {
        id: 'entry-conflict-photo',
        type: 'photo' as const,
        content: '',
        media: JSON.stringify([
          {
            uri: 'file:///old-device/media/photos/original/conflict-photo.jpg',
            remoteUri: 'https://cdn.example.com/conflict-photo.jpg',
            mimeType: 'image/jpeg',
            size: 2048,
          },
        ]),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      clientEntry: {
        id: 'entry-conflict-photo',
        type: 'photo' as const,
        content: '',
        media: JSON.stringify([
          {
            uri: 'file:///current-device/media/photos/original/conflict-photo.jpg',
            mimeType: 'image/jpeg',
            size: 2048,
          },
        ]),
        updatedAt: new Date().toISOString(),
      },
    };

    mockPost.mockResolvedValueOnce({
      newCursor: 11,
      results: [
        { changeId: 'change-conflict-photo', status: 'conflicted', entryId: 'entry-conflict-photo' },
      ],
      serverChanges: [],
      conflicts: [conflictPayload],
    });
    (DB.getEntryById as jest.Mock).mockResolvedValue({ id: 'entry-conflict-photo', media: [] });
    mockValidateEntries.mockResolvedValueOnce({
      summary: {
        status: 'success',
        total: 1,
        downloaded: 1,
        missing: 0,
        failed: 0,
        suspect: 0,
        repairable: 0,
        lastError: null,
        lastValidatedAt: 2345,
      },
      issues: [],
    });

    await createCloudSyncService().syncNow();

    expect(mockValidateEntries).toHaveBeenCalledTimes(1);
    expect(mockValidateEntries).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'entry-conflict-photo',
        type: 'photo',
        media: [
          expect.objectContaining({
            remoteUri: 'https://cdn.example.com/conflict-photo.jpg',
          }),
        ],
      }),
    ]);
  });

  it('does not create a conflict-local-copy when a legacy conflict payload is returned', async () => {
    mockPost.mockResolvedValueOnce({
      newCursor: 13,
      results: [
        { changeId: 'change-legacy-conflict', status: 'conflicted', entryId: 'entry-legacy-conflict' },
      ],
      serverChanges: [],
      conflicts: [
        {
          changeId: 'change-legacy-conflict',
          entryId: 'entry-legacy-conflict',
          reason: 'server_newer_than_base',
          serverEntry: {
            id: 'entry-legacy-conflict',
            type: 'text',
            content: 'server wins',
            tags: ['srv'],
            createdAt: '2026-03-22T10:00:00Z',
            updatedAt: '2026-03-22T10:05:00Z',
          },
          clientEntry: {
            id: 'entry-legacy-conflict',
            type: 'text',
            content: 'client loses',
            tags: ['cli'],
            updatedAt: '2026-03-22T10:04:00Z',
          },
        },
      ],
    });
    (DB.getEntryById as jest.Mock).mockResolvedValue({ id: 'entry-legacy-conflict' });

    await createCloudSyncService().syncNow();

    expect(DB.updateEntry).toHaveBeenCalledWith('entry-legacy-conflict', expect.objectContaining({
      content: 'server wins',
      syncStatus: 'synced',
    }));
    expect(DB.addEntry).not.toHaveBeenCalled();
  });

  it('resets partial media validation summary to success when sync completes with no new media entries', async () => {
    useSyncStore.setState({
      lastMediaValidationSummary: {
        status: 'partial',
        total: 3,
        downloaded: 1,
        missing: 2,
        failed: 0,
        suspect: 1,
        repairable: 1,
        lastError: 'missing file',
        lastValidatedAt: 1000,
      },
    });

    mockPost.mockResolvedValueOnce({
      newCursor: 12,
      results: [],
      serverChanges: [
        {
          changeId: 1,
          op: 'update' as const,
          entry: {
            id: 'entry-text-only',
            type: 'text' as const,
            content: 'server text',
            tags: ['note'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      ],
      conflicts: [],
    });

    (DB.getEntryById as jest.Mock).mockResolvedValueOnce({ id: 'entry-text-only' });

    await createCloudSyncService().syncNow();

    expect(mockValidateEntries).not.toHaveBeenCalled();
    expect(useSyncStore.getState().lastMediaValidationSummary?.status).toBe('success');
    expect(mockShowPhotoRepairPrompt).not.toHaveBeenCalled();
  });

  it('sends remoteUri as uri in server payload when remoteUri exists', async () => {
    const pendingEntry = {
      id: 'entry-photo-send',
      type: 'photo' as const,
      content: '',
      media: [
        {
          uri: 'file:///current-device/media/photos/original/photo.jpg',
          remoteUri: 'https://cdn.example.com/photo.jpg',
          mimeType: 'image/jpeg',
          size: 1000,
        },
      ],
      syncStatus: 'pending' as const,
      syncOp: 'create' as const,
      timestamp: 1000000,
      updatedAt: 1000000,
      baseUpdatedAt: 1000000,
    };

    (DB.getEntriesBySyncStatus as jest.Mock).mockResolvedValueOnce([pendingEntry]);
    mockPost.mockResolvedValueOnce({
      newCursor: 2,
      results: [
        {
          changeId: `${pendingEntry.id}:create:${pendingEntry.updatedAt}`,
          status: 'applied',
          entryId: pendingEntry.id,
        },
      ],
      serverChanges: [],
      conflicts: [],
    });

    const service = createCloudSyncService();
    await service.syncNow();

    const sentBody = mockPost.mock.calls[0]?.[1];
    const sentMedia = JSON.parse(sentBody?.clientChanges?.[0]?.entry?.media ?? '[]');
    expect(sentMedia[0]?.uri).toBe('https://cdn.example.com/photo.jpg');
  });

  it('marks sync as in flight during syncNow and refreshes the indicator after settle', async () => {
    mockPost.mockImplementationOnce(async () => {
      expect(useSyncStore.getState().isSyncing).toBe(true);
      return {
        newCursor: 0,
        results: [],
        serverChanges: [],
        conflicts: [],
      };
    });

    const service = createCloudSyncService();
    await service.syncNow();

    expect(useSyncStore.getState().isSyncing).toBe(false);
    expect(mockRefreshIndicator).toHaveBeenCalled();
  });

  it('runs a follow-up sync when syncNow is requested again during an in-flight sync', async () => {
    const firstSyncStarted = createDeferred<void>();
    let resolveFirstSync: ((value: {
      newCursor: number;
      results: Array<{ changeId: string; status: 'applied'; entryId: string }>;
      serverChanges: [];
      conflicts: [];
    }) => void) | null = null;

    (DB.getEntriesBySyncStatus as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'entry-photo-tail',
          type: 'photo',
          content: '',
          media: [
            {
              uri: 'file:///current-device/media/photos/original/photo.jpg',
              remoteUri: 'https://cdn.example.com/photo-tail.jpg',
              mimeType: 'image/jpeg',
              size: 1000,
            },
          ],
          syncStatus: 'pending',
          syncOp: 'create',
          timestamp: 1000001,
          updatedAt: 1000001,
          baseUpdatedAt: 1000001,
        },
      ]);

    mockPost
      .mockImplementationOnce(() => new Promise((resolve) => {
        firstSyncStarted.resolve();
        resolveFirstSync = resolve;
      }))
      .mockResolvedValueOnce({
        newCursor: 2,
        results: [
          {
            changeId: 'entry-photo-tail:create:1000001',
            status: 'applied',
            entryId: 'entry-photo-tail',
          },
        ],
        serverChanges: [],
        conflicts: [],
      });

    const service = createCloudSyncService();
    const firstRun = service.syncNow();
    await firstSyncStarted.promise;
    const secondRun = service.syncNow();

    expect(mockPost).toHaveBeenCalledTimes(1);

    resolveFirstSync?.({
      newCursor: 1,
      results: [],
      serverChanges: [],
      conflicts: [],
    });

    await Promise.all([firstRun, secondRun]);

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost.mock.calls[1]?.[1]).toMatchObject({
      clientChanges: [
        expect.objectContaining({
          changeId: 'entry-photo-tail:create:1000001',
          op: 'create',
        }),
      ],
    });
  });
});
