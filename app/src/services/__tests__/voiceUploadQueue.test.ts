jest.mock('@/src/database/operations', () => ({
  getVoiceEntriesBySyncStatus: jest.fn(),
  getEntryById: jest.fn(),
  updateEntry: jest.fn(),
  deleteEntry: jest.fn(),
}));

jest.mock('@/src/services/apiClient', () => ({
  getApiClient: jest.fn(() => ({
    uploadFile: jest.fn(),
    post: jest.fn(),
  })),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

import type { Entry } from '@/src/types/entry';
import { createVoiceUploadQueue } from '../voiceUploadQueue';

const makeVoiceEntry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 'voice-local-1',
  type: 'voice',
  content: '',
  timestamp: 1774104000000,
  syncStatus: 'pending_upload',
  recordingStatus: 'completed',
  recordingDuration: 12,
  media: [
    {
      uri: 'file:///cache/voice.m4a',
      mimeType: 'audio/m4a',
      size: 2048,
      duration: 12000,
    },
  ],
  ...overrides,
});

describe('voiceUploadQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uploads pending voice entry and replaces it with synced remote entry', async () => {
    const entry = makeVoiceEntry();
    const queue = createVoiceUploadQueue({
      getPendingEntries: jest.fn().mockResolvedValue([entry]),
      getEntryById: jest.fn().mockResolvedValue(entry),
      markUploading: jest.fn().mockResolvedValue(undefined),
      markPending: jest.fn().mockResolvedValue(undefined),
      removeLocalEntry: jest.fn().mockResolvedValue(undefined),
      uploadMedia: jest.fn().mockResolvedValue({ id: 'media-1', url: 'https://cdn/voice.m4a' }),
      createRemoteEntry: jest.fn().mockResolvedValue({
        id: 'remote-1',
        type: 'voice',
        content: '',
        timestamp: 1774105000000,
        syncStatus: 'synced',
        recordingStatus: 'completed',
        recordingDuration: 12,
        media: [
          {
            uri: 'https://cdn/voice.m4a',
            mimeType: 'audio/m4a',
            size: 2048,
            duration: 12000,
          },
        ],
      }),
      onEntryUploading: jest.fn(),
      onEntryPending: jest.fn(),
      onEntrySynced: jest.fn(),
    });

    await queue.flushPending();

    expect(queue.deps.markUploading).toHaveBeenCalledWith('voice-local-1');
    expect(queue.deps.onEntryUploading).toHaveBeenCalledWith('voice-local-1');
    expect(queue.deps.uploadMedia).toHaveBeenCalledWith('file:///cache/voice.m4a');
    expect(queue.deps.createRemoteEntry).toHaveBeenCalled();
    expect(queue.deps.removeLocalEntry).toHaveBeenCalledWith('voice-local-1');
    expect(queue.deps.onEntrySynced).toHaveBeenCalledWith(
      'voice-local-1',
      expect.objectContaining({
        id: 'remote-1',
        syncStatus: 'synced',
        media: [
          expect.objectContaining({
            uri: 'file:///cache/voice.m4a',
            remoteUri: 'https://cdn/voice.m4a',
          }),
        ],
      })
    );
  });

  it('returns entry to pending_upload when media upload fails', async () => {
    const entry = makeVoiceEntry();
    const queue = createVoiceUploadQueue({
      getPendingEntries: jest.fn().mockResolvedValue([entry]),
      getEntryById: jest.fn().mockResolvedValue(entry),
      markUploading: jest.fn().mockResolvedValue(undefined),
      markPending: jest.fn().mockResolvedValue(undefined),
      removeLocalEntry: jest.fn().mockResolvedValue(undefined),
      uploadMedia: jest.fn().mockRejectedValue(new Error('network down')),
      createRemoteEntry: jest.fn(),
      onEntryUploading: jest.fn(),
      onEntryPending: jest.fn(),
      onEntrySynced: jest.fn(),
    });

    await queue.flushPending();

    expect(queue.deps.markUploading).toHaveBeenCalledWith('voice-local-1');
    expect(queue.deps.onEntryUploading).toHaveBeenCalledWith('voice-local-1');
    expect(queue.deps.markPending).toHaveBeenCalledWith('voice-local-1');
    expect(queue.deps.removeLocalEntry).not.toHaveBeenCalled();
    expect(queue.deps.onEntryPending).toHaveBeenCalledWith('voice-local-1');
  });

  it('skips canceled entries before starting upload', async () => {
    const entry = makeVoiceEntry();
    const queue = createVoiceUploadQueue({
      getPendingEntries: jest.fn().mockResolvedValue([]),
      getEntryById: jest.fn().mockResolvedValue(entry),
      markUploading: jest.fn().mockResolvedValue(undefined),
      markPending: jest.fn().mockResolvedValue(undefined),
      removeLocalEntry: jest.fn().mockResolvedValue(undefined),
      uploadMedia: jest.fn().mockResolvedValue({ id: 'media-1', url: 'https://cdn/voice.m4a' }),
      createRemoteEntry: jest.fn(),
      onEntryUploading: jest.fn(),
      onEntryPending: jest.fn(),
      onEntrySynced: jest.fn(),
    });

    queue.enqueue('voice-local-1');
    queue.cancel('voice-local-1');
    await queue.waitForIdle();

    expect(queue.deps.markUploading).not.toHaveBeenCalled();
    expect(queue.deps.uploadMedia).not.toHaveBeenCalled();
  });
});
