import {logger} from '@services/telemetry/logger';

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // 毫秒
  maxDelay: number; // 毫秒
  backoffMultiplier: number;
  jitterFactor: number; // 0-1
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  retryCount: number;
  totalDuration: number;
}

/**
 * 重试策略服务
 * 实现指数退避和抖动的重试机制
 */
export class RetryStrategyService {
  private config: RetryConfig = {
    maxRetries: 5,
    initialDelay: 1000, // 1 秒
    maxDelay: 60000, // 60 秒
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  };

  constructor(config?: Partial<RetryConfig>) {
    if (config) {
      this.config = {...this.config, ...config};
    }
    logger.info('Retry strategy initialized', {config: this.config});
  }

  /**
   * 执行带重试的操作
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation',
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let lastError: Error | undefined;
    let retryCount = 0;

    for (retryCount = 0; retryCount <= this.config.maxRetries; retryCount++) {
      try {
        logger.info(`Executing ${operationName}`, {attempt: retryCount + 1});
        const data = await operation();

        const duration = Date.now() - startTime;
        logger.info(`${operationName} succeeded`, {
          retryCount,
          duration,
        });

        return {
          success: true,
          data,
          retryCount,
          totalDuration: duration,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (retryCount < this.config.maxRetries) {
          const delay = this.calculateDelay(retryCount);
          logger.warn(`${operationName} failed, retrying in ${delay}ms`, {
            attempt: retryCount + 1,
            error: lastError.message,
          });

          await this.delay(delay);
        } else {
          logger.error(`${operationName} failed after max retries`, {
            maxRetries: this.config.maxRetries,
            error: lastError.message,
          });
        }
      }
    }

    const duration = Date.now() - startTime;
    return {
      success: false,
      error: lastError,
      retryCount,
      totalDuration: duration,
    };
  }

  /**
   * 计算延迟时间（指数退避 + 抖动）
   */
  private calculateDelay(retryCount: number): number {
    // 指数退避
    const exponentialDelay = this.config.initialDelay *
      Math.pow(this.config.backoffMultiplier, retryCount);

    // 限制最大延迟
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);

    // 添加抖动
    const jitter = cappedDelay * this.config.jitterFactor * Math.random();
    const finalDelay = cappedDelay + jitter;

    return Math.round(finalDelay);
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 批量执行带重试的操作
   */
  async executeBatchWithRetry<T>(
    operations: Array<{
      name: string;
      operation: () => Promise<T>;
    }>,
    concurrency: number = 3,
  ): Promise<Array<RetryResult<T>>> {
    const results: Array<RetryResult<T>> = [];
    const queue = [...operations];

    logger.info('Starting batch operations with retry', {
      totalCount: operations.length,
      concurrency,
    });

    while (queue.length > 0) {
      const batch = queue.splice(0, concurrency);
      const batchResults = await Promise.all(
        batch.map(({name, operation}) =>
          this.executeWithRetry(operation, name),
        ),
      );
      results.push(...batchResults);
    }

    const successCount = results.filter(r => r.success).length;
    logger.info('Batch operations completed', {
      totalCount: operations.length,
      successCount,
      failureCount: operations.length - successCount,
    });

    return results;
  }

  /**
   * 获取重试配置
   */
  getConfig(): RetryConfig {
    return {...this.config};
  }

  /**
   * 更新重试配置
   */
  setConfig(config: Partial<RetryConfig>): void {
    this.config = {...this.config, ...config};
    logger.info('Retry strategy config updated', {config: this.config});
  }

  /**
   * 计算预期的最大总时间
   */
  getExpectedMaxDuration(): number {
    let totalDelay = 0;
    for (let i = 0; i < this.config.maxRetries; i++) {
      totalDelay += this.calculateDelay(i);
    }
    return totalDelay;
  }

  /**
   * 获取重试统计
   */
  getRetryStats(result: RetryResult<any>): {
    isSuccess: boolean;
    retryCount: number;
    averageRetryDelay: number;
    totalDuration: number;
  } {
    return {
      isSuccess: result.success,
      retryCount: result.retryCount,
      averageRetryDelay: result.retryCount > 0
        ? result.totalDuration / result.retryCount
        : 0,
      totalDuration: result.totalDuration,
    };
  }
}

// 导出单例
export const retryStrategyService = new RetryStrategyService({
  maxRetries: 5,
  initialDelay: 1000,
  maxDelay: 60000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
});

