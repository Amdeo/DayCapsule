import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { VoiceRecorder } from '../VoiceRecorder';
import { VoiceService } from '@/src/services/voiceService';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { logger } from '@/src/utils/logger';

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

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

describe('VoiceRecorder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
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

  it('shows branded feedback and still closes when dismissing while recording fails to cancel', async () => {
    const onCancel = jest.fn();
    (VoiceService.cancelRecording as jest.Mock).mockRejectedValueOnce(new Error('cancel failed'));
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
      expect(showErrorFeedback).toHaveBeenCalledWith({
        title: '取消失败',
        message: '取消录音失败，请重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  it('cancels only once when dismissing triggers parent visibility change', async () => {
    const onCancel = jest.fn();
    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={onCancel} />
    );

    onCancel.mockImplementation(() => {
      screen.rerender(
        <VoiceRecorder visible={false} onSave={jest.fn()} onCancel={onCancel} />
      );
    });

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

  it('cancels the active recording when the modal becomes hidden externally', async () => {
    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(screen.getByTestId('voice-recorder-recording')).toBeTruthy();
    });

    screen.rerender(
      <VoiceRecorder visible={false} onSave={jest.fn()} onCancel={jest.fn()} />
    );

    await waitFor(() => {
      expect(VoiceService.cancelRecording).toHaveBeenCalledTimes(1);
    });
  });

  it('drops start results from a previous session after the modal is closed and reopened', async () => {
    let resolveStart: (() => void) | undefined;
    (VoiceService.startRecording as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveStart = resolve;
        })
    );

    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await act(async () => {
      screen.rerender(
        <VoiceRecorder visible={false} onSave={jest.fn()} onCancel={jest.fn()} />
      );
    });

    screen.rerender(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    expect(screen.getByTestId('voice-recorder-idle')).toBeTruthy();

    await act(async () => {
      resolveStart?.();
    });

    await waitFor(() => {
      expect(VoiceService.cancelRecording).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByTestId('voice-recorder-recording')).toBeNull();
    expect(screen.queryByText('停止')).toBeNull();
    expect(screen.getByTestId('voice-recorder-idle')).toBeTruthy();
  });

  it('ignores start failures from a previous session after the modal is closed and reopened', async () => {
    let rejectStart: ((reason?: unknown) => void) | undefined;
    (VoiceService.startRecording as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectStart = reject;
        })
    );

    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    screen.rerender(
      <VoiceRecorder visible={false} onSave={jest.fn()} onCancel={jest.fn()} />
    );

    screen.rerender(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    await act(async () => {
      rejectStart?.(new Error('late start failure'));
    });

    expect(showErrorFeedback).not.toHaveBeenCalledWith({
      title: '录音失败',
      message: '无法启动录音，请检查麦克风权限',
      actions: [{ label: '知道了', role: 'primary' }],
    });
    expect(screen.queryByTestId('voice-recorder-recording')).toBeNull();
    expect(screen.queryByText('停止')).toBeNull();
    expect(screen.getByTestId('voice-recorder-idle')).toBeTruthy();
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

  it('drops stop results from a previous session after the modal is closed and reopened', async () => {
    let resolveStop: ((value: { uri: string }) => void) | undefined;
    (VoiceService.stopRecording as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<{ uri: string }>((resolve) => {
          resolveStop = resolve;
        })
    );

    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(screen.getByTestId('voice-recorder-recording')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('停止'));

    screen.rerender(
      <VoiceRecorder visible={false} onSave={jest.fn()} onCancel={jest.fn()} />
    );

    await waitFor(() => {
      expect(VoiceService.cancelRecording).toHaveBeenCalledTimes(1);
    });

    screen.rerender(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    expect(screen.getByTestId('voice-recorder-idle')).toBeTruthy();

    await act(async () => {
      resolveStop?.({ uri: 'file:///late-stop.m4a' });
    });

    expect(screen.queryByTestId('voice-recorder-done')).toBeNull();
    expect(screen.queryByText('录音完成')).toBeNull();
    expect(screen.getByTestId('voice-recorder-idle')).toBeTruthy();
  });

  it('ignores stop failures from a previous session after the modal is closed and reopened', async () => {
    let rejectStop: ((reason?: unknown) => void) | undefined;
    (VoiceService.stopRecording as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<never>((_, reject) => {
          rejectStop = reject;
        })
    );

    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(screen.getByTestId('voice-recorder-recording')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('停止'));

    screen.rerender(
      <VoiceRecorder visible={false} onSave={jest.fn()} onCancel={jest.fn()} />
    );

    await waitFor(() => {
      expect(VoiceService.cancelRecording).toHaveBeenCalledTimes(1);
    });

    screen.rerender(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    expect(screen.getByTestId('voice-recorder-idle')).toBeTruthy();

    await act(async () => {
      rejectStop?.(new Error('late stop failure'));
    });

    expect(showErrorFeedback).not.toHaveBeenCalledWith({
      title: '保存失败',
      message: '保存录音失败，请重试',
      actions: [{ label: '知道了', role: 'primary' }],
    });
    expect(screen.queryByTestId('voice-recorder-done')).toBeNull();
    expect(screen.queryByText('录音完成')).toBeNull();
    expect(screen.getByTestId('voice-recorder-idle')).toBeTruthy();
  });

  it('ignores pause results from a previous session after the modal is closed and reopened', async () => {
    let resolvePause: (() => void) | undefined;
    (VoiceService.pauseRecording as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolvePause = resolve;
        })
    );

    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(screen.getByTestId('voice-recorder-recording')).toBeTruthy();
      expect(screen.getByText('暂停')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('暂停'));

    screen.rerender(
      <VoiceRecorder visible={false} onSave={jest.fn()} onCancel={jest.fn()} />
    );

    await waitFor(() => {
      expect(VoiceService.cancelRecording).toHaveBeenCalledTimes(1);
    });

    screen.rerender(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(screen.getByTestId('voice-recorder-recording')).toBeTruthy();
      expect(screen.getByText('暂停')).toBeTruthy();
    });

    await act(async () => {
      resolvePause?.();
    });

    expect(screen.queryByText('继续')).toBeNull();
    expect(screen.getByText('暂停')).toBeTruthy();
    expect(screen.getByTestId('mock-waveform-recording')).toBeTruthy();
  });

  it('ignores pause failures from a previous session after the modal is closed and reopened', async () => {
    let rejectPause: ((reason?: unknown) => void) | undefined;
    (VoiceService.pauseRecording as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectPause = reject;
        })
    );

    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(screen.getByTestId('voice-recorder-recording')).toBeTruthy();
      expect(screen.getByText('暂停')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('暂停'));

    screen.rerender(
      <VoiceRecorder visible={false} onSave={jest.fn()} onCancel={jest.fn()} />
    );

    await waitFor(() => {
      expect(VoiceService.cancelRecording).toHaveBeenCalledTimes(1);
    });

    screen.rerender(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(screen.getByTestId('voice-recorder-recording')).toBeTruthy();
      expect(screen.getByText('暂停')).toBeTruthy();
    });

    await act(async () => {
      rejectPause?.(new Error('late pause failure'));
    });

    expect(logger.error).not.toHaveBeenCalledWith(
      'Failed to pause recording:',
      expect.any(Error)
    );
    expect(screen.queryByText('继续')).toBeNull();
    expect(screen.getByText('暂停')).toBeTruthy();
    expect(screen.getByTestId('mock-waveform-recording')).toBeTruthy();
  });

  it('shows branded feedback when pausing the recorder fails in the active session', async () => {
    (VoiceService.pauseRecording as jest.Mock).mockRejectedValueOnce(new Error('pause failed'));

    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(screen.getByTestId('voice-recorder-recording')).toBeTruthy();
      expect(screen.getByText('暂停')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('暂停'));

    await waitFor(() => {
      expect(showErrorFeedback).toHaveBeenCalledWith({
        title: '暂停失败',
        message: '暂停录音失败，请重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    });

    expect(screen.queryByText('继续')).toBeNull();
    expect(screen.getByText('暂停')).toBeTruthy();
    expect(screen.getByTestId('mock-waveform-recording')).toBeTruthy();
  });

  it('ignores resume results from a previous session after the modal is closed and reopened', async () => {
    let resolveResume: (() => void) | undefined;
    (VoiceService.resumeRecording as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveResume = resolve;
        })
    );

    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(screen.getByText('暂停')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('暂停'));

    await waitFor(() => {
      expect(screen.getByText('继续')).toBeTruthy();
      expect(screen.getByTestId('mock-waveform-paused')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('继续'));

    screen.rerender(
      <VoiceRecorder visible={false} onSave={jest.fn()} onCancel={jest.fn()} />
    );

    await waitFor(() => {
      expect(VoiceService.cancelRecording).toHaveBeenCalledTimes(1);
    });

    screen.rerender(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(screen.getByTestId('voice-recorder-recording')).toBeTruthy();
      expect(screen.getByText('暂停')).toBeTruthy();
      expect(screen.getByTestId('mock-waveform-recording')).toBeTruthy();
    });

    await act(async () => {
      resolveResume?.();
    });

    expect(screen.queryByText('继续')).toBeNull();
    expect(screen.getByText('暂停')).toBeTruthy();
    expect(screen.getByTestId('mock-waveform-recording')).toBeTruthy();
  });

  it('ignores resume failures from a previous session after the modal is closed and reopened', async () => {
    let rejectResume: ((reason?: unknown) => void) | undefined;
    (VoiceService.resumeRecording as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectResume = reject;
        })
    );

    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(screen.getByText('暂停')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('暂停'));

    await waitFor(() => {
      expect(screen.getByText('继续')).toBeTruthy();
      expect(screen.getByTestId('mock-waveform-paused')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('继续'));

    screen.rerender(
      <VoiceRecorder visible={false} onSave={jest.fn()} onCancel={jest.fn()} />
    );

    await waitFor(() => {
      expect(VoiceService.cancelRecording).toHaveBeenCalledTimes(1);
    });

    screen.rerender(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(screen.getByTestId('voice-recorder-recording')).toBeTruthy();
      expect(screen.getByText('暂停')).toBeTruthy();
      expect(screen.getByTestId('mock-waveform-recording')).toBeTruthy();
    });

    await act(async () => {
      rejectResume?.(new Error('late resume failure'));
    });

    expect(logger.error).not.toHaveBeenCalledWith(
      'Failed to resume recording:',
      expect.any(Error)
    );
    expect(screen.queryByText('继续')).toBeNull();
    expect(screen.getByText('暂停')).toBeTruthy();
    expect(screen.getByTestId('mock-waveform-recording')).toBeTruthy();
  });

  it('shows branded feedback when resuming the recorder fails in the active session', async () => {
    (VoiceService.resumeRecording as jest.Mock).mockRejectedValueOnce(new Error('resume failed'));

    const screen = render(
      <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(screen.getByText('开始录音'));

    await waitFor(() => {
      expect(screen.getByText('暂停')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('暂停'));

    await waitFor(() => {
      expect(screen.getByText('继续')).toBeTruthy();
      expect(screen.getByTestId('mock-waveform-paused')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('继续'));

    await waitFor(() => {
      expect(showErrorFeedback).toHaveBeenCalledWith({
        title: '继续失败',
        message: '继续录音失败，请重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    });

    expect(screen.getByText('继续')).toBeTruthy();
    expect(screen.queryByText('暂停')).toBeNull();
    expect(screen.getByTestId('mock-waveform-paused')).toBeTruthy();
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
      expect(showErrorFeedback).toHaveBeenCalledWith({
        title: '录音失败',
        message: '无法启动录音，请检查麦克风权限',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    });
    expect(screen.getByTestId('voice-recorder-idle')).toBeTruthy();
  });
});
