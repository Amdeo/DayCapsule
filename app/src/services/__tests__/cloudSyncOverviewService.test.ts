import { waitFor } from '@testing-library/react-native';
import { createCloudSyncOverviewService } from '../cloudSyncOverviewService';
import * as DB from '@/src/database/operations';
import { createCloudSyncService } from '../cloudSyncService';
import { getApiClient } from '@/src/services/apiClient';
import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '@/src/utils/logger';

jest.mock('@/src/database/sqlite', () => ({
  getDatabase: jest.fn(() => ({})),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/src/database/operations', () => ({
  getLocalSyncOverviewCounts: jest.fn(async () => ({
    entryCount: 0,
    photoCount: 0,
    voiceCount: 0,
  })),
  getAllEntries: jest.fn(async () => []),
}));

const mockGetStatus = jest.fn();
jest.mock('../cloudSyncService', () => ({
  createCloudSyncService: jest.fn(() => ({
    getStatus: mockGetStatus,
  })),
}));

const mockSyncStoreGetState = jest.fn();
jest.mock('@/src/store/syncStore', () => ({
  useSyncStore: {
    getState: () => mockSyncStoreGetState(),
  },
}));

const mockGet = jest.fn();
jest.mock('@/src/services/apiClient', () => ({
  getApiClient: jest.fn(() => ({
    get: mockGet,
  })),
}));

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
}));

describe('cloudSyncOverviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncStoreGetState.mockReturnValue({
      lastMediaValidationSummary: null,
    });
  });

  it('limits concurrent local media stat requests', async () => {
    mockGetStatus.mockResolvedValueOnce({
      lastSyncAt: null,
      lastSyncError: null,
      initialSyncState: 'idle',
      pendingEntries: 0,
      pendingUploads: 0,
      uploadingEntries: 0,
      failedEntries: 0,
      conflictCopies: 0,
    });
    (DB.getLocalSyncOverviewCounts as jest.Mock).mockResolvedValueOnce({
      entryCount: 10,
      photoCount: 10,
      voiceCount: 0,
    });
    (DB.getAllEntries as jest.Mock).mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, index) => ({
        id: `e${index}`,
        type: 'photo',
        content: '',
        timestamp: index,
        syncStatus: 'synced',
        media: [
          {
            uri: `file:///media-${index}.jpg`,
            mimeType: 'image/jpeg',
            size: 1,
          },
        ],
      })),
    );
    mockGet.mockResolvedValueOnce({
      entryCount: 0,
      photoCount: 0,
      voiceCount: 0,
      mediaCount: 0,
      mediaBytes: 0,
    });

    let active = 0;
    let maxActive = 0;
    let resolvedCount = 0;
    const resolvers: Array<() => void> = [];
    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          resolvers.push(() => {
            active -= 1;
            resolvedCount += 1;
            resolve({ exists: true, size: 1 });
          });
        }),
    );

    const service = createCloudSyncOverviewService();
    const snapshotPromise = service.getSnapshot();

    await waitFor(() => {
      expect(resolvers.length).toBeGreaterThan(0);
    });

    expect(maxActive).toBeLessThanOrEqual(4);

    while (resolvedCount < 10) {
      const previousResolvedCount = resolvedCount;
      const pendingResolvers = resolvers.splice(0);
      pendingResolvers.forEach((resolve) => resolve());
      await waitFor(() => {
        expect(resolvedCount).toBeGreaterThan(previousResolvedCount);
      });
    }

    const snapshot = await snapshotPromise;

    expect(snapshot.local.mediaBytes).toBe(10);
  });

  it('merges local counts, local media bytes, cloud overview and queue status', async () => {
    mockGetStatus.mockResolvedValueOnce({
      lastSyncAt: 1700000000000,
      lastSyncError: null,
      initialSyncState: 'ready',
      pendingEntries: 2,
      pendingUploads: 3,
      uploadingEntries: 1,
      failedEntries: 4,
      conflictCopies: 1,
    });
    mockSyncStoreGetState.mockReturnValueOnce({
      lastMediaValidationSummary: {
        status: 'partial',
        total: 3,
        downloaded: 2,
        missing: 1,
        failed: 0,
        lastError: 'missing photo',
        lastValidatedAt: 1700000001234,
      },
    });
    (DB.getLocalSyncOverviewCounts as jest.Mock).mockResolvedValueOnce({
      entryCount: 7,
      photoCount: 3,
      voiceCount: 2,
    });
    (DB.getAllEntries as jest.Mock).mockResolvedValueOnce([
      {
        id: 'e1',
        type: 'photo',
        content: '',
        timestamp: 1,
        syncStatus: 'synced',
        media: [
          { uri: 'file:///a.jpg', thumbnail: 'file:///a-thumb.jpg', mimeType: 'image/jpeg', size: 100 },
        ],
      },
      {
        id: 'e2',
        type: 'voice',
        content: '',
        timestamp: 2,
        syncStatus: 'synced',
        media: [
          { uri: 'file:///v.m4a', mimeType: 'audio/m4a', size: 200 },
        ],
      },
    ]);
    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (uri: string) => {
      const sizeMap: Record<string, number> = {
        'file:///a.jpg': 500,
        'file:///a-thumb.jpg': 100,
        'file:///v.m4a': 900,
      };
      return { exists: true, size: sizeMap[uri] ?? 0 };
    });
    mockGet.mockResolvedValueOnce({
      entryCount: 20,
      photoCount: 8,
      voiceCount: 5,
      mediaCount: 12,
      mediaBytes: 2048,
    });

    const service = createCloudSyncOverviewService();
    const snapshot = await service.getSnapshot();

    expect(createCloudSyncService).toHaveBeenCalled();
    expect(getApiClient).toHaveBeenCalled();
    expect(snapshot).toEqual({
      lastSyncAt: 1700000000000,
      lastSyncError: null,
      pendingEntries: 2,
      pendingUploads: 3,
      uploadingEntries: 1,
      failedEntries: 4,
      conflictCopies: 1,
      lastMediaValidationSummary: {
        status: 'partial',
        total: 3,
        downloaded: 2,
        missing: 1,
        failed: 0,
        lastError: 'missing photo',
        lastValidatedAt: 1700000001234,
      },
      local: {
        entryCount: 7,
        photoCount: 3,
        voiceCount: 2,
        mediaBytes: 1500,
      },
      cloud: {
        entryCount: 20,
        photoCount: 8,
        voiceCount: 5,
        mediaCount: 12,
        mediaBytes: 2048,
      },
      cloudError: null,
    });
  });

  it('keeps local and queue status when cloud overview request fails', async () => {
    mockGetStatus.mockResolvedValueOnce({
      lastSyncAt: null,
      lastSyncError: 'timeout',
      initialSyncState: 'idle',
      pendingEntries: 1,
      pendingUploads: 0,
      uploadingEntries: 0,
      failedEntries: 0,
      conflictCopies: 0,
    });
    (DB.getLocalSyncOverviewCounts as jest.Mock).mockResolvedValueOnce({
      entryCount: 1,
      photoCount: 0,
      voiceCount: 0,
    });
    (DB.getAllEntries as jest.Mock).mockResolvedValueOnce([]);
    mockGet.mockRejectedValueOnce(new Error('cloud unavailable'));

    const service = createCloudSyncOverviewService();
    const snapshot = await service.getSnapshot();

    expect(snapshot.cloud).toBeNull();
    expect(snapshot.cloudError).toContain('cloud unavailable');
    expect(snapshot.local).toEqual({
      entryCount: 1,
      photoCount: 0,
      voiceCount: 0,
      mediaBytes: 0,
    });
    expect(snapshot.pendingEntries).toBe(1);
    expect(snapshot.lastSyncError).toBe('timeout');
  });

  it('deduplicates media file paths and ignores remote urls or missing files', async () => {
    mockGetStatus.mockResolvedValueOnce({
      lastSyncAt: null,
      lastSyncError: null,
      initialSyncState: 'idle',
      pendingEntries: 0,
      pendingUploads: 0,
      uploadingEntries: 0,
      failedEntries: 0,
      conflictCopies: 0,
    });
    (DB.getLocalSyncOverviewCounts as jest.Mock).mockResolvedValueOnce({
      entryCount: 3,
      photoCount: 2,
      voiceCount: 1,
    });
    (DB.getAllEntries as jest.Mock).mockResolvedValueOnce([
      {
        id: 'e1',
        type: 'photo',
        content: '',
        timestamp: 1,
        syncStatus: 'synced',
        media: [
          {
            uri: 'file:///shared.jpg',
            thumbnail: 'https://cdn.example.com/thumb.jpg',
            mimeType: 'image/jpeg',
            size: 1,
          },
        ],
      },
      {
        id: 'e2',
        type: 'photo',
        content: '',
        timestamp: 2,
        syncStatus: 'synced',
        media: [
          {
            uri: 'file:///shared.jpg',
            thumbnail: 'file:///shared.jpg',
            mimeType: 'image/jpeg',
            size: 1,
          },
          {
            uri: 'file:///missing.jpg',
            thumbnail: 'file:///thumb.jpg',
            mimeType: 'image/jpeg',
            size: 1,
          },
        ],
      },
      {
        id: 'e3',
        type: 'voice',
        content: '',
        timestamp: 3,
        syncStatus: 'synced',
        media: [
          { uri: 'https://cdn.example.com/audio.m4a', mimeType: 'audio/m4a', size: 1 },
        ],
      },
    ]);
    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (uri: string) => {
      if (uri === 'file:///missing.jpg') {
        throw new Error('ENOENT');
      }
      const sizeMap: Record<string, number> = {
        'file:///shared.jpg': 700,
        'file:///thumb.jpg': 50,
      };
      return { exists: true, size: sizeMap[uri] ?? 0 };
    });
    mockGet.mockResolvedValueOnce({
      entryCount: 0,
      photoCount: 0,
      voiceCount: 0,
      mediaCount: 0,
      mediaBytes: 0,
    });

    const service = createCloudSyncOverviewService();
    const snapshot = await service.getSnapshot();

    expect(snapshot.local.mediaBytes).toBe(750);
    expect(FileSystem.getInfoAsync).toHaveBeenCalledTimes(3);
  });

  it('falls back to zeroed local counts when local overview queries fail', async () => {
    mockGetStatus.mockResolvedValueOnce({
      lastSyncAt: 1700000000000,
      lastSyncError: null,
      initialSyncState: 'ready',
      pendingEntries: 2,
      pendingUploads: 1,
      uploadingEntries: 0,
      failedEntries: 0,
      conflictCopies: 1,
    });
    (DB.getLocalSyncOverviewCounts as jest.Mock).mockRejectedValueOnce(new Error('local counts unavailable'));
    (DB.getAllEntries as jest.Mock).mockRejectedValueOnce(new Error('local media unavailable'));
    mockGet.mockResolvedValueOnce({
      entryCount: 20,
      photoCount: 8,
      voiceCount: 5,
      mediaCount: 12,
      mediaBytes: 2048,
    });

    const service = createCloudSyncOverviewService();
    const snapshot = await service.getSnapshot();

    expect(snapshot).toMatchObject({
      lastSyncAt: 1700000000000,
      lastSyncError: null,
      pendingEntries: 2,
      pendingUploads: 1,
      uploadingEntries: 0,
      failedEntries: 0,
      conflictCopies: 1,
      local: {
        entryCount: 0,
        photoCount: 0,
        voiceCount: 0,
        mediaBytes: 0,
      },
      cloud: {
        entryCount: 20,
        photoCount: 8,
        voiceCount: 5,
        mediaCount: 12,
        mediaBytes: 2048,
      },
      cloudError: null,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      '[cloudSyncOverview] get local overview counts failed:',
      expect.any(Error)
    );
    expect(logger.warn).toHaveBeenCalledWith(
      '[cloudSyncOverview] get local media bytes failed:',
      expect.any(Error)
    );
  });
});
