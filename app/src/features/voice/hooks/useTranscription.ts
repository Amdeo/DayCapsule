import {useState, useCallback} from 'react';
import {asrService, TranscriptionResult} from '@services/ai/asrService';
import {performanceMonitor} from '@services/telemetry/performance';
import {logger} from '@services/telemetry/logger';

export interface UseTranscriptionReturn {
  transcript: string;
  confidence: number;
  isTranscribing: boolean;
  error: string | null;
  progress: number;
  transcribe: (audioPath: string, language?: string) => Promise<void>;
  transcribeBatch: (audioPaths: string[]) => Promise<void>;
  clear: () => void;
}

export const useTranscription = (): UseTranscriptionReturn => {
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const transcribe = useCallback(
    async (audioPath: string, language: string = 'zh-CN') => {
      try {
        setIsTranscribing(true);
        setError(null);
        setProgress(0);
        setTranscript('');
        setConfidence(0);

        performanceMonitor.startMeasure(`transcribe_${audioPath}`);

        const result = await asrService.transcribe(audioPath, language, {
          enablePunctuation: true,
          convertNumbers: true,
          onProgress: (current, total) => {
            setProgress((current / total) * 100);
          },
        });

        performanceMonitor.endMeasure(`transcribe_${audioPath}`);

        if (result) {
          setTranscript(result.text);
          setConfidence(result.confidence);
          logger.info('Transcription completed', {
            audioPath,
            textLength: result.text.length,
            confidence: result.confidence,
          });
        } else {
          setError('转写失败，请重试');
          logger.error('Transcription failed', {audioPath});
        }
      } catch (err) {
        setError('转写过程出错');
        logger.error('Transcription error', {audioPath, error: err});
      } finally {
        setIsTranscribing(false);
        setProgress(0);
      }
    },
    [],
  );

  const transcribeBatch = useCallback(
    async (audioPaths: string[]) => {
      try {
        setIsTranscribing(true);
        setError(null);
        setProgress(0);
        setTranscript('');
        setConfidence(0);

        performanceMonitor.startMeasure('transcribe_batch');

        const results = await asrService.transcribeBatch(audioPaths, {
          onProgress: (current, total) => {
            setProgress((current / total) * 100);
          },
        });

        performanceMonitor.endMeasure('transcribe_batch');

        // 合并所有转写结果
        const allText = results
          .filter((r): r is TranscriptionResult => r !== null)
          .map(r => r.text)
          .join('\n\n');

        const avgConfidence =
          results.filter((r): r is TranscriptionResult => r !== null).length > 0
            ? results
                .filter((r): r is TranscriptionResult => r !== null)
                .reduce((sum, r) => sum + r.confidence, 0) /
              results.filter((r): r is TranscriptionResult => r !== null).length
            : 0;

        setTranscript(allText);
        setConfidence(avgConfidence);

        logger.info('Batch transcription completed', {
          count: audioPaths.length,
          successCount: results.filter(r => r !== null).length,
        });
      } catch (err) {
        setError('批量转写失败');
        logger.error('Batch transcription error', {error: err});
      } finally {
        setIsTranscribing(false);
        setProgress(0);
      }
    },
    [],
  );

  const clear = useCallback(() => {
    setTranscript('');
    setConfidence(0);
    setIsTranscribing(false);
    setError(null);
    setProgress(0);
  }, []);

  return {
    transcript,
    confidence,
    isTranscribing,
    error,
    progress,
    transcribe,
    transcribeBatch,
    clear,
  };
};

