import { createSyncBootstrapService } from '../syncBootstrapService';
import * as DB from '@/src/database/operations';

const mockApiGet = jest.fn();
const mockUploadFile = jest.fn();
const mockSetInitialSyncState = jest.fn(async () => undefined);
const mockSetMediaValidationSummary = jest.fn(async () => undefined);
const mockValidateEntries = jest.fn();
const mockReplaceIssues = jest.fn();
const mockShowPhotoRepairPrompt = jest.fn();

jest.mock('@/src/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/src/services/apiClient', () => ({
  getApiClient: jest.fn(() => ({
    get: mockApiGet,
    uploadFile: mockUploadFile,
  })),
}));

jest.mock('../cloudMediaSyncService', () => ({
  createCloudMediaSyncService: jest.fn(() => ({
    validateEntries: mockValidateEntries,
  })),
}));

jest.mock('../showPhotoRepairPrompt', () => ({
  showPhotoRepairPrompt: (...args: unknown[]) => mockShowPhotoRepairPrompt(...args),
}));

jest.mock('@/src/store/syncStore', () => ({
  useSyncStore: {
    getState: () => ({
      setInitialSyncState: mockSetInitialSyncState,
      setMediaValidationSummary: mockSetMediaValidationSummary,
    }),
  },
}));

jest.mock('@/src/store/mediaRepairStore', () => ({
  useMediaRepairStore: {
    getState: () => ({
      replaceIssues: mockReplaceIssues,
    }),
  },
}));

jest.mock('@/src/database/operations', () => ({
  getEntriesCount: jest.fn(async () => 0),
  getAllEntries: jest.fn(async () => []),
  updateEntry: jest.fn(async () => undefined),
  clearAllEntries: jest.fn(async () => undefined),
  restoreEntries: jest.fn(async () => []),
}));

describe('syncBootstrapService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (DB.getEntriesCount as jest.Mock).mockResolvedValue(0);
    (DB.getAllEntries as jest.Mock).mockResolvedValue([]);
    mockApiGet.mockResolvedValue({ entryCount: 0 });
    mockValidateEntries.mockResolvedValue({
      summary: {
        status: 'success',
        total: 0,
        downloaded: 0,
        missing: 0,
        failed: 0,
        suspect: 0,
        repairable: 0,
        lastError: null,
        lastValidatedAt: 1700000000000,
      },
      issues: [],
    });
  });

  it('returns restore flow when local is empty and cloud has data', async () => {
    mockApiGet.mockResolvedValueOnce({ entryCount: 3 });

    const service = createSyncBootstrapService();
    const inspection = await service.inspectInitialState();
    const flow = service.buildInitialFlow(inspection);

    expect(flow).toMatchObject({
      type: 'restoring',
      localCount: 0,
      cloudCount: 3,
    });
  });

  it('returns backup flow when local has data and cloud is empty', async () => {
    (DB.getEntriesCount as jest.Mock).mockResolvedValueOnce(2);

    const service = createSyncBootstrapService();
    const inspection = await service.inspectInitialState();
    const flow = service.buildInitialFlow(inspection);

    expect(flow).toMatchObject({
      type: 'backing-up',
      localCount: 2,
      cloudCount: 0,
    });
  });

  it('returns needs-decision when both local and cloud have data', async () => {
    (DB.getEntriesCount as jest.Mock).mockResolvedValueOnce(2);
    mockApiGet.mockResolvedValueOnce({ entryCount: 4 });

    const service = createSyncBootstrapService();
    const inspection = await service.inspectInitialState();
    const flow = service.buildInitialFlow(inspection);

    expect(flow).toMatchObject({
      type: 'needs-decision',
      localCount: 2,
      cloudCount: 4,
    });
  });

  it('normalizes exported voice media into an array before restoring locally', async () => {
    mockApiGet.mockResolvedValueOnce([
      {
        id: 'voice-1',
        type: 'voice',
        content: '同步语音',
        timestamp: 1700000000000,
        media: JSON.stringify({
          uri: 'https://cdn.example.com/voice-1.m4a',
          mimeType: 'audio/m4a',
          size: 1234,
          duration: 5000,
        }),
        recordingDuration: 5,
      },
    ]);

    const service = createSyncBootstrapService();
    await service.runInitialFlow('cloud');

    expect(DB.restoreEntries).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'voice-1',
        type: 'voice',
        media: [
          expect.objectContaining({
            uri: 'https://cdn.example.com/voice-1.m4a',
            mimeType: 'audio/m4a',
            duration: 5000,
          }),
        ],
      }),
    ]);
  });

  it('normalizes exported photo media string arrays before restoring locally', async () => {
    mockApiGet.mockResolvedValueOnce([
      {
        id: 'photo-1',
        type: 'photo',
        content: '同步图片',
        timestamp: 1700000001000,
        media: JSON.stringify([
          {
            uri: 'https://cdn.example.com/photo-1.jpg',
            mimeType: 'image/jpeg',
            size: 2048,
            thumbnail: 'https://cdn.example.com/photo-1-thumb.jpg',
          },
          {
            uri: 'https://cdn.example.com/photo-2.jpg',
            mimeType: 'image/jpeg',
            size: 4096,
            thumbnail: 'https://cdn.example.com/photo-2-thumb.jpg',
          },
        ]),
      },
    ]);

    const service = createSyncBootstrapService();
    await service.runInitialFlow('cloud');

    expect(DB.restoreEntries).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'photo-1',
        type: 'photo',
        media: [
          expect.objectContaining({
            uri: 'https://cdn.example.com/photo-1.jpg',
            thumbnail: 'https://cdn.example.com/photo-1-thumb.jpg',
          }),
          expect.objectContaining({
            uri: 'https://cdn.example.com/photo-2.jpg',
            thumbnail: 'https://cdn.example.com/photo-2-thumb.jpg',
          }),
        ],
      }),
    ]);
  });

  it('restores cloud entries, validates media, then marks initial sync ready', async () => {
    mockApiGet.mockResolvedValueOnce([
      {
        id: 'photo-restore-1',
        type: 'photo',
        content: '云端恢复图片',
        timestamp: 1700000002000,
        media: [
          {
            uri: 'https://cdn.example.com/photo-restore-1.jpg',
            remoteUri: 'https://cdn.example.com/photo-restore-1.jpg',
            thumbnail: 'https://cdn.example.com/photo-restore-1-thumb.jpg',
            remoteThumbnail: 'https://cdn.example.com/photo-restore-1-thumb.jpg',
            mimeType: 'image/jpeg',
            size: 1024,
          },
        ],
      },
    ]);
    const mediaSummary = {
      summary: {
        status: 'partial' as const,
        total: 2,
        downloaded: 1,
        missing: 1,
        failed: 0,
        suspect: 1,
        repairable: 1,
        lastError: 'missing thumbnail',
        lastValidatedAt: 1700000003000,
      },
      issues: [
        {
          entryId: 'photo-restore-1',
          mediaIndex: 0,
          localMediaId: 'local-restore-1',
          localUri: 'file:///documents/media/photos/original/photo-restore-1.jpg',
          integrityStatus: 'repair_prompt_required' as const,
          integrityReason: 'cloud hash mismatch while local original is still healthy',
        },
      ],
    };
    mockValidateEntries.mockResolvedValueOnce(mediaSummary);

    const service = createSyncBootstrapService();
    await service.runInitialFlow('cloud');

    const restoredEntries = (DB.restoreEntries as jest.Mock).mock.calls[0]?.[0];
    expect(mockValidateEntries).toHaveBeenCalledWith(restoredEntries);
    expect(mockSetMediaValidationSummary).toHaveBeenCalledWith(mediaSummary.summary);
    expect(mockReplaceIssues).toHaveBeenCalledWith(mediaSummary.issues);
    expect(mockShowPhotoRepairPrompt).toHaveBeenCalledTimes(1);
    expect(mockSetInitialSyncState).toHaveBeenNthCalledWith(1, 'restoring');
    expect(mockSetInitialSyncState).toHaveBeenNthCalledWith(2, 'ready');
    expect(mockValidateEntries.mock.invocationCallOrder[0]).toBeLessThan(
      mockSetInitialSyncState.mock.invocationCallOrder[1]
    );
  });

  it('writes validation summary and issues without showing a repair prompt during cloud restore', async () => {
    mockApiGet.mockResolvedValueOnce([
      {
        id: 'photo-restore-no-prompt',
        type: 'photo',
        content: '云端恢复图片',
        timestamp: 1700000002000,
        media: [
          {
            uri: 'https://cdn.example.com/photo-restore-no-prompt.jpg',
            remoteUri: 'https://cdn.example.com/photo-restore-no-prompt.jpg',
            thumbnail: 'https://cdn.example.com/photo-restore-no-prompt-thumb.jpg',
            remoteThumbnail: 'https://cdn.example.com/photo-restore-no-prompt-thumb.jpg',
            mimeType: 'image/jpeg',
            size: 1024,
          },
        ],
      },
    ]);
    const mediaSummary = {
      summary: {
        status: 'partial' as const,
        total: 1,
        downloaded: 1,
        missing: 0,
        failed: 0,
        suspect: 1,
        repairable: 0,
        lastError: null,
        lastValidatedAt: 1700000003001,
      },
      issues: [
        {
          entryId: 'photo-restore-no-prompt',
          mediaIndex: 0,
          localMediaId: 'local-restore-no-prompt',
          localUri: 'file:///documents/media/photos/original/photo-restore-no-prompt.jpg',
          integrityStatus: 'repair_failed' as const,
          integrityReason: 'repair already failed',
        },
      ],
    };
    mockValidateEntries.mockResolvedValueOnce(mediaSummary);

    const service = createSyncBootstrapService();
    await service.runInitialFlow('cloud');

    expect(mockSetMediaValidationSummary).toHaveBeenCalledWith(mediaSummary.summary);
    expect(mockReplaceIssues).toHaveBeenCalledWith(mediaSummary.issues);
    expect(mockShowPhotoRepairPrompt).not.toHaveBeenCalled();
  });

  it('marks media validation failed and still finishes cloud restore when validation rejects', async () => {
    mockApiGet.mockResolvedValueOnce([
      {
        id: 'photo-restore-2',
        type: 'photo',
        content: '云端恢复异常图片',
        timestamp: 1700000004000,
        media: [
          {
            uri: 'https://cdn.example.com/photo-restore-2.jpg',
            remoteUri: 'https://cdn.example.com/photo-restore-2.jpg',
            mimeType: 'image/jpeg',
            size: 2048,
          },
        ],
      },
    ]);
    mockValidateEntries.mockRejectedValueOnce(new Error('media broken'));

    const service = createSyncBootstrapService();

    await expect(service.runInitialFlow('cloud')).resolves.toBeUndefined();

    expect(mockSetMediaValidationSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        total: 1,
        downloaded: 0,
        missing: 0,
        failed: 1,
        suspect: 0,
        repairable: 0,
        lastError: 'media broken',
        lastValidatedAt: expect.any(Number),
      }),
    );
    expect(mockReplaceIssues).toHaveBeenCalledWith([]);
    expect(mockShowPhotoRepairPrompt).not.toHaveBeenCalled();
    expect(mockSetInitialSyncState).toHaveBeenNthCalledWith(1, 'restoring');
    expect(mockSetInitialSyncState).toHaveBeenNthCalledWith(2, 'ready');
  });

  it('ignores deleted entries when deriving failed media validation totals during cloud restore', async () => {
    mockApiGet.mockResolvedValueOnce([
      {
        id: 'photo-restore-live',
        type: 'photo',
        content: '有效图片',
        timestamp: 1700000004000,
        media: [
          {
            uri: 'https://cdn.example.com/photo-live.jpg',
            remoteUri: 'https://cdn.example.com/photo-live.jpg',
            mimeType: 'image/jpeg',
            size: 2048,
          },
        ],
      },
      {
        id: 'photo-restore-deleted',
        type: 'photo',
        content: '已删除图片',
        timestamp: 1700000005000,
        deleted: true,
        media: [
          {
            uri: 'https://cdn.example.com/photo-deleted.jpg',
            remoteUri: 'https://cdn.example.com/photo-deleted.jpg',
            remoteThumbnail: 'https://cdn.example.com/photo-deleted-thumb.jpg',
            mimeType: 'image/jpeg',
            size: 1024,
          },
        ],
      },
    ]);
    mockValidateEntries.mockRejectedValueOnce(new Error('media broken'));

    const service = createSyncBootstrapService();

    await expect(service.runInitialFlow('cloud')).resolves.toBeUndefined();

    expect(mockSetMediaValidationSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        total: 1,
        downloaded: 0,
        missing: 0,
        failed: 1,
        suspect: 0,
        repairable: 0,
        lastError: 'media broken',
        lastValidatedAt: expect.any(Number),
      }),
    );
  });

  it('uploads local photo media before marking entries pending for first cloud backup', async () => {
    (DB.getAllEntries as jest.Mock).mockResolvedValueOnce([
      {
        id: 'photo-local-1',
        type: 'photo',
        content: '本地图片',
        timestamp: 1700000001000,
        syncStatus: 'synced',
        media: [
          {
            uri: 'file:///data/user/0/com.memorycapsule.app/cache/photo-1.jpg',
            mimeType: 'image/jpeg',
            size: 2048,
            metadata: {
              localMediaId: 'bootstrap-local-media-1',
              sourceHash: 'source-hash-1',
              persistedHash: 'persisted-hash-1',
              width: 1200,
              height: 900,
              createdAt: 1700000001000,
              modifiedAt: 1700000001000,
            },
          },
        ],
      },
    ]);
    mockUploadFile.mockResolvedValueOnce({
      id: 'media-1',
      url: 'https://cdn.example.com/photo-1.jpg',
      remoteHash: 'remote-hash-1',
      validationStatus: 'healthy',
      validationError: null,
    });

    const service = createSyncBootstrapService();
    await service.runInitialFlow('local');

    expect(mockUploadFile).toHaveBeenCalledWith(
      '/media/upload',
      'file:///data/user/0/com.memorycapsule.app/cache/photo-1.jpg',
      'file',
      {
        metadata: {
          traceId: 'bootstrap-local-media-1',
          localMediaId: 'bootstrap-local-media-1',
          persistedHash: 'persisted-hash-1',
          sourceHash: 'source-hash-1',
          size: 2048,
          width: 1200,
          height: 900,
        },
      },
    );
    expect(DB.updateEntry).toHaveBeenNthCalledWith(
      1,
      'photo-local-1',
      expect.objectContaining({
        media: [
          expect.objectContaining({
            uri: 'file:///data/user/0/com.memorycapsule.app/cache/photo-1.jpg',
            remoteUri: 'https://cdn.example.com/photo-1.jpg',
            metadata: expect.objectContaining({
              remoteHash: 'remote-hash-1',
              integrityStatus: 'healthy',
              integrityReason: undefined,
            }),
          }),
        ],
      }),
    );
    expect(DB.updateEntry).toHaveBeenNthCalledWith(
      2,
      'photo-local-1',
      expect.objectContaining({
        syncStatus: 'pending',
        syncOp: 'create',
      }),
    );
  });

  it('normalizes stale local uri to remoteUri when restoring from cloud', async () => {
    const cloudEntry = {
      id: 'entry1',
      type: 'photo' as const,
      content: '',
      media: [
        {
          uri: 'file:///old-device/media/photos/original/photo.jpg',
          remoteUri: 'https://cdn.example.com/photo.jpg',
          mimeType: 'image/jpeg',
          size: 1000,
        },
      ],
      syncStatus: 'synced' as const,
      timestamp: Date.now(),
      updatedAt: Date.now(),
    };
    mockApiGet.mockResolvedValueOnce([cloudEntry]);

    const service = createSyncBootstrapService();
    await service.runInitialFlow('cloud');

    const restoredEntries = (DB.restoreEntries as jest.Mock).mock.calls[0][0];
    expect(restoredEntries[0].media[0].uri).toBe('https://cdn.example.com/photo.jpg');
  });

  it('does not re-upload media that already has a remote uri during first cloud backup', async () => {
    (DB.getAllEntries as jest.Mock).mockResolvedValueOnce([
      {
        id: 'photo-local-2',
        type: 'photo',
        content: '本地图片',
        timestamp: 1700000002000,
        syncStatus: 'synced',
        media: [
          {
            uri: 'file:///data/user/0/com.memorycapsule.app/cache/photo-2.jpg',
            remoteUri: 'https://cdn.example.com/photo-2.jpg',
            mimeType: 'image/jpeg',
            size: 4096,
          },
        ],
      },
    ]);

    const service = createSyncBootstrapService();
    await service.runInitialFlow('local');

    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(DB.updateEntry).toHaveBeenCalledTimes(1);
    expect(DB.updateEntry).toHaveBeenCalledWith(
      'photo-local-2',
      expect.objectContaining({
        syncStatus: 'pending',
        syncOp: 'create',
      }),
    );
  });

  it('skips media pre-upload for entries already marked pending delete during first cloud backup', async () => {
    (DB.getAllEntries as jest.Mock).mockResolvedValueOnce([
      {
        id: 'photo-local-delete',
        type: 'photo',
        content: '待删除图片',
        timestamp: 1700000002100,
        syncStatus: 'pending_delete',
        syncOp: 'delete',
        deleted: true,
        media: [
          {
            uri: 'file:///data/user/0/com.memorycapsule.app/cache/photo-delete.jpg',
            mimeType: 'image/jpeg',
            size: 4096,
            metadata: {
              localMediaId: 'bootstrap-local-media-delete',
              sourceHash: 'source-hash-delete',
              persistedHash: 'persisted-hash-delete',
              width: 1200,
              height: 900,
              createdAt: 1700000002100,
              modifiedAt: 1700000002100,
            },
          },
        ],
      },
    ]);

    const service = createSyncBootstrapService();
    await service.runInitialFlow('local');

    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(DB.updateEntry).toHaveBeenCalledTimes(1);
    expect(DB.updateEntry).toHaveBeenCalledWith(
      'photo-local-delete',
      expect.objectContaining({
        syncStatus: 'pending_delete',
        syncOp: 'delete',
        deleted: true,
      }),
    );
  });

  it('resets initial sync state when first local backup fails during media upload', async () => {
    (DB.getAllEntries as jest.Mock).mockResolvedValueOnce([
      {
        id: 'photo-local-fail',
        type: 'photo',
        content: '本地图片',
        timestamp: 1700000002000,
        syncStatus: 'synced',
        media: [
          {
            uri: 'file:///data/user/0/com.memorycapsule.app/cache/photo-fail.jpg',
            mimeType: 'image/jpeg',
            size: 4096,
            metadata: {
              localMediaId: 'bootstrap-local-media-fail',
              sourceHash: 'source-hash-fail',
              persistedHash: 'persisted-hash-fail',
              width: 1200,
              height: 900,
              createdAt: 1700000002000,
              modifiedAt: 1700000002000,
            },
          },
        ],
      },
    ]);
    mockUploadFile.mockRejectedValueOnce(new Error('upload unavailable'));

    const service = createSyncBootstrapService();

    await expect(service.runInitialFlow('local')).rejects.toThrow('upload unavailable');

    expect(mockSetInitialSyncState).toHaveBeenNthCalledWith(1, 'backing-up');
    expect(mockSetInitialSyncState).toHaveBeenNthCalledWith(2, 'ready');
    expect(DB.updateEntry).not.toHaveBeenCalled();
  });

  it('resets initial sync state when cloud restore export fails before local restore begins', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('export unavailable'));

    const service = createSyncBootstrapService();

    await expect(service.runInitialFlow('cloud')).rejects.toThrow('export unavailable');

    expect(mockSetInitialSyncState).toHaveBeenNthCalledWith(1, 'restoring');
    expect(mockSetInitialSyncState).toHaveBeenNthCalledWith(2, 'ready');
    expect(DB.clearAllEntries).not.toHaveBeenCalled();
    expect(DB.restoreEntries).not.toHaveBeenCalled();
  });
});
