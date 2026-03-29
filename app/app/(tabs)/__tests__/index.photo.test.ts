jest.mock('react-native', () => {
  return {
    View: 'View',
    Alert: { alert: jest.fn() },
    Linking: { openURL: jest.fn() },
    BackHandler: { addEventListener: jest.fn(() => ({ remove: jest.fn() })), removeEventListener: jest.fn() },
    Pressable: 'Pressable',
    Dimensions: { get: () => ({ width: 390, height: 844 }) },
    Platform: { OS: 'ios', select: (obj) => obj.ios ?? obj.default },
    StyleSheet: { create: (s) => s, hairlineWidth: 0.5, absoluteFill: {}, absoluteFillObject: {} },
  };
});

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => ({
    loadEntries: jest.fn(),
    addEntry: jest.fn(),
    addLocalEntry: jest.fn(),
    updateLocalEntry: jest.fn(),
    deleteEntry: jest.fn(),
    updateRecordingStatus: jest.fn(),
    updateRecordingDuration: jest.fn(),
    completeRecording: jest.fn(),
  }),
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      loadSettings: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock('@/src/store/commonTagsStore', () => ({
  useCommonTagsStore: {
    getState: () => ({
      loadCommonTags: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock('@/src/store/cloudSyncIndicatorStore', () => ({
  useCloudSyncIndicatorStore: {
    getState: () => ({
      refresh: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock('@/src/services/voiceService', () => ({
  VoiceService: {
    prewarmAudioSystem: jest.fn().mockResolvedValue(undefined),
    cancelRecording: jest.fn().mockResolvedValue(undefined),
    getRecordingDuration: jest.fn().mockResolvedValue(0),
    startRecording: jest.fn().mockResolvedValue(undefined),
    resumeRecording: jest.fn().mockResolvedValue(undefined),
    pauseRecording: jest.fn().mockResolvedValue(undefined),
    stopRecording: jest.fn().mockResolvedValue({ uri: '', duration: 0 }),
    saveVoiceToStorage: jest.fn().mockResolvedValue(''),
    saveVoiceToCache: jest.fn().mockResolvedValue(''),
    preloadAudio: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/src/services/photoService', () => ({
  PhotoService: {
    savePhotoToStorage: jest.fn(),
    savePhotoToCache: jest.fn(),
  },
}));

jest.mock('@/src/services/voiceUploadQueue', () => ({
  enqueueVoiceUpload: jest.fn(),
  configureVoiceUploadQueueCallbacks: jest.fn(),
  flushPendingVoiceUploads: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/services/photoUploadQueue', () => ({
  enqueuePhotoUpload: jest.fn(),
  configurePhotoUploadQueueCallbacks: jest.fn(),
}));

jest.mock('@/src/services/photoIntegrityService', () => ({
  fingerprintPhotoFile: jest.fn(),
  buildPhotoLogPayload: jest.fn((input) => input),
}));

jest.mock('@/src/components/Timeline.v2', () => ({
  Timeline: 'Timeline',
}));

jest.mock('@/src/components/Sidebar', () => ({
  Sidebar: 'Sidebar',
}));

jest.mock('@/src/components/TextEditor', () => ({
  TextEditor: 'TextEditor',
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/src/utils/fileSystem', () => ({
  deleteFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native-css-interop/src/runtime/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));

import type { MediaInfo } from '@/src/types/entry';
import { handlePhotoSelectForTest, type PhotoSelectDeps } from '../index';

const PHOTO_RESULT = {
  uri: 'content://media/external/images/1234',
  width: 3024,
  height: 4032,
  aspectRatio: 3024 / 4032,
};

const SECOND_PHOTO_RESULT = {
  uri: 'content://media/external/images/5678',
  width: 2048,
  height: 1536,
  aspectRatio: 2048 / 1536,
};

const PREPARED_MEDIA: MediaInfo[] = [
  {
    uri: 'file:///cache/media/photos/display/photo_123.jpg',
    mimeType: 'image/jpeg',
    size: 2048,
    thumbnail: 'file:///cache/media/photos/thumbnails/thumb_123.jpg',
    metadata: {
      width: 1200,
      height: 900,
      aspectRatio: 1200 / 900,
      localMediaId: 'media-1',
      sourceHash: 'source-hash',
      persistedHash: 'persisted-hash',
      integrityStatus: 'healthy',
      integrityReason: null,
      repairable: false,
      createdAt: 1774104000000,
      modifiedAt: 1774104000000,
    },
  },
];

const MULTI_PREPARED_MEDIA: MediaInfo[] = [
  ...PREPARED_MEDIA,
  {
    uri: 'file:///cache/media/photos/display/photo_456.jpg',
    mimeType: 'image/jpeg',
    size: 4096,
    thumbnail: 'file:///cache/media/photos/thumbnails/thumb_456.jpg',
    metadata: {
      width: 1024,
      height: 768,
      aspectRatio: 1024 / 768,
      localMediaId: 'media-2',
      sourceHash: 'source-hash-2',
      persistedHash: 'persisted-hash-2',
      integrityStatus: 'healthy',
      integrityReason: null,
      repairable: false,
      createdAt: 1774104000001,
      modifiedAt: 1774104000001,
    },
  },
];

const CREATED_FILES = [
  'file:///cache/media/photos/display/photo_123.jpg',
  'file:///cache/media/photos/thumbnails/thumb_123.jpg',
];

type PhotoSelectTestDeps = PhotoSelectDeps & {
  addLocalEntry: jest.Mock;
  updateLocalEntry: jest.Mock;
  deleteEntry: jest.Mock;
  enqueueUpload: jest.Mock;
  preparePhotoEntryMedia: jest.Mock;
};

function makeDeps(overrides: Partial<PhotoSelectTestDeps> = {}): PhotoSelectTestDeps {
  return {
    savePhotoToStorage: jest.fn(),
    deleteLocalFile: jest.fn().mockResolvedValue(undefined),
    addLocalEntry: jest.fn().mockResolvedValue({ id: 'photo-local-1' }),
    updateLocalEntry: jest.fn().mockResolvedValue(undefined),
    deleteEntry: jest.fn().mockResolvedValue(undefined),
    enqueueUpload: jest.fn(),
    preparePhotoEntryMedia: jest.fn().mockResolvedValue({
      media: PREPARED_MEDIA,
      createdFiles: CREATED_FILES,
    }),
    initialSyncStatus: 'pending_upload',
    ...overrides,
  } as PhotoSelectTestDeps;
}

describe('handlePhotoSelectForTest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates photo entry immediately with processing localReadyState and preview uri', async () => {
    const deps = makeDeps();

    await handlePhotoSelectForTest([PHOTO_RESULT], deps);

    expect(deps.addLocalEntry).toHaveBeenCalledWith({
      type: 'photo',
      content: '',
      syncStatus: 'pending_upload',
      localReadyState: 'processing',
      media: [
        expect.objectContaining({
          uri: PHOTO_RESULT.uri,
          mimeType: 'image/jpeg',
          size: 0,
          metadata: expect.objectContaining({
            width: PHOTO_RESULT.width,
            height: PHOTO_RESULT.height,
            aspectRatio: PHOTO_RESULT.aspectRatio,
          }),
        }),
      ],
    });
  });

  it('updates the same entry to ready media after local preparation succeeds', async () => {
    const deps = makeDeps();

    await handlePhotoSelectForTest([PHOTO_RESULT], deps);

    expect(deps.preparePhotoEntryMedia).toHaveBeenCalledWith([PHOTO_RESULT]);
    expect(deps.updateLocalEntry).toHaveBeenCalledWith('photo-local-1', {
      media: PREPARED_MEDIA,
      localReadyState: 'ready',
    });
  });

  it('keeps multiple preview photos visible before updating the same entry to multiple ready media items', async () => {
    const deps = makeDeps({
      preparePhotoEntryMedia: jest.fn().mockResolvedValue({
        media: MULTI_PREPARED_MEDIA,
        createdFiles: [...CREATED_FILES, 'file:///cache/media/photos/display/photo_456.jpg'],
      }),
    });

    await handlePhotoSelectForTest([PHOTO_RESULT, SECOND_PHOTO_RESULT], deps);

    expect(deps.addLocalEntry).toHaveBeenCalledWith(expect.objectContaining({
      media: [
        expect.objectContaining({ uri: PHOTO_RESULT.uri }),
        expect.objectContaining({ uri: SECOND_PHOTO_RESULT.uri }),
      ],
    }));
    expect(deps.updateLocalEntry).toHaveBeenCalledWith('photo-local-1', {
      media: MULTI_PREPARED_MEDIA,
      localReadyState: 'ready',
    });
  });

  it('deletes the created entry when local preparation fails', async () => {
    const deps = makeDeps({
      preparePhotoEntryMedia: jest.fn().mockRejectedValue(Object.assign(new Error('disk full'), {
        createdFiles: CREATED_FILES,
      })),
    });

    await expect(handlePhotoSelectForTest([PHOTO_RESULT], deps)).rejects.toThrow('disk full');

    expect(deps.deleteLocalFile).toHaveBeenCalledWith(CREATED_FILES[0]);
    expect(deps.deleteLocalFile).toHaveBeenCalledWith(CREATED_FILES[1]);
    expect(deps.deleteEntry).toHaveBeenCalledWith('photo-local-1');
    expect(deps.updateLocalEntry).not.toHaveBeenCalled();
    expect(deps.enqueueUpload).not.toHaveBeenCalled();
  });

  it('cleans up created files when ready update fails after preparation succeeds', async () => {
    const deps = makeDeps({
      updateLocalEntry: jest.fn().mockRejectedValue(new Error('db write failed')),
    });

    await expect(handlePhotoSelectForTest([PHOTO_RESULT], deps)).rejects.toThrow('db write failed');

    expect(deps.deleteLocalFile).toHaveBeenCalledWith(CREATED_FILES[0]);
    expect(deps.deleteLocalFile).toHaveBeenCalledWith(CREATED_FILES[1]);
    expect(deps.deleteEntry).toHaveBeenCalledWith('photo-local-1');
  });

  it('continues deleting the entry when one cleanup file delete fails', async () => {
    const deps = makeDeps({
      deleteLocalFile: jest.fn()
        .mockRejectedValueOnce(new Error('unlink failed'))
        .mockResolvedValueOnce(undefined),
      preparePhotoEntryMedia: jest.fn().mockRejectedValue(Object.assign(new Error('disk full'), {
        createdFiles: CREATED_FILES,
      })),
    });

    await expect(handlePhotoSelectForTest([PHOTO_RESULT], deps)).rejects.toThrow('disk full');

    expect(deps.deleteLocalFile).toHaveBeenCalledTimes(2);
    expect(deps.deleteEntry).toHaveBeenCalledWith('photo-local-1');
  });

  it('enqueues upload only after the entry becomes ready in cloud mode', async () => {
    const deps = makeDeps();

    await handlePhotoSelectForTest([PHOTO_RESULT], deps);

    expect(deps.updateLocalEntry).toHaveBeenCalledTimes(1);
    expect(deps.enqueueUpload).toHaveBeenCalledWith('photo-local-1');
    expect(deps.updateLocalEntry.mock.invocationCallOrder[0]).toBeLessThan(
      deps.enqueueUpload.mock.invocationCallOrder[0]
    );
  });

  it('does not enqueue upload in offline mode and keeps the entry synced', async () => {
    const deps = makeDeps({
      enqueueUpload: undefined as unknown as jest.Mock,
      initialSyncStatus: 'synced',
    });

    await handlePhotoSelectForTest([PHOTO_RESULT], deps);

    expect(deps.addLocalEntry).toHaveBeenCalledWith(expect.objectContaining({
      syncStatus: 'synced',
    }));
    expect(deps.updateLocalEntry).toHaveBeenCalledWith('photo-local-1', {
      media: PREPARED_MEDIA,
      localReadyState: 'ready',
    });
  });
});
