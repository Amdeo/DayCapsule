import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  renderEntryEditor,
  resetRenderEntryEditorMocks,
} from '../helpers/renderEntryEditor';

describe('EntryEditor save flow', () => {
  beforeEach(() => {
    resetRenderEntryEditorMocks();
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
});
