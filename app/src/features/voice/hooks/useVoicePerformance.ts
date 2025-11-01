import {useEffect, useRef, useCallback} from 'react';
import {performanceMonitor} from '@services/telemetry/performance';
import {logger} from '@services/telemetry/logger';

export interface VoicePerformanceMetrics {
  recordingStartTime: number;
  recordingEndTime: number;
  recordingDuration: number;
  transcriptionStartTime: number;
  transcriptionEndTime: number;
  transcriptionDuration: number;
  transcriptionLatencyRatio: number; // 转写时延 / 录音时长
  totalDuration: number;
}

export interface UseVoicePerformanceReturn {
  metrics: VoicePerformanceMetrics | null;
  startRecordingMetrics: () => void;
  endRecordingMetrics: () => void;
  startTranscriptionMetrics: () => void;
  endTranscriptionMetrics: () => void;
  getMetrics: () => VoicePerformanceMetrics | null;
  logMetrics: () => void;
}

export const useVoicePerformance = (): UseVoicePerformanceReturn => {
  const metricsRef = useRef<Partial<VoicePerformanceMetrics>>({});

  const startRecordingMetrics = useCallback(() => {
    metricsRef.current.recordingStartTime = Date.now();
    performanceMonitor.startMeasure('voice_recording');
    logger.info('Voice recording metrics started');
  }, []);

  const endRecordingMetrics = useCallback(() => {
    metricsRef.current.recordingEndTime = Date.now();
    performanceMonitor.endMeasure('voice_recording');

    if (
      metricsRef.current.recordingStartTime &&
      metricsRef.current.recordingEndTime
    ) {
      metricsRef.current.recordingDuration =
        metricsRef.current.recordingEndTime - metricsRef.current.recordingStartTime;
      logger.info('Voice recording completed', {
        duration: metricsRef.current.recordingDuration,
      });
    }
  }, []);

  const startTranscriptionMetrics = useCallback(() => {
    metricsRef.current.transcriptionStartTime = Date.now();
    performanceMonitor.startMeasure('voice_transcription');
    logger.info('Voice transcription metrics started');
  }, []);

  const endTranscriptionMetrics = useCallback(() => {
    metricsRef.current.transcriptionEndTime = Date.now();
    performanceMonitor.endMeasure('voice_transcription');

    if (
      metricsRef.current.transcriptionStartTime &&
      metricsRef.current.transcriptionEndTime
    ) {
      metricsRef.current.transcriptionDuration =
        metricsRef.current.transcriptionEndTime -
        metricsRef.current.transcriptionStartTime;

      // 计算转写时延比率
      if (metricsRef.current.recordingDuration) {
        metricsRef.current.transcriptionLatencyRatio =
          metricsRef.current.transcriptionDuration /
          metricsRef.current.recordingDuration;
      }

      logger.info('Voice transcription completed', {
        duration: metricsRef.current.transcriptionDuration,
        latencyRatio: metricsRef.current.transcriptionLatencyRatio,
      });
    }
  }, []);

  const getMetrics = useCallback((): VoicePerformanceMetrics | null => {
    if (
      !metricsRef.current.recordingStartTime ||
      !metricsRef.current.recordingEndTime ||
      !metricsRef.current.transcriptionStartTime ||
      !metricsRef.current.transcriptionEndTime
    ) {
      return null;
    }

    const metrics: VoicePerformanceMetrics = {
      recordingStartTime: metricsRef.current.recordingStartTime,
      recordingEndTime: metricsRef.current.recordingEndTime,
      recordingDuration: metricsRef.current.recordingDuration || 0,
      transcriptionStartTime: metricsRef.current.transcriptionStartTime,
      transcriptionEndTime: metricsRef.current.transcriptionEndTime,
      transcriptionDuration: metricsRef.current.transcriptionDuration || 0,
      transcriptionLatencyRatio: metricsRef.current.transcriptionLatencyRatio || 0,
      totalDuration:
        (metricsRef.current.transcriptionEndTime || 0) -
        (metricsRef.current.recordingStartTime || 0),
    };

    return metrics;
  }, []);

  const logMetrics = useCallback(() => {
    const metrics = getMetrics();
    if (!metrics) {
      logger.warn('No metrics available');
      return;
    }

    // 验证性能指标
    const isRecordingResponseFast = metrics.recordingDuration < 1000; // <1 秒
    const isTranscriptionFast = metrics.transcriptionDuration < 10000; // <10 秒
    const isLatencyRatioGood = metrics.transcriptionLatencyRatio <= 0.2; // ≤20%

    logger.info('Voice performance metrics', {
      recordingDuration: `${metrics.recordingDuration}ms`,
      transcriptionDuration: `${metrics.transcriptionDuration}ms`,
      transcriptionLatencyRatio: `${(metrics.transcriptionLatencyRatio * 100).toFixed(1)}%`,
      totalDuration: `${metrics.totalDuration}ms`,
      isRecordingResponseFast,
      isTranscriptionFast,
      isLatencyRatioGood,
    });

    // 记录性能警告
    if (!isRecordingResponseFast) {
      logger.warn('Recording response time exceeded 1 second', {
        duration: metrics.recordingDuration,
      });
    }

    if (!isTranscriptionFast) {
      logger.warn('Transcription time exceeded 10 seconds', {
        duration: metrics.transcriptionDuration,
      });
    }

    if (!isLatencyRatioGood) {
      logger.warn('Transcription latency ratio exceeded 20%', {
        ratio: metrics.transcriptionLatencyRatio,
      });
    }

    // 发送到性能监控系统
    performanceMonitor.recordMetric('voice_recording_duration', metrics.recordingDuration);
    performanceMonitor.recordMetric(
      'voice_transcription_duration',
      metrics.transcriptionDuration,
    );
    performanceMonitor.recordMetric(
      'voice_transcription_latency_ratio',
      metrics.transcriptionLatencyRatio,
    );
  }, [getMetrics]);

  // 清理
  useEffect(() => {
    return () => {
      metricsRef.current = {};
    };
  }, []);

  return {
    metrics: getMetrics(),
    startRecordingMetrics,
    endRecordingMetrics,
    startTranscriptionMetrics,
    endTranscriptionMetrics,
    getMetrics,
    logMetrics,
  };
};

