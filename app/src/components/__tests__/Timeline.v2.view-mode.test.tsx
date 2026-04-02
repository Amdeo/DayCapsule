/**
 * Timeline 视图切换回归测试
 */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Timeline } from '../Timeline.v2';
import { Entry } from '@/src/types/entry';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';

const mockToggleTag = jest.fn();
const mockClearTags = jest.fn();
const mockSetSearchQuery = jest.fn();
const mockSetFilterType = jest.fn();
const mockSetFilterDateRange = jest.fn();

const defaultEntries: Entry[] = [
  {
    id: 'entry-1',
    type: 'text',
    content: '第一条',
    tags: ['旅行'],
    timestamp: new Date('2026-03-17T09:00:00+08:00').getTime(),
    syncStatus: 'synced',
  },
  {
    id: 'entry-2',
    type: 'photo',
    content: '第二条',
    tags: [],
    timestamp: new Date('2026-03-18T10:00:00+08:00').getTime(),
    syncStatus: 'synced',
  },
];
let mockEntries: Entry[] = [...defaultEntries];

let mockSelectedTags: string[] = [];
let mockSearchQuery = '';
let mockFilterType = 'all';
let mockFilterDateRange = 'all';
const mockDeleteEntry = jest.fn();
const mockUpdateEntry = jest.fn();
const mockLoadMore = jest.fn();
const mockApplyFilters = jest.fn().mockResolvedValue(undefined);
const mockCalendarView = jest.fn(() => null);
const mockEntryEditor = jest.fn(() => null);
const mockTextEntryDetailPage = jest.fn(() => null);
const mockEntryCard = jest.fn(() => null);
const mockShowCloudSyncStatusAlert = jest.fn();
const actualEntryEditorModule = jest.requireActual('../EntryEditor');

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

jest.mock('@/src/services/tagSuggestionService', () => ({
  suggestTags: () => ['复盘'],
}));

jest.mock('@/src/store/commonTagsStore', () => ({
  useCommonTagsStore: () => ({
    tags: ['产品', '想法', '复盘'],
    isLoaded: true,
    loadCommonTags: jest.fn(),
  }),
}));

const mockFilterUiState = () => ({
  searchQuery: mockSearchQuery,
  filterType: mockFilterType,
  filterDateRange: mockFilterDateRange,
  selectedTags: mockSelectedTags,
  setSearchQuery: mockSetSearchQuery,
  setFilterType: mockSetFilterType,
  setFilterDateRange: mockSetFilterDateRange,
  toggleTag: mockToggleTag,
  clearTags: mockClearTags,
});

const mockEntryStoreState = () => ({
  entries: mockEntries,
  deleteEntry: mockDeleteEntry,
  updateEntry: mockUpdateEntry,
  applyFilters: mockApplyFilters,
  loadMore: mockLoadMore,
  isLoadingMore: false,
  hasMore: false,
});

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: (selector: (state: any) => any) => selector(mockEntryStoreState()),
}));

jest.mock('@/src/store/entryFilterUIStore', () => ({
  useEntryFilterUIStore: (selector: (state: any) => any) => selector(mockFilterUiState()),
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: () => ({ cardSpacing: 'default', calendarDensity: 'default' }),
  SPACING_VALUES: { compact: 8, default: 12, loose: 16 },
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
  const MockIcon = ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>;
  return { Ionicons: MockIcon };
});

jest.mock('../SearchOverlay', () => ({
  SearchOverlay: () => null,
}));

jest.mock('../EntryEditor', () => ({
  EntryEditor: (props: unknown) => mockEntryEditor(props),
}));

jest.mock('../TextEntryDetailPage', () => ({
  TextEntryDetailPage: (props: unknown) => mockTextEntryDetailPage(props),
}));

jest.mock('../CalendarView', () => ({
  CalendarView: (props: unknown) => mockCalendarView(props),
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
  EntryCard: ({
    entry,
    enterDelay = -1,
    onView,
    variant,
  }: {
    entry: { id: string };
    enterDelay?: number;
    onView?: (entry: { id: string }) => void;
    variant?: string;
  }) => {
    const React = require('react');
    const { Text, Pressable } = require('react-native');
    mockEntryCard({ entry, enterDelay, onView, variant });
    return (
      <Pressable testID={`mock-entry-card-${entry.id}`} onPress={() => onView?.(entry)}>
        <Text>{`${entry.id}:${enterDelay}`}</Text>
      </Pressable>
    );
  },
}));

describe('Timeline view mode switching', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockEntries = [...defaultEntries];
    mockSelectedTags = [];
    mockSearchQuery = '';
    mockFilterType = 'all';
    mockFilterDateRange = 'all';
    jest.clearAllMocks();
    mockEntryEditor.mockImplementation(() => null);
    mockTextEntryDetailPage.mockImplementation(() => null);
    mockEntryCard.mockClear();
    mockApplyFilters.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('passes staggered enter delays to entry cards', () => {
    const screen = render(<Timeline />);

    expect(screen.getByText('entry-1:0')).toBeTruthy();
    expect(screen.getByText('entry-2:90')).toBeTruthy();
  });

  it('uses calendar variant for entry cards in list mode', () => {
    render(<Timeline />);

    expect(mockEntryCard).toHaveBeenCalled();

    const entryCardCalls = mockEntryCard.mock.calls.map(([props]) => props);
    expect(entryCardCalls[0]?.variant).toBe('calendar');
    expect(entryCardCalls[1]?.variant).toBe('calendar');
  });

  it('renders themed loader dots during view transitions', () => {
    const screen = render(<Timeline />);

    fireEvent.press(screen.getByTestId('searchbar-view-mode-toggle'));
    fireEvent.press(screen.getByText('日历'));

    expect(screen.getByTestId('loader-dot-text')).toHaveStyle({ backgroundColor: '#A491D3' });
    expect(screen.getByTestId('loader-dot-photo')).toHaveStyle({ backgroundColor: '#77C9D4' });
    expect(screen.getByTestId('loader-dot-voice')).toHaveStyle({ backgroundColor: '#F5A623' });
  });

  it('renders the extracted empty state shell when there are no entries', () => {
    mockEntries = [];

    const screen = render(<Timeline />);

    expect(screen.getByTestId('timeline-empty-state')).toBeTruthy();
    expect(screen.getByText('还没有记忆')).toBeTruthy();
  });

  it('clears only the pressed tag chip instead of clearing all tags', () => {
    mockSelectedTags = ['旅行'];
    const screen = render(<Timeline />);

    fireEvent.press(screen.getByText('close'));

    expect(mockToggleTag).toHaveBeenCalledWith('旅行');
    expect(mockClearTags).not.toHaveBeenCalled();
    expect(mockApplyFilters).toHaveBeenCalledTimes(1);
  });

  it('passes full record interactions into CalendarView', () => {
    const screen = render(<Timeline />);

    fireEvent.press(screen.getByTestId('searchbar-view-mode-toggle'));
    fireEvent.press(screen.getByText('日历'));

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(mockCalendarView).toHaveBeenCalled();

    const latestProps = mockCalendarView.mock.calls.at(-1)?.[0] as Record<string, unknown>;

    expect(latestProps.entries).toBe(mockEntries);
    expect(latestProps.onDeleteEntry).toBeInstanceOf(Function);
    expect(latestProps.onEditEntry).toBeInstanceOf(Function);
    expect(latestProps.onPauseRecording).toBeUndefined();
    expect(latestProps.onResumeRecording).toBeUndefined();
    expect(latestProps.onStopRecording).toBeUndefined();
    expect(latestProps.activeActionSheetId).toBeNull();
    expect(latestProps.onActionSheetOpen).toBeInstanceOf(Function);
  });

  it('shows branded feedback when calendar-mode delete rejects', async () => {
    mockDeleteEntry.mockRejectedValueOnce(new Error('delete failed'));

    const screen = render(<Timeline />);

    fireEvent.press(screen.getByTestId('searchbar-view-mode-toggle'));
    fireEvent.press(screen.getByText('日历'));

    act(() => {
      jest.advanceTimersByTime(600);
    });

    const latestProps = mockCalendarView.mock.calls.at(-1)?.[0] as Record<string, unknown>;

    await act(async () => {
      await (latestProps.onDeleteEntry as (id: string) => Promise<void>)('entry-1');
    });

    expect(mockDeleteEntry).toHaveBeenCalledWith('entry-1');
    expect(showErrorFeedback).toHaveBeenCalledWith(expect.objectContaining({
      title: '删除失败',
      message: '删除这条记录失败，请重试',
    }));
  });

  it('opens text entries in a detail page instead of the editor on card press', () => {
    const screen = render(<Timeline />);

    fireEvent.press(screen.getByTestId('mock-entry-card-entry-1'));

    const latestDetailProps = mockTextEntryDetailPage.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(latestDetailProps.visible).toBe(true);
    expect(latestDetailProps.entry).toMatchObject({ id: 'entry-1' });

    const latestEditorProps = mockEntryEditor.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
    expect(latestEditorProps?.visible ?? false).toBe(false);
  });

  it('opens the editor from the detail page edit action', () => {
    mockTextEntryDetailPage.mockImplementation(({ visible, entry, onEdit }: any) => {
      if (!visible || !entry) return null;
      const React = require('react');
      const { Pressable, Text } = require('react-native');
      return (
        <Pressable testID="mock-text-detail-edit" onPress={() => onEdit(entry)}>
          <Text>编辑详情</Text>
        </Pressable>
      );
    });

    const screen = render(<Timeline />);

    fireEvent.press(screen.getByTestId('mock-entry-card-entry-1'));
    fireEvent.press(screen.getByTestId('mock-text-detail-edit'));

    act(() => {
      jest.advanceTimersByTime(300);
    });

    const latestEditorProps = mockEntryEditor.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(latestEditorProps.visible).toBe(true);
    expect(latestEditorProps.entry).toMatchObject({ id: 'entry-1' });
  });

  it('keeps the editor open and shows save feedback when timeline edit save rejects through the real dialog chain', async () => {
    mockEntryEditor.mockImplementation((props: any) => React.createElement(actualEntryEditorModule.EntryEditor, props));
    mockUpdateEntry.mockRejectedValueOnce(new Error('db failed'));

    const screen = render(<Timeline />);

    fireEvent.press(screen.getByTestId('mock-entry-card-entry-1'));

    const latestDetailProps = mockTextEntryDetailPage.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    act(() => {
      (latestDetailProps.onEdit as (entry: Entry) => void)(latestDetailProps.entry as Entry);
      jest.advanceTimersByTime(300);
    });

    fireEvent.changeText(screen.getByTestId('entry-editor-content-input'), '新的时间轴正文');
    fireEvent.press(screen.getByTestId('entry-editor-save-button'));

    await waitFor(() => {
      expect(showErrorFeedback).toHaveBeenCalledWith(expect.objectContaining({
        title: '保存失败',
        message: '保存内容失败，请重试',
      }));
    });

    expect(mockUpdateEntry).toHaveBeenCalledWith('entry-1', {
      content: '新的时间轴正文',
      tags: ['旅行'],
    });
    expect(screen.getByTestId('entry-editor-save-button').props.accessibilityState.disabled).toBe(false);
  });
});
