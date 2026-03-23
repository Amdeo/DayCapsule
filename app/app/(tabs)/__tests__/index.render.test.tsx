import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import HomeScreen from '../index';

const mockLoadEntries = jest.fn().mockResolvedValue(undefined);
const mockAddEntry = jest.fn().mockResolvedValue(undefined);
const mockAddLocalEntry = jest.fn().mockResolvedValue(undefined);
const mockUpdateLocalEntry = jest.fn().mockResolvedValue(undefined);
const mockReplaceEntry = jest.fn().mockResolvedValue(undefined);
const mockDeleteEntry = jest.fn().mockResolvedValue(undefined);
const mockUpdateRecordingStatus = jest.fn().mockResolvedValue(undefined);
const mockUpdateRecordingDuration = jest.fn().mockResolvedValue(undefined);
const mockCompleteRecording = jest.fn().mockResolvedValue(undefined);
const mockRefreshCloudSyncIndicator = jest.fn().mockResolvedValue(undefined);
const mockLoadSettings = jest.fn().mockResolvedValue(undefined);
const mockLoadCommonTags = jest.fn().mockResolvedValue(undefined);
let timelineRenderCount = 0;

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => ({
    loadEntries: mockLoadEntries,
    addEntry: mockAddEntry,
    addLocalEntry: mockAddLocalEntry,
    updateLocalEntry: mockUpdateLocalEntry,
    replaceEntry: mockReplaceEntry,
    deleteEntry: mockDeleteEntry,
    updateRecordingStatus: mockUpdateRecordingStatus,
    updateRecordingDuration: mockUpdateRecordingDuration,
    completeRecording: mockCompleteRecording,
  }),
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      loadSettings: mockLoadSettings,
      cloudMode: false,
    }),
  },
}));

jest.mock('@/src/store/commonTagsStore', () => ({
  useCommonTagsStore: {
    getState: () => ({
      loadCommonTags: mockLoadCommonTags,
    }),
  },
}));

jest.mock('@/src/store/cloudSyncIndicatorStore', () => ({
  useCloudSyncIndicatorStore: {
    getState: () => ({
      refresh: mockRefreshCloudSyncIndicator,
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
      uri: 'file:///recording.m4a',
      duration: 0,
      size: 0,
      mimeType: 'audio/m4a',
    }),
    saveVoiceToStorage: jest.fn().mockResolvedValue('file:///saved-recording.m4a'),
    saveVoiceToCache: jest.fn().mockResolvedValue('file:///saved-recording.m4a'),
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

jest.mock('@/src/components/Timeline.v2', () => {
  const { View } = require('react-native');
  return {
    Timeline: () => {
      timelineRenderCount += 1;
      return <View testID="timeline-stub" />;
    },
  };
});

jest.mock('@/src/components/Sidebar', () => {
  const { View, Pressable, Text } = require('react-native');
  return {
    Sidebar: ({ setShowStats }: { setShowStats: (value: boolean) => void }) => (
      <View testID="sidebar-stub">
        <Pressable testID="sidebar-open-stats" onPress={() => setShowStats(true)}>
          <Text>打开统计</Text>
        </Pressable>
      </View>
    ),
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

describe('HomeScreen render shell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    timelineRenderCount = 0;
  });

  it('keeps the home screen root container after nativewind migration', () => {
    const screen = render(<HomeScreen />);

    expect(screen.getByTestId('home-screen-root')).toHaveStyle({ flex: 1 });
  });

  it('does not rerender timeline when opening a sidebar detail page', () => {
    const screen = render(<HomeScreen />);

    expect(timelineRenderCount).toBe(1);

    fireEvent.press(screen.getByTestId('sidebar-open-stats'));

    expect(timelineRenderCount).toBe(1);
  });
});
