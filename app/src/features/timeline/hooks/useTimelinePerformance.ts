import {useEffect, useRef, useCallback} from 'react';
import {performanceMonitor} from '@services/telemetry/performance';
import {logger} from '@services/telemetry/logger';

export interface TimelinePerformanceMetrics {
  viewLoadTime: number;
  renderTime: number;
  scrollFPS: number;
  memoryUsage: number;
  totalDuration: number;
}

export interface UseTimelinePerformanceReturn {
  metrics: TimelinePerformanceMetrics | null;
  startViewLoad: () => void;
  endViewLoad: () => void;
  startRender: () => void;
  endRender: () => void;
  recordScrollFPS: (fps: number) => void;
  recordMemoryUsage: (usage: number) => void;
  getMetrics: () => TimelinePerformanceMetrics | null;
  logMetrics: () => void;
}

export const useTimelinePerformance = (): UseTimelinePerformanceReturn => {
  const metricsRef = useRef<Partial<TimelinePerformanceMetrics>>({});
  const startTimeRef = useRef<number>(0);

  const startViewLoad = useCallback(() => {
    startTimeRef.current = Date.now();
    performanceMonitor.startMeasure('timeline_view_load');
    logger.info('Timeline view load started');
  }, []);

  const endViewLoad = useCallback(() => {
    performanceMonitor.endMeasure('timeline_view_load');
    const metric = performanceMonitor.getMeasure('timeline_view_load');
    metricsRef.current.viewLoadTime = metric?.duration || 0;

    logger.info('Timeline view load completed', {duration: metric?.duration});
  }, []);

  const startRender = useCallback(() => {
    performanceMonitor.startMeasure('timeline_render');
  }, []);

  const endRender = useCallback(() => {
    performanceMonitor.endMeasure('timeline_render');
    const metric = performanceMonitor.getMeasure('timeline_render');
    metricsRef.current.renderTime = metric?.duration || 0;

    logger.info('Timeline render completed', {duration: metric?.duration});
  }, []);

  const recordScrollFPS = useCallback((fps: number) => {
    metricsRef.current.scrollFPS = fps;
    logger.info('Timeline scroll FPS recorded', {fps});
  }, []);

  const recordMemoryUsage = useCallback((usage: number) => {
    metricsRef.current.memoryUsage = usage;
    logger.info('Timeline memory usage recorded', {usage});
  }, []);

  const getMetrics = useCallback((): TimelinePerformanceMetrics | null => {
    if (!metricsRef.current.viewLoadTime) {
      return null;
    }

    const metrics: TimelinePerformanceMetrics = {
      viewLoadTime: metricsRef.current.viewLoadTime || 0,
      renderTime: metricsRef.current.renderTime || 0,
      scrollFPS: metricsRef.current.scrollFPS || 0,
      memoryUsage: metricsRef.current.memoryUsage || 0,
      totalDuration:
        (metricsRef.current.viewLoadTime || 0) + (metricsRef.current.renderTime || 0),
    };

    return metrics;
  }, []);

  const logMetrics = useCallback(() => {
    const metrics = getMetrics();
    if (!metrics) {
      logger.warn('No timeline metrics available');
      return;
    }

    // 验证性能指标
    const isViewLoadFast = metrics.viewLoadTime < 2000; // <2 秒
    const isRenderFast = metrics.renderTime < 1000; // <1 秒
    const isScrollSmooth = metrics.scrollFPS >= 50; // ≥50 FPS

    logger.info('Timeline performance metrics', {
      viewLoadTime: `${metrics.viewLoadTime}ms`,
      renderTime: `${metrics.renderTime}ms`,
      scrollFPS: `${metrics.scrollFPS}fps`,
      memoryUsage: `${metrics.memoryUsage}MB`,
      totalDuration: `${metrics.totalDuration}ms`,
      isViewLoadFast,
      isRenderFast,
      isScrollSmooth,
    });

    // 记录性能警告
    if (!isViewLoadFast) {
      logger.warn('Timeline view load time exceeded 2 seconds', {
        duration: metrics.viewLoadTime,
      });
    }

    if (!isRenderFast) {
      logger.warn('Timeline render time exceeded 1 second', {
        duration: metrics.renderTime,
      });
    }

    if (!isScrollSmooth) {
      logger.warn('Timeline scroll FPS below 50', {
        fps: metrics.scrollFPS,
      });
    }

    // 发送到性能监控系统
    performanceMonitor.recordMetric('timeline_view_load_time', metrics.viewLoadTime);
    performanceMonitor.recordMetric('timeline_render_time', metrics.renderTime);
    performanceMonitor.recordMetric('timeline_scroll_fps', metrics.scrollFPS);
    performanceMonitor.recordMetric('timeline_memory_usage', metrics.memoryUsage);
  }, [getMetrics]);

  // 清理
  useEffect(() => {
    return () => {
      metricsRef.current = {};
    };
  }, []);

  return {
    metrics: getMetrics(),
    startViewLoad,
    endViewLoad,
    startRender,
    endRender,
    recordScrollFPS,
    recordMemoryUsage,
    getMetrics,
    logMetrics,
  };
};

