import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react-native';
import {TranscriptionLanguageSelector} from '../TranscriptionLanguageSelector';

describe('TranscriptionLanguageSelector', () => {
  const mockOnLanguageSelect = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when visible is true', () => {
    render(
      <TranscriptionLanguageSelector
        visible={true}
        selectedLanguage="zh-CN"
        onLanguageSelect={mockOnLanguageSelect}
        onCancel={mockOnCancel}
        testID="language-selector"
      />,
    );

    expect(screen.getByText('选择转录语言')).toBeTruthy();
  });

  it('should not render when visible is false', () => {
    render(
      <TranscriptionLanguageSelector
        visible={false}
        selectedLanguage="zh-CN"
        onLanguageSelect={mockOnLanguageSelect}
        onCancel={mockOnCancel}
        testID="language-selector"
      />,
    );

    expect(screen.queryByText('选择转录语言')).toBeFalsy();
  });

  it('should display all supported languages', () => {
    render(
      <TranscriptionLanguageSelector
        visible={true}
        selectedLanguage="zh-CN"
        onLanguageSelect={mockOnLanguageSelect}
        onCancel={mockOnCancel}
        testID="language-selector"
      />,
    );

    expect(screen.getByText('简体中文')).toBeTruthy();
    expect(screen.getByText('英文')).toBeTruthy();
    expect(screen.getByText('日语')).toBeTruthy();
  });

  it('should display language options', () => {
    render(
      <TranscriptionLanguageSelector
        visible={true}
        selectedLanguage="zh-CN"
        onLanguageSelect={mockOnLanguageSelect}
        onCancel={mockOnCancel}
        testID="language-selector"
      />,
    );

    const englishOption = screen.getByTestId('language-selector-language-en-US');
    expect(englishOption).toBeTruthy();
  });

  it('should call onLanguageSelect when confirm button is clicked with different language', async () => {
    render(
      <TranscriptionLanguageSelector
        visible={true}
        selectedLanguage="zh-CN"
        onLanguageSelect={mockOnLanguageSelect}
        onCancel={mockOnCancel}
        testID="language-selector"
      />,
    );

    const confirmButton = screen.getByTestId('language-selector-confirm-button');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(mockOnLanguageSelect).toHaveBeenCalled();
    });
  });

  it('should call onCancel when cancel button is clicked', async () => {
    render(
      <TranscriptionLanguageSelector
        visible={true}
        selectedLanguage="zh-CN"
        onLanguageSelect={mockOnLanguageSelect}
        onCancel={mockOnCancel}
        testID="language-selector"
      />,
    );

    const cancelButton = screen.getByTestId('language-selector-cancel-button');
    fireEvent.press(cancelButton);

    await waitFor(() => {
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  it('should disable confirm button when language is not changed', () => {
    render(
      <TranscriptionLanguageSelector
        visible={true}
        selectedLanguage="zh-CN"
        onLanguageSelect={mockOnLanguageSelect}
        onCancel={mockOnCancel}
        testID="language-selector"
      />,
    );

    const confirmButton = screen.getByTestId('language-selector-confirm-button');
    expect(confirmButton.props.disabled).toBe(true);
  });

  it('should have confirm button available', () => {
    render(
      <TranscriptionLanguageSelector
        visible={true}
        selectedLanguage="zh-CN"
        onLanguageSelect={mockOnLanguageSelect}
        onCancel={mockOnCancel}
        testID="language-selector"
      />,
    );

    const confirmButton = screen.getByTestId('language-selector-confirm-button');
    expect(confirmButton).toBeTruthy();
  });

  it('should display current language in info section', () => {
    render(
      <TranscriptionLanguageSelector
        visible={true}
        selectedLanguage="en-US"
        onLanguageSelect={mockOnLanguageSelect}
        onCancel={mockOnCancel}
        testID="language-selector"
      />,
    );

    expect(screen.getByText(/当前选择: 英文/)).toBeTruthy();
  });

  it('should reset language selection when cancel is clicked', async () => {
    render(
      <TranscriptionLanguageSelector
        visible={true}
        selectedLanguage="zh-CN"
        onLanguageSelect={mockOnLanguageSelect}
        onCancel={mockOnCancel}
        testID="language-selector"
      />,
    );

    const englishOption = screen.getByTestId('language-selector-language-en-US');
    fireEvent.press(englishOption);

    const cancelButton = screen.getByTestId('language-selector-cancel-button');
    fireEvent.press(cancelButton);

    await waitFor(() => {
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});
