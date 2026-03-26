import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { VoiceRecorder } from '../VoiceRecorder';
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

describe('VoiceRecorder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
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

  it('pauses and resumes the recording state', async () => {
    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(screen.getByText('暂停')).toBeTruthy();
      expect(screen.getByTestId('mock-waveform-recording')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('暂停'));

    await waitFor(() => {
      expect(VoiceService.pauseRecording).toHaveBeenCalledTimes(1);
      expect(screen.getByText('继续')).toBeTruthy();
      expect(screen.getByTestId('mock-waveform-paused')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('继续'));

    await waitFor(() => {
      expect(VoiceService.resumeRecording).toHaveBeenCalledTimes(1);
      expect(screen.getByText('暂停')).toBeTruthy();
      expect(screen.getByTestId('mock-waveform-recording')).toBeTruthy();
    });
  });

  it('cancels the active recording and calls onCancel when dismissing while recording', async () => {
    const onCancel = jest.fn();
    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={onCancel} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(screen.getByTestId('voice-recorder-recording')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('close'));

    await waitFor(() => {
      expect(VoiceService.cancelRecording).toHaveBeenCalledTimes(1);
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  it('saves the finished recording with the recorded duration', async () => {
    const onSave = jest.fn();
    const screen = render(
      <VoiceRecorder visible onSave={onSave} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(screen.getByTestId('voice-recorder-recording')).toBeTruthy();
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    fireEvent.press(screen.getByText('停止'));

    await waitFor(() => {
      expect(screen.getByTestId('voice-recorder-done')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('保存'));

    expect(onSave).toHaveBeenCalledWith('file:///voice.m4a', 2);
  });

  it('returns to the idle state when retrying after a finished recording', async () => {
    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(screen.getByTestId('voice-recorder-recording')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('停止'));

    await waitFor(() => {
      expect(screen.getByTestId('voice-recorder-done')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('重新录制'));

    expect(screen.getByTestId('voice-recorder-idle')).toBeTruthy();
    expect(screen.getByText('开始录音')).toBeTruthy();
  });

  it('shows an alert when starting the recorder fails', async () => {
    (VoiceService.startRecording as jest.Mock).mockRejectedValueOnce(new Error('permission denied'));

    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('录音失败', '无法启动录音，请检查麦克风权限');
    });
    expect(screen.getByTestId('voice-recorder-idle')).toBeTruthy();
  });
});
