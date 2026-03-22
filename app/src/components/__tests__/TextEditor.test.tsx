import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TextEditor } from '../TextEditor';

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
    tags: ['生活', '工作', '复盘'],
    isLoaded: true,
    loadCommonTags: jest.fn(),
  }),
}));

describe('TextEditor', () => {
  it('renders the existing bottom sheet shell when visible', () => {
    const screen = render(<TextEditor visible onSave={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByTestId('text-editor-sheet')).toBeTruthy();
    expect(screen.getByText('添加文字记录')).toBeTruthy();
  });

  it('keeps save disabled until content is entered', () => {
    const screen = render(<TextEditor visible onSave={jest.fn()} onCancel={jest.fn()} />);

    const saveButton = screen.getByTestId('text-editor-save-button');
    expect(saveButton.props.accessibilityState?.disabled ?? saveButton.props.disabled).toBe(true);

    fireEvent.changeText(screen.getByTestId('text-editor-content-input'), '新的记录');

    const enabledSaveButton = screen.getByTestId('text-editor-save-button');
    expect(enabledSaveButton.props.accessibilityState?.disabled ?? enabledSaveButton.props.disabled).toBe(false);
  });

  it('clears local draft state when cancelled', () => {
    const onCancel = jest.fn();
    const screen = render(<TextEditor visible onSave={jest.fn()} onCancel={onCancel} />);

    fireEvent.changeText(screen.getByTestId('text-editor-content-input'), '草稿');
    fireEvent.changeText(screen.getByTestId('text-editor-tags-input'), '生活');
    fireEvent.press(screen.getByText('取消'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('text-editor-content-input').props.value).toBe('');
    expect(screen.getByTestId('text-editor-tags-input').props.value).toBe('');
  });
});
