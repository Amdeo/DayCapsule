import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import type { Entry } from '@/src/types/entry';

type CloudUiState = 'hidden' | 'synced' | 'pending' | 'failed' | 'syncing';

type MockEntryStoreState = {
  entries: Entry[];
  searchQuery: string;
  filterType: 'all' | 'text' | 'photo' | 'voice';
  filterDateRange: 'all' | 'today' | 'week' | 'month';
  selectedTags: string[];
  loadEntries: jest.Mock<Promise<void>, []>;
  addEntry: jest.Mock<Promise<void>, [Omit<Entry, 'id' | 'timestamp'>]>;
  addLocalEntry: jest.Mock<Promise<Entry>, [Omit<Entry, 'id' | 'timestamp'>]>;
  updateEntry: jest.Mock<Promise<void>, [string, Partial<Entry>]>;
  updateLocalEntry: jest.Mock<Promise<void>, [string, Partial<Entry>]>;
  replaceEntry: jest.Mock<void, [string, Entry]>;
  deleteEntry: jest.Mock<Promise<void>, [string]>;
  updateRecordingStatus: jest.Mock<Promise<void>, [string, 'recording' | 'paused' | 'completed']>;
  updateRecordingDuration: jest.Mock<void, [string, number]>;
  completeRecording: jest.Mock<Promise<void>, [string, string, number]>;
  setSearchQuery: jest.Mock<void, [string]>;
  setFilterType: jest.Mock<void, ['all' | 'text' | 'photo' | 'voice']>;
  setFilterDateRange: jest.Mock<void, ['all' | 'today' | 'week' | 'month']>;
  toggleTag: jest.Mock<void, [string]>;
  clearTags: jest.Mock<void, []>;
  getAllTags: jest.Mock<Promise<string[]>, []>;
  applySearchFilters: jest.Mock<Promise<void>, [{ query?: string; type?: 'all' | 'text' | 'photo' | 'voice'; dateRange?: 'all' | 'today' | 'week' | 'month'; tags?: string[] }]>;
  loadMore: jest.Mock<void, []>;
  isLoadingMore: boolean;
  hasMore: boolean;
};

const mockEntryStoreListeners = new Set<() => void>();
const mockRefreshCloudSyncIndicator = jest.fn().mockResolvedValue(undefined);
const mockLoadSettings = jest.fn().mockResolvedValue(undefined);
const mockLoadCommonTags = jest.fn().mockResolvedValue(undefined);

let mockAllTags: string[] = [];
let mockCloudSyncUiState: CloudUiState = 'hidden';
let mockEntryStoreState: MockEntryStoreState;

const mockTimelineContentModule = {
  TimelineContent: ({
    hasEntries,
    displayEntries,
  }: {
    hasEntries: boolean;
    displayEntries: Entry[];
  }) => {
    if (!hasEntries) {
      return (
        <View testID="timeline-empty-state">
          <Text>还没有记忆</Text>
        </View>
      );
    }

    return (
      <View testID="timeline-data-state">
        {displayEntries.map((entry) => (
          <View key={entry.id} testID={`timeline-entry-${entry.id}`}>
            <Text>{entry.content}</Text>
          </View>
        ))}
      </View>
    );
  },
};

const mockTimelineDialogsModule = {
  TimelineDialogs: () => null,
};

const mockTimelineScrollTopButtonModule = {
  TimelineScrollTopButton: () => null,
};

const mockFabMenuModule = {
  FABMenu: () => null,
};

const mockSidebarModule = {
  Sidebar: () => null,
};

const mockTextEditorModule = {
  TextEditor: () => null,
};

const mockShowCloudSyncStatusAlert = jest.fn();

const emitEntryStore = () => {
  mockEntryStoreListeners.forEach((listener) => listener());
};

const setEntryStoreState = (
  update:
    | Partial<MockEntryStoreState>
    | ((state: MockEntryStoreState) => Partial<MockEntryStoreState>)
) => {
  const patch = typeof update === 'function' ? update(mockEntryStoreState) : update;
  mockEntryStoreState = {
    ...mockEntryStoreState,
    ...patch,
  };
  emitEntryStore();
};

const createEntryStoreState = (entries: Entry[]): MockEntryStoreState => ({
  entries,
  searchQuery: '',
  filterType: 'all',
  filterDateRange: 'all',
  selectedTags: [],
  loadEntries: jest.fn().mockResolvedValue(undefined),
  addEntry: jest.fn().mockResolvedValue(undefined),
  addLocalEntry: jest.fn().mockResolvedValue({
    id: 'local-entry',
    type: 'text',
    content: '',
    timestamp: Date.now(),
    syncStatus: 'pending',
  } as Entry),
  updateEntry: jest.fn().mockResolvedValue(undefined),
  updateLocalEntry: jest.fn().mockResolvedValue(undefined),
  replaceEntry: jest.fn(),
  deleteEntry: jest.fn().mockResolvedValue(undefined),
  updateRecordingStatus: jest.fn().mockResolvedValue(undefined),
  updateRecordingDuration: jest.fn(),
  completeRecording: jest.fn().mockResolvedValue(undefined),
  setSearchQuery: jest.fn(),
  setFilterType: jest.fn(),
  setFilterDateRange: jest.fn(),
  toggleTag: jest.fn(),
  clearTags: jest.fn(),
  getAllTags: jest.fn(async () => mockAllTags),
  applySearchFilters: jest.fn().mockResolvedValue(undefined),
  loadMore: jest.fn(),
  isLoadingMore: false,
  hasMore: false,
});

const mockUseEntryStore = Object.assign(
  <T,>(selector?: (state: MockEntryStoreState) => T) => {
    const snapshot = React.useSyncExternalStore(
      (listener) => {
        mockEntryStoreListeners.add(listener);
        return () => mockEntryStoreListeners.delete(listener);
      },
      () => mockEntryStoreState,
      () => mockEntryStoreState
    );

    return selector ? selector(snapshot) : snapshot;
  },
  {
    getState: () => mockEntryStoreState,
    setState: setEntryStoreState,
  }
);

const mockSettingsState = {
  loadSettings: mockLoadSettings,
  cloudMode: false,
  cardSpacing: 'default' as const,
};

const mockUseSettingsStore = Object.assign(
  () => mockSettingsState,
  {
    getState: () => mockSettingsState,
  }
);

const mockCommonTagsState = {
  tags: ['旅行', '工作'],
  isLoaded: true,
  loadCommonTags: mockLoadCommonTags,
};

const mockUseCommonTagsStore = Object.assign(
  () => mockCommonTagsState,
  {
    getState: () => mockCommonTagsState,
  }
);

const mockUseCloudSyncIndicatorStore = Object.assign(
  <T,>(selector?: (state: { uiState: CloudUiState }) => T) =>
    selector ? selector({ uiState: mockCloudSyncUiState }) : ({ uiState: mockCloudSyncUiState } as T),
  {
    getState: () => ({
      refresh: mockRefreshCloudSyncIndicator,
    }),
  }
);

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: mockUseEntryStore,
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: mockUseSettingsStore,
  SPACING_VALUES: { compact: 8, default: 12, loose: 16 },
}));

jest.mock('@/src/store/commonTagsStore', () => ({
  useCommonTagsStore: mockUseCommonTagsStore,
}));

jest.mock('@/src/store/cloudSyncIndicatorStore', () => ({
  useCloudSyncIndicatorStore: mockUseCloudSyncIndicatorStore,
}));

jest.mock('@/src/components/timeline-v2/TimelineContent', () => mockTimelineContentModule);
jest.mock('@/src/components/timeline-v2/TimelineDialogs', () => mockTimelineDialogsModule);
jest.mock('@/src/components/timeline-v2/TimelineScrollTopButton', () => mockTimelineScrollTopButtonModule);
jest.mock('@/src/components/FABMenu', () => mockFabMenuModule);
jest.mock('@/src/components/Sidebar', () => mockSidebarModule);
jest.mock('@/src/components/TextEditor', () => mockTextEditorModule);

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

jest.mock('@/src/services/showCloudSyncStatusAlert', () => ({
  showCloudSyncStatusAlert: () => mockShowCloudSyncStatusAlert(),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/src/utils/fileSystem', () => ({
  deleteFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

const HomeScreen = require('../index').default;

function renderHomeScreen(options: { entries?: Entry[]; cloudSyncUiState?: CloudUiState } = {}) {
  mockAllTags = Array.from(new Set((options.entries ?? []).flatMap((entry) => entry.tags ?? [])));
  mockCloudSyncUiState = options.cloudSyncUiState ?? 'hidden';
  mockEntryStoreState = createEntryStoreState(options.entries ?? []);

  return render(<HomeScreen />);
}

describe('HomeScreen timeline state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCloudSyncUiState = 'hidden';
    mockAllTags = [];
    mockEntryStoreState = createEntryStoreState([]);
  });

  it('renders the empty timeline state and refreshes home bootstrap sources on mount', async () => {
    const screen = renderHomeScreen();

    expect(screen.getByTestId('timeline-empty-state')).toBeTruthy();

    await waitFor(() => {
      expect(mockLoadSettings).toHaveBeenCalledTimes(1);
      expect(mockLoadCommonTags).toHaveBeenCalledTimes(1);
      expect(mockEntryStoreState.loadEntries).toHaveBeenCalledTimes(1);
      expect(mockRefreshCloudSyncIndicator).toHaveBeenCalledTimes(1);
    });
  });

  it('renders timeline entries when the home screen has data', () => {
    const screen = renderHomeScreen({
      entries: [
        {
          id: 'entry-text-1',
          type: 'text',
          content: '第一条文本记录',
          tags: ['工作'],
          timestamp: new Date('2026-03-20T09:00:00+08:00').getTime(),
          syncStatus: 'synced',
        } as Entry,
      ],
    });

    expect(screen.getByTestId('timeline-entry-entry-text-1')).toBeTruthy();
    expect(screen.getByText('第一条文本记录')).toBeTruthy();
  });

  it('shows the sync status entry point when the home timeline reports cloud activity', () => {
    const screen = renderHomeScreen({
      entries: [
        {
          id: 'entry-text-1',
          type: 'text',
          content: '第一条文本记录',
          tags: ['工作'],
          timestamp: new Date('2026-03-20T09:00:00+08:00').getTime(),
          syncStatus: 'synced',
        } as Entry,
      ],
      cloudSyncUiState: 'pending',
    });

    expect(screen.getByTestId('cloud-sync-button')).toBeTruthy();
    expect(screen.getByTestId('cloud-sync-dot-pending')).toBeTruthy();
  });
});
