import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Timeline } from '../../Timeline.v2';
import type { Entry } from '@/src/types/entry';

const mockEntries: Entry[] = [
  {
    id: 'entry-text-1',
    type: 'text',
    content: '可以查看详情的文本',
    tags: ['产品'],
    timestamp: new Date('2026-03-20T10:00:00+08:00').getTime(),
    syncStatus: 'synced',
  },
];

const mockUpdateEntry = jest.fn();
const mockSetSearchQuery = jest.fn();
const mockSetFilterType = jest.fn();
const mockSetFilterDateRange = jest.fn();
const mockToggleTag = jest.fn();
const mockClearTags = jest.fn();
const mockShowCloudSyncStatusAlert = jest.fn();

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => ({
    entries: mockEntries,
    searchQuery: '',
    filterType: 'all',
    filterDateRange: 'all',
    selectedTags: [],
    deleteEntry: jest.fn(),
    updateEntry: mockUpdateEntry,
    setSearchQuery: mockSetSearchQuery,
    setFilterType: mockSetFilterType,
    setFilterDateRange: mockSetFilterDateRange,
    toggleTag: mockToggleTag,
    clearTags: mockClearTags,
    getAllTags: jest.fn(async () => ['产品']),
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
    tags: ['产品'],
    isLoaded: true,
    loadCommonTags: jest.fn(),
  }),
}));

jest.mock('@/src/store/cloudSyncIndicatorStore', () => ({
  useCloudSyncIndicatorStore: () => 'hidden',
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
  EntryCard: ({ entry, onView }: { entry: Entry; onView?: (entry: Entry) => void }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable testID={`timeline-entry-card-${entry.id}`} onPress={() => onView?.(entry)}>
        <Text>{entry.content}</Text>
      </Pressable>
    );
  },
}));

jest.mock('../../TextEntryDetailPage', () => ({
  TextEntryDetailPage: ({
    visible,
    entry,
    onEdit,
  }: {
    visible: boolean;
    entry: Entry | null;
    onEdit: (entry: Entry) => void;
  }) => {
    const React = require('react');
    const { Pressable, Text, View } = require('react-native');
    if (!visible || !entry) return null;
    return (
      <View testID="timeline-text-detail">
        <Text>{entry.content}</Text>
        <Pressable testID="timeline-text-detail-edit" onPress={() => onEdit(entry)}>
          <Text>编辑</Text>
        </Pressable>
      </View>
    );
  },
}));

jest.mock('../../EntryEditor', () => ({
  EntryEditor: ({ visible, entry }: { visible: boolean; entry: Entry | null }) => {
    const React = require('react');
    const { Text } = require('react-native');
    if (!visible || !entry) return null;
    return <Text testID="timeline-entry-editor">{entry.content}</Text>;
  },
}));

jest.mock('../../CalendarView', () => ({
  CalendarView: () => null,
}));

jest.mock('../../FABMenu', () => ({
  FABMenu: () => null,
}));

describe('Timeline home navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the text detail page when a timeline card is pressed', () => {
    const screen = render(<Timeline />);

    fireEvent.press(screen.getByTestId('timeline-entry-card-entry-text-1'));

    expect(screen.getByTestId('timeline-text-detail')).toBeTruthy();
  });

  it('flows from the detail page edit action into the entry editor', () => {
    const screen = render(<Timeline />);

    fireEvent.press(screen.getByTestId('timeline-entry-card-entry-text-1'));
    fireEvent.press(screen.getByTestId('timeline-text-detail-edit'));

    expect(screen.queryByTestId('timeline-text-detail')).toBeNull();
    expect(screen.getByTestId('timeline-entry-editor')).toBeTruthy();
  });
});
