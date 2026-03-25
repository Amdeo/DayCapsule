import React from 'react';
import { Alert } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import {
  renderEntryEditor,
  resetRenderEntryEditorMocks,
} from '../helpers/renderEntryEditor';

describe('EntryEditor leave guard', () => {
  beforeEach(() => {
    resetRenderEntryEditorMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('closes immediately when leaving a pristine editor', () => {
    const onClose = jest.fn();
    const { screen } = renderEntryEditor({ onClose });

    fireEvent.press(screen.getByTestId('entry-editor-back-button'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('asks for confirmation before leaving a dirty editor', () => {
    const onClose = jest.fn();
    const { screen } = renderEntryEditor({ onClose });

    fireEvent.changeText(screen.getByTestId('entry-editor-content-input'), '新的正文');
    fireEvent.press(screen.getByTestId('entry-editor-back-button'));

    expect(Alert.alert).toHaveBeenCalledWith(
      '放弃修改？',
      '未保存的修改将会丢失。',
      expect.any(Array)
    );
    expect(onClose).not.toHaveBeenCalled();

    const actions = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{ text?: string; onPress?: () => void }>;
    const discardAction = actions.find((action) => action.text === '放弃修改');

    discardAction?.onPress?.();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
