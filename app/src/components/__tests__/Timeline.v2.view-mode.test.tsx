/**
 * Timeline 视图切换回归测试
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { SectionList } from 'react-native';
import { Timeline } from '../Timeline.v2';
import { Entry } from '@/src/types/entry';

const mockEntries: Entry[] = [
  {
    id: 'entry-1',
    type: 'text',
    content: '第一条',
    tags: [],
    timestamp: new Date('2026-03-17T09:00:00+08:00').getTime(),
    syncStatus: 'synced',
  },
  {
    id: 'entry-2',
    type: 'photo',
    content: '第二条',
    tags: [],
    timestamp: new Date('2026-03-16T10:00:00+08:00').getTime(),
    syncStatus: 'synced',
  },
];

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => ({
    entries: mockEntries,
    filteredEntries: [],
    searchQuery: '',
    filterType: 'all',
    filterDateRange: 'all',
    selectedTags: [],
    deleteEntry: jest.fn(),
    updateEntry: jest.fn(),
    setSearchQuery: jest.fn(),
    setFilterType: jest.fn(),
    setFilterDateRange: jest.fn(),
    clearTags: jest.fn(),
    loadMore: jest.fn(),
    isLoadingMore: false,
    hasMore: false,
  }),
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: () => ({ cardSpacing: 'default' }),
  SPACING_VALUES: { compact: 8, default: 12, large: 16 },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const MockIcon = ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>;
  return { Ionicons: MockIcon };
});

jest.mock('../SearchOverlay', () => ({
  SearchOverlay: () => null,
}));

jest.mock('../EntryEditor', () => ({
  EntryEditor: () => null,
}));

jest.mock('../CalendarView', () => ({
  CalendarView: () => null,
}));

jest.mock('../FABMenu', () => ({
  FABMenu: () => null,
}));

jest.mock('../SearchBar', () => ({
  SearchBar: ({ onViewModePress }: { onViewModePress?: () => void }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable testID="searchbar-view-mode-toggle" onPress={onViewModePress}>
        <Text>切换视图</Text>
      </Pressable>
    );
  },
}));

jest.mock('../EntryCard', () => ({
  EntryCard: ({ entry }: { entry: { id: string } }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return <Text testID="mock-entry-card">{entry.id}</Text>;
  },
}));

describe('Timeline view mode switching', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  const collectKeys = (listProps: any) =>
    listProps.sections.flatMap((section: any) =>
      section.data.map((item: Entry, index: number) => listProps.keyExtractor(item, index))
    );

  it('uses stable SectionList keys when switching between list and monthly views', () => {
    const screen = render(<Timeline />);

    const initialList = screen.UNSAFE_getByType(SectionList);
    expect(collectKeys(initialList.props)).toEqual(['entry-1', 'entry-2']);

    fireEvent.press(screen.getByTestId('searchbar-view-mode-toggle'));
    fireEvent.press(screen.getByText('按月'));

    act(() => {
      jest.advanceTimersByTime(600);
    });

    const monthlyList = screen.UNSAFE_getByType(SectionList);
    expect(collectKeys(monthlyList.props)).toEqual(['entry-1', 'entry-2']);
  });

  it('renders entry cards again after switching to monthly mode', () => {
    const screen = render(<Timeline />);

    fireEvent.press(screen.getByTestId('searchbar-view-mode-toggle'));
    fireEvent.press(screen.getByText('按月'));

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(screen.getAllByTestId('mock-entry-card')).toHaveLength(2);
  });
});
