import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  renderEntryEditor,
  resetRenderEntryEditorMocks,
} from '../helpers/renderEntryEditor';

describe('EntryEditor dirty state', () => {
  beforeEach(() => {
    resetRenderEntryEditorMocks();
  });

  it('returns to the disabled save state when the user restores the original content', () => {
    const { screen, entry } = renderEntryEditor();
    const saveButton = screen.getByTestId('entry-editor-save-button');

    expect(saveButton.props.accessibilityState?.disabled).toBe(true);

    fireEvent.changeText(screen.getByTestId('entry-editor-content-input'), '新的正文');
    expect(screen.getByTestId('entry-editor-save-button').props.accessibilityState?.disabled).toBe(false);

    fireEvent.changeText(screen.getByTestId('entry-editor-content-input'), entry.content);
    expect(screen.getByTestId('entry-editor-save-button').props.accessibilityState?.disabled).toBe(true);
  });
});
