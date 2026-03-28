import React from 'react';
import { act, render } from '@testing-library/react-native';
import HomeScreen from '../index';

let capturedOnQuickAdd: undefined | ((type: 'text' | 'photo' | 'voice') => Promise<void> | void);

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => ({
    loadEntries: jest.fn().mockResolvedValue(undefined),
    addEntry: jest.fn().mockResolvedValue(undefined),
    addLocalEntry: jest.fn().mockImplementation(async (entry) => ({
      id: 'temp-voice-1',
      timestamp: 1774104000000,
      ...entry,
    })),
    updateLocalEntry: jest.fn().mockResolvedValue(undefined),
    replaceEntry: jest.fn().mockResolvedValue(undefined),
    deleteEntry: jest.fn().mockResolvedValue(undefined),
    updateRecordingStatus: jest.fn().mockResolvedValue(undefined),
    updateRecordingDuration: jest.fn().mockResolvedValue(undefined),
    completeRecording: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      loadSettings: jest.fn().mockResolvedValue(undefined),
      cloudMode: true,
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
    stopRecording: jest.fn().mockResolvedValue({
      uri: 'file:///cache/recording.m4a',
      duration: 0,
      size: 0,
      mimeType: 'audio/m4a',
    }),
    saveVoiceToCache: jest.fn().mockResolvedValue('file:///cache/final.m4a'),
    saveVoiceToStorage: jest.fn().mockResolvedValue('file:///saved-recording.m4a'),
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
  buildPhotoLogPayload: jest.fn(() => ({})),
  fingerprintPhotoFile: jest.fn().mockResolvedValue({
    sha256: 'abc',
    mimeType: 'image/jpeg',
    size: 1,
    width: 1,
    height: 1,
  }),
}));

jest.mock('@/src/components/Timeline.v2', () => {
  const { View } = require('react-native');
  return {
    Timeline: ({ onQuickAdd }: { onQuickAdd?: (type: 'text' | 'photo' | 'voice') => Promise<void> | void }) => {
      capturedOnQuickAdd = onQuickAdd;
      return <View testID="timeline-stub" />;
    },
  };
});

jest.mock('@/src/components/Sidebar', () => {
  const { View } = require('react-native');
  return {
    Sidebar: () => <View testID="sidebar-stub" />,
  };
});

jest.mock('@/src/components/TextEditor', () => {
  const { View } = require('react-native');
  return {
    TextEditor: () => <View testID="text-editor-stub" />,
  };
});

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/src/utils/fileSystem', () => ({
  deleteFile: jest.fn().mockResolvedValue(undefined),
}));

describe('HomeScreen cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnQuickAdd = undefined;
  });

  it('clears the active recording timer when HomeScreen unmounts', async () => {
    jest.useFakeTimers();
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const screen = render(<HomeScreen />);
    expect(capturedOnQuickAdd).toBeDefined();

    // Drive the real HomeScreen recording start path so it allocates an interval.
    await act(async () => {
      await capturedOnQuickAdd?.('voice');
    });

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    const intervalHandle = setIntervalSpy.mock.results[0]?.value;

    screen.unmount();

    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalHandle);

    jest.useRealTimers();
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });
});
