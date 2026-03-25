import { createSyncBootstrapService } from '../syncBootstrapService';
import * as DB from '@/src/database/operations';

const mockApiGet = jest.fn();
const mockUploadFile = jest.fn();
const mockSetInitialSyncState = jest.fn(async () => undefined);

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

jest.mock('@/src/store/syncStore', () => ({
  useSyncStore: {
    getState: () => ({
      setInitialSyncState: mockSetInitialSyncState,
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
          },
        ],
      },
    ]);
    mockUploadFile.mockResolvedValueOnce({
      id: 'media-1',
      url: 'https://cdn.example.com/photo-1.jpg',
    });

    const service = createSyncBootstrapService();
    await service.runInitialFlow('local');

    expect(mockUploadFile).toHaveBeenCalledWith(
      '/media/upload',
      'file:///data/user/0/com.memorycapsule.app/cache/photo-1.jpg',
      'file',
    );
    expect(DB.updateEntry).toHaveBeenNthCalledWith(
      1,
      'photo-local-1',
      expect.objectContaining({
        media: [
          expect.objectContaining({
            uri: 'file:///data/user/0/com.memorycapsule.app/cache/photo-1.jpg',
            remoteUri: 'https://cdn.example.com/photo-1.jpg',
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
});
