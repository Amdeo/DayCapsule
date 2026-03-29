import type { Entry } from '@/src/types/entry';

jest.mock('@/src/database/operations', () => ({
  getEntriesByLocalReadyState: jest.fn(),
  deleteEntry: jest.fn(),
}));

jest.mock('@/src/utils/fileSystem', () => ({
  deleteFile: jest.fn(),
}));

import { cleanupIncompleteLocalEntries } from '../localEntryRecoveryService';

const makeEntry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 'entry-1',
  type: 'photo',
  content: '',
  timestamp: 1774104000000,
  syncStatus: 'pending_upload',
  localReadyState: 'processing',
  media: [
    {
      uri: 'file:///cache/media/photos/display/photo_1.jpg',
      thumbnail: 'file:///cache/media/photos/thumbnails/thumb_1.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
    },
    {
      uri: 'file:///cache/media/photos/display/photo_2.jpg',
      thumbnail: 'file:///cache/media/photos/thumbnails/thumb_2.jpg',
      mimeType: 'image/jpeg',
      size: 2048,
    },
  ],
  ...overrides,
});

describe('localEntryRecoveryService', () => {
  it('deletes processing entries and their local files on startup cleanup', async () => {
    const processingEntry = makeEntry({ id: 'processing-1' });
    const processingVoiceEntry = makeEntry({
      id: 'processing-2',
      type: 'voice',
      media: [
        {
          uri: 'file:///cache/media/voice/voice_1.m4a',
          mimeType: 'audio/m4a',
          size: 4096,
        },
      ],
    });

    const deps = {
      getEntriesByLocalReadyState: jest.fn().mockResolvedValue([processingEntry, processingVoiceEntry]),
      deleteLocalFile: jest.fn().mockResolvedValue(undefined),
      deleteEntry: jest.fn().mockResolvedValue(undefined),
    };

    await cleanupIncompleteLocalEntries(deps);

    expect(deps.getEntriesByLocalReadyState).toHaveBeenCalledWith(['processing']);
    expect(deps.deleteLocalFile).toHaveBeenCalledWith('file:///cache/media/photos/display/photo_1.jpg');
    expect(deps.deleteLocalFile).toHaveBeenCalledWith('file:///cache/media/photos/thumbnails/thumb_1.jpg');
    expect(deps.deleteLocalFile).toHaveBeenCalledWith('file:///cache/media/photos/display/photo_2.jpg');
    expect(deps.deleteLocalFile).toHaveBeenCalledWith('file:///cache/media/photos/thumbnails/thumb_2.jpg');
    expect(deps.deleteLocalFile).toHaveBeenCalledWith('file:///cache/media/voice/voice_1.m4a');
    expect(deps.deleteEntry).toHaveBeenNthCalledWith(1, 'processing-1');
    expect(deps.deleteEntry).toHaveBeenNthCalledWith(2, 'processing-2');
  });
});
