jest.mock('@/src/database/operations', () => ({
  getVoiceEntriesBySyncStatus: jest.fn(),
  getEntryById: jest.fn(),
  updateEntry: jest.fn(),
  deleteEntry: jest.fn(),
  restoreEntries: jest.fn(),
}));

const mockUploadFile = jest.fn();
const mockPost = jest.fn();

jest.mock('@/src/services/apiClient', () => ({
  getApiClient: jest.fn(() => ({
    uploadFile: mockUploadFile,
    post: mockPost,
  })),
}));

const mockSyncNow = jest.fn();
jest.mock('../cloudSyncService', () => ({
  createCloudSyncService: jest.fn(() => ({
    syncNow: mockSyncNow,
  })),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

import type { Entry } from '@/src/types/entry';
import * as DB from '@/src/database/operations';
import {
  createVoiceUploadQueue,
  flushPendingVoiceUploads,
} from '../voiceUploadQueue';

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
      uploadMedia: jest.fn().mockResolvedValue({ id: 'media-1', url: 'https://cdn/voice.m4a' }),
      markPendingSync: jest.fn().mockResolvedValue(undefined),
      triggerSync: jest.fn().mockResolvedValue(undefined),
      onEntryUploading: jest.fn(),
      onEntryPending: jest.fn(),
      onEntryPendingSync: jest.fn(),
    });

    await queue.flushPending();

    expect(queue.deps.markUploading).toHaveBeenCalledWith('voice-local-1');
    expect(queue.deps.onEntryUploading).toHaveBeenCalledWith('voice-local-1');
    expect(queue.deps.uploadMedia).toHaveBeenCalledWith('file:///cache/voice.m4a');
    expect(queue.deps.markPendingSync).toHaveBeenCalledWith(
      'voice-local-1',
      expect.objectContaining({
        syncStatus: 'pending',
        media: [
          expect.objectContaining({
            uri: 'file:///cache/voice.m4a',
            remoteUri: 'https://cdn/voice.m4a',
          }),
        ],
      })
    );
    expect(queue.deps.triggerSync).toHaveBeenCalledTimes(1);
    expect(queue.deps.onEntryPendingSync).toHaveBeenCalledWith(
      'voice-local-1',
      expect.objectContaining({
        syncStatus: 'pending',
      }),
    );
  });

  it('returns entry to pending_upload when media upload fails', async () => {
    const entry = makeVoiceEntry();
    const queue = createVoiceUploadQueue({
      getPendingEntries: jest.fn().mockResolvedValue([entry]),
      getEntryById: jest.fn().mockResolvedValue(entry),
      markUploading: jest.fn().mockResolvedValue(undefined),
      markPending: jest.fn().mockResolvedValue(undefined),
      uploadMedia: jest.fn().mockRejectedValue(new Error('network down')),
      markPendingSync: jest.fn(),
      triggerSync: jest.fn(),
      onEntryUploading: jest.fn(),
      onEntryPending: jest.fn(),
      onEntryPendingSync: jest.fn(),
    });

    await queue.flushPending();

    expect(queue.deps.markUploading).toHaveBeenCalledWith('voice-local-1');
    expect(queue.deps.onEntryUploading).toHaveBeenCalledWith('voice-local-1');
    expect(queue.deps.markPending).toHaveBeenCalledWith('voice-local-1');
    expect(queue.deps.markPendingSync).not.toHaveBeenCalled();
    expect(queue.deps.onEntryPending).toHaveBeenCalledWith('voice-local-1');
  });

  it('skips canceled entries before starting upload', async () => {
    const entry = makeVoiceEntry();
    const queue = createVoiceUploadQueue({
      getPendingEntries: jest.fn().mockResolvedValue([]),
      getEntryById: jest.fn().mockResolvedValue(entry),
      markUploading: jest.fn().mockResolvedValue(undefined),
      markPending: jest.fn().mockResolvedValue(undefined),
      uploadMedia: jest.fn().mockResolvedValue({ id: 'media-1', url: 'https://cdn/voice.m4a' }),
      markPendingSync: jest.fn(),
      triggerSync: jest.fn(),
      onEntryUploading: jest.fn(),
      onEntryPending: jest.fn(),
      onEntryPendingSync: jest.fn(),
    });

    queue.enqueue('voice-local-1');
    queue.cancel('voice-local-1');
    await queue.waitForIdle();

    expect(queue.deps.markUploading).not.toHaveBeenCalled();
    expect(queue.deps.uploadMedia).not.toHaveBeenCalled();
  });

  it('continues draining entries that are enqueued while another voice upload is already in flight', async () => {
    const firstEntry = makeVoiceEntry({ id: 'voice-local-1' });
    const secondEntry = makeVoiceEntry({
      id: 'voice-local-2',
      media: [
        {
          uri: 'file:///cache/voice-2.m4a',
          mimeType: 'audio/m4a',
          size: 1024,
          duration: 8000,
        },
      ],
    });

    let queue!: ReturnType<typeof createVoiceUploadQueue>;
    queue = createVoiceUploadQueue({
      getPendingEntries: jest.fn().mockResolvedValue([]),
      getEntryById: jest.fn(async (id: string) => {
        if (id === firstEntry.id) return firstEntry;
        if (id === secondEntry.id) return secondEntry;
        return null;
      }),
      markUploading: jest.fn().mockResolvedValue(undefined),
      markPending: jest.fn().mockResolvedValue(undefined),
      uploadMedia: jest.fn()
        .mockResolvedValueOnce({ id: 'media-1', url: 'https://cdn/voice.m4a' })
        .mockResolvedValueOnce({ id: 'media-2', url: 'https://cdn/voice-2.m4a' }),
      markPendingSync: jest.fn().mockResolvedValue(undefined),
      triggerSync: jest.fn().mockResolvedValue(undefined),
      onEntryUploading: jest.fn((id: string) => {
        if (id === firstEntry.id) {
          queue.enqueue(secondEntry.id);
        }
      }),
      onEntryPending: jest.fn(),
      onEntryPendingSync: jest.fn(),
    });

    queue.enqueue(firstEntry.id);
    await queue.waitForIdle();

    expect(queue.deps.markUploading).toHaveBeenCalledTimes(2);
    expect(queue.deps.markUploading).toHaveBeenNthCalledWith(1, firstEntry.id);
    expect(queue.deps.markUploading).toHaveBeenNthCalledWith(2, secondEntry.id);
    expect(queue.deps.markPendingSync).toHaveBeenCalledTimes(2);
  });

  it('default queue should keep the local voice entry and mark it pending after media upload', async () => {
    const entry = makeVoiceEntry();

    (DB.getVoiceEntriesBySyncStatus as jest.Mock).mockResolvedValue([entry]);
    (DB.getEntryById as jest.Mock).mockResolvedValue(entry);
    (DB.updateEntry as jest.Mock).mockResolvedValue(undefined);
    (DB.deleteEntry as jest.Mock).mockResolvedValue(undefined);
    (DB.restoreEntries as jest.Mock).mockResolvedValue(['remote-voice-1']);
    mockUploadFile.mockResolvedValue({ id: 'media-1', url: 'https://cdn/voice.m4a' });
    mockPost.mockResolvedValue(undefined);

    await flushPendingVoiceUploads();

    expect(DB.deleteEntry).not.toHaveBeenCalled();
    expect(DB.restoreEntries).not.toHaveBeenCalled();
    expect(DB.updateEntry).toHaveBeenCalledWith(
      'voice-local-1',
      expect.objectContaining({
        syncStatus: 'pending',
        media: [
          expect.objectContaining({
            uri: 'file:///cache/voice.m4a',
            remoteUri: 'https://cdn/voice.m4a',
          }),
        ],
      })
    );
    expect(mockSyncNow).toHaveBeenCalledTimes(1);
  });
});
