import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';
import type { Entry } from '@/src/types/entry';
import { TagsPage } from '../TagsPage';

const mockUseEntryStore = jest.fn();

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => mockUseEntryStore(),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

jest.mock('../DetailPageShell', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  return {
    DetailPageShell: ({
      visible,
      title,
      children,
    }: {
      visible: boolean;
      title: string;
      children: React.ReactNode;
    }) => {
      if (!visible) {
        return null;
      }

      return (
        <View>
          <Text>{title}</Text>
          {children}
        </View>
      );
    },
  };
});

describe('TagsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createEntry = (overrides: Partial<Entry>): Entry => ({
    id: 'entry',
    type: 'text',
    content: 'content',
    timestamp: 1,
    syncStatus: 'synced',
    ...overrides,
  });

  it('renders the empty state when there are no tags', () => {
    mockUseEntryStore.mockReturnValue({ entries: [] });
    const screen = render(<TagsPage visible onClose={jest.fn()} />);

    expect(screen.getByTestId('tags-page-root')).toBeTruthy();
    expect(screen.getByTestId('tags-page-empty')).toBeTruthy();
    expect(screen.getByText('还没有标签')).toBeTruthy();
  });

  it('renders the empty state when entries exist but none of them carry tags', () => {
    mockUseEntryStore.mockReturnValue({
      entries: [
        createEntry({ id: '1', content: 'a', tags: [] }),
        createEntry({ id: '2', content: 'b', tags: undefined }),
      ],
    });
    const screen = render(<TagsPage visible onClose={jest.fn()} />);

    expect(screen.getByTestId('tags-page-empty')).toBeTruthy();
    expect(screen.queryAllByTestId('tags-page-row')).toHaveLength(0);
  });

  it('does not render anything when the page is hidden', () => {
    mockUseEntryStore.mockReturnValue({
      entries: [createEntry({ id: '1', content: 'a', tags: ['旅行'] })],
    });

    const screen = render(<TagsPage visible={false} onClose={jest.fn()} />);

    expect(screen.queryByTestId('tags-page-root')).toBeNull();
  });

  it('aggregates repeated tags, ignores undefined tags, and renders rows in descending count order', () => {
    mockUseEntryStore.mockReturnValue({
      entries: [
        createEntry({ id: '1', content: 'a', timestamp: 1, tags: ['旅行', '工作', '旅行'] }),
        createEntry({ id: '2', content: 'b', timestamp: 2, tags: ['旅行'] }),
        createEntry({ id: '3', content: 'c', timestamp: 3, tags: undefined }),
      ],
    });

    const screen = render(<TagsPage visible onClose={jest.fn()} />);
    const rows = screen.getAllByTestId('tags-page-row');

    expect(screen.getByText('共 2 个标签')).toBeTruthy();
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('#旅行')).toBeTruthy();
    expect(within(rows[0]).getByText('3 条')).toBeTruthy();
    expect(within(rows[1]).getByText('#工作')).toBeTruthy();
    expect(within(rows[1]).getByText('1 条')).toBeTruthy();
    expect(screen.queryByTestId('tags-page-empty')).toBeNull();
  });

  it('closes the page when different tag rows are pressed', () => {
    const onClose = jest.fn();

    mockUseEntryStore.mockReturnValue({
      entries: [
        createEntry({ id: '1', content: 'a', timestamp: 1, tags: ['旅行', '工作'] }),
        createEntry({ id: '2', content: 'b', timestamp: 2, tags: ['生活'] }),
      ],
    });

    const screen = render(<TagsPage visible onClose={onClose} />);
    const rows = screen.getAllByTestId('tags-page-row');

    fireEvent.press(rows[0]);
    fireEvent.press(rows[1]);

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
