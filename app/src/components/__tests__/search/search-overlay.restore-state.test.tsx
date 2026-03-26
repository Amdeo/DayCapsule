import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SearchOverlay } from '../../SearchOverlay';

let mockSearchState = {
  searchQuery: '初始关键词',
  filterType: 'text' as 'all' | 'text' | 'photo' | 'voice',
  filterDateRange: 'today' as 'all' | 'today' | 'week' | 'month',
  selectedTags: ['旅行'] as string[],
};

const mockApplySearchFilters = jest.fn(async () => undefined);
const mockGetAllTags = jest.fn(async () => ['旅行', '工作']);
const mockLoadCommonTags = jest.fn();

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => ({
    ...mockSearchState,
    getAllTags: mockGetAllTags,
    applySearchFilters: mockApplySearchFilters,
  }),
}));

jest.mock('@/src/store/commonTagsStore', () => ({
  useCommonTagsStore: () => ({
    tags: ['旅行', '工作'],
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

describe('SearchOverlay restore state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchState = {
      searchQuery: '初始关键词',
      filterType: 'text',
      filterDateRange: 'today',
      selectedTags: ['旅行'],
    };
  });

  it('restores persisted filters after canceling a local edit and reopening the overlay', async () => {
    const onClose = jest.fn();
    const screen = render(<SearchOverlay visible onClose={onClose} onSearch={jest.fn()} />);

    await waitFor(() => expect(mockGetAllTags).toHaveBeenCalledTimes(1));

    expect(screen.getByPlaceholderText('搜索记忆...').props.value).toBe('初始关键词');
    expect(screen.getByText('#旅行')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('搜索记忆...'), '临时修改');
    fireEvent.press(screen.getByTestId('search-overlay-cancel-button'));
    expect(onClose).toHaveBeenCalledTimes(1);

    screen.rerender(<SearchOverlay visible={false} onClose={onClose} onSearch={jest.fn()} />);
    screen.rerender(<SearchOverlay visible onClose={onClose} onSearch={jest.fn()} />);

    await waitFor(() => expect(mockGetAllTags).toHaveBeenCalledTimes(2));
    expect(screen.getByPlaceholderText('搜索记忆...').props.value).toBe('初始关键词');
  });

  it('hydrates the overlay from the latest store filters when state changed outside the sheet', async () => {
    const screen = render(<SearchOverlay visible onClose={jest.fn()} onSearch={jest.fn()} />);

    await waitFor(() => expect(mockGetAllTags).toHaveBeenCalledTimes(1));

    mockSearchState = {
      searchQuery: '新的关键词',
      filterType: 'photo',
      filterDateRange: 'month',
      selectedTags: ['工作'],
    };

    screen.rerender(<SearchOverlay visible={false} onClose={jest.fn()} onSearch={jest.fn()} />);
    screen.rerender(<SearchOverlay visible onClose={jest.fn()} onSearch={jest.fn()} />);

    await waitFor(() => expect(mockGetAllTags).toHaveBeenCalledTimes(2));
    expect(screen.getByPlaceholderText('搜索记忆...').props.value).toBe('新的关键词');
    expect(screen.getByText('#工作')).toBeTruthy();
    expect(screen.getByText('照片')).toBeTruthy();
    expect(screen.getByText('本月')).toBeTruthy();
  });
});
