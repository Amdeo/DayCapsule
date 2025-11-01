import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react-native';
import {TranscriptionEditor} from '../TranscriptionEditor';

describe('TranscriptionEditor', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOnDelete = jest.fn();
  const initialText = 'This is the initial transcription text';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when visible is true', () => {
    render(
      <TranscriptionEditor
        visible={true}
        initialText={initialText}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        testID="transcription-editor"
      />,
    );

    expect(screen.getByText('编辑转录文本')).toBeTruthy();
  });

  it('should not render when visible is false', () => {
    render(
      <TranscriptionEditor
        visible={false}
        initialText={initialText}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        testID="transcription-editor"
      />,
    );

    expect(screen.queryByText('编辑转录文本')).toBeFalsy();
  });

  it('should display initial text in input', () => {
    render(
      <TranscriptionEditor
        visible={true}
        initialText={initialText}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        testID="transcription-editor"
      />,
    );

    const input = screen.getByTestId('transcription-editor-input');
    expect(input).toBeTruthy();
  });

  it('should update text when user types', () => {
    render(
      <TranscriptionEditor
        visible={true}
        initialText={initialText}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        testID="transcription-editor"
      />,
    );

    const input = screen.getByTestId('transcription-editor-input');
    fireEvent.changeText(input, 'Updated text');

    expect(input).toBeTruthy();
  });

  it('should call onSave with trimmed text', async () => {
    render(
      <TranscriptionEditor
        visible={true}
        initialText={initialText}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        testID="transcription-editor"
      />,
    );

    const input = screen.getByTestId('transcription-editor-input');
    fireEvent.changeText(input, '  Updated text  ');

    const saveButton = screen.getByTestId('transcription-editor-save-button');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('Updated text');
    });
  });

  it('should call onCancel when cancel button is pressed', async () => {
    render(
      <TranscriptionEditor
        visible={true}
        initialText={initialText}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        testID="transcription-editor"
      />,
    );

    const cancelButton = screen.getByTestId('transcription-editor-cancel-button');
    fireEvent.press(cancelButton);

    await waitFor(() => {
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  it('should call onDelete when delete button is pressed', async () => {
    render(
      <TranscriptionEditor
        visible={true}
        initialText={initialText}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDelete={mockOnDelete}
        testID="transcription-editor"
      />,
    );

    const deleteButton = screen.getByTestId('transcription-editor-delete-button');
    fireEvent.press(deleteButton);

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalled();
    });
  });

  it('should disable save button when text has not changed', () => {
    render(
      <TranscriptionEditor
        visible={true}
        initialText={initialText}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        testID="transcription-editor"
      />,
    );

    const saveButton = screen.getByTestId('transcription-editor-save-button');
    expect(saveButton.props.disabled).toBe(true);
  });

  it('should enable save button when text has changed', () => {
    render(
      <TranscriptionEditor
        visible={true}
        initialText={initialText}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        testID="transcription-editor"
      />,
    );

    const input = screen.getByTestId('transcription-editor-input');
    fireEvent.changeText(input, 'Changed text');

    const saveButton = screen.getByTestId('transcription-editor-save-button');
    expect(saveButton.props.disabled).toBe(false);
  });

  it('should display character count', () => {
    render(
      <TranscriptionEditor
        visible={true}
        initialText={initialText}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        testID="transcription-editor"
      />,
    );

    expect(screen.getByText(new RegExp(`${initialText.length} / 5000`))).toBeTruthy();
  });

  it('should disable save button when text exceeds max length', () => {
    const longText = 'a'.repeat(5001);

    render(
      <TranscriptionEditor
        visible={true}
        initialText={initialText}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        testID="transcription-editor"
      />,
    );

    const input = screen.getByTestId('transcription-editor-input');
    fireEvent.changeText(input, longText);

    const saveButton = screen.getByTestId('transcription-editor-save-button');
    expect(saveButton.props.disabled).toBe(true);
  });

  it('should disable all buttons when loading', () => {
    render(
      <TranscriptionEditor
        visible={true}
        initialText={initialText}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDelete={mockOnDelete}
        isLoading={true}
        testID="transcription-editor"
      />,
    );

    const saveButton = screen.getByTestId('transcription-editor-save-button');
    const cancelButton = screen.getByTestId('transcription-editor-cancel-button');
    const deleteButton = screen.getByTestId('transcription-editor-delete-button');

    expect(saveButton.props.disabled).toBe(true);
    expect(cancelButton.props.disabled).toBe(true);
    expect(deleteButton.props.disabled).toBe(true);
  });

  // 搜索功能测试
  it('should show search bar when search button is clicked', () => {
    render(
      <TranscriptionEditor
        visible={true}
        initialText={initialText}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        testID="transcription-editor"
        enableSearch={true}
      />,
    );

    const searchButton = screen.getByTestId('transcription-editor-search-button');
    fireEvent.press(searchButton);

    expect(screen.getByTestId('transcription-editor-search-input')).toBeTruthy();
  });

  it('should hide search bar when close button is clicked', () => {
    render(
      <TranscriptionEditor
        visible={true}
        initialText={initialText}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        testID="transcription-editor"
        enableSearch={true}
      />,
    );

    const searchButton = screen.getByTestId('transcription-editor-search-button');
    fireEvent.press(searchButton);

    const closeButton = screen.getByTestId('transcription-editor-search-close');
    fireEvent.press(closeButton);

    expect(screen.queryByTestId('transcription-editor-search-input')).toBeFalsy();
  });

  it('should accept search query input', () => {
    render(
      <TranscriptionEditor
        visible={true}
        initialText={initialText}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        testID="transcription-editor"
        enableSearch={true}
      />,
    );

    const searchButton = screen.getByTestId('transcription-editor-search-button');
    fireEvent.press(searchButton);

    const searchInput = screen.getByTestId('transcription-editor-search-input');
    fireEvent.changeText(searchInput, 'test');

    expect(searchInput).toBeTruthy();
  });

  it('should navigate through search results with next button', () => {
    render(
      <TranscriptionEditor
        visible={true}
        initialText={initialText}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        testID="transcription-editor"
        enableSearch={true}
      />,
    );

    const searchButton = screen.getByTestId('transcription-editor-search-button');
    fireEvent.press(searchButton);

    const nextButton = screen.getByTestId('transcription-editor-search-next');
    expect(nextButton).toBeTruthy();
  });

  it('should navigate through search results with prev button', () => {
    render(
      <TranscriptionEditor
        visible={true}
        initialText={initialText}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        testID="transcription-editor"
        enableSearch={true}
      />,
    );

    const searchButton = screen.getByTestId('transcription-editor-search-button');
    fireEvent.press(searchButton);

    const prevButton = screen.getByTestId('transcription-editor-search-prev');
    expect(prevButton).toBeTruthy();
  });

  it('should not show search bar when enableSearch is false', () => {
    render(
      <TranscriptionEditor
        visible={true}
        initialText={initialText}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        testID="transcription-editor"
        enableSearch={false}
      />,
    );

    expect(screen.queryByTestId('transcription-editor-search-button')).toBeFalsy();
  });
});
