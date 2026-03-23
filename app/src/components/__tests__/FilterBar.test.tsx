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

const mockStoreState = {
  entries: [
    { id: '1', type: 'text' },
    { id: '2', type: 'photo' },
    { id: '3', type: 'voice' },
  ],
  filterType: 'all' as 'all' | 'text' | 'photo' | 'voice',
  filterDateRange: 'all' as 'all' | 'today' | 'week' | 'month',
  selectedTags: [] as string[],
  setFilterType: mockSetFilterType,
  setFilterDateRange: mockSetFilterDateRange,
  getAllTags: mockGetAllTags,
  toggleTag: mockToggleTag,
  clearTags: mockClearTags,
};

jest.mock('../../store/entryStore', () => ({
  useEntryStore: () => mockStoreState,
}));

describe('FilterBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.filterType = 'all';
    mockStoreState.filterDateRange = 'all';
    mockStoreState.selectedTags = [];
    mockGetAllTags.mockResolvedValue(['工作', '灵感']);
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
    mockStoreState.filterType = 'photo';

    const screen = render(<FilterBar isVisible onClose={jest.fn()} />);

    await waitFor(() => {
      expect(mockGetAllTags).toHaveBeenCalled();
    });

    expect(screen.getByTestId('filter-bar-reset-button')).toBeTruthy();
  });

  it('shows tag modal shell after opening tag picker', async () => {
    const screen = render(<FilterBar isVisible onClose={jest.fn()} />);

    fireEvent.press(screen.getByText('选择标签'));

    await waitFor(() => {
      expect(screen.getByTestId('filter-bar-tag-modal')).toBeTruthy();
    });
  });
});
