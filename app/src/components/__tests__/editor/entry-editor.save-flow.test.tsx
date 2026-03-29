import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  renderEntryEditor,
  resetRenderEntryEditorMocks,
} from '../helpers/renderEntryEditor';

describe('EntryEditor save flow', () => {
  beforeEach(() => {
    resetRenderEntryEditorMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not call onSave when the editor is still pristine', () => {
    const onSave = jest.fn();
    const { UNSAFE_getByProps } = renderEntryEditor({ onSave });
    const saveButton = UNSAFE_getByProps({ testID: 'entry-editor-save-button' });

    saveButton.props.onPress();

    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves edited content once and closes after the async save resolves', async () => {
    let resolveSave: (() => void) | null = null;
    const onSave = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
    );
    const onClose = jest.fn();
    const { screen, entry } = renderEntryEditor({ onSave, onClose });

    fireEvent.changeText(screen.getByTestId('entry-editor-content-input'), '新的正文');
    fireEvent.changeText(screen.getByTestId('entry-editor-tags-input'), '产品, 想法, 复盘');
    fireEvent.press(screen.getByTestId('entry-editor-save-button'));
    fireEvent.press(screen.getByTestId('entry-editor-save-button'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(entry.id, '新的正文', ['产品', '想法', '复盘']);
    expect(onClose).not.toHaveBeenCalled();

    resolveSave?.();

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows a controlled error and stays open when the async save rejects', async () => {
    const onSave = jest
      .fn()
      .mockRejectedValueOnce(new Error('save failed'))
      .mockResolvedValueOnce(undefined);
    const onClose = jest.fn();
    const { screen, entry } = renderEntryEditor({ onSave, onClose });

    fireEvent.changeText(screen.getByTestId('entry-editor-content-input'), '新的正文');
    fireEvent.press(screen.getByTestId('entry-editor-save-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('保存失败', '保存内容失败，请重试');
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('entry-editor-save-button').props.accessibilityState.disabled).toBe(false);

    fireEvent.press(screen.getByTestId('entry-editor-save-button'));

    await waitFor(() => {
      expect(onSave).toHaveBeenNthCalledWith(2, entry.id, '新的正文', ['产品', '想法']);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
