import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
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

  it('renders the empty state when there are no tags', () => {
    mockUseEntryStore.mockReturnValue({ entries: [] });
    const screen = render(<TagsPage visible onClose={jest.fn()} />);

    expect(screen.getByTestId('tags-page-root')).toBeTruthy();
    expect(screen.getByTestId('tags-page-empty')).toBeTruthy();
    expect(screen.getByText('还没有标签')).toBeTruthy();
  });

  it('renders tag counts and closes when a tag row is pressed', () => {
    const onClose = jest.fn();
    const entries: Entry[] = [
      {
        id: '1',
        type: 'text',
        content: 'a',
        timestamp: 1,
        tags: ['旅行'],
        syncStatus: 'synced',
      },
      {
        id: '2',
        type: 'text',
        content: 'b',
        timestamp: 2,
        tags: ['旅行', '工作'],
        syncStatus: 'synced',
      },
    ];

    mockUseEntryStore.mockReturnValue({ entries });
    const screen = render(<TagsPage visible onClose={onClose} />);

    expect(screen.getByText('共 2 个标签')).toBeTruthy();
    expect(screen.getByText('#旅行')).toBeTruthy();
    expect(screen.getByText('2 条')).toBeTruthy();

    fireEvent.press(screen.getByText('#旅行'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
