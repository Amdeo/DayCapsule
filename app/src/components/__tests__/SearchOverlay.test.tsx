import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SearchOverlay } from '../SearchOverlay';

const mockApplySearchFilters = jest.fn();
const mockGetAllTags = jest.fn(async () => ['旅行', '工作']);
const mockLoadCommonTags = jest.fn();

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => ({
    searchQuery: '',
    filterType: 'all',
    filterDateRange: 'all',
    selectedTags: [],
    getAllTags: mockGetAllTags,
    applySearchFilters: mockApplySearchFilters,
  }),
}));

jest.mock('@/src/store/commonTagsStore', () => ({
  useCommonTagsStore: () => ({
    tags: ['灵感'],
    isLoaded: true,
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

  it('renders a stable cancel button testID for dismiss flows', () => {
    const screen = render(<SearchOverlay visible onClose={jest.fn()} onSearch={jest.fn()} />);

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
