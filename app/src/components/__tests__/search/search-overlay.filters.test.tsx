import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SearchOverlay } from '../../SearchOverlay';

let mockFilterUiState = {
  searchQuery: '',
  filterType: 'all' as 'all' | 'text' | 'photo' | 'voice',
  filterDateRange: 'all' as 'all' | 'today' | 'week' | 'month',
  selectedTags: [] as string[],
  setSearchQuery: jest.fn(),
  setFilterType: jest.fn(),
  setFilterDateRange: jest.fn(),
  toggleTag: jest.fn(),
  clearTags: jest.fn(),
};

const mockApplySearchFilters = jest.fn(async () => undefined);
const mockGetAllTags = jest.fn(async () => ['旅行', '工作', '海边']);
const mockLoadCommonTags = jest.fn();
let mockCommonTagsState = {
  tags: ['旅行', '工作'],
  isLoaded: true,
};

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: (selector: (state: { getAllTags: typeof mockGetAllTags; applySearchFilters: typeof mockApplySearchFilters }) => unknown) =>
    selector({
      getAllTags: mockGetAllTags,
      applySearchFilters: mockApplySearchFilters,
    }),
}));

jest.mock('@/src/store/entryFilterUIStore', () => ({
  useEntryFilterUIStore: (selector?: (state: typeof mockFilterUiState) => unknown) =>
    selector ? selector(mockFilterUiState) : mockFilterUiState,
}));

jest.mock('@/src/store/commonTagsStore', () => ({
  useCommonTagsStore: () => ({
    ...mockCommonTagsState,
    loadCommonTags: mockLoadCommonTags,
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

describe('SearchOverlay filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFilterUiState = {
      searchQuery: '',
      filterType: 'all',
      filterDateRange: 'all',
      selectedTags: [],
      setSearchQuery: jest.fn(),
      setFilterType: jest.fn(),
      setFilterDateRange: jest.fn(),
      toggleTag: jest.fn(),
      clearTags: jest.fn(),
    };
    mockCommonTagsState = {
      tags: ['旅行', '工作'],
      isLoaded: true,
    };
  });

  it('clears the local keyword from the search input clear affordance', async () => {
    const screen = render(<SearchOverlay visible onClose={jest.fn()} onSearch={jest.fn()} />);

    await waitFor(() => expect(mockGetAllTags).toHaveBeenCalledTimes(1));

    fireEvent.changeText(screen.getByPlaceholderText('搜索记忆...'), '旅行');
    fireEvent.press(screen.getByTestId('search-overlay-clear-query-button'));

    expect(screen.getByPlaceholderText('搜索记忆...').props.value).toBe('');
  });

  it('submits combined keyword, type, date and tag filters', async () => {
    const onClose = jest.fn();
    const onSearch = jest.fn();
    const screen = render(<SearchOverlay visible onClose={onClose} onSearch={onSearch} />);

    await waitFor(() => expect(mockGetAllTags).toHaveBeenCalledTimes(1));

    fireEvent.changeText(screen.getByPlaceholderText('搜索记忆...'), '旅行');
    fireEvent.press(screen.getByText('照片'));
    fireEvent.press(screen.getByText('本周'));
    fireEvent.press(screen.getByText('#旅行'));
    fireEvent.press(screen.getByTestId('search-overlay-submit-button'));

    await waitFor(() => {
      expect(mockApplySearchFilters).toHaveBeenCalledWith({
        query: '旅行',
        type: 'photo',
        dateRange: 'week',
        tags: ['旅行'],
      });
    });
    expect(onSearch).toHaveBeenCalledWith('旅行');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clears selected tags from the dedicated clear action before submit', async () => {
    mockFilterUiState = {
      searchQuery: '',
      filterType: 'all',
      filterDateRange: 'all',
      selectedTags: ['旅行'],
      setSearchQuery: jest.fn(),
      setFilterType: jest.fn(),
      setFilterDateRange: jest.fn(),
      toggleTag: jest.fn(),
      clearTags: jest.fn(),
    };

    const screen = render(<SearchOverlay visible onClose={jest.fn()} onSearch={jest.fn()} />);

    await waitFor(() => expect(mockGetAllTags).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByText('清除'));
    fireEvent.press(screen.getByTestId('search-overlay-submit-button'));

    await waitFor(() => {
      expect(mockApplySearchFilters).toHaveBeenCalledWith({
        query: '',
        type: 'all',
        dateRange: 'all',
        tags: [],
      });
    });
  });

  it('shows the empty tag hint when neither store tags nor common tags are available', async () => {
    mockGetAllTags.mockResolvedValueOnce([]);
    mockCommonTagsState = {
      tags: [],
      isLoaded: true,
    };

    const screen = render(<SearchOverlay visible onClose={jest.fn()} onSearch={jest.fn()} />);

    await waitFor(() => expect(mockGetAllTags).toHaveBeenCalledTimes(1));

    expect(screen.getByText('暂无标签，在编辑记录时添加')).toBeTruthy();
  });
});
