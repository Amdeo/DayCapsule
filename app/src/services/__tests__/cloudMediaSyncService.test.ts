import * as FileSystem from 'expo-file-system/legacy';

import { createCloudMediaSyncService } from '../cloudMediaSyncService';
import { MediaCacheService } from '../mediaCacheService';
import { fingerprintPhotoFile } from '../photoIntegrityService';

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
}));

jest.mock('../photoIntegrityService', () => ({
  fingerprintPhotoFile: jest.fn(),
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
    (fingerprintPhotoFile as jest.Mock).mockResolvedValue({
      uri: 'file:///cache/photo.jpg',
      sha256: 'hash-default',
      size: 123,
      width: 1200,
      height: 900,
      mimeType: 'image/jpeg',
    });
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

    const result = await createCloudMediaSyncService().validateEntries([entry as never]);

    expect(result.summary).toMatchObject({
      status: 'success',
      total: 2,
      downloaded: 2,
      missing: 0,
      failed: 0,
      suspect: 0,
      repairable: 0,
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

    const result = await createCloudMediaSyncService().validateEntries([entry as never]);

    expect(MediaCacheService.hydrateEntries).not.toHaveBeenCalled();
    expect(result.summary).toMatchObject({
      status: 'success',
      total: 0,
      downloaded: 0,
      missing: 0,
      failed: 0,
      suspect: 0,
      repairable: 0,
    });
    expect(result.issues).toEqual([]);
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

    const result = await createCloudMediaSyncService().validateEntries([entry as never]);

    expect(result.summary).toMatchObject({
      status: 'success',
      total: 2,
      downloaded: 2,
      missing: 0,
      failed: 0,
      suspect: 0,
      repairable: 0,
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

    const result = await createCloudMediaSyncService().validateEntries([entry as never]);

    expect(result.summary).toMatchObject({
      status: 'partial',
      total: 2,
      downloaded: 1,
      missing: 1,
      failed: 0,
      suspect: 0,
      repairable: 0,
    });
  });

  it('marks a downloaded file as cloud_content_suspect when local persistedHash differs from remoteHash', async () => {
    const entry = {
      id: 'entry-1',
      type: 'photo',
      content: '',
      timestamp: 1,
      syncStatus: 'synced',
      media: [
        {
          uri: 'file:///documents/media/photos/original/photo-1.jpg',
          remoteUri: 'https://cdn.example.com/photo-1.jpg',
          mimeType: 'image/jpeg',
          size: 2048,
          metadata: {
            localMediaId: 'local-1',
            persistedHash: 'local-good',
            remoteHash: 'remote-bad',
            createdAt: 1,
            modifiedAt: 1,
          },
        },
      ],
    };

    (MediaCacheService.hydrateEntries as jest.Mock).mockResolvedValueOnce([
      {
        ...entry,
        media: [
          {
            ...entry.media[0],
            uri: 'file:///cache/photo-1.jpg',
          },
        ],
      },
    ]);
    (fingerprintPhotoFile as jest.Mock)
      .mockResolvedValueOnce({
        uri: 'file:///cache/photo-1.jpg',
        sha256: 'remote-bad',
        size: 2048,
        width: 1200,
        height: 900,
        mimeType: 'image/jpeg',
      })
      .mockResolvedValueOnce({
        uri: 'file:///documents/media/photos/original/photo-1.jpg',
        sha256: 'local-good',
        size: 2048,
        width: 1200,
        height: 900,
        mimeType: 'image/jpeg',
      });

    const result = await createCloudMediaSyncService().validateEntries([entry as never]);

    expect(result.summary).toMatchObject({
      status: 'partial',
      total: 1,
      downloaded: 1,
      missing: 0,
      failed: 0,
      suspect: 1,
      repairable: 1,
    });
    expect(result.issues).toEqual([
      expect.objectContaining({
        entryId: 'entry-1',
        mediaIndex: 0,
        localMediaId: 'local-1',
        localUri: 'file:///documents/media/photos/original/photo-1.jpg',
        remoteUri: 'https://cdn.example.com/photo-1.jpg',
        persistedHash: 'local-good',
        remoteHash: 'remote-bad',
        downloadedHash: 'remote-bad',
        integrityStatus: 'repair_prompt_required',
      }),
    ]);
  });
});
