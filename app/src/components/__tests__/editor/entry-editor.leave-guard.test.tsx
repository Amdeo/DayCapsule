import React from 'react';
import { Alert, Modal } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
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

  it('keeps the edited content when the user chooses to continue editing', () => {
    const onClose = jest.fn();
    const { screen } = renderEntryEditor({ onClose });

    fireEvent.changeText(screen.getByTestId('entry-editor-content-input'), '继续编辑的正文');
    fireEvent.press(screen.getByTestId('entry-editor-back-button'));

    const actions = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{ text?: string; onPress?: () => void }>;
    const continueAction = actions.find((action) => action.text === '继续编辑');

    continueAction?.onPress?.();

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('继续编辑的正文')).toBeTruthy();
  });

  it('ignores close requests while a save is still in progress', async () => {
    let resolveSave: (() => void) | null = null;
    const onSave = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
    );
    const onClose = jest.fn();
    const { screen, UNSAFE_getByType } = renderEntryEditor({ onSave, onClose });

    fireEvent.changeText(screen.getByTestId('entry-editor-content-input'), '保存中的正文');
    fireEvent.press(screen.getByTestId('entry-editor-save-button'));
    fireEvent.press(screen.getByTestId('entry-editor-back-button'));
    fireEvent.press(screen.getByTestId('entry-editor-backdrop'));

    act(() => {
      UNSAFE_getByType(Modal).props.onRequestClose();
    });

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    resolveSave?.();

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
