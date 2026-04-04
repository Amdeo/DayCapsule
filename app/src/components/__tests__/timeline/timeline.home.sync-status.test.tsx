import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Timeline } from '../../Timeline.v2';

let mockUiState: 'hidden' | 'synced' | 'pending' | 'failed' | 'syncing' = 'hidden';
const mockShowCloudSyncMonitor = jest.fn();
const mockFilterUiState = {
  searchQuery: '',
  filterType: 'all' as const,
  filterDateRange: 'all' as const,
  selectedTags: [] as string[],
  setSearchQuery: jest.fn(),
  setFilterType: jest.fn(),
  setFilterDateRange: jest.fn(),
  toggleTag: jest.fn(),
  clearTags: jest.fn(),
};
const mockEntryStoreState = {
  entries: [],
  deleteEntry: jest.fn(),
  updateEntry: jest.fn(),
  loadMore: jest.fn(),
  isLoadingMore: false,
  hasMore: false,
};

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: (selector: (state: typeof mockEntryStoreState) => unknown) =>
    selector(mockEntryStoreState),
}));

jest.mock('@/src/store/entryFilterUIStore', () => ({
  useEntryFilterUIStore: (selector: (state: typeof mockFilterUiState) => unknown) =>
    selector(mockFilterUiState),
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: () => ({ cardSpacing: 'default' }),
  SPACING_VALUES: { compact: 8, default: 12, loose: 16 },
}));

jest.mock('@/src/store/commonTagsStore', () => ({
  useCommonTagsStore: () => ({
    tags: [],
    isLoaded: true,
    loadCommonTags: jest.fn(),
  }),
}));

jest.mock('@/src/store/cloudSyncIndicatorStore', () => ({
  useCloudSyncIndicatorStore: (selector: (state: { uiState: typeof mockUiState }) => unknown) =>
    selector({ uiState: mockUiState }),
}));

jest.mock('@/src/services/showCloudSyncMonitor', () => ({
  showCloudSyncMonitor: () => mockShowCloudSyncMonitor(),
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

jest.mock('../../EntryCard', () => ({
  EntryCard: () => null,
}));

jest.mock('../../CalendarView', () => ({
  CalendarView: () => null,
}));

jest.mock('../../TextEntryDetailPage', () => ({
  TextEntryDetailPage: () => null,
}));

jest.mock('../../EntryEditor', () => ({
  EntryEditor: () => null,
}));

jest.mock('../../SearchOverlay', () => ({
  SearchOverlay: () => null,
}));

jest.mock('../../FABMenu', () => ({
  FABMenu: () => null,
}));

describe('Timeline home cloud sync status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides the sync status action when the cloud indicator is hidden', () => {
    mockUiState = 'hidden';
    const screen = render(<Timeline />);

    expect(screen.queryByTestId('cloud-sync-button')).toBeNull();
  });

  it('removes stale sync actions when the cloud indicator falls back to hidden on rerender', () => {
    mockUiState = 'pending';
    const screen = render(<Timeline />);

    expect(screen.getByTestId('cloud-sync-button')).toBeTruthy();
    expect(screen.getByTestId('cloud-sync-icon-pending')).toBeTruthy();

    mockUiState = 'hidden';
    screen.rerender(<Timeline />);

    expect(screen.queryByTestId('cloud-sync-button')).toBeNull();
    expect(screen.queryByTestId('cloud-sync-spinner')).toBeNull();
    expect(screen.queryByTestId('cloud-sync-icon-synced')).toBeNull();
    expect(screen.queryByTestId('cloud-sync-icon-pending')).toBeNull();
    expect(screen.queryByTestId('cloud-sync-icon-failed')).toBeNull();
  });

  it.each([
    ['synced', 'cloud-sync-icon-synced'],
    ['pending', 'cloud-sync-icon-pending'],
    ['failed', 'cloud-sync-icon-failed'],
    ['syncing', 'cloud-sync-spinner'],
  ] as const)(
    'renders the %s cloud sync state in the timeline header and opens the sync monitor',
    (uiState, indicatorTestId) => {
      mockUiState = uiState;
      const screen = render(<Timeline />);

      expect(screen.getByTestId('cloud-sync-button')).toBeTruthy();
      expect(screen.getByTestId(indicatorTestId)).toBeTruthy();

      fireEvent.press(screen.getByTestId('cloud-sync-button'));
      expect(mockShowCloudSyncMonitor).toHaveBeenCalledTimes(1);
    }
  );

  it('renders the sync status action after the cloud indicator becomes visible on rerender', () => {
    mockUiState = 'hidden';
    const screen = render(<Timeline />);

    expect(screen.queryByTestId('cloud-sync-button')).toBeNull();

    mockUiState = 'syncing';
    screen.rerender(<Timeline />);

    expect(screen.getByTestId('cloud-sync-button')).toBeTruthy();
    expect(screen.getByTestId('cloud-sync-spinner')).toBeTruthy();
  });

  it('swaps the syncing spinner for a synced dot when the cloud indicator settles', () => {
    mockUiState = 'syncing';
    const screen = render(<Timeline />);

    expect(screen.getByTestId('cloud-sync-spinner')).toBeTruthy();

    mockUiState = 'synced';
    screen.rerender(<Timeline />);

    expect(screen.queryByTestId('cloud-sync-spinner')).toBeNull();
    expect(screen.getByTestId('cloud-sync-icon-synced')).toBeTruthy();
  });
});
