import {useEffect, useRef, useCallback} from 'react';
import {performanceMonitor} from '@services/telemetry/performance';
import {logger} from '@services/telemetry/logger';

export interface SearchPerformanceMetrics {
  queryTime: number;
  renderTime: number;
  totalTime: number;
  resultCount: number;
  isFirstScreenFast: boolean;
}

export interface UseSearchPerformanceReturn {
  metrics: SearchPerformanceMetrics | null;
  startSearch: () => void;
  endSearch: (resultCount: number) => void;
  startRender: () => void;
  endRender: () => void;
  getMetrics: () => SearchPerformanceMetrics | null;
  logMetrics: () => void;
}

export const useSearchPerformance = (): UseSearchPerformanceReturn => {
  const metricsRef = useRef<Partial<SearchPerformanceMetrics>>({});
  const startTimeRef = useRef<number>(0);

  const startSearch = useCallback(() => {
    startTimeRef.current = Date.now();
    performanceMonitor.startMeasure('search_query');
    logger.info('Search started');
  }, []);

  const endSearch = useCallback((resultCount: number) => {
    performanceMonitor.endMeasure('search_query');
    const duration = performanceMonitor.getMeasure('search_query');
    metricsRef.current.queryTime = duration;
    metricsRef.current.resultCount = resultCount;

    logger.info('Search query completed', {duration, resultCount});
  }, []);

  const startRender = useCallback(() => {
    performanceMonitor.startMeasure('search_render');
  }, []);

  const endRender = useCallback(() => {
    performanceMonitor.endMeasure('search_render');
    const duration = performanceMonitor.getMeasure('search_render');
    metricsRef.current.renderTime = duration;

    logger.info('Search render completed', {duration});
  }, []);

  const getMetrics = useCallback((): SearchPerformanceMetrics | null => {
    if (!metricsRef.current.queryTime) {
      return null;
    }

    const queryTime = metricsRef.current.queryTime || 0;
    const renderTime = metricsRef.current.renderTime || 0;
    const totalTime = queryTime + renderTime;
    const resultCount = metricsRef.current.resultCount || 0;

    const metrics: SearchPerformanceMetrics = {
      queryTime,
      renderTime,
      totalTime,
      resultCount,
      isFirstScreenFast: totalTime < 2000, // <2 秒
    };

    return metrics;
  }, []);

  const logMetrics = useCallback(() => {
    const metrics = getMetrics();
    if (!metrics) {
      logger.warn('No search metrics available');
      return;
    }

    // 验证性能指标
    const isQueryFast = metrics.queryTime < 1000; // <1 秒
    const isRenderFast = metrics.renderTime < 500; // <500ms
    const isFirstScreenFast = metrics.isFirstScreenFast;

    logger.info('Search performance metrics', {
      queryTime: `${metrics.queryTime}ms`,
      renderTime: `${metrics.renderTime}ms`,
      totalTime: `${metrics.totalTime}ms`,
      resultCount: metrics.resultCount,
      isQueryFast,
      isRenderFast,
      isFirstScreenFast,
    });

    // 记录性能警告
    if (!isQueryFast) {
      logger.warn('Search query time exceeded 1 second', {
        duration: metrics.queryTime,
      });
    }

    if (!isRenderFast) {
      logger.warn('Search render time exceeded 500ms', {
        duration: metrics.renderTime,
      });
    }

    if (!isFirstScreenFast) {
      logger.warn('Search first screen time exceeded 2 seconds', {
        duration: metrics.totalTime,
      });
    }

    // 发送到性能监控系统
    performanceMonitor.recordMetric('search_query_time', metrics.queryTime);
    performanceMonitor.recordMetric('search_render_time', metrics.renderTime);
    performanceMonitor.recordMetric('search_total_time', metrics.totalTime);
    performanceMonitor.recordMetric('search_result_count', metrics.resultCount);
  }, [getMetrics]);

  // 清理
  useEffect(() => {
    return () => {
      metricsRef.current = {};
    };
  }, []);

  return {
    metrics: getMetrics(),
    startSearch,
    endSearch,
    startRender,
    endRender,
    getMetrics,
    logMetrics,
  };
};

