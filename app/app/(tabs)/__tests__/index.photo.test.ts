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

import { Alert } from 'react-native';
import { fingerprintPhotoFile } from '@/src/services/photoIntegrityService';
import { logger } from '@/src/utils/logger';
import { handlePhotoSelectForTest, PhotoSelectDeps } from '../index';

const PHOTO_RESULT = {
  uri: 'content://media/external/images/1234',
  width: 3024,
  height: 4032,
  aspectRatio: 3024 / 4032,
};

const CACHE_URI =
  'file:///data/user/0/com.app/cache/media/photos/display/photo_123.jpg';

const THUMBNAIL_URI =
  'file:///data/user/0/com.app/cache/media/photos/thumbnails/thumb_123.jpg';

const SAVED_PHOTO = {
  originalUri: CACHE_URI,
  thumbnailUri: THUMBNAIL_URI,
  aspectRatio: PHOTO_RESULT.aspectRatio,
  width: PHOTO_RESULT.width,
  height: PHOTO_RESULT.height,
};

const SOURCE_FINGERPRINT = {
  uri: PHOTO_RESULT.uri,
  sha256: 'source-hash',
  size: 8000,
  width: PHOTO_RESULT.width,
  height: PHOTO_RESULT.height,
  mimeType: 'image/jpeg' as const,
};

const PERSISTED_FINGERPRINT = {
  uri: CACHE_URI,
  sha256: 'persisted-hash',
  size: 2048,
  width: 1200,
  height: 900,
  mimeType: 'image/jpeg' as const,
};

type PhotoSelectTestDeps = PhotoSelectDeps & {
  addLocalEntry: jest.Mock;
  enqueueUpload: jest.Mock;
  addEntry: jest.Mock;
};

const mockFingerprintPhotoFile = fingerprintPhotoFile as jest.Mock;

function makeDeps(overrides: Partial<PhotoSelectTestDeps> = {}): PhotoSelectTestDeps {
  return {
    savePhotoToStorage: jest.fn().mockResolvedValue(SAVED_PHOTO),
    deleteLocalFile: jest.fn().mockResolvedValue(undefined),
    addEntry: jest.fn().mockResolvedValue(undefined),
    addLocalEntry: jest.fn().mockResolvedValue({ id: 'photo-local-1' }),
    enqueueUpload: jest.fn(),
    ...overrides,
  } as PhotoSelectTestDeps;
}

describe('handlePhotoSelectForTest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFingerprintPhotoFile.mockImplementation(async (uri: string) => {
      if (uri === PHOTO_RESULT.uri) {
        return SOURCE_FINGERPRINT;
      }

      return { ...PERSISTED_FINGERPRINT, uri };
    });
  });

  it('savePhotoToStorage 失败时不调用 addLocalEntry', async () => {
    const deps = makeDeps({
      savePhotoToStorage: jest.fn().mockRejectedValue(new Error('disk full')),
    });

    await expect(handlePhotoSelectForTest([PHOTO_RESULT], deps)).rejects.toThrow('disk full');

    expect(deps.addLocalEntry).not.toHaveBeenCalled();
  });

  it('云端照片创建时使用本地 cache URI，并标记为 pending_upload', async () => {
    const deps = makeDeps();

    await handlePhotoSelectForTest([PHOTO_RESULT], deps);

    expect(deps.addLocalEntry).toHaveBeenCalledTimes(1);
    const callArg = deps.addLocalEntry.mock.calls[0][0];
    expect(callArg.syncStatus).toBe('pending_upload');
    expect(callArg.media?.[0]?.uri).toBe(CACHE_URI);
    expect(callArg.media?.[0]?.uri).not.toContain('content://');
    expect(callArg.media?.[0]?.uri).toContain('cache');
  });

  it('本地卡片创建成功后立即 enqueue 一次后台上传', async () => {
    const deps = makeDeps();

    await handlePhotoSelectForTest([PHOTO_RESULT], deps);

    expect(deps.enqueueUpload).toHaveBeenCalledTimes(1);
    expect(deps.enqueueUpload).toHaveBeenCalledWith('photo-local-1');
  });

  it('离线照片创建时不应入队后台上传，并应标记为 synced', async () => {
    const deps = makeDeps();

    await handlePhotoSelectForTest([PHOTO_RESULT], {
      ...deps,
      enqueueUpload: undefined,
      initialSyncStatus: 'synced',
    });

    expect(deps.addLocalEntry).toHaveBeenCalledWith(expect.objectContaining({
      syncStatus: 'synced',
    }));
    expect(deps.enqueueUpload).not.toHaveBeenCalled();
  });

  it('savePhotoToStorage 接收临时 URI，addLocalEntry 不使用临时 URI', async () => {
    const deps = makeDeps();

    await handlePhotoSelectForTest([PHOTO_RESULT], deps);

    expect((deps.savePhotoToStorage as jest.Mock).mock.calls[0][0]).toBe(PHOTO_RESULT.uri);
    const addCallArg = deps.addLocalEntry.mock.calls[0][0];
    expect(addCallArg.media?.[0]?.uri).not.toBe(PHOTO_RESULT.uri);
  });

  it('single photo: addLocalEntry receives media array of length 1', async () => {
    const deps = makeDeps();

    await handlePhotoSelectForTest([PHOTO_RESULT], deps);
    expect(deps.savePhotoToStorage).toHaveBeenCalledTimes(1);
    const call = deps.addLocalEntry.mock.calls[0][0];
    expect(call.media).toHaveLength(1);
    expect(call.media[0].uri).toBe(CACHE_URI);
  });

  it('3 photos: addLocalEntry receives media array of length 3, save called 3 times', async () => {
    const deps = makeDeps();
    const results = [PHOTO_RESULT, PHOTO_RESULT, PHOTO_RESULT];

    await handlePhotoSelectForTest(results, deps);
    expect(deps.savePhotoToStorage).toHaveBeenCalledTimes(3);
    const call = deps.addLocalEntry.mock.calls[0][0];
    expect(call.media).toHaveLength(3);
  });

  it('addLocalEntry 失败时清理本次新建的本地媒体文件', async () => {
    const deps = makeDeps({
      addLocalEntry: jest.fn().mockRejectedValue(new Error('upload failed')),
    });

    await expect(handlePhotoSelectForTest([PHOTO_RESULT], deps)).rejects.toThrow('upload failed');

    expect(deps.deleteLocalFile).toHaveBeenCalledWith(CACHE_URI);
    expect(deps.deleteLocalFile).toHaveBeenCalledWith(THUMBNAIL_URI);
  });

  it('stores source and persisted hashes on the new photo entry', async () => {
    mockFingerprintPhotoFile
      .mockResolvedValueOnce(SOURCE_FINGERPRINT)
      .mockResolvedValueOnce(PERSISTED_FINGERPRINT);
    const deps = makeDeps();

    await handlePhotoSelectForTest([PHOTO_RESULT], deps);

    expect(deps.addLocalEntry).toHaveBeenCalledWith(expect.objectContaining({
      media: [expect.objectContaining({
        size: PERSISTED_FINGERPRINT.size,
        metadata: expect.objectContaining({
          localMediaId: expect.any(String),
          sourceHash: 'source-hash',
          persistedHash: 'persisted-hash',
          integrityStatus: 'healthy',
          repairable: false,
        }),
      })],
    }));
  });

  it('logs photo capture and db entry save payloads', async () => {
    const deps = makeDeps();

    await handlePhotoSelectForTest([PHOTO_RESULT], deps);

    expect(logger.log).toHaveBeenCalledWith(
      'photo.capture.received',
      expect.objectContaining({
        sourceUri: PHOTO_RESULT.uri,
        sourceHash: SOURCE_FINGERPRINT.sha256,
      }),
    );
    expect(logger.log).toHaveBeenCalledWith(
      'photo.db.entry_saved',
      expect.objectContaining({
        localUri: CACHE_URI,
        persistedHash: PERSISTED_FINGERPRINT.sha256,
        integrityStatus: 'healthy',
      }),
    );
  });
});
