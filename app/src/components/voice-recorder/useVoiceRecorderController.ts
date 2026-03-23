import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
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
    if (!visible) {
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      setRecordingUri(null);
      setIsLoading(false);
    }
  }, [visible]);

  const handleStart = useCallback(async () => {
    try {
      setIsLoading(true);
      await VoiceService.startRecording();
      setIsRecording(true);
      setDuration(0);
      setIsPaused(false);
    } catch (error) {
      logger.error('Failed to start recording:', error);
      Alert.alert('录音失败', '无法启动录音，请检查麦克风权限');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePause = useCallback(async () => {
    try {
      await VoiceService.pauseRecording();
      setIsPaused(true);
    } catch (error) {
      logger.error('Failed to pause recording:', error);
    }
  }, []);

  const handleResume = useCallback(async () => {
    try {
      await VoiceService.resumeRecording();
      setIsPaused(false);
    } catch (error) {
      logger.error('Failed to resume recording:', error);
    }
  }, []);

  const handleStop = useCallback(async () => {
    try {
      setIsLoading(true);
      const audioFile = await VoiceService.stopRecording();
      setRecordingUri(audioFile.uri);
      setIsRecording(false);
      setIsPaused(false);
    } catch (error) {
      logger.error('Failed to stop recording:', error);
      Alert.alert('保存失败', '保存录音失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCancel = useCallback(async () => {
    try {
      if (isRecording) {
        await VoiceService.cancelRecording();
      }
    } catch (error) {
      logger.error('Failed to cancel recording:', error);
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
