import React from 'react';
import { Modal } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import {
  renderEntryEditor,
  resetRenderEntryEditorMocks,
} from '../helpers/renderEntryEditor';

const mockShowConfirmDialog = jest.fn();
const mockShowErrorFeedback = jest.fn();

jest.mock('@/src/services/showConfirmDialog', () => ({
  showConfirmDialog: (...args: unknown[]) => mockShowConfirmDialog(...args),
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: (...args: unknown[]) => mockShowErrorFeedback(...args),
}));

describe('EntryEditor leave guard', () => {
  beforeEach(() => {
    resetRenderEntryEditorMocks();
    jest.clearAllMocks();
  });

  it('closes immediately when leaving a pristine editor', () => {
    const onClose = jest.fn();
    const { screen } = renderEntryEditor({ onClose });

    fireEvent.press(screen.getByTestId('entry-editor-back-button'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockShowConfirmDialog).not.toHaveBeenCalled();
  });

  it('asks for confirmation before leaving a dirty editor', () => {
    const onClose = jest.fn();
    const { screen } = renderEntryEditor({ onClose });

    fireEvent.changeText(screen.getByTestId('entry-editor-content-input'), '新的正文');
    fireEvent.press(screen.getByTestId('entry-editor-back-button'));

    expect(mockShowConfirmDialog).toHaveBeenCalledWith({
      title: '放弃修改？',
      message: '未保存的修改将会丢失。',
      actions: [
        expect.objectContaining({ label: '继续编辑', role: 'secondary' }),
        expect.objectContaining({ label: '放弃修改', role: 'danger' }),
      ],
    });
    expect(onClose).not.toHaveBeenCalled();

    const request = mockShowConfirmDialog.mock.calls[0][0] as {
      actions: Array<{ label: string; onPress?: () => void | Promise<void> }>;
    };
    const discardAction = request.actions.find((action) => action.label === '放弃修改');

    discardAction?.onPress?.();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the edited content when the user chooses to continue editing', () => {
    const onClose = jest.fn();
    const { screen } = renderEntryEditor({ onClose });

    fireEvent.changeText(screen.getByTestId('entry-editor-content-input'), '继续编辑的正文');
    fireEvent.press(screen.getByTestId('entry-editor-back-button'));

    expect(mockShowConfirmDialog).toHaveBeenCalledWith({
      title: '放弃修改？',
      message: '未保存的修改将会丢失。',
      actions: [
        expect.objectContaining({ label: '继续编辑', role: 'secondary' }),
        expect.objectContaining({ label: '放弃修改', role: 'danger' }),
      ],
    });

    const request = mockShowConfirmDialog.mock.calls[0][0] as {
      actions: Array<{ label: string; onPress?: () => void | Promise<void> }>;
    };
    const continueAction = request.actions.find((action) => action.label === '继续编辑');

    expect(continueAction).toBeDefined();
    expect(continueAction?.onPress).toEqual(expect.any(Function));

    continueAction!.onPress!();

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

    expect(mockShowConfirmDialog).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    resolveSave?.();

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
