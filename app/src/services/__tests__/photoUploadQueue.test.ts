jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

import type { Entry } from '@/src/types/entry';
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

  it('uploads pending photo media, writes remoteUri, then marks entry pending', async () => {
    const entry = makePhotoEntry();
    const queue = createPhotoUploadQueue({
      getPendingEntries: jest.fn().mockResolvedValue([entry]),
      getEntryById: jest.fn().mockResolvedValue(entry),
      markUploading: jest.fn().mockResolvedValue(undefined),
      markPendingUpload: jest.fn().mockResolvedValue(undefined),
      markPendingSync: jest.fn().mockResolvedValue(undefined),
      uploadMedia: jest.fn()
        .mockResolvedValueOnce({ id: 'media-1', url: 'https://cdn/photo_1.jpg' })
        .mockResolvedValueOnce({ id: 'media-2', url: 'https://cdn/photo_2.jpg' }),
      triggerSync: jest.fn().mockResolvedValue(undefined),
      onEntryUploading: jest.fn(),
      onEntryPendingUpload: jest.fn(),
      onEntryPendingSync: jest.fn(),
    });

    await queue.flushPending();

    expect(queue.deps.markUploading).toHaveBeenCalledWith('photo-local-1');
    expect(queue.deps.uploadMedia).toHaveBeenNthCalledWith(
      1,
      'file:///cache/media/photos/display/photo_1.jpg'
    );
    expect(queue.deps.uploadMedia).toHaveBeenNthCalledWith(
      2,
      'file:///cache/media/photos/display/photo_2.jpg'
    );
    expect(queue.deps.markPendingSync).toHaveBeenCalledWith(
      'photo-local-1',
      [
        expect.objectContaining({
          uri: 'file:///cache/media/photos/display/photo_1.jpg',
          thumbnail: 'file:///cache/media/photos/thumbnails/thumb_1.jpg',
          remoteUri: 'https://cdn/photo_1.jpg',
        }),
        expect.objectContaining({
          uri: 'file:///cache/media/photos/display/photo_2.jpg',
          thumbnail: 'file:///cache/media/photos/thumbnails/thumb_2.jpg',
          remoteUri: 'https://cdn/photo_2.jpg',
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
});
