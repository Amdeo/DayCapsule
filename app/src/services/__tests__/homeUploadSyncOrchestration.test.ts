const mockSetState = jest.fn();
const mockRefreshCloudSyncIndicator = jest.fn();

jest.mock('@/src/store/entryStore', () => {
  const useEntryStore = () => ({});
  (useEntryStore as typeof useEntryStore & { setState: typeof mockSetState }).setState = mockSetState;
  return { useEntryStore };
});

jest.mock('@/src/store/cloudSyncIndicatorStore', () => ({
  useCloudSyncIndicatorStore: {
    getState: () => ({
      refresh: mockRefreshCloudSyncIndicator,
    }),
  },
}));

import type { Entry, MediaInfo } from '@/src/types/entry';

jest.mock('@/src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { createHomeUploadSyncOrchestration } from '../homeUploadSyncOrchestration';

const makeEntry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 'entry-1',
  type: 'voice',
  content: '',
  timestamp: 1774104000000,
  syncStatus: 'synced',
  media: [{ uri: 'file:///voice.m4a', mimeType: 'audio/m4a', size: 128 }],
  ...overrides,
});

describe('homeUploadSyncOrchestration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshCloudSyncIndicator.mockResolvedValue(undefined);
  });

  it('returns enqueue decisions for cloud-mode voice and photo flows', () => {
    const orchestration = createHomeUploadSyncOrchestration({
      setEntryState: mockSetState,
      refreshCloudSyncIndicator: mockRefreshCloudSyncIndicator,
    });

    expect(orchestration.shouldEnqueueVoiceUpload(true)).toBe(true);
    expect(orchestration.shouldEnqueueVoiceUpload(false)).toBe(false);
    expect(orchestration.getPhotoCreationPolicy(true)).toEqual({
      shouldEnqueueUpload: true,
      initialSyncStatus: 'pending_upload',
    });
    expect(orchestration.getPhotoCreationPolicy(false)).toEqual({
      shouldEnqueueUpload: false,
      initialSyncStatus: 'synced',
    });
  });

  it('updates entry sync state and refreshes cloud sync indicator for voice and photo queue callbacks', async () => {
    const orchestration = createHomeUploadSyncOrchestration({
      setEntryState: mockSetState,
      refreshCloudSyncIndicator: mockRefreshCloudSyncIndicator,
    });
    const pendingVoiceEntry = makeEntry({
      syncStatus: 'pending',
      media: [{ uri: 'file:///voice-uploaded.m4a', remoteUri: 'https://cdn/voice.m4a', mimeType: 'audio/m4a', size: 256 }],
    });
    const uploadedPhotoMedia: MediaInfo[] = [
      { uri: 'file:///photo.jpg', remoteUri: 'https://cdn/photo.jpg', mimeType: 'image/jpeg', size: 512 },
    ];

    orchestration.voiceCallbacks.onEntryUploading?.('entry-1');
    orchestration.voiceCallbacks.onEntryPending?.('entry-1');
    orchestration.voiceCallbacks.onEntryPendingSync?.('entry-1', pendingVoiceEntry);
    orchestration.photoCallbacks.onEntryUploading?.('entry-1');
    orchestration.photoCallbacks.onEntryPendingUpload?.('entry-1');
    orchestration.photoCallbacks.onEntryPendingSync?.('entry-1', uploadedPhotoMedia);

    expect(mockSetState).toHaveBeenCalledTimes(6);

    const uploadState = mockSetState.mock.calls[0][0]({ entries: [makeEntry()] });
    expect(uploadState.entries[0].syncStatus).toBe('uploading');

    const pendingUploadState = mockSetState.mock.calls[1][0]({ entries: [makeEntry()] });
    expect(pendingUploadState.entries[0].syncStatus).toBe('pending_upload');

    const pendingSyncVoiceState = mockSetState.mock.calls[2][0]({ entries: [makeEntry()] });
    expect(pendingSyncVoiceState.entries[0]).toMatchObject({
      syncStatus: 'pending',
      media: pendingVoiceEntry.media,
    });

    const photoUploadingState = mockSetState.mock.calls[3][0]({ entries: [makeEntry({ type: 'photo' })] });
    expect(photoUploadingState.entries[0].syncStatus).toBe('uploading');

    const photoPendingUploadState = mockSetState.mock.calls[4][0]({ entries: [makeEntry({ type: 'photo' })] });
    expect(photoPendingUploadState.entries[0].syncStatus).toBe('pending_upload');

    const pendingSyncPhotoState = mockSetState.mock.calls[5][0]({ entries: [makeEntry({ type: 'photo', media: [] })] });
    expect(pendingSyncPhotoState.entries[0]).toMatchObject({
      syncStatus: 'pending',
      media: uploadedPhotoMedia,
    });

    expect(mockRefreshCloudSyncIndicator).toHaveBeenCalledTimes(6);
  });
});
