/**
 * 转录 Hook
 *
 * 管理语音转文字的状态和进度
 */

import {useState, useCallback} from 'react';
import {speechToTextService} from '@services/speechToText';
import {logger} from '@services/telemetry/logger';
import type {TranscriptionResult} from '@services/speechToText';

interface UseTranscriptionState {
  isTranscribing: boolean;
  progress: number;
  result: TranscriptionResult | null;
  error: Error | null;
  status: 'idle' | 'transcribing' | 'completed' | 'error';
}

interface UseTranscriptionReturn extends UseTranscriptionState {
  transcribe: (audioPath: string) => Promise<TranscriptionResult | null>;
  cancel: () => void;
  reset: () => void;
}

export const useTranscription = (): UseTranscriptionReturn => {
  const [state, setState] = useState<UseTranscriptionState>({
    isTranscribing: false,
    progress: 0,
    result: null,
    error: null,
    status: 'idle',
  });

  const [abortController, setAbortController] = useState<AbortController | null>(null);

  /**
   * 转录音频文件
   */
  const transcribe = useCallback(async (audioPath: string): Promise<TranscriptionResult | null> => {
    try {
      // 检查服务是否已初始化
      if (!speechToTextService.isReady()) {
        throw new Error('Speech-to-text service is not initialized');
      }

      setState(prev => ({
        ...prev,
        isTranscribing: true,
        progress: 0,
        error: null,
        status: 'transcribing',
      }));

      // 创建 AbortController 用于取消操作
      const controller = new AbortController();
      setAbortController(controller);

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 0.1, 0.9),
        }));
      }, 500);

      try {
        // 调用转录服务
        const result = await speechToTextService.transcribe(audioPath);

        clearInterval(progressInterval);

        setState(prev => ({
          ...prev,
          isTranscribing: false,
          progress: 1,
          result,
          status: 'completed',
        }));

        logger.info('Transcription completed', {
          audioPath,
          textLength: result.text.length,
          confidence: result.confidence,
        });

        return result;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      setState(prev => ({
        ...prev,
        isTranscribing: false,
        error: err,
        status: 'error',
      }));

      logger.error('Transcription failed', {
        audioPath,
        error: err.message,
      });

      return null;
    } finally {
      setAbortController(null);
    }
  }, []);

  /**
   * 取消转录
   */
  const cancel = useCallback(() => {
    if (abortController) {
      abortController.abort();
    }

    setState(prev => ({
      ...prev,
      isTranscribing: false,
      status: 'idle',
    }));

    logger.info('Transcription cancelled');
  }, [abortController]);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setState({
      isTranscribing: false,
      progress: 0,
      result: null,
      error: null,
      status: 'idle',
    });
  }, []);

  return {
    ...state,
    transcribe,
    cancel,
    reset,
  };
};
