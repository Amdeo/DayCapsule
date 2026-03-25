import React from 'react';
import {
  renderEntryEditor,
  resetRenderEntryEditorMocks,
} from './helpers/renderEntryEditor';

describe('EntryEditor redesigned layout', () => {
  beforeEach(() => {
    resetRenderEntryEditorMocks();
  });

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
});
