import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { Entry } from '@/src/types/entry';
import { TextEntryDetailPage } from '../TextEntryDetailPage';

jest.mock('../DetailPageShell', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  return {
    DetailPageShell: ({
      visible,
      title,
      headerRight,
      children,
    }: {
      visible: boolean;
      title: string;
      headerRight?: React.ReactNode;
      children: React.ReactNode;
    }) => {
      if (!visible) {
        return null;
      }

      return (
        <View>
          <Text>{title}</Text>
          {headerRight ? <View>{headerRight}</View> : null}
          <View>{children}</View>
        </View>
      );
    },
  };
});

describe('TextEntryDetailPage', () => {
  const entry: Entry = {
    id: 'entry-text-1',
    type: 'text',
    content: '一段用于详情页的文本内容',
    timestamp: new Date('2026-03-23T08:30:00+08:00').getTime(),
    editedAt: new Date('2026-03-23T09:45:00+08:00').getTime(),
    tags: ['旅行', '春天'],
    syncStatus: 'synced',
  };

  it('renders the text detail content, meta rows and tags inside the existing shell', () => {
    const screen = render(
      <TextEntryDetailPage visible entry={entry} onClose={jest.fn()} onEdit={jest.fn()} />
    );

    expect(screen.getByTestId('text-entry-detail-root')).toBeTruthy();
    expect(screen.getByTestId('text-entry-detail-hero')).toBeTruthy();
    expect(screen.getByText(entry.content)).toBeTruthy();
    expect(screen.getByText('创建时间')).toBeTruthy();
    expect(screen.getByText('最近编辑')).toBeTruthy();
    expect(screen.getByTestId('text-entry-detail-tags')).toBeTruthy();
  });

  it('calls onEdit with the current entry from the existing header action', () => {
    const onEdit = jest.fn();
    const screen = render(
      <TextEntryDetailPage visible entry={entry} onClose={jest.fn()} onEdit={onEdit} />
    );

    fireEvent.press(screen.getByTestId('text-entry-detail-edit-button'));

    expect(onEdit).toHaveBeenCalledWith(entry);
  });
});
