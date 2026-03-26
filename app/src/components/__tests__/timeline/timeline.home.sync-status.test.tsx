import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Timeline } from '../../Timeline.v2';

let mockUiState: 'hidden' | 'synced' | 'pending' | 'failed' | 'syncing' = 'hidden';
const mockShowCloudSyncStatusAlert = jest.fn();

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => ({
    entries: [],
    searchQuery: '',
    filterType: 'all',
    filterDateRange: 'all',
    selectedTags: [],
    deleteEntry: jest.fn(),
    updateEntry: jest.fn(),
    setSearchQuery: jest.fn(),
    setFilterType: jest.fn(),
    setFilterDateRange: jest.fn(),
    toggleTag: jest.fn(),
    clearTags: jest.fn(),
    getAllTags: jest.fn(async () => []),
    applySearchFilters: jest.fn(async () => undefined),
    loadMore: jest.fn(),
    isLoadingMore: false,
    hasMore: false,
  }),
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

jest.mock('@/src/services/showCloudSyncStatusAlert', () => ({
  showCloudSyncStatusAlert: () => mockShowCloudSyncStatusAlert(),
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

  it.each([
    ['synced', 'cloud-sync-dot-synced'],
    ['pending', 'cloud-sync-dot-pending'],
    ['failed', 'cloud-sync-dot-failed'],
    ['syncing', 'cloud-sync-spinner'],
  ] as const)(
    'renders the %s cloud sync state in the timeline header and opens the status alert',
    (uiState, indicatorTestId) => {
      mockUiState = uiState;
      const screen = render(<Timeline />);

      expect(screen.getByTestId('cloud-sync-button')).toBeTruthy();
      expect(screen.getByTestId(indicatorTestId)).toBeTruthy();

      fireEvent.press(screen.getByTestId('cloud-sync-button'));
      expect(mockShowCloudSyncStatusAlert).toHaveBeenCalledTimes(1);
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
    expect(screen.getByTestId('cloud-sync-dot-synced')).toBeTruthy();
  });
});
