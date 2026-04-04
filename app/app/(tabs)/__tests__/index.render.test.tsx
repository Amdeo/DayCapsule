import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { VoiceService } from '@/src/services/voiceService';

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
let mockGetStateEntries: Array<{ id: string }> = [];
let mockCloudMode = false;

const mockUseEntryStoreImpl = jest.fn(() => ({
  loadEntries: mockLoadEntries,
  addEntry: mockAddEntry,
  addLocalEntry: mockAddLocalEntry,
  updateLocalEntry: mockUpdateLocalEntry,
  replaceEntry: mockReplaceEntry,
  deleteEntry: mockDeleteEntry,
  updateRecordingStatus: mockUpdateRecordingStatus,
  updateRecordingDuration: mockUpdateRecordingDuration,
  completeRecording: mockCompleteRecording,
}));

const mockGetEntryState = () => ({ entries: mockGetStateEntries });

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: Object.assign(
    (...args: unknown[]) => mockUseEntryStoreImpl(...args),
    {
      getState: mockGetEntryState,
    }
  ),
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      loadSettings: mockLoadSettings,
      cloudMode: mockCloudMode,
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

jest.mock('@/src/services/workspaceSessionState', () => ({
  buildWorkspaceSessionSnapshot: () => ({
    currentScopeKey: mockCloudMode ? 'server_user-1' : 'local',
    isAuthenticated: mockCloudMode,
    isTransitioning: false,
    isAccountScopeActive: mockCloudMode,
    canRunCloudSync: mockCloudMode,
  }),
  getWorkspaceSessionStateSync: () => ({
    currentScopeKey: mockCloudMode ? 'server_user-1' : 'local',
    isAuthenticated: mockCloudMode,
    isTransitioning: false,
    isAccountScopeActive: mockCloudMode,
    canRunCloudSync: mockCloudMode,
  }),
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
  const { View, Pressable } = require('react-native');
  return {
    Timeline: ({ onMenuPress, onQuickAdd }: { onMenuPress?: () => void; onQuickAdd?: (type: 'voice') => void }) => (
      <View testID="timeline-stub">
        <Pressable testID="timeline-open-drawer" onPress={onMenuPress} />
        <Pressable testID="timeline-quick-add-voice" onPress={() => onQuickAdd?.('voice')} />
      </View>
    ),
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

const HomeScreen = require('../index').default;

describe('HomeScreen render shell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStateEntries = [];
    mockCloudMode = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps the home screen root container after nativewind migration', () => {
    const screen = render(<HomeScreen />);

    expect(screen.getByTestId('home-screen-root')).toHaveStyle({ flex: 1 });
    expect(screen.getByTestId('timeline-stub')).toBeTruthy();
  });

  it('removes the hardware back subscription when HomeScreen unmounts with the drawer open', async () => {
    const remove = jest.fn();
    const addEventListenerSpy = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation(() => ({ remove }) as any);

    const screen = render(<HomeScreen />);
    fireEvent.press(screen.getByTestId('timeline-open-drawer'));

    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
    });

    screen.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('only updates recording duration when the visible value changes during recording', async () => {
    jest.useFakeTimers();
    mockCloudMode = true;

    const createdEntry = {
      id: 'voice-entry-1',
      timestamp: 1774104000000,
      type: 'voice' as const,
      content: '',
      syncStatus: 'pending_upload' as const,
      localReadyState: 'processing' as const,
      recordingStatus: 'recording' as const,
      recordingDuration: 0,
      media: [{ uri: '', mimeType: 'audio/m4a' as const, size: 0, duration: 0 }],
    };

    mockAddLocalEntry.mockResolvedValue(createdEntry);

    const getRecordingDurationMock = jest
      .mocked(VoiceService.getRecordingDuration)
      .mockResolvedValueOnce(0.1)
      .mockResolvedValueOnce(0.9)
      .mockResolvedValueOnce(1.2)
      .mockResolvedValueOnce(1.8);

    const screen = render(<HomeScreen />);

    fireEvent.press(screen.getByTestId('timeline-quick-add-voice'));

    await waitFor(() => {
      expect(mockAddLocalEntry).toHaveBeenCalledTimes(1);
    });

    await jest.advanceTimersByTimeAsync(1000);

    await waitFor(() => {
      expect(VoiceService.startRecording).toHaveBeenCalledTimes(1);
      expect(getRecordingDurationMock).toHaveBeenCalledTimes(4);
      expect(mockUpdateRecordingDuration.mock.calls).toEqual([
        ['voice-entry-1', 0],
        ['voice-entry-1', 1],
      ]);
    });
  });
});
