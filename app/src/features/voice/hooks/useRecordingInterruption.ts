import {useEffect, useRef, useCallback} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {audioRecorder} from '@services/voice/audioRecorder';
import {audioStorage} from '@services/storage/audioStorage';
import {databaseService} from '@services/storage/database';
import {logger} from '@services/telemetry/logger';

export interface InterruptionData {
  audioPath: string;
  duration: number;
  timestamp: number;
}

export interface UseRecordingInterruptionReturn {
  isInterrupted: boolean;
  interruptionData: InterruptionData | null;
  resumeRecording: () => Promise<void>;
  discardRecording: () => Promise<void>;
  saveInterruptedRecording: () => Promise<string | null>;
}

export const useRecordingInterruption = (): UseRecordingInterruptionReturn => {
  const appState = useRef(AppState.currentState);
  const isRecordingRef = useRef(false);
  const recordingStartTimeRef = useRef(0);
  const interruptedAudioPathRef = useRef<string | null>(null);

  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus) => {
      // 检测应用从前台切换到后台
      if (
        appState.current.match(/inactive|background/) === null &&
        nextAppState.match(/inactive|background/) !== null
      ) {
        // 应用进入后台
        if (audioRecorder.isRecording()) {
          logger.info('App moved to background, recording interrupted');

          // 保存当前录音状态
          isRecordingRef.current = true;
          recordingStartTimeRef.current = Date.now();

          // 暂停录音
          await audioRecorder.pauseRecording();
        }
      }

      // 检测应用从后台切换到前台
      if (
        appState.current.match(/inactive|background/) !== null &&
        nextAppState === 'active'
      ) {
        // 应用进入前台
        if (isRecordingRef.current && audioRecorder.isPaused()) {
          logger.info('App moved to foreground, resuming recording');

          // 自动恢复录音
          await audioRecorder.resumeRecording();
        }
      }

      appState.current = nextAppState;
    },
    [],
  );

  // 监听应用状态变化
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  // 处理来电中断
  useEffect(() => {
    // 这需要原生模块支持来电检测
    // 实际实现中应该使用 react-native-call-detection 或类似库
    return () => {
      // 清理
    };
  }, []);

  const resumeRecording = useCallback(async () => {
    try {
      if (audioRecorder.isPaused()) {
        const result = await audioRecorder.resumeRecording();
        if (result) {
          logger.info('Recording resumed successfully');
        }
      }
    } catch (error) {
      logger.error('Failed to resume recording', {error});
    }
  }, []);

  const discardRecording = useCallback(async () => {
    try {
      await audioRecorder.cancelRecording();
      interruptedAudioPathRef.current = null;
      isRecordingRef.current = false;
      logger.info('Recording discarded');
    } catch (error) {
      logger.error('Failed to discard recording', {error});
    }
  }, []);

  const saveInterruptedRecording = useCallback(async (): Promise<string | null> => {
    try {
      // 停止录音
      const audioPath = await audioRecorder.stopRecording();
      if (!audioPath) {
        logger.error('Failed to stop recording');
        return null;
      }

      // 保存音频
      const savedPath = await audioStorage.saveAudio(audioPath, true);
      if (!savedPath) {
        logger.error('Failed to save audio');
        return null;
      }

      // 保存到数据库作为草稿
      const entryId = await databaseService.insertEntry({
        type: 'voice_draft',
        content: '中断的录音',
        mediaPath: savedPath,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      if (entryId) {
        logger.info('Interrupted recording saved as draft', {entryId, savedPath});
        interruptedAudioPathRef.current = savedPath;
        isRecordingRef.current = false;
        return savedPath;
      }

      return null;
    } catch (error) {
      logger.error('Failed to save interrupted recording', {error});
      return null;
    }
  }, []);

  return {
    isInterrupted: isRecordingRef.current && audioRecorder.isPaused(),
    interruptionData: interruptedAudioPathRef.current
      ? {
          audioPath: interruptedAudioPathRef.current,
          duration: audioRecorder.getRecordingDuration(),
          timestamp: recordingStartTimeRef.current,
        }
      : null,
    resumeRecording,
    discardRecording,
    saveInterruptedRecording,
  };
};

