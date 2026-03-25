import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';

type TimelineEntry = {
  id: string;
  type: 'text' | 'photo' | 'voice';
  content: string;
  tags?: string[];
  timestamp: number;
  syncStatus: 'synced' | 'pending_upload' | 'pending_sync' | 'failed';
};

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

let mockEntries: TimelineEntry[] = [];
let mockCloudSyncPending = false;

const mockTimelineModule = {
  Timeline: ({ onMenuPress }: { onMenuPress?: () => void }) => (
    <View testID="timeline-home-shell">
      <Pressable testID="searchbar-menu-button-pressable" onPress={onMenuPress}>
        <Text>menu</Text>
      </Pressable>
      {mockCloudSyncPending ? (
        <View testID="cloud-sync-button">
          <View testID="cloud-sync-dot-pending" />
        </View>
      ) : null}
      {mockEntries.length === 0 ? (
        <View testID="timeline-empty-state">
          <Text>还没有记忆</Text>
        </View>
      ) : (
        <View testID="timeline-data-state">
          {mockEntries.map((entry) => (
            <View key={entry.id} testID={`timeline-entry-${entry.id}`}>
              <Text>{entry.content}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  ),
};

const mockSidebarModule = {
  Sidebar: () => <View testID="sidebar-stub" />,
};

const mockTextEditorModule = {
  TextEditor: () => <View testID="text-editor-stub" />,
};

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

jest.mock('@/src/components/Timeline.v2', () => mockTimelineModule);
jest.mock('@/src/components/Sidebar', () => mockSidebarModule);
jest.mock('@/src/components/TextEditor', () => mockTextEditorModule);

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/src/utils/fileSystem', () => ({
  deleteFile: jest.fn().mockResolvedValue(undefined),
}));

const HomeScreen = require('../index').default;

function renderTimelineState(options: {
  entries?: TimelineEntry[];
  cloudSyncPending?: boolean;
} = {}) {
  mockEntries = options.entries ?? [];
  mockCloudSyncPending = options.cloudSyncPending ?? false;

  return render(<HomeScreen />);
}

describe('HomeScreen timeline state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEntries = [];
    mockCloudSyncPending = false;
  });

  it('renders the empty timeline state and refreshes home bootstrap sources on mount', async () => {
    const screen = renderTimelineState();

    expect(screen.getByTestId('timeline-empty-state')).toBeTruthy();

    await waitFor(() => {
      expect(mockLoadSettings).toHaveBeenCalledTimes(1);
      expect(mockLoadCommonTags).toHaveBeenCalledTimes(1);
      expect(mockLoadEntries).toHaveBeenCalledTimes(1);
      expect(mockRefreshCloudSyncIndicator).toHaveBeenCalledTimes(1);
    });
  });

  it('renders timeline entries when the home screen has data', () => {
    const screen = renderTimelineState({
      entries: [
        {
          id: 'entry-text-1',
          type: 'text',
          content: '第一条文本记录',
          tags: ['工作'],
          timestamp: new Date('2026-03-20T09:00:00+08:00').getTime(),
          syncStatus: 'synced',
        },
      ],
    });

    expect(screen.getByTestId('timeline-entry-entry-text-1')).toBeTruthy();
    expect(screen.getByText('第一条文本记录')).toBeTruthy();
  });

  it('shows the sync status entry point when the home timeline reports cloud activity', () => {
    const screen = renderTimelineState({
      entries: [
        {
          id: 'entry-text-1',
          type: 'text',
          content: '第一条文本记录',
          tags: ['工作'],
          timestamp: new Date('2026-03-20T09:00:00+08:00').getTime(),
          syncStatus: 'synced',
        },
      ],
      cloudSyncPending: true,
    });

    expect(screen.getByTestId('cloud-sync-button')).toBeTruthy();
    expect(screen.getByTestId('cloud-sync-dot-pending')).toBeTruthy();
  });
});
