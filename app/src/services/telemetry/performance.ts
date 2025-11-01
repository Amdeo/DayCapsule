/**
 * 性能监控工具
 * 记录 p95 响应时间和性能指标
 */

import {logger} from './logger';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private timers: Map<string, number> = new Map();
  private maxMetricsPerName = 1000;

  /**
   * 开始计时
   */
  start(name: string): string {
    const timerId = `${name}_${Date.now()}_${Math.random()}`;
    this.timers.set(timerId, performance.now());
    return timerId;
  }

  /**
   * 结束计时并记录
   */
  end(timerId: string, metadata?: Record<string, any>): number {
    const startTime = this.timers.get(timerId);
    if (!startTime) {
      logger.warn('Performance timer not found', {timerId});
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(timerId);

    // 从 timerId 中提取 name
    const name = timerId.split('_')[0];
    this.record(name, duration, metadata);

    return duration;
  }

  /**
   * 记录性能指标
   */
  record(name: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push(metric);

    // 限制每个指标的记录数量
    if (metrics.length > this.maxMetricsPerName) {
      metrics.shift();
    }

    // 在开发环境输出慢操作警告
    if (__DEV__ && duration > 1000) {
      logger.warn(`Slow operation detected: ${name}`, {duration: `${duration.toFixed(2)}ms`});
    }
  }

  /**
   * 测量异步函数执行时间
   */
  async measure<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const timerId = this.start(name);
    try {
      const result = await fn();
      this.end(timerId, metadata);
      return result;
    } catch (error) {
      this.end(timerId, {...metadata, error: true});
      throw error;
    }
  }

  /**
   * 测量同步函数执行时间
   */
  measureSync<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    const timerId = this.start(name);
    try {
      const result = fn();
      this.end(timerId, metadata);
      return result;
    } catch (error) {
      this.end(timerId, {...metadata, error: true});
      throw error;
    }
  }

  /**
   * 获取性能统计
   */
  getStats(name: string): PerformanceStats | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const count = durations.length;

    return {
      count,
      min: durations[0],
      max: durations[count - 1],
      avg: durations.reduce((sum, d) => sum + d, 0) / count,
      p50: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
    };
  }

  /**
   * 计算百分位数
   */
  private percentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * 获取所有指标名称
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * 获取指标详情
   */
  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.get(name) || [];
  }

  /**
   * 清除指标
   */
  clearMetrics(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const report: any = {};

    this.getMetricNames().forEach(name => {
      const stats = this.getStats(name);
      if (stats) {
        report[name] = {
          count: stats.count,
          min: `${stats.min.toFixed(2)}ms`,
          max: `${stats.max.toFixed(2)}ms`,
          avg: `${stats.avg.toFixed(2)}ms`,
          p50: `${stats.p50.toFixed(2)}ms`,
          p95: `${stats.p95.toFixed(2)}ms`,
          p99: `${stats.p99.toFixed(2)}ms`,
        };
      }
    });

    return JSON.stringify(report, null, 2);
  }

  /**
   * 记录应用启动时间
   */
  recordAppStart(duration: number): void {
    this.record('app_start', duration, {type: 'cold_start'});
    logger.info('App started', {duration: `${duration.toFixed(2)}ms`});
  }

  /**
   * 记录屏幕渲染时间
   */
  recordScreenRender(screenName: string, duration: number): void {
    this.record('screen_render', duration, {screen: screenName});
  }

  /**
   * 记录 API 请求时间
   */
  recordApiCall(endpoint: string, duration: number, success: boolean): void {
    this.record('api_call', duration, {endpoint, success});
  }

  /**
   * 记录数据库操作时间
   */
  recordDbOperation(operation: string, duration: number): void {
    this.record('db_operation', duration, {operation});
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * 装饰器：测量方法执行时间
 */
export function measurePerformance(metricName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measure(name, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}
