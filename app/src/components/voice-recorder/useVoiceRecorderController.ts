import { useCallback, useEffect, useRef, useState } from 'react';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { VoiceService } from '@/src/services/voiceService';
import { logger } from '@/src/utils/logger';

interface UseVoiceRecorderControllerOptions {
  visible: boolean;
  onSave: (uri: string, duration: number) => void;
  onCancel: () => void;
}

export function useVoiceRecorderController({
  visible,
  onSave,
  onCancel,
}: UseVoiceRecorderControllerOptions) {
  const cancelledSessionIdRef = useRef<number | null>(null);
  const activeSessionIdRef = useRef(0);
  const pendingStartSessionIdRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isCurrentSession = useCallback(
    (sessionId: number) => activeSessionIdRef.current === sessionId,
    [],
  );

  const resetRecorderState = useCallback(() => {
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setRecordingUri(null);
    setIsLoading(false);
  }, []);

  const showRecorderError = useCallback((title: string, message: string) => {
    showErrorFeedback({
      title,
      message,
      actions: [{ label: '知道了', role: 'primary' }],
    });
  }, []);

  useEffect(() => {
    if (!isRecording || isPaused) {
      return;
    }

    const timer = setInterval(() => {
      setDuration((value) => value + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, isRecording]);

  useEffect(() => {
    if (visible) {
      return;
    }

    const closingSessionId = activeSessionIdRef.current;
    const pendingStartSessionId = pendingStartSessionIdRef.current;
    activeSessionIdRef.current += 1;

    void (async () => {
      try {
        if (pendingStartSessionId === closingSessionId) {
          pendingStartSessionIdRef.current = null;
          cancelledSessionIdRef.current = closingSessionId;
          await VoiceService.cancelRecording();
        } else if (
          isRecording &&
          cancelledSessionIdRef.current !== closingSessionId &&
          cancelledSessionIdRef.current !== closingSessionId - 1
        ) {
          cancelledSessionIdRef.current = closingSessionId;
          await VoiceService.cancelRecording();
        }
      } catch (error) {
        logger.error('Failed to cancel recording on modal close:', error);
      } finally {
        if (!isCurrentSession(closingSessionId + 1)) {
          return;
        }

        resetRecorderState();
      }
    })();
  }, [isCurrentSession, isRecording, resetRecorderState, visible]);

  const handleStart = useCallback(async () => {
    const startSessionId = activeSessionIdRef.current;
    let activeStartSessionId = startSessionId;

    try {
      setIsLoading(true);
      pendingStartSessionIdRef.current = startSessionId;
      await VoiceService.startRecording();

      pendingStartSessionIdRef.current = null;

      if (!isCurrentSession(startSessionId)) {
        if (cancelledSessionIdRef.current !== startSessionId) {
          cancelledSessionIdRef.current = startSessionId;
          await VoiceService.cancelRecording();
        }
        return;
      }

      activeSessionIdRef.current += 1;
      activeStartSessionId = activeSessionIdRef.current;
      setIsRecording(true);
      setDuration(0);
      setIsPaused(false);
    } catch (error) {
      if (pendingStartSessionIdRef.current === startSessionId) {
        pendingStartSessionIdRef.current = null;
      }

      if (!isCurrentSession(startSessionId)) {
        return;
      }

      logger.error('Failed to start recording:', error);
      showRecorderError('录音失败', '无法启动录音，请检查麦克风权限');
    } finally {
      if (!isCurrentSession(activeStartSessionId)) {
        return;
      }

      setIsLoading(false);
    }
  }, [isCurrentSession, showRecorderError]);

  const handlePause = useCallback(async () => {
    const pauseSessionId = activeSessionIdRef.current;

    try {
      await VoiceService.pauseRecording();

      if (!isCurrentSession(pauseSessionId)) {
        return;
      }

      setIsPaused(true);
    } catch (error) {
      if (!isCurrentSession(pauseSessionId)) {
        return;
      }

      logger.error('Failed to pause recording:', error);
      showRecorderError('暂停失败', '暂停录音失败，请重试');
    }
  }, [isCurrentSession, showRecorderError]);

  const handleResume = useCallback(async () => {
    const resumeSessionId = activeSessionIdRef.current;

    try {
      await VoiceService.resumeRecording();

      if (!isCurrentSession(resumeSessionId)) {
        return;
      }

      setIsPaused(false);
    } catch (error) {
      if (!isCurrentSession(resumeSessionId)) {
        return;
      }

      logger.error('Failed to resume recording:', error);
      showRecorderError('继续失败', '继续录音失败，请重试');
    }
  }, [isCurrentSession, showRecorderError]);

  const handleStop = useCallback(async () => {
    const stopSessionId = activeSessionIdRef.current;

    try {
      setIsLoading(true);
      const audioFile = await VoiceService.stopRecording();

      if (!isCurrentSession(stopSessionId)) {
        return;
      }

      setRecordingUri(audioFile.uri);
      setIsRecording(false);
      setIsPaused(false);
    } catch (error) {
      if (!isCurrentSession(stopSessionId)) {
        return;
      }

      logger.error('Failed to stop recording:', error);
      showRecorderError('保存失败', '保存录音失败，请重试');
    } finally {
      if (!isCurrentSession(stopSessionId)) {
        return;
      }

      setIsLoading(false);
    }
  }, [isCurrentSession, showRecorderError]);

  const handleCancel = useCallback(async () => {
    try {
      const currentSessionId = activeSessionIdRef.current;
      activeSessionIdRef.current += 1;

      if (pendingStartSessionIdRef.current === currentSessionId) {
        pendingStartSessionIdRef.current = null;
        cancelledSessionIdRef.current = currentSessionId;
        await VoiceService.cancelRecording();
      } else if (isRecording && cancelledSessionIdRef.current !== currentSessionId) {
        cancelledSessionIdRef.current = currentSessionId;
        await VoiceService.cancelRecording();
      }

      if (activeSessionIdRef.current !== currentSessionId + 1) {
        return;
      }
    } catch (error) {
      logger.error('Failed to cancel recording:', error);
      showRecorderError('取消失败', '取消录音失败，请重试');
    }

    onCancel();
  }, [isRecording, onCancel, showRecorderError]);

  const handleSave = useCallback(() => {
    if (!recordingUri) {
      return;
    }
    onSave(recordingUri, duration);
  }, [duration, onSave, recordingUri]);

  const handleRetry = useCallback(() => {
    setRecordingUri(null);
    setDuration(0);
  }, []);

  return {
    isRecording,
    duration,
    isPaused,
    recordingUri,
    isLoading,
    handleStart,
    handlePause,
    handleResume,
    handleStop,
    handleCancel,
    handleSave,
    handleRetry,
  };
}
