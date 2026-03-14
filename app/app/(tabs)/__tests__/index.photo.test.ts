jest.mock('react-native', () => {
  return {
    View: 'View',
    Alert: { alert: jest.fn() },
    Linking: { openURL: jest.fn() },
  };
});

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => ({
    loadEntries: jest.fn(),
    addEntry: jest.fn(),
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
    preloadAudio: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/src/services/photoService', () => ({
  PhotoService: {
    savePhotoToStorage: jest.fn(),
  },
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

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native-css-interop/src/runtime/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));

import { Alert } from 'react-native';
import { handlePhotoSelectForTest, PhotoSelectDeps } from '../index';

const PHOTO_RESULT = {
  uri: 'content://media/external/images/1234',
  width: 3024,
  height: 4032,
  aspectRatio: 3024 / 4032,
};

const PERSISTENT_URI =
  'file:///data/user/0/com.app/files/media/photos/original/photo_123.jpg';

const THUMBNAIL_URI =
  'file:///data/user/0/com.app/files/media/photos/original/thumb_123.jpg';

const SAVED_PHOTO = {
  originalUri: PERSISTENT_URI,
  thumbnailUri: THUMBNAIL_URI,
  aspectRatio: PHOTO_RESULT.aspectRatio,
  width: PHOTO_RESULT.width,
  height: PHOTO_RESULT.height,
};

function makeDeps(overrides: Partial<PhotoSelectDeps> = {}): PhotoSelectDeps {
  return {
    savePhotoToStorage: jest.fn().mockResolvedValue(SAVED_PHOTO),
    addEntry: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('handlePhotoSelectForTest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('savePhotoToStorage 失败时不调用 addEntry', async () => {
    const deps = makeDeps({
      savePhotoToStorage: jest.fn().mockRejectedValue(new Error('disk full')),
    });

    await expect(handlePhotoSelectForTest(PHOTO_RESULT, deps)).rejects.toThrow('disk full');

    expect(deps.addEntry).not.toHaveBeenCalled();
  });

  it('addEntry 收到持久化 URI，不含 content:// 前缀', async () => {
    const deps = makeDeps();

    await handlePhotoSelectForTest(PHOTO_RESULT, deps);

    expect(deps.addEntry).toHaveBeenCalledTimes(1);
    const callArg = (deps.addEntry as jest.Mock).mock.calls[0][0];
    expect(callArg.media.uri).toBe(PERSISTENT_URI);
    expect(callArg.media.uri).not.toContain('content://');
    expect(callArg.media.uri).not.toContain('cache');
  });

  it('addEntry 只被调用一次（无 updateEntry 第二步）', async () => {
    const deps = makeDeps();

    await handlePhotoSelectForTest(PHOTO_RESULT, deps);

    expect(deps.addEntry).toHaveBeenCalledTimes(1);
  });

  it('savePhotoToStorage 接收临时 URI，addEntry 不使用临时 URI', async () => {
    const deps = makeDeps();

    await handlePhotoSelectForTest(PHOTO_RESULT, deps);

    expect((deps.savePhotoToStorage as jest.Mock).mock.calls[0][0]).toBe(PHOTO_RESULT.uri);
    const addCallArg = (deps.addEntry as jest.Mock).mock.calls[0][0];
    expect(addCallArg.media.uri).not.toBe(PHOTO_RESULT.uri);
  });
});
