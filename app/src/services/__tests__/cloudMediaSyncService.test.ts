import * as FileSystem from 'expo-file-system/legacy';

import { createCloudMediaSyncService } from '../cloudMediaSyncService';
import { MediaCacheService } from '../mediaCacheService';

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
}));

jest.mock('../mediaCacheService', () => ({
  MediaCacheService: {
    isRemoteUri: (uri?: string) => !!uri && /^(?:https?:\/\/|\/api\/media(?:\/|$))/i.test(uri),
    hydrateEntries: jest.fn(),
  },
}));

describe('cloudMediaSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
  });

  it('includes legacy cloud media that stores remote urls in uri and thumbnail', async () => {
    const entry = {
      id: 'entry-legacy-cloud',
      type: 'photo',
      content: '',
      timestamp: 1,
      syncStatus: 'synced',
      media: [
        {
          uri: 'https://cdn.example.com/photo.jpg',
          thumbnail: 'https://cdn.example.com/photo-thumb.jpg',
          mimeType: 'image/jpeg',
          size: 123,
        },
      ],
    };

    (MediaCacheService.hydrateEntries as jest.Mock).mockResolvedValueOnce([
      {
        ...entry,
        media: [
          {
            ...entry.media[0],
            uri: 'file:///cache/photo.jpg',
            thumbnail: 'file:///cache/photo-thumb.jpg',
          },
        ],
      },
    ]);

    const summary = await createCloudMediaSyncService().validateEntries([entry as never]);

    expect(summary).toMatchObject({
      status: 'success',
      total: 2,
      downloaded: 2,
      missing: 0,
      failed: 0,
    });
  });

  it('skips deleted entries from cloud media validation', async () => {
    const entry = {
      id: 'entry-deleted',
      type: 'photo',
      content: '',
      timestamp: 2,
      deleted: true,
      syncStatus: 'synced',
      media: [
        {
          uri: 'https://cdn.example.com/deleted-photo.jpg',
          remoteUri: 'https://cdn.example.com/deleted-photo.jpg',
          thumbnail: 'https://cdn.example.com/deleted-photo-thumb.jpg',
          remoteThumbnail: 'https://cdn.example.com/deleted-photo-thumb.jpg',
          mimeType: 'image/jpeg',
          size: 123,
        },
      ],
    };

    const summary = await createCloudMediaSyncService().validateEntries([entry as never]);

    expect(MediaCacheService.hydrateEntries).not.toHaveBeenCalled();
    expect(summary).toMatchObject({
      status: 'success',
      total: 0,
      downloaded: 0,
      missing: 0,
      failed: 0,
    });
  });

  it('returns success when hydrated media files exist locally', async () => {
    const entry = {
      id: 'entry-1',
      type: 'photo',
      content: '',
      timestamp: 1,
      syncStatus: 'synced',
      media: [
        {
          uri: 'https://cdn.example.com/photo.jpg',
          remoteUri: 'https://cdn.example.com/photo.jpg',
          thumbnail: 'https://cdn.example.com/photo-thumb.jpg',
          remoteThumbnail: 'https://cdn.example.com/photo-thumb.jpg',
          mimeType: 'image/jpeg',
          size: 123,
        },
      ],
    };

    (MediaCacheService.hydrateEntries as jest.Mock).mockResolvedValueOnce([
      {
        ...entry,
        media: [
          {
            ...entry.media[0],
            uri: 'file:///cache/photo.jpg',
            thumbnail: 'file:///cache/photo-thumb.jpg',
          },
        ],
      },
    ]);

    const summary = await createCloudMediaSyncService().validateEntries([entry as never]);

    expect(summary).toMatchObject({
      status: 'success',
      total: 2,
      downloaded: 2,
      missing: 0,
      failed: 0,
    });
  });

  it('returns partial when hydrate falls back to remote urls or files are missing', async () => {
    const entry = {
      id: 'entry-2',
      type: 'photo',
      content: '',
      timestamp: 2,
      syncStatus: 'synced',
      media: [
        {
          uri: 'https://cdn.example.com/photo.jpg',
          remoteUri: 'https://cdn.example.com/photo.jpg',
          thumbnail: 'https://cdn.example.com/photo-thumb.jpg',
          remoteThumbnail: 'https://cdn.example.com/photo-thumb.jpg',
          mimeType: 'image/jpeg',
          size: 123,
        },
      ],
    };

    (MediaCacheService.hydrateEntries as jest.Mock).mockResolvedValueOnce([
      {
        ...entry,
        media: [
          {
            ...entry.media[0],
            uri: 'file:///cache/photo.jpg',
            thumbnail: 'https://cdn.example.com/photo-thumb.jpg',
          },
        ],
      },
    ]);
    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (uri: string) => ({
      exists: uri === 'file:///cache/photo.jpg',
    }));

    const summary = await createCloudMediaSyncService().validateEntries([entry as never]);

    expect(summary).toMatchObject({
      status: 'partial',
      total: 2,
      downloaded: 1,
      missing: 1,
      failed: 0,
    });
  });
});
