import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderEntryEditor } from './helpers/renderEntryEditor';

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

describe('EntryEditor redesigned layout', () => {
  it('keeps the header and type badge visible in the full-screen editor shell', () => {
    const { screen } = renderEntryEditor();

    expect(screen.getByTestId('entry-editor-header')).toBeTruthy();
    expect(screen.getByTestId('entry-editor-type-badge')).toBeTruthy();
    expect(screen.getByText('编辑记录')).toBeTruthy();
  });

  it('renders stable back and save button testIDs', () => {
    const { screen } = renderEntryEditor();

    expect(screen.getByTestId('entry-editor-back-button')).toBeTruthy();
    expect(screen.getByTestId('entry-editor-save-button')).toBeTruthy();
  });

  it('renders a large primary text editor area for text entries', () => {
    const { screen } = renderEntryEditor();

    const input = screen.getByTestId('entry-editor-content-input');

    expect(screen.getByTestId('entry-editor-content-surface')).toBeTruthy();
    expect(input).toBeTruthy();
    expect(input.props.multiline).toBe(true);
  });

  it('keeps the tag dock visible while rendering content editor separately', () => {
    const { screen } = renderEntryEditor();

    expect(screen.getByTestId('entry-editor-header')).toBeTruthy();
    expect(screen.getByTestId('entry-editor-tag-dock')).toBeTruthy();
    expect(screen.getByTestId('entry-editor-content-surface')).toBeTruthy();
    expect(screen.getByTestId('entry-editor-tags-input')).toBeTruthy();
  });

  it('saves edited content and tags from the redesigned layout', () => {
    const onSave = jest.fn();
    const { entry, screen } = renderEntryEditor({ onSave });

    fireEvent.changeText(screen.getByTestId('entry-editor-content-input'), '新的正文');
    fireEvent.changeText(screen.getByTestId('entry-editor-tags-input'), '产品, 想法, 复盘');
    fireEvent.press(screen.getByText('保存'));

    expect(onSave).toHaveBeenCalledWith(entry.id, '新的正文', ['产品', '想法', '复盘']);
  });
});
