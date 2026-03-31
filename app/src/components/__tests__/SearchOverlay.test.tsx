import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SearchOverlay } from '../SearchOverlay';

const mockApplySearchFilters = jest.fn();
const mockGetAllTags = jest.fn(async () => ['旅行', '工作']);
const mockLoadCommonTags = jest.fn();
let mockFilterUiState = {
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
let mockCommonTagsState = {
  tags: ['灵感'],
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

describe('SearchOverlay', () => {
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
      tags: ['灵感'],
      isLoaded: true,
    };
  });

  it('returns null and does not fetch tags when hidden', () => {
    const screen = render(<SearchOverlay visible={false} onClose={jest.fn()} onSearch={jest.fn()} />);

    expect(screen.queryByTestId('search-overlay-root')).toBeNull();
    expect(mockGetAllTags).not.toHaveBeenCalled();
  });

  it('renders the existing full-screen search shell when visible', async () => {
    const screen = render(<SearchOverlay visible onClose={jest.fn()} onSearch={jest.fn()} />);

    await waitFor(() => expect(mockGetAllTags).toHaveBeenCalledTimes(1));

    expect(screen.getByTestId('search-overlay-root')).toBeTruthy();
    expect(screen.getByPlaceholderText('搜索记忆...')).toBeTruthy();
    expect(screen.getByText('类型')).toBeTruthy();
    expect(screen.getByText('时间')).toBeTruthy();
    expect(screen.getByText('标签')).toBeTruthy();
  });

  it('loads common tags when the shared tag store is not hydrated yet', async () => {
    mockCommonTagsState = {
      tags: [],
      isLoaded: false,
    };

    render(<SearchOverlay visible onClose={jest.fn()} onSearch={jest.fn()} />);

    await waitFor(() => {
      expect(mockLoadCommonTags).toHaveBeenCalledTimes(1);
      expect(mockGetAllTags).toHaveBeenCalledTimes(1);
    });
  });

  it('renders a stable cancel button testID for dismiss flows', async () => {
    const screen = render(<SearchOverlay visible onClose={jest.fn()} onSearch={jest.fn()} />);

    await waitFor(() => expect(mockGetAllTags).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('search-overlay-cancel-button')).toBeTruthy();
  });

  it('resets local filters from the reset action without closing the overlay', async () => {
    const onClose = jest.fn();
    const screen = render(<SearchOverlay visible onClose={onClose} onSearch={jest.fn()} />);

    await waitFor(() => expect(mockGetAllTags).toHaveBeenCalledTimes(1));

    fireEvent.changeText(screen.getByPlaceholderText('搜索记忆...'), '旅行');
    fireEvent.press(screen.getByText('文字'));
    fireEvent.press(screen.getByTestId('search-overlay-reset-button'));

    expect(screen.getByPlaceholderText('搜索记忆...').props.value).toBe('');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('submits search filters once and closes the overlay', async () => {
    const onClose = jest.fn();
    const onSearch = jest.fn();
    const screen = render(<SearchOverlay visible onClose={onClose} onSearch={onSearch} />);

    await waitFor(() => expect(mockGetAllTags).toHaveBeenCalledTimes(1));

    fireEvent.changeText(screen.getByPlaceholderText('搜索记忆...'), '旅行');
    fireEvent.press(screen.getByTestId('search-overlay-submit-button'));

    await waitFor(() => {
      expect(mockApplySearchFilters).toHaveBeenCalledWith({
        query: '旅行',
        type: 'all',
        dateRange: 'all',
        tags: [],
      });
    });
    expect(onSearch).toHaveBeenCalledWith('旅行');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
