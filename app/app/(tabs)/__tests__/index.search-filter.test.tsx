import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
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
const mockLoadSettings = jest.fn().mockResolvedValue(undefined);
const mockLoadCommonTags = jest.fn().mockResolvedValue(undefined);
const mockRefreshCloudSyncIndicator = jest.fn().mockResolvedValue(undefined);

let mockSourceEntries: Entry[] = [];
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

function applyFilters(entries: Entry[], filters: {
  query?: string;
  type?: 'all' | 'text' | 'photo' | 'voice';
  dateRange?: 'all' | 'today' | 'week' | 'month';
  tags?: string[];
}) {
  const query = filters.query?.trim() ?? '';
  const type = filters.type ?? 'all';
  const tags = filters.tags ?? [];

  return entries.filter((entry) => {
    if (query && !entry.content.includes(query)) return false;
    if (type !== 'all' && entry.type !== type) return false;
    if (tags.length > 0 && !tags.every((tag) => entry.tags?.includes(tag))) return false;
    return true;
  });
}

const createEntryStoreState = (entries: Entry[]): MockEntryStoreState => {
  const state: MockEntryStoreState = {
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
    setSearchQuery: jest.fn((query: string) => {
      setEntryStoreState({ searchQuery: query });
    }),
    setFilterType: jest.fn((type: 'all' | 'text' | 'photo' | 'voice') => {
      setEntryStoreState({ filterType: type });
    }),
    setFilterDateRange: jest.fn((dateRange: 'all' | 'today' | 'week' | 'month') => {
      setEntryStoreState({ filterDateRange: dateRange });
    }),
    toggleTag: jest.fn((tag: string) => {
      setEntryStoreState((current) => ({
        selectedTags: current.selectedTags.includes(tag)
          ? current.selectedTags.filter((item) => item !== tag)
          : [...current.selectedTags, tag],
      }));
    }),
    clearTags: jest.fn(() => {
      setEntryStoreState({ selectedTags: [] });
    }),
    getAllTags: jest.fn(async () => mockAllTags),
    applySearchFilters: jest.fn(async (filters) => {
      setEntryStoreState({
        searchQuery: filters.query ?? '',
        filterType: filters.type ?? 'all',
        filterDateRange: filters.dateRange ?? 'all',
        selectedTags: filters.tags ?? [],
        entries: applyFilters(mockSourceEntries, filters),
      });
    }),
    loadMore: jest.fn(),
    isLoadingMore: false,
    hasMore: false,
  };

  return state;
};

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
  showCloudSyncStatusAlert: jest.fn(),
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

function renderHomeScreen(entries: Entry[]) {
  mockSourceEntries = entries;
  mockAllTags = Array.from(new Set(entries.flatMap((entry) => entry.tags ?? [])));
  mockCloudSyncUiState = 'hidden';
  mockEntryStoreState = createEntryStoreState(entries);

  return render(<HomeScreen />);
}

describe('HomeScreen search filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const entries = [
      {
        id: 'entry-text-1',
        type: 'text',
        content: '整理旅行照片',
        tags: ['旅行'],
        timestamp: new Date('2026-03-20T09:00:00+08:00').getTime(),
        syncStatus: 'synced',
      },
      {
        id: 'entry-photo-1',
        type: 'photo',
        content: '旅行海边照片',
        tags: ['旅行', '海边'],
        timestamp: new Date('2026-03-21T09:00:00+08:00').getTime(),
        syncStatus: 'synced',
        media: [{ uri: 'file:///photo.jpg', mimeType: 'image/jpeg', size: 123 }],
      },
    ] as Entry[];

    mockSourceEntries = entries;
    mockAllTags = ['旅行', '海边'];
    mockCloudSyncUiState = 'hidden';
    mockEntryStoreState = createEntryStoreState(entries);
  });

  it('opens search from the home search box and dismisses it from the cancel button', async () => {
    const screen = render(<HomeScreen />);

    fireEvent.press(screen.getByTestId('searchbar-search-box'));
    expect(screen.getByTestId('search-overlay-root')).toBeTruthy();

    await waitFor(() => {
      expect(mockEntryStoreState.getAllTags).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(screen.getByTestId('search-overlay-cancel-button'));
    await waitFor(() => {
      expect(screen.queryByTestId('search-overlay-root')).toBeNull();
    });
  });

  it('applies keyword, type and tag filters from the real home screen search flow', async () => {
    const screen = render(<HomeScreen />);

    fireEvent.press(screen.getByTestId('searchbar-search-box'));

    await waitFor(() => {
      expect(mockEntryStoreState.getAllTags).toHaveBeenCalledTimes(1);
    });

    fireEvent.changeText(screen.getByPlaceholderText('搜索记忆...'), '旅行');
    fireEvent.press(screen.getByText('照片'));
    fireEvent.press(screen.getByText('#旅行'));
    fireEvent.press(screen.getByTestId('search-overlay-submit-button'));

    await waitFor(() => {
      expect(mockEntryStoreState.applySearchFilters).toHaveBeenCalledWith({
        query: '旅行',
        type: 'photo',
        dateRange: 'all',
        tags: ['旅行'],
      });
    });

    await waitFor(() => {
      expect(screen.queryByTestId('search-overlay-root')).toBeNull();
    });

    expect(screen.getByText('1 条')).toBeTruthy();
    expect(screen.getByText('"旅行"')).toBeTruthy();
    expect(screen.getByText('照片')).toBeTruthy();
    expect(screen.getByText('#旅行')).toBeTruthy();
    expect(screen.getByTestId('timeline-entry-entry-photo-1')).toBeTruthy();
  });
});
