jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: Object.assign(
    () => ({
      loadEntries: jest.fn(),
      addEntry: jest.fn(),
      addLocalEntry: jest.fn(),
      updateLocalEntry: jest.fn(),
      replaceEntry: jest.fn(),
      deleteEntry: jest.fn(),
      updateRecordingStatus: jest.fn(),
      updateRecordingDuration: jest.fn(),
      completeRecording: jest.fn(),
    }),
    {
      getState: () => ({ entries: [] }),
      setState: jest.fn(),
    },
  ),
}));

jest.mock('@/src/components/Timeline.v2', () => ({
  Timeline: () => null,
}));

jest.mock('@/src/components/Sidebar', () => ({
  Sidebar: () => null,
}));

jest.mock('@/src/components/TextEditor', () => ({
  TextEditor: () => null,
}));

jest.mock('@/src/services/voiceService', () => ({
  VoiceService: {
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    saveVoiceToCache: jest.fn(),
    saveVoiceToStorage: jest.fn(),
    preloadAudio: jest.fn(),
    prewarmAudioSystem: jest.fn(),
    getRecordingDuration: jest.fn(),
    cancelRecording: jest.fn(),
  },
}));

jest.mock('@/src/services/photoService', () => ({
  PhotoService: {
    savePhotoToCache: jest.fn(),
    savePhotoToStorage: jest.fn(),
  },
}));

jest.mock('@/src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      cloudMode: false,
      loadSettings: jest.fn(),
    }),
  },
}));

jest.mock('@/src/store/commonTagsStore', () => ({
  useCommonTagsStore: {
    getState: () => ({
      loadCommonTags: jest.fn(),
    }),
  },
}));

jest.mock('@/src/store/cloudSyncIndicatorStore', () => ({
  useCloudSyncIndicatorStore: {
    getState: () => ({
      refresh: jest.fn(),
    }),
  },
}));

jest.mock('@/src/utils/fileSystem', () => ({
  deleteFile: jest.fn(),
}));

jest.mock('@/src/services/voiceUploadQueue', () => ({
  enqueueVoiceUpload: jest.fn(),
  configureVoiceUploadQueueCallbacks: jest.fn(),
  flushPendingVoiceUploads: jest.fn(),
}));

jest.mock('@/src/services/photoUploadQueue', () => ({
  enqueuePhotoUpload: jest.fn(),
  configurePhotoUploadQueueCallbacks: jest.fn(),
}));

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

import {
  buildActiveRecordingDialogForTest,
  buildMicrophonePermissionDialogForTest,
  buildPhotoSaveFailedDialogForTest,
  buildRecordingSaveFailedDialogForTest,
} from '../(tabs)/index';

describe('HomeScreen dialog builders', () => {
  it('builds a blocking dialog for active recording conflicts', () => {
    expect(buildActiveRecordingDialogForTest()).toEqual(
      expect.objectContaining({
        title: '录音进行中',
        message: '请先完成当前录音，再开始新的录音。',
        blocking: true,
        tone: 'error',
        actions: [expect.objectContaining({ label: '知道了', role: 'primary' })],
      })
    );
  });

  it('builds a microphone permission dialog that can open system settings', async () => {
    const openSettings = jest.fn();
    const request = buildMicrophonePermissionDialogForTest(openSettings);

    expect(request).toEqual(
      expect.objectContaining({
        title: '需要麦克风权限',
        message: '请在系统设置中允许 DayCapsule 访问麦克风，才能录制语音。',
        blocking: true,
        actions: expect.arrayContaining([
          expect.objectContaining({ label: '取消', role: 'secondary' }),
          expect.objectContaining({ label: '去设置', role: 'primary' }),
        ]),
      })
    );

    const settingsAction = request.actions.find((action) => action.label === '去设置');
    await settingsAction?.onPress?.();

    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it('builds a blocking dialog for voice save failures', () => {
    expect(buildRecordingSaveFailedDialogForTest()).toEqual(
      expect.objectContaining({
        title: '录音保存失败',
        message: '录音文件保存失败，请重试。',
        blocking: true,
        tone: 'error',
      })
    );
  });

  it('builds a blocking dialog for photo save failures', () => {
    expect(buildPhotoSaveFailedDialogForTest()).toEqual(
      expect.objectContaining({
        title: '保存失败',
        message: '照片保存失败，请重试',
        blocking: true,
        tone: 'error',
      })
    );
  });
});
