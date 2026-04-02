import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { TextEditor } from '../TextEditor';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';

const mockLoadCommonTags = jest.fn();
let mockCommonTagsState = {
  tags: ['生活', '工作', '复盘'],
  isLoaded: true,
};

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
    ...mockCommonTagsState,
    loadCommonTags: mockLoadCommonTags,
  }),
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

describe('TextEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockCommonTagsState = {
      tags: ['生活', '工作', '复盘'],
      isLoaded: true,
    };
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders nothing when hidden', () => {
    const screen = render(<TextEditor visible={false} onSave={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.queryByTestId('text-editor-sheet')).toBeNull();
  });

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

  it('loads common tags when the shared tag store is not hydrated yet', async () => {
    mockCommonTagsState = {
      tags: [],
      isLoaded: false,
    };

    render(<TextEditor visible onSave={jest.fn()} onCancel={jest.fn()} />);

    await waitFor(() => {
      expect(mockLoadCommonTags).toHaveBeenCalledTimes(1);
    });
  });

  it('toggles a common tag chip into and out of the tag input', () => {
    const screen = render(<TextEditor visible onSave={jest.fn()} onCancel={jest.fn()} />);

    fireEvent.press(screen.getAllByText('生活')[0]);
    expect(screen.getByTestId('text-editor-tags-input')).toHaveProp('value', '生活');

    fireEvent.press(screen.getAllByText('生活')[0]);
    expect(screen.getByTestId('text-editor-tags-input')).toHaveProp('value', '');
  });

  it('parses comma-separated tags on save and resets the editor state', async () => {
    const onSave = jest.fn();
    const screen = render(<TextEditor visible onSave={onSave} onCancel={jest.fn()} />);

    fireEvent.changeText(screen.getByTestId('text-editor-content-input'), '新的记录');
    fireEvent.changeText(screen.getByTestId('text-editor-tags-input'), '生活, 工作 , 复盘 ');
    await act(async () => {
      fireEvent.press(screen.getByTestId('text-editor-save-button'));
    });

    expect(onSave).toHaveBeenCalledWith('新的记录', ['生活', '工作', '复盘']);
    expect(screen.getByTestId('text-editor-content-input')).toHaveProp('value', '');
    expect(screen.getByTestId('text-editor-tags-input')).toHaveProp('value', '');
  });

  it('shows branded feedback and keeps draft content when async save fails', async () => {
    const onSave = jest.fn().mockRejectedValueOnce(new Error('db write failed'));
    const screen = render(<TextEditor visible onSave={onSave} onCancel={jest.fn()} />);

    fireEvent.changeText(screen.getByTestId('text-editor-content-input'), '新的记录');
    fireEvent.changeText(screen.getByTestId('text-editor-tags-input'), '生活, 工作');

    await act(async () => {
      fireEvent.press(screen.getByTestId('text-editor-save-button'));
    });

    expect(showErrorFeedback).toHaveBeenCalledWith({
      title: '保存失败',
      message: '文本保存失败，请重试',
      actions: [{ label: '知道了', role: 'primary' }],
    });
    expect(screen.getByTestId('text-editor-content-input')).toHaveProp('value', '新的记录');
    expect(screen.getByTestId('text-editor-tags-input')).toHaveProp('value', '生活, 工作');
  });

  it('shows debounced suggestions and appends the selected suggestion only once', async () => {
    const screen = render(<TextEditor visible onSave={jest.fn()} onCancel={jest.fn()} />);

    fireEvent.changeText(screen.getByTestId('text-editor-content-input'), '复盘会议');
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getAllByText('复盘').length).toBeGreaterThan(0);

    fireEvent.press(screen.getAllByText('复盘').at(-1)!);
    expect(screen.getByTestId('text-editor-tags-input')).toHaveProp('value', '复盘');

    fireEvent.press(screen.getAllByText('复盘').at(-1)!);
    expect(screen.getByTestId('text-editor-tags-input')).toHaveProp('value', '复盘');
  });
});
