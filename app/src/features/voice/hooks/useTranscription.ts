import { useState, useEffect, useCallback } from 'react';
import { asrService, TranscriptionResult } from '../../../services/ai/asrService';
import { performanceMonitor } from '../../../services/telemetry/performance'; // Import performanceMonitor

interface UseTranscriptionOptions {
  autoTranscribe?: boolean;
  language?: string;
  onTranscriptionComplete?: (result: TranscriptionResult) => void;
  onTranscriptionError?: (error: string) => void;
}

export const useTranscription = (audioPath: string | null, options?: UseTranscriptionOptions) => {
  const { autoTranscribe = true, language = 'zh-CN', onTranscriptionComplete, onTranscriptionError } = options || {};
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const transcribeAudio = useCallback(async (path: string, recordingDurationMs?: number) => {
    if (!path) {
      setError("Audio path is empty.");
      onTranscriptionError?.("Audio path is empty.");
      return;
    }

    setTranscribing(true);
    setTranscriptionResult(null);
    setError(null);

    const measureName = `transcription_delay_${path}`;
    performanceMonitor.startMeasure(measureName); // Start measuring transcription delay

    try {
      await asrService.initialize();

      const result = await asrService.transcribe(path, language);
      if (result) {
        setTranscriptionResult(result);
        onTranscriptionComplete?.(result);

        performanceMonitor.endMeasure(measureName); // End measuring
        const transcriptionDelay = performanceMonitor.getMeasure(measureName)?.duration || 0;

        if (recordingDurationMs) {
          const ratio = transcriptionDelay / recordingDurationMs;
          performanceMonitor.addMetric('transcription_delay_ratio', ratio, {
            audioPath: path,
            recordingDurationMs,
            transcriptionDelay,
          });
          console.log(`Transcription Delay Ratio: ${ratio.toFixed(2)} (Target: <0.2)`);
        }
      } else {
        setError("Transcription failed: No result returned.");
        onTranscriptionError?.("Transcription failed: No result returned.");
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unknown error occurred during transcription.";
      setError(errorMessage);
      onTranscriptionError?.(errorMessage);
      console.error("Transcription error:", e);
      performanceMonitor.endMeasure(measureName, { failed: true, error: errorMessage });
    } finally {
      setTranscribing(false);
    }
  }, [language, onTranscriptionComplete, onTranscriptionError]);

  useEffect(() => {
    if (autoTranscribe && audioPath && !transcribing && !transcriptionResult) {
      // In a real scenario, you'd pass recordingDurationMs from where audioPath is set.
      // For now, it's not directly available here unless passed as option.
      transcribeAudio(audioPath); 
    }
  }, [autoTranscribe, audioPath, transcribing, transcriptionResult, transcribeAudio]);

  const clearTranscription = useCallback(() => {
    setTranscribing(false);
    setTranscriptionResult(null);
    setError(null);
  }, []);

  return { transcribing, transcriptionResult, error, transcribeAudio, clearTranscription };
};
