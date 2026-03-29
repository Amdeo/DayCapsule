jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

import type { Entry } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';
import { createPhotoUploadQueue } from '../photoUploadQueue';

const makePhotoEntry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 'photo-local-1',
  type: 'photo',
  content: '',
  timestamp: 1774104000000,
  syncStatus: 'pending_upload',
  media: [
    {
      uri: 'file:///cache/media/photos/display/photo_1.jpg',
      thumbnail: 'file:///cache/media/photos/thumbnails/thumb_1.jpg',
      mimeType: 'image/jpeg',
      size: 2048,
      metadata: {
        localMediaId: 'local-media-1',
        sourceHash: 'source-hash-1',
        persistedHash: 'persisted-hash-1',
        width: 1200,
        height: 900,
        aspectRatio: 1200 / 900,
        createdAt: 1774104000000,
        modifiedAt: 1774104000000,
      },
    },
    {
      uri: 'file:///cache/media/photos/display/photo_2.jpg',
      thumbnail: 'file:///cache/media/photos/thumbnails/thumb_2.jpg',
      mimeType: 'image/jpeg',
      size: 4096,
      metadata: {
        localMediaId: 'local-media-2',
        sourceHash: 'source-hash-2',
        persistedHash: 'persisted-hash-2',
        width: 900,
        height: 1200,
        aspectRatio: 900 / 1200,
        createdAt: 1774104000000,
        modifiedAt: 1774104000000,
      },
    },
  ],
  ...overrides,
});

describe('photoUploadQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('uploads pending photo media, writes remoteUri, then marks entry pending', async () => {
    const entry = makePhotoEntry();
    const queue = createPhotoUploadQueue({
      getPendingEntries: jest.fn().mockResolvedValue([entry]),
      getEntryById: jest.fn().mockResolvedValue(entry),
      markUploading: jest.fn().mockResolvedValue(undefined),
      markPendingUpload: jest.fn().mockResolvedValue(undefined),
      markPendingSync: jest.fn().mockResolvedValue(undefined),
      uploadMedia: jest.fn()
        .mockResolvedValueOnce({
          id: 'media-1',
          url: 'https://cdn/photo_1.jpg',
          remoteHash: 'remote-hash-1',
          validationStatus: 'healthy',
          validationError: null,
        })
        .mockResolvedValueOnce({
          id: 'media-2',
          url: 'https://cdn/photo_2.jpg',
          remoteHash: 'remote-hash-2',
          validationStatus: 'healthy',
          validationError: null,
        }),
      triggerSync: jest.fn().mockResolvedValue(undefined),
      onEntryUploading: jest.fn(),
      onEntryPendingUpload: jest.fn(),
      onEntryPendingSync: jest.fn(),
    });

    await queue.flushPending();

    expect(queue.deps.markUploading).toHaveBeenCalledWith('photo-local-1');
    expect(queue.deps.uploadMedia).toHaveBeenNthCalledWith(
      1,
      'file:///cache/media/photos/display/photo_1.jpg',
      {
        metadata: {
          traceId: 'local-media-1',
          localMediaId: 'local-media-1',
          persistedHash: 'persisted-hash-1',
          sourceHash: 'source-hash-1',
          size: 2048,
          width: 1200,
          height: 900,
        },
      },
    );
    expect(queue.deps.uploadMedia).toHaveBeenNthCalledWith(
      2,
      'file:///cache/media/photos/display/photo_2.jpg',
      {
        metadata: {
          traceId: 'local-media-2',
          localMediaId: 'local-media-2',
          persistedHash: 'persisted-hash-2',
          sourceHash: 'source-hash-2',
          size: 4096,
          width: 900,
          height: 1200,
        },
      },
    );
    expect(queue.deps.markPendingSync).toHaveBeenCalledWith(
      'photo-local-1',
      [
        expect.objectContaining({
          uri: 'file:///cache/media/photos/display/photo_1.jpg',
          thumbnail: 'file:///cache/media/photos/thumbnails/thumb_1.jpg',
          remoteUri: 'https://cdn/photo_1.jpg',
          metadata: expect.objectContaining({
            remoteHash: 'remote-hash-1',
            integrityStatus: 'healthy',
            integrityReason: undefined,
          }),
        }),
        expect.objectContaining({
          uri: 'file:///cache/media/photos/display/photo_2.jpg',
          thumbnail: 'file:///cache/media/photos/thumbnails/thumb_2.jpg',
          remoteUri: 'https://cdn/photo_2.jpg',
          metadata: expect.objectContaining({
            remoteHash: 'remote-hash-2',
            integrityStatus: 'healthy',
            integrityReason: undefined,
          }),
        }),
      ],
    );
    expect(queue.deps.triggerSync).toHaveBeenCalledTimes(1);
    expect(queue.deps.markPendingUpload).not.toHaveBeenCalled();
    expect(queue.deps.onEntryUploading).toHaveBeenCalledWith('photo-local-1');
    expect(queue.deps.onEntryPendingSync).toHaveBeenCalledWith(
      'photo-local-1',
      expect.arrayContaining([
        expect.objectContaining({ remoteUri: 'https://cdn/photo_1.jpg' }),
      ]),
    );
    expect(queue.deps.onEntryPendingUpload).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      'photo.upload.start',
      expect.objectContaining({
        localMediaId: 'local-media-1',
        localUri: 'file:///cache/media/photos/display/photo_1.jpg',
      }),
    );
    expect(logger.log).toHaveBeenCalledWith(
      'photo.upload.finish',
      expect.objectContaining({
        remoteUri: 'https://cdn/photo_1.jpg',
        remoteHash: 'remote-hash-1',
      }),
    );
  });

  it('returns photo entry to pending_upload when any media upload fails', async () => {
    const entry = makePhotoEntry();
    const queue = createPhotoUploadQueue({
      getPendingEntries: jest.fn().mockResolvedValue([entry]),
      getEntryById: jest.fn().mockResolvedValue(entry),
      markUploading: jest.fn().mockResolvedValue(undefined),
      markPendingUpload: jest.fn().mockResolvedValue(undefined),
      markPendingSync: jest.fn().mockResolvedValue(undefined),
      uploadMedia: jest.fn()
        .mockResolvedValueOnce({ id: 'media-1', url: 'https://cdn/photo_1.jpg' })
        .mockRejectedValueOnce(new Error('network down')),
      triggerSync: jest.fn().mockResolvedValue(undefined),
      onEntryUploading: jest.fn(),
      onEntryPendingUpload: jest.fn(),
      onEntryPendingSync: jest.fn(),
    });

    await queue.flushPending();

    expect(queue.deps.markUploading).toHaveBeenCalledWith('photo-local-1');
    expect(queue.deps.markPendingUpload).toHaveBeenCalledWith('photo-local-1');
    expect(queue.deps.markPendingSync).not.toHaveBeenCalled();
    expect(queue.deps.triggerSync).not.toHaveBeenCalled();
    expect(queue.deps.onEntryUploading).toHaveBeenCalledWith('photo-local-1');
    expect(queue.deps.onEntryPendingUpload).toHaveBeenCalledWith('photo-local-1');
    expect(queue.deps.onEntryPendingSync).not.toHaveBeenCalled();
  });

  it('retries failed photo uploads after the initial backoff window', async () => {
    jest.useFakeTimers();
    const entry = makePhotoEntry({
      media: [makePhotoEntry().media![0]],
    });
    const queue = createPhotoUploadQueue({
      getPendingEntries: jest.fn()
        .mockResolvedValueOnce([entry])
        .mockResolvedValueOnce([entry]),
      getEntryById: jest.fn().mockResolvedValue(entry),
      markUploading: jest.fn().mockResolvedValue(undefined),
      markPendingUpload: jest.fn().mockResolvedValue(undefined),
      markPendingSync: jest.fn().mockResolvedValue(undefined),
      uploadMedia: jest.fn()
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce({
          id: 'media-1',
          url: 'https://cdn/photo_1.jpg',
          remoteHash: 'remote-hash-1',
          validationStatus: 'healthy',
          validationError: null,
        }),
      triggerSync: jest.fn().mockResolvedValue(undefined),
      onEntryUploading: jest.fn(),
      onEntryPendingUpload: jest.fn(),
      onEntryPendingSync: jest.fn(),
    });

    await queue.flushPending();
    expect(queue.deps.uploadMedia).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(15_000);
    await queue.waitForIdle();

    expect(queue.deps.uploadMedia).toHaveBeenCalledTimes(2);
    expect(queue.deps.markPendingSync).toHaveBeenCalledTimes(1);
  });

  it('cancels a scheduled photo retry when flushPending is called manually', async () => {
    jest.useFakeTimers();
    const entry = makePhotoEntry({
      media: [makePhotoEntry().media![0]],
    });
    const queue = createPhotoUploadQueue({
      getPendingEntries: jest.fn()
        .mockResolvedValueOnce([entry])
        .mockResolvedValueOnce([entry]),
      getEntryById: jest.fn().mockResolvedValue(entry),
      markUploading: jest.fn().mockResolvedValue(undefined),
      markPendingUpload: jest.fn().mockResolvedValue(undefined),
      markPendingSync: jest.fn().mockResolvedValue(undefined),
      uploadMedia: jest.fn()
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce({
          id: 'media-1',
          url: 'https://cdn/photo_1.jpg',
          remoteHash: 'remote-hash-1',
          validationStatus: 'healthy',
          validationError: null,
        }),
      triggerSync: jest.fn().mockResolvedValue(undefined),
      onEntryUploading: jest.fn(),
      onEntryPendingUpload: jest.fn(),
      onEntryPendingSync: jest.fn(),
    });

    await queue.flushPending();
    expect(queue.deps.uploadMedia).toHaveBeenCalledTimes(1);

    await queue.flushPending();
    await queue.waitForIdle();

    expect(queue.deps.uploadMedia).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(15_000);
    await queue.waitForIdle();

    expect(queue.deps.uploadMedia).toHaveBeenCalledTimes(2);
  });

  it('resets photo retry backoff after a successful retry so the next failure starts from 15 seconds again', async () => {
    jest.useFakeTimers();
    const entry = makePhotoEntry({
      media: [makePhotoEntry().media![0]],
    });
    const queue = createPhotoUploadQueue({
      getPendingEntries: jest.fn()
        .mockResolvedValueOnce([entry])
        .mockResolvedValueOnce([entry])
        .mockResolvedValueOnce([entry])
        .mockResolvedValueOnce([entry]),
      getEntryById: jest.fn().mockResolvedValue(entry),
      markUploading: jest.fn().mockResolvedValue(undefined),
      markPendingUpload: jest.fn().mockResolvedValue(undefined),
      markPendingSync: jest.fn().mockResolvedValue(undefined),
      uploadMedia: jest.fn()
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce({
          id: 'media-1',
          url: 'https://cdn/photo_1.jpg',
          remoteHash: 'remote-hash-1',
          validationStatus: 'healthy',
          validationError: null,
        })
        .mockRejectedValueOnce(new Error('network down again'))
        .mockResolvedValueOnce({
          id: 'media-1',
          url: 'https://cdn/photo_1.jpg',
          remoteHash: 'remote-hash-1',
          validationStatus: 'healthy',
          validationError: null,
        }),
      triggerSync: jest.fn().mockResolvedValue(undefined),
      onEntryUploading: jest.fn(),
      onEntryPendingUpload: jest.fn(),
      onEntryPendingSync: jest.fn(),
    });

    await queue.flushPending();
    expect(queue.deps.uploadMedia).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(15_000);
    await queue.waitForIdle();

    expect(queue.deps.uploadMedia).toHaveBeenCalledTimes(2);
    expect(queue.deps.markPendingSync).toHaveBeenCalledTimes(1);

    await queue.flushPending();
    expect(queue.deps.uploadMedia).toHaveBeenCalledTimes(3);

    await jest.advanceTimersByTimeAsync(14_999);
    await queue.waitForIdle();
    expect(queue.deps.uploadMedia).toHaveBeenCalledTimes(3);

    await jest.advanceTimersByTimeAsync(1);
    await queue.waitForIdle();

    expect(queue.deps.uploadMedia).toHaveBeenCalledTimes(4);
    expect(queue.deps.markPendingSync).toHaveBeenCalledTimes(2);
  });

  it('does not process canceled photo entries', async () => {
    const entry = makePhotoEntry();
    const queue = createPhotoUploadQueue({
      getPendingEntries: jest.fn().mockResolvedValue([]),
      getEntryById: jest.fn().mockResolvedValue(entry),
      markUploading: jest.fn().mockResolvedValue(undefined),
      markPendingUpload: jest.fn().mockResolvedValue(undefined),
      markPendingSync: jest.fn().mockResolvedValue(undefined),
      uploadMedia: jest.fn().mockResolvedValue({ id: 'media-1', url: 'https://cdn/photo_1.jpg' }),
      triggerSync: jest.fn().mockResolvedValue(undefined),
      onEntryUploading: jest.fn(),
      onEntryPendingUpload: jest.fn(),
      onEntryPendingSync: jest.fn(),
    });

    queue.enqueue('photo-local-1');
    queue.cancel('photo-local-1');
    await queue.waitForIdle();

    expect(queue.deps.markUploading).not.toHaveBeenCalled();
    expect(queue.deps.uploadMedia).not.toHaveBeenCalled();
  });

  it('continues draining entries that are enqueued while another photo upload is already in flight', async () => {
    const firstEntry = makePhotoEntry({
      id: 'photo-local-1',
      media: [makePhotoEntry().media![0]],
    });
    const secondEntry = makePhotoEntry({
      id: 'photo-local-2',
      media: [
        {
          ...makePhotoEntry().media![1],
          uri: 'file:///cache/media/photos/display/photo_3.jpg',
          thumbnail: 'file:///cache/media/photos/thumbnails/thumb_3.jpg',
          metadata: {
            ...makePhotoEntry().media![1].metadata!,
            localMediaId: 'local-media-3',
          },
        },
      ],
    });

    let queue!: ReturnType<typeof createPhotoUploadQueue>;
    queue = createPhotoUploadQueue({
      getPendingEntries: jest.fn().mockResolvedValue([]),
      getEntryById: jest.fn(async (id: string) => {
        if (id === firstEntry.id) return firstEntry;
        if (id === secondEntry.id) return secondEntry;
        return null;
      }),
      markUploading: jest.fn().mockResolvedValue(undefined),
      markPendingUpload: jest.fn().mockResolvedValue(undefined),
      markPendingSync: jest.fn().mockResolvedValue(undefined),
      uploadMedia: jest.fn()
        .mockResolvedValueOnce({
          id: 'media-1',
          url: 'https://cdn/photo_1.jpg',
          remoteHash: 'remote-hash-1',
          validationStatus: 'healthy',
          validationError: null,
        })
        .mockResolvedValueOnce({
          id: 'media-2',
          url: 'https://cdn/photo_3.jpg',
          remoteHash: 'remote-hash-3',
          validationStatus: 'healthy',
          validationError: null,
        }),
      triggerSync: jest.fn().mockResolvedValue(undefined),
      onEntryUploading: jest.fn((id: string) => {
        if (id === firstEntry.id) {
          queue.enqueue(secondEntry.id);
        }
      }),
      onEntryPendingUpload: jest.fn(),
      onEntryPendingSync: jest.fn(),
    });

    queue.enqueue(firstEntry.id);
    await queue.waitForIdle();

    expect(queue.deps.markUploading).toHaveBeenCalledTimes(2);
    expect(queue.deps.markUploading).toHaveBeenNthCalledWith(1, firstEntry.id);
    expect(queue.deps.markUploading).toHaveBeenNthCalledWith(2, secondEntry.id);
    expect(queue.deps.markPendingSync).toHaveBeenCalledTimes(2);
  });
});
