import React from 'react';
import {render, screen} from '@testing-library/react-native';
import {PaperProvider} from 'react-native-paper';
import {TranscriptionProgress} from '../TranscriptionProgress';

jest.mock('@services/telemetry/logger');

const renderWithTheme = (component: React.ReactElement) => {
  return render(<PaperProvider>{component}</PaperProvider>);
};

describe('TranscriptionProgress', () => {
  it('should not render when isVisible is false', () => {
    const {queryByTestId} = renderWithTheme(
      <TranscriptionProgress isVisible={false} testID="transcription-progress" />,
    );

    expect(queryByTestId('transcription-progress')).toBeNull();
  });

  it('should render when isVisible is true', () => {
    const {getByTestId} = renderWithTheme(
      <TranscriptionProgress isVisible={true} testID="transcription-progress" />,
    );

    expect(getByTestId('transcription-progress')).toBeTruthy();
  });

  it('should display transcribing message', () => {
    const {getByText} = renderWithTheme(
      <TranscriptionProgress
        isVisible={true}
        status="transcribing"
        message="正在转录..."
        testID="transcription-progress"
      />,
    );

    expect(getByText('正在转录...')).toBeTruthy();
  });

  it('should display completed message', () => {
    const {getByText} = renderWithTheme(
      <TranscriptionProgress isVisible={true} status="completed" testID="transcription-progress" />,
    );

    expect(getByText('转录完成')).toBeTruthy();
  });

  it('should display error message', () => {
    const {getByText} = renderWithTheme(
      <TranscriptionProgress isVisible={true} status="error" testID="transcription-progress" />,
    );

    expect(getByText('转录失败')).toBeTruthy();
  });

  it('should show cancel button when transcribing', () => {
    const mockCancel = jest.fn();
    const {getByTestId} = renderWithTheme(
      <TranscriptionProgress
        isVisible={true}
        status="transcribing"
        onCancel={mockCancel}
        testID="transcription-progress"
      />,
    );

    expect(getByTestId('transcription-progress-cancel-button')).toBeTruthy();
  });

  it('should not show cancel button when completed', () => {
    const {queryByTestId} = renderWithTheme(
      <TranscriptionProgress isVisible={true} status="completed" testID="transcription-progress" />,
    );

    expect(queryByTestId('transcription-progress-cancel-button')).toBeNull();
  });

  it('should display progress percentage', () => {
    const {getByText} = renderWithTheme(
      <TranscriptionProgress isVisible={true} progress={0.5} testID="transcription-progress" />,
    );

    expect(getByText('50%')).toBeTruthy();
  });
});
