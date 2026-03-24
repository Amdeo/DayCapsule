import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { VoiceRecorder } from '../VoiceRecorder';
import { showAppDialog } from '@/src/services/showAppDialog';
import { VoiceService } from '@/src/services/voiceService';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text> };
});

jest.mock('../WaveformAnimation', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ isRecording }: { isRecording: boolean }) => (
    <View testID={isRecording ? 'mock-waveform-recording' : 'mock-waveform-paused'} />
  );
});

jest.mock('@/src/services/voiceService', () => ({
  VoiceService: {
    startRecording: jest.fn(async () => undefined),
    pauseRecording: jest.fn(async () => undefined),
    resumeRecording: jest.fn(async () => undefined),
    stopRecording: jest.fn(async () => ({ uri: 'file:///voice.m4a' })),
    cancelRecording: jest.fn(async () => undefined),
  },
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), log: jest.fn() },
}));

jest.mock('@/src/services/showAppDialog', () => ({
  showAppDialog: jest.fn(),
}));

describe('VoiceRecorder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders idle shell when visible', () => {
    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    expect(screen.getByTestId('voice-recorder-root')).toBeTruthy();
    expect(screen.getByTestId('voice-recorder-idle')).toBeTruthy();
    expect(screen.getByText('开始录音')).toBeTruthy();
  });

  it('shows done state after start and stop flow', async () => {
    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(VoiceService.startRecording).toHaveBeenCalled();
      expect(screen.getByTestId('voice-recorder-recording')).toBeTruthy();
      expect(screen.getByText('停止')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('停止'));

    await waitFor(() => {
      expect(VoiceService.stopRecording).toHaveBeenCalled();
      expect(screen.getByTestId('voice-recorder-done')).toBeTruthy();
      expect(screen.getByText('录音完成')).toBeTruthy();
    });
  });

  it('shows blocking dialog when start recording fails', async () => {
    (VoiceService.startRecording as jest.Mock).mockRejectedValueOnce(new Error('denied'));

    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(showAppDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '录音失败',
          message: '无法启动录音，请检查麦克风权限',
          tone: 'error',
          blocking: true,
        })
      );
    });
  });

  it('shows blocking dialog when stopping recording fails', async () => {
    (VoiceService.stopRecording as jest.Mock).mockRejectedValueOnce(new Error('write failed'));

    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(screen.getByTestId('voice-recorder-recording')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('停止'));

    await waitFor(() => {
      expect(showAppDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '保存失败',
          message: '保存录音失败，请重试',
          tone: 'error',
          blocking: true,
        })
      );
    });
  });
});
