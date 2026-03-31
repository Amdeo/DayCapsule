jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { FilterBar } from '../FilterBar';

const mockSetFilterType = jest.fn();
const mockSetFilterDateRange = jest.fn();
const mockToggleTag = jest.fn();
const mockClearTags = jest.fn();
const mockGetAllTags = jest.fn();

const mockFilterUiState = {
  filterType: 'all' as 'all' | 'text' | 'photo' | 'voice',
  filterDateRange: 'all' as 'all' | 'today' | 'week' | 'month',
  selectedTags: [] as string[],
  searchQuery: '',
  setSearchQuery: jest.fn(),
  setFilterType: mockSetFilterType,
  setFilterDateRange: mockSetFilterDateRange,
  toggleTag: mockToggleTag,
  clearTags: mockClearTags,
};

const mockStoreState = {
  entries: [
    { id: '1', type: 'text' },
    { id: '2', type: 'photo' },
    { id: '3', type: 'voice' },
  ],
  getAllTags: mockGetAllTags,
};

jest.mock('../../store/entryStore', () => ({
  useEntryStore: (selector: (state: typeof mockStoreState) => unknown) => selector(mockStoreState),
}));

jest.mock('../../store/entryFilterUIStore', () => ({
  useEntryFilterUIStore: (selector?: (state: typeof mockFilterUiState) => unknown) =>
    selector ? selector(mockFilterUiState) : mockFilterUiState,
}));

describe('FilterBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFilterUiState.filterType = 'all';
    mockFilterUiState.filterDateRange = 'all';
    mockFilterUiState.selectedTags = [];
    mockGetAllTags.mockResolvedValue(['工作', '灵感']);
  });

  it('returns null and does not fetch tags when hidden', () => {
    const screen = render(<FilterBar isVisible={false} onClose={jest.fn()} />);

    expect(screen.queryByTestId('filter-bar-root')).toBeNull();
    expect(mockGetAllTags).not.toHaveBeenCalled();
  });

  it('renders filter bar shell when visible', async () => {
    const screen = render(<FilterBar isVisible onClose={jest.fn()} />);

    await waitFor(() => {
      expect(mockGetAllTags).toHaveBeenCalled();
    });

    expect(screen.getByTestId('filter-bar-root')).toBeTruthy();
  });

  it('calls setFilterType when selecting a type', async () => {
    const screen = render(<FilterBar isVisible onClose={jest.fn()} />);

    await waitFor(() => {
      expect(mockGetAllTags).toHaveBeenCalled();
    });

    fireEvent.press(screen.getByText('文本'));

    expect(mockSetFilterType).toHaveBeenCalledWith('text');
  });

  it('shows reset button when there are active filters', async () => {
    mockFilterUiState.filterType = 'photo';

    const screen = render(<FilterBar isVisible onClose={jest.fn()} />);

    await waitFor(() => {
      expect(mockGetAllTags).toHaveBeenCalled();
    });

    expect(screen.getByTestId('filter-bar-reset-button')).toBeTruthy();
  });

  it('resets active type, date and tag filters from the reset action', async () => {
    mockFilterUiState.filterType = 'photo';
    mockFilterUiState.filterDateRange = 'week';
    mockFilterUiState.selectedTags = ['工作'];

    const screen = render(<FilterBar isVisible onClose={jest.fn()} />);

    await waitFor(() => {
      expect(mockGetAllTags).toHaveBeenCalled();
    });

    fireEvent.press(screen.getByTestId('filter-bar-reset-button'));

    expect(mockSetFilterType).toHaveBeenCalledWith('all');
    expect(mockSetFilterDateRange).toHaveBeenCalledWith('all');
    expect(mockClearTags).toHaveBeenCalledTimes(1);
  });

  it('shows tag modal shell after opening tag picker', async () => {
    const screen = render(<FilterBar isVisible onClose={jest.fn()} />);

    fireEvent.press(screen.getByText('选择标签'));

    await waitFor(() => {
      expect(screen.getByTestId('filter-bar-tag-modal')).toBeTruthy();
    });
  });
});
