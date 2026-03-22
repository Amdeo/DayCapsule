import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { EntryEditor } from '../EntryEditor';
import { Entry } from '@/src/types/entry';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

jest.mock('@/src/services/tagSuggestionService', () => ({
  suggestTags: jest.fn(() => ['复盘']),
}));

jest.mock('@/src/store/commonTagsStore', () => ({
  useCommonTagsStore: () => ({
    tags: ['产品', '想法', '复盘'],
    isLoaded: true,
    loadCommonTags: jest.fn(),
  }),
}));

const textEntry: Entry = {
  id: 'text-entry-1',
  type: 'text',
  content: '今天重新看了下这版时间流，感觉还是要把卡片收回主页体系里。',
  tags: ['产品', '想法'],
  timestamp: new Date('2026-03-16T11:11:00+08:00').getTime(),
  syncStatus: 'synced',
};

describe('EntryEditor redesigned layout', () => {
  it('keeps the header and type badge visible in the full-screen editor shell', () => {
    const screen = render(
      <EntryEditor visible entry={textEntry} onSave={jest.fn()} onClose={jest.fn()} />
    );

    expect(screen.getByTestId('entry-editor-header')).toBeTruthy();
    expect(screen.getByTestId('entry-editor-type-badge')).toBeTruthy();
    expect(screen.getByText('编辑记录')).toBeTruthy();
  });

  it('renders a large primary text editor area for text entries', () => {
    const screen = render(
      <EntryEditor visible entry={textEntry} onSave={jest.fn()} onClose={jest.fn()} />
    );

    const input = screen.getByTestId('entry-editor-content-input');

    expect(screen.getByTestId('entry-editor-content-surface')).toBeTruthy();
    expect(input).toBeTruthy();
    expect(input.props.multiline).toBe(true);
  });

  it('keeps the tag dock visible while rendering content editor separately', () => {
    const screen = render(
      <EntryEditor visible entry={textEntry} onSave={jest.fn()} onClose={jest.fn()} />
    );

    expect(screen.getByTestId('entry-editor-header')).toBeTruthy();
    expect(screen.getByTestId('entry-editor-tag-dock')).toBeTruthy();
    expect(screen.getByTestId('entry-editor-content-surface')).toBeTruthy();
    expect(screen.getByTestId('entry-editor-tags-input')).toBeTruthy();
  });

  it('saves edited content and tags from the redesigned layout', () => {
    const onSave = jest.fn();
    const screen = render(
      <EntryEditor visible entry={textEntry} onSave={onSave} onClose={jest.fn()} />
    );

    fireEvent.changeText(screen.getByTestId('entry-editor-content-input'), '新的正文');
    fireEvent.changeText(screen.getByTestId('entry-editor-tags-input'), '产品, 想法, 复盘');
    fireEvent.press(screen.getByText('保存'));

    expect(onSave).toHaveBeenCalledWith(textEntry.id, '新的正文', ['产品', '想法', '复盘']);
  });
});
