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
        if (activeSessionIdRef.current !== closingSessionId + 1) {
          return;
        }

        setIsRecording(false);
        setIsPaused(false);
        setDuration(0);
        setRecordingUri(null);
        setIsLoading(false);
      }
    })();
  }, [isRecording, visible]);

  const handleStart = useCallback(async () => {
    const startSessionId = activeSessionIdRef.current;
    let activeStartSessionId = startSessionId;

    try {
      setIsLoading(true);
      pendingStartSessionIdRef.current = startSessionId;
      await VoiceService.startRecording();

      pendingStartSessionIdRef.current = null;

      if (activeSessionIdRef.current !== startSessionId) {
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

      if (activeSessionIdRef.current !== startSessionId) {
        return;
      }

      logger.error('Failed to start recording:', error);
      showErrorFeedback({
        title: '录音失败',
        message: '无法启动录音，请检查麦克风权限',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    } finally {
      if (activeSessionIdRef.current !== activeStartSessionId) {
        return;
      }

      setIsLoading(false);
    }
  }, []);

  const handlePause = useCallback(async () => {
    const pauseSessionId = activeSessionIdRef.current;

    try {
      await VoiceService.pauseRecording();

      if (activeSessionIdRef.current !== pauseSessionId) {
        return;
      }

      setIsPaused(true);
    } catch (error) {
      if (activeSessionIdRef.current !== pauseSessionId) {
        return;
      }

      logger.error('Failed to pause recording:', error);
      showErrorFeedback({
        title: '暂停失败',
        message: '暂停录音失败，请重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    }
  }, []);

  const handleResume = useCallback(async () => {
    const resumeSessionId = activeSessionIdRef.current;

    try {
      await VoiceService.resumeRecording();

      if (activeSessionIdRef.current !== resumeSessionId) {
        return;
      }

      setIsPaused(false);
    } catch (error) {
      if (activeSessionIdRef.current !== resumeSessionId) {
        return;
      }

      logger.error('Failed to resume recording:', error);
      showErrorFeedback({
        title: '继续失败',
        message: '继续录音失败，请重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    }
  }, []);

  const handleStop = useCallback(async () => {
    const stopSessionId = activeSessionIdRef.current;

    try {
      setIsLoading(true);
      const audioFile = await VoiceService.stopRecording();

      if (activeSessionIdRef.current !== stopSessionId) {
        return;
      }

      setRecordingUri(audioFile.uri);
      setIsRecording(false);
      setIsPaused(false);
    } catch (error) {
      if (activeSessionIdRef.current !== stopSessionId) {
        return;
      }

      logger.error('Failed to stop recording:', error);
      showErrorFeedback({
        title: '保存失败',
        message: '保存录音失败，请重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    } finally {
      if (activeSessionIdRef.current !== stopSessionId) {
        return;
      }

      setIsLoading(false);
    }
  }, []);

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
      showErrorFeedback({
        title: '取消失败',
        message: '取消录音失败，请重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    }

    onCancel();
  }, [isRecording, onCancel]);

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
