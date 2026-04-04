import React from 'react';
import { AsyncLocalStorage } from 'async_hooks';
import { act, render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import type { Entry } from '@/src/types/entry';

export type CloudUiState = 'hidden' | 'synced' | 'pending' | 'failed' | 'syncing';

type MockEntryStoreState = {
  entries: Entry[];
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
  getAllTags: jest.Mock<Promise<string[]>, []>;
  applySearchFilters: jest.Mock<
    Promise<void>,
    [{
      query?: string;
      type?: 'all' | 'text' | 'photo' | 'voice';
      dateRange?: 'all' | 'today' | 'week' | 'month';
      tags?: string[];
    }]
  >;
  loadMore: jest.Mock<void, []>;
  isLoadingMore: boolean;
  hasMore: boolean;
};

type MockEntryFilterUiState = {
  searchQuery: string;
  filterType: 'all' | 'text' | 'photo' | 'voice';
  filterDateRange: 'all' | 'today' | 'week' | 'month';
  selectedTags: string[];
  setSearchQuery: jest.Mock<void, [string]>;
  setFilterType: jest.Mock<void, ['all' | 'text' | 'photo' | 'voice']>;
  setFilterDateRange: jest.Mock<void, ['all' | 'today' | 'week' | 'month']>;
  toggleTag: jest.Mock<void, [string]>;
  clearTags: jest.Mock<void, []>;
  applySearchFilters: jest.Mock<
    void,
    [{
      query?: string;
      type?: 'all' | 'text' | 'photo' | 'voice';
      dateRange?: 'all' | 'today' | 'week' | 'month';
      tags?: string[];
    }]
  >;
};

export interface RenderHomeScreenOptions {
  entries?: Entry[];
  allTags?: string[];
  commonTags?: string[];
  cloudSyncUiState?: CloudUiState;
  authenticated?: boolean;
  accountScopeActive?: boolean;
  sessionTransitioning?: boolean;
  loadEntriesImplementation?: () => Promise<void>;
  loadSettingsImplementation?: () => Promise<void>;
  loadCommonTagsImplementation?: () => Promise<void>;
  initialFilters?: {
    searchQuery?: string;
    filterType?: 'all' | 'text' | 'photo' | 'voice';
    filterDateRange?: 'all' | 'today' | 'week' | 'month';
    selectedTags?: string[];
  };
}

type RenderHomeScreenState = {
  sourceEntries: Entry[];
  allTags: string[];
  derivesAllTagsFromEntries: boolean;
};

type MockEntryStoreContainer = {
  state: MockEntryStoreState;
  listeners: Set<() => void>;
};

type MockEntryFilterUiStoreContainer = {
  state: MockEntryFilterUiState;
  listeners: Set<() => void>;
};

const mockRefreshCloudSyncIndicator = jest.fn().mockResolvedValue(undefined);
const mockLoadSettings = jest.fn().mockResolvedValue(undefined);
const mockLoadCommonTags = jest.fn().mockResolvedValue(undefined);
const mockShowCloudSyncStatusAlert = jest.fn();
const mockShowErrorFeedback = jest.fn();
const mockVoiceStartRecording = jest.fn().mockResolvedValue(undefined);
const mockVoicePreloadAudio = jest.fn().mockResolvedValue(undefined);
const mockLoggerError = jest.fn();

let defaultMockEntryStore: MockEntryStoreContainer;
let defaultMockEntryFilterUiStore: MockEntryFilterUiStoreContainer;
const activeEntryStore = new AsyncLocalStorage<MockEntryStoreContainer>();
const activeEntryFilterUiStore = new AsyncLocalStorage<MockEntryFilterUiStoreContainer>();
const fabSelectHandlers = new WeakMap<MockEntryStoreContainer, (type: 'text' | 'photo' | 'voice') => void>();
const cloudSyncUiStates = new WeakMap<MockEntryStoreContainer, CloudUiState>();

const MockEntryStoreContext = React.createContext<MockEntryStoreContainer | null>(null);
const MockEntryFilterUiStoreContext = React.createContext<MockEntryFilterUiStoreContainer | null>(null);

const resolveActiveEntryStore = (contextStore: MockEntryStoreContainer | null = null) => (
  contextStore ?? activeEntryStore.getStore() ?? defaultMockEntryStore
);

const resolveActiveEntryFilterUiStore = (contextStore: MockEntryFilterUiStoreContainer | null = null) => (
  contextStore ?? activeEntryFilterUiStore.getStore() ?? defaultMockEntryFilterUiStore
);

const emitEntryStore = (store: MockEntryStoreContainer) => {
  store.listeners.forEach((listener) => listener());
};

const emitEntryFilterUiStore = (store: MockEntryFilterUiStoreContainer) => {
  store.listeners.forEach((listener) => listener());
};

const runWithActiveRenderStores = <Args extends unknown[], Result>(
  stores: {
    entryStore: MockEntryStoreContainer;
    filterUiStore: MockEntryFilterUiStoreContainer;
  },
  callback: (...args: Args) => Result
) => (...args: Args) => {
  const previousStore = defaultMockEntryStore;
  const previousFilterUiStore = defaultMockEntryFilterUiStore;
  defaultMockEntryStore = stores.entryStore;
  defaultMockEntryFilterUiStore = stores.filterUiStore;

  return activeEntryStore.run(stores.entryStore, () => activeEntryFilterUiStore.run(stores.filterUiStore, () => {
    const result = callback(...args);
    if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
      return (result as PromiseLike<unknown>).finally(() => {
        if (defaultMockEntryStore === stores.entryStore) {
          defaultMockEntryStore = previousStore;
        }
        if (defaultMockEntryFilterUiStore === stores.filterUiStore) {
          defaultMockEntryFilterUiStore = previousFilterUiStore;
        }
      }) as Result;
    }

    if (defaultMockEntryStore === stores.entryStore) {
      defaultMockEntryStore = previousStore;
    }
    if (defaultMockEntryFilterUiStore === stores.filterUiStore) {
      defaultMockEntryFilterUiStore = previousFilterUiStore;
    }

    return result;
  }));
};

const setEntryStoreState = (
  store: MockEntryStoreContainer,
  update:
    | Partial<MockEntryStoreState>
    | ((state: MockEntryStoreState) => Partial<MockEntryStoreState>)
) => {
  const patch = typeof update === 'function' ? update(store.state) : update;
  store.state = {
    ...store.state,
    ...patch,
  };
  emitEntryStore(store);
};

const setEntryFilterUiStoreState = (
  store: MockEntryFilterUiStoreContainer,
  update:
    | Partial<MockEntryFilterUiState>
    | ((state: MockEntryFilterUiState) => Partial<MockEntryFilterUiState>)
) => {
  const patch = typeof update === 'function' ? update(store.state) : update;
  store.state = {
    ...store.state,
    ...patch,
  };
  emitEntryFilterUiStore(store);
};

const deriveAllTags = (entries: Entry[]) => Array.from(new Set(entries.flatMap((entry) => entry.tags ?? [])));

const createSetSourceEntries = (store: MockEntryStoreContainer, renderState: RenderHomeScreenState) => (entries: Entry[]) => {
  act(() => {
    renderState.sourceEntries = entries;
    if (renderState.derivesAllTagsFromEntries) {
      renderState.allTags = deriveAllTags(entries);
    }
    setEntryStoreState(store, { entries });
  });
};

const createSetPaginationState = (store: MockEntryStoreContainer) => (pagination: Pick<MockEntryStoreState, 'hasMore' | 'isLoadingMore'>) => {
  act(() => {
    setEntryStoreState(store, pagination);
  });
};

const applyFilters = (
  entries: Entry[],
  filters: {
    query?: string;
    type?: 'all' | 'text' | 'photo' | 'voice';
    dateRange?: 'all' | 'today' | 'week' | 'month';
    tags?: string[];
  }
) => {
  const query = filters.query?.trim() ?? '';
  const type = filters.type ?? 'all';
  const tags = filters.tags ?? [];

  return entries.filter((entry) => {
    if (query && !entry.content.includes(query)) return false;
    if (type !== 'all' && entry.type !== type) return false;
    if (tags.length > 0 && !tags.every((tag) => entry.tags?.includes(tag))) return false;
    return true;
  });
};

const createEntryStoreState = (
  entries: Entry[],
  loadEntriesImplementation: (() => Promise<void>) | undefined,
  renderState: RenderHomeScreenState,
  filterUiStore: MockEntryFilterUiStoreContainer,
  setState: (
    update:
      | Partial<MockEntryStoreState>
      | ((state: MockEntryStoreState) => Partial<MockEntryStoreState>)
  ) => void
): MockEntryStoreState => ({
  entries,
  loadEntries: jest.fn(loadEntriesImplementation ?? (async () => undefined)),
  addEntry: jest.fn(async (entry: Omit<Entry, 'id' | 'timestamp'>) => {
    const createdEntry = {
      ...entry,
      id: `mock-entry-${renderState.sourceEntries.length + 1}`,
      timestamp: Date.now(),
    } as Entry;

    renderState.sourceEntries = [createdEntry, ...renderState.sourceEntries];
    setState({ entries: renderState.sourceEntries });
  }),
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
  getAllTags: jest.fn(async () => renderState.allTags),
  applySearchFilters: jest.fn(async (filters) => {
    setEntryFilterUiStoreState(filterUiStore, {
      searchQuery: filters.query ?? '',
      filterType: filters.type ?? 'all',
      filterDateRange: filters.dateRange ?? 'all',
      selectedTags: filters.tags ?? [],
    });
    defaultMockEntryFilterUiStore = filterUiStore;
    setState({
      entries: applyFilters(renderState.sourceEntries, filters),
    });
  }),
  loadMore: jest.fn(),
  isLoadingMore: false,
  hasMore: false,
});

const createMockEntryStore = (
  entries: Entry[],
  loadEntriesImplementation: (() => Promise<void>) | undefined,
  renderState: RenderHomeScreenState,
  filterUiStore: MockEntryFilterUiStoreContainer
): MockEntryStoreContainer => {
  const store = {
    listeners: new Set<() => void>(),
    state: null as unknown as MockEntryStoreState,
  } satisfies MockEntryStoreContainer;

  store.state = createEntryStoreState(entries, loadEntriesImplementation, renderState, filterUiStore, (update) => {
    setEntryStoreState(store, update);
  });

  return store;
};

const createEntryFilterUiStoreState = (
  initialFilters: NonNullable<RenderHomeScreenOptions['initialFilters']> = {},
  setState: (
    update:
      | Partial<MockEntryFilterUiState>
      | ((state: MockEntryFilterUiState) => Partial<MockEntryFilterUiState>)
  ) => void
): MockEntryFilterUiState => ({
  searchQuery: initialFilters.searchQuery ?? '',
  filterType: initialFilters.filterType ?? 'all',
  filterDateRange: initialFilters.filterDateRange ?? 'all',
  selectedTags: initialFilters.selectedTags ?? [],
  setSearchQuery: jest.fn((query: string) => {
    setState({ searchQuery: query });
  }),
  setFilterType: jest.fn((type: 'all' | 'text' | 'photo' | 'voice') => {
    setState({ filterType: type });
  }),
  setFilterDateRange: jest.fn((filterDateRange: 'all' | 'today' | 'week' | 'month') => {
    setState({ filterDateRange });
  }),
  toggleTag: jest.fn((tag: string) => {
    setState((current) => ({
      selectedTags: current.selectedTags.includes(tag)
        ? current.selectedTags.filter((item) => item !== tag)
        : [...current.selectedTags, tag],
    }));
  }),
  clearTags: jest.fn(() => {
    setState({ selectedTags: [] });
  }),
  applySearchFilters: jest.fn((filters) => {
    setState((current) => ({
      searchQuery: filters.query ?? current.searchQuery,
      filterType: filters.type ?? current.filterType,
      filterDateRange: filters.dateRange ?? current.filterDateRange,
      selectedTags: filters.tags ?? current.selectedTags,
    }));
  }),
});

const createMockEntryFilterUiStore = (
  initialFilters: NonNullable<RenderHomeScreenOptions['initialFilters']> = {}
): MockEntryFilterUiStoreContainer => {
  const store = {
    listeners: new Set<() => void>(),
    state: null as unknown as MockEntryFilterUiState,
  } satisfies MockEntryFilterUiStoreContainer;

  store.state = createEntryFilterUiStoreState(initialFilters, (update) => {
    setEntryFilterUiStoreState(store, update);
  });

  return store;
};

const mockTimelineContentModule = {
  TimelineContent: ({
    hasEntries,
    displayEntries,
    deleteEntry,
    onViewEntry,
    onStopRecording,
    hasMore,
    loadMore,
    isLoadingMore,
  }: {
    hasEntries: boolean;
    displayEntries: Entry[];
    deleteEntry: (id: string) => void | Promise<void>;
    onViewEntry: (entry: Entry) => void;
    onStopRecording?: (id: string) => void;
    hasMore: boolean;
    loadMore: () => void;
    isLoadingMore: boolean;
  }) => {
    const { Pressable } = require('react-native');
    const store = React.useContext(MockEntryStoreContext) ?? defaultMockEntryStore;
    const filterUiStore = React.useContext(MockEntryFilterUiStoreContext) ?? defaultMockEntryFilterUiStore;

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
          <View key={entry.id}>
            <Pressable
              testID={`timeline-entry-card-${entry.id}`}
              onPress={runWithActiveRenderStores({ entryStore: store, filterUiStore }, () => onViewEntry(entry))}
            >
              <View testID={`timeline-entry-${entry.id}`}>
                <Text>{entry.content}</Text>
              </View>
            </Pressable>
            <Pressable
              testID={`timeline-entry-delete-${entry.id}`}
              onPress={runWithActiveRenderStores({ entryStore: store, filterUiStore }, () => deleteEntry(entry.id))}
            >
              <Text>删除</Text>
            </Pressable>
            {onStopRecording ? (
              <Pressable
                testID={`timeline-entry-stop-recording-${entry.id}`}
                onPress={runWithActiveRenderStores({ entryStore: store, filterUiStore }, () => onStopRecording(entry.id))}
              >
                <Text>停止录音</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {hasMore && !isLoadingMore ? (
            <Pressable
              testID="timeline-load-more-trigger"
              onPress={runWithActiveRenderStores({ entryStore: store, filterUiStore }, loadMore)}
            >
            <Text>加载更多</Text>
          </Pressable>
        ) : null}
        {isLoadingMore ? <View testID="timeline-loading-more-indicator" /> : null}
      </View>
    );
  },
};

const mockTimelineDialogsModule = {
  TimelineDialogs: ({
    viewingEntry,
    editingEntry,
    onCloseViewing,
    onSaveTextDetail,
    onCloseEditing,
  }: {
    viewingEntry: Entry | null;
    editingEntry: Entry | null;
    onCloseViewing: () => void;
    onSaveTextDetail: (id: string, content: string, tags: string[]) => void | Promise<void>;
    onCloseEditing: () => void;
  }) => {
    const { Pressable } = require('react-native');
    const store = React.useContext(MockEntryStoreContext) ?? defaultMockEntryStore;
    const filterUiStore = React.useContext(MockEntryFilterUiStoreContext) ?? defaultMockEntryFilterUiStore;

    return (
      <>
        {viewingEntry ? (
          <View testID="timeline-text-detail">
            <Text>{viewingEntry.content}</Text>
            <Pressable
              testID="timeline-text-detail-edit"
              onPress={runWithActiveRenderStores({ entryStore: store, filterUiStore }, () => onSaveTextDetail(viewingEntry.id, viewingEntry.content, viewingEntry.tags ?? []))}
            >
              <Text>编辑</Text>
            </Pressable>
            <Pressable
              testID="timeline-text-detail-close"
              onPress={runWithActiveRenderStores({ entryStore: store, filterUiStore }, onCloseViewing)}
            >
              <Text>关闭</Text>
            </Pressable>
          </View>
        ) : null}
        {editingEntry ? (
          <View testID="timeline-entry-editor">
            <Text>{editingEntry.content}</Text>
            <Pressable
              testID="timeline-entry-editor-close"
              onPress={runWithActiveRenderStores({ entryStore: store, filterUiStore }, onCloseEditing)}
            >
              <Text>关闭编辑</Text>
            </Pressable>
          </View>
        ) : null}
      </>
    );
  },
};

const mockTimelineScrollTopButtonModule = {
  TimelineScrollTopButton: () => null,
};

const mockFabMenuModule = {
  FABMenu: ({
    onSelect,
  }: {
    onSelect: (type: 'text' | 'photo' | 'voice') => void;
  }) => {
    const { Pressable } = require('react-native');
    const store = React.useContext(MockEntryStoreContext) ?? defaultMockEntryStore;
    const filterUiStore = React.useContext(MockEntryFilterUiStoreContext) ?? defaultMockEntryFilterUiStore;
    fabSelectHandlers.set(store, onSelect);

    return (
      <>
        <Pressable
          testID="home-quick-add-text"
          onPress={runWithActiveRenderStores({ entryStore: store, filterUiStore }, () => onSelect('text'))}
        >
          <Text>文本</Text>
        </Pressable>
        <Pressable
          testID="home-quick-add-voice"
          onPress={runWithActiveRenderStores({ entryStore: store, filterUiStore }, () => onSelect('voice'))}
        >
          <Text>录音</Text>
        </Pressable>
      </>
    );
  },
};

const mockSidebarModule = {
  Sidebar: () => null,
};

const mockTextEditorModule = {
  TextEditor: (props: React.ComponentProps<typeof import('@/src/components/TextEditor').TextEditor>) => {
    const actualTextEditorModule = jest.requireActual('@/src/components/TextEditor');
    return React.createElement(actualTextEditorModule.TextEditor, props);
  },
};

const mockUseEntryStore = Object.assign(
  <T,>(selector?: (state: MockEntryStoreState) => T) => {
    const store = resolveActiveEntryStore(React.useContext(MockEntryStoreContext));
    const snapshot = React.useSyncExternalStore(
      (listener) => {
        store.listeners.add(listener);
        return () => store.listeners.delete(listener);
      },
      () => store.state,
      () => store.state
    );

    return selector ? selector(snapshot) : snapshot;
  },
  {
    getState: () => resolveActiveEntryStore().state,
    setState: (
      update:
        | Partial<MockEntryStoreState>
        | ((state: MockEntryStoreState) => Partial<MockEntryStoreState>)
    ) => setEntryStoreState(resolveActiveEntryStore(), update),
  }
);

const mockUseEntryFilterUiStore = Object.assign(
  <T,>(selector?: (state: MockEntryFilterUiState) => T) => {
    const store = resolveActiveEntryFilterUiStore(React.useContext(MockEntryFilterUiStoreContext));
    const snapshot = React.useSyncExternalStore(
      (listener) => {
        store.listeners.add(listener);
        return () => store.listeners.delete(listener);
      },
      () => store.state,
      () => store.state
    );

    return selector ? selector(snapshot) : snapshot;
  },
  {
    getState: () => resolveActiveEntryFilterUiStore().state,
    setState: (
      update:
        | Partial<MockEntryFilterUiState>
        | ((state: MockEntryFilterUiState) => Partial<MockEntryFilterUiState>)
    ) => setEntryFilterUiStoreState(resolveActiveEntryFilterUiStore(), update),
  }
);

const mockSettingsState = {
  loadSettings: mockLoadSettings,
  cardSpacing: 'default' as const,
};
let mockIsAuthenticated = false;
let mockSessionState = {
  currentScopeKey: 'local',
  isAuthenticated: false,
  isTransitioning: false,
  isAccountScopeActive: false,
  canRunCloudSync: false,
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
  <T,>(selector?: (state: typeof mockCommonTagsState) => T) =>
    selector ? selector(mockCommonTagsState) : (mockCommonTagsState as T),
  {
    getState: () => mockCommonTagsState,
  }
);

const mockUseCloudSyncIndicatorStore = Object.assign(
  <T,>(selector?: (state: { uiState: CloudUiState }) => T) => {
    const store = resolveActiveEntryStore(React.useContext(MockEntryStoreContext));
    const uiState = cloudSyncUiStates.get(store) ?? 'hidden';

    return selector ? selector({ uiState }) : ({ uiState } as T);
  },
  {
    getState: () => ({
      refresh: mockRefreshCloudSyncIndicator,
    }),
  }
);

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: mockUseEntryStore,
}));

jest.mock('@/src/store/entryFilterUIStore', () => ({
  useEntryFilterUIStore: mockUseEntryFilterUiStore,
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: mockUseSettingsStore,
  SPACING_VALUES: { compact: 8, default: 12, loose: 16 },
}));

jest.mock('@/src/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      isAuthenticated: mockIsAuthenticated,
    }),
  },
}));

jest.mock('@/src/services/workspaceSessionState', () => ({
  buildWorkspaceSessionSnapshot: () => mockSessionState,
  getWorkspaceSessionStateSync: () => mockSessionState,
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
    startRecording: mockVoiceStartRecording,
    stopRecording: jest.fn().mockResolvedValue({
      uri: 'file:///recording.m4a',
      duration: 0,
      size: 0,
      mimeType: 'audio/m4a',
    }),
    saveVoiceToStorage: jest.fn().mockResolvedValue('file:///saved-recording.m4a'),
    saveVoiceToCache: jest.fn().mockResolvedValue('file:///saved-recording.m4a'),
    preloadAudio: mockVoicePreloadAudio,
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

jest.mock('@/src/services/showCloudSyncMonitor', () => ({
  showCloudSyncMonitor: () => mockShowCloudSyncStatusAlert(),
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: (...args: unknown[]) => mockShowErrorFeedback(...args),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: mockLoggerError, debug: jest.fn() },
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
    Ionicons: ({ name, ...props }: { name?: string; [key: string]: unknown }) => (
      <Text {...props}>{name ?? 'icon'}</Text>
    ),
  };
});

const HomeScreen = require('../../../../app/(tabs)/index').default;

export function renderHomeScreen(options: RenderHomeScreenOptions = {}) {
  const entries = options.entries ?? [];
  const renderState: RenderHomeScreenState = {
    sourceEntries: entries,
    allTags: options.allTags ?? deriveAllTags(entries),
    derivesAllTagsFromEntries: options.allTags == null,
  };

  const filterUiStore = createMockEntryFilterUiStore(options.initialFilters);
  const entryStore = createMockEntryStore(
    entries,
    options.loadEntriesImplementation,
    renderState,
    filterUiStore
  );
  cloudSyncUiStates.set(entryStore, options.cloudSyncUiState ?? 'hidden');
  defaultMockEntryStore = entryStore;
  defaultMockEntryFilterUiStore = filterUiStore;
  mockIsAuthenticated = options.authenticated ?? false;
  mockSessionState = {
    currentScopeKey: options.accountScopeActive ? 'account:user-1' : 'local',
    isAuthenticated: mockIsAuthenticated,
    isTransitioning: options.sessionTransitioning ?? false,
    isAccountScopeActive: options.accountScopeActive ?? false,
    canRunCloudSync: (options.accountScopeActive ?? false) && !(options.sessionTransitioning ?? false),
  };

  Object.assign(mockSettingsState, {
    loadSettings: jest.fn(options.loadSettingsImplementation ?? (async () => undefined)),
    cardSpacing: 'default',
  });

  Object.assign(mockCommonTagsState, {
    tags: options.commonTags ?? ['旅行', '工作'],
    isLoaded: true,
    loadCommonTags: jest.fn(options.loadCommonTagsImplementation ?? (async () => undefined)),
  });

  mockRefreshCloudSyncIndicator.mockClear();
  mockRefreshCloudSyncIndicator.mockResolvedValue(undefined);
  mockShowCloudSyncStatusAlert.mockClear();
  mockShowErrorFeedback.mockClear();

  const baseApplySearchFilters = entryStore.state.applySearchFilters;
  const applySearchFiltersSpy = jest.fn(
    runWithActiveRenderStores({ entryStore, filterUiStore }, (...args) => baseApplySearchFilters(...args))
  );
  entryStore.state.applySearchFilters = applySearchFiltersSpy;
  const triggerQuickAddVoice = jest.fn(
    runWithActiveRenderStores({ entryStore, filterUiStore }, () => fabSelectHandlers.get(entryStore)?.('voice'))
  );
  const triggerQuickAddText = jest.fn(
    runWithActiveRenderStores({ entryStore, filterUiStore }, () => fabSelectHandlers.get(entryStore)?.('text'))
  );

  return {
    screen: activeEntryStore.run(entryStore, () => activeEntryFilterUiStore.run(filterUiStore, () => render(
      <MockEntryStoreContext.Provider value={entryStore}>
        <MockEntryFilterUiStoreContext.Provider value={filterUiStore}>
          <HomeScreen />
        </MockEntryFilterUiStoreContext.Provider>
      </MockEntryStoreContext.Provider>
    ))),
    controls: {
      setEntries: createSetSourceEntries(entryStore, renderState),
      setPagination: createSetPaginationState(entryStore),
    },
    spies: {
      loadEntries: entryStore.state.loadEntries,
      addEntry: entryStore.state.addEntry,
      completeRecording: entryStore.state.completeRecording,
      loadMore: entryStore.state.loadMore,
      loadSettings: mockSettingsState.loadSettings,
      loadCommonTags: mockCommonTagsState.loadCommonTags,
      refreshCloudSyncIndicator: mockRefreshCloudSyncIndicator,
      applySearchFilters: applySearchFiltersSpy,
      getAllTags: entryStore.state.getAllTags,
      startRecording: mockVoiceStartRecording,
      preloadAudio: mockVoicePreloadAudio,
      triggerQuickAddText,
      triggerQuickAddVoice,
      loggerError: mockLoggerError,
      showCloudSyncMonitor: mockShowCloudSyncStatusAlert,
      showErrorFeedback: mockShowErrorFeedback,
    },
    stores: {
      entryStore,
      filterUiStore,
    },
  };
}
