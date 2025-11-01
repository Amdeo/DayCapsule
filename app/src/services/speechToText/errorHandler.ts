/**
 * 转录错误处理模块
 *
 * 处理语音转文字过程中的各种错误
 */

import {logger} from '@services/telemetry/logger';

export enum TranscriptionErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  INVALID_AUDIO = 'INVALID_AUDIO',
  SERVICE_ERROR = 'SERVICE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface TranscriptionErrorInfo {
  type: TranscriptionErrorType;
  message: string;
  userMessage: string;
  originalError?: Error;
  retryable: boolean;
}

class TranscriptionErrorHandler {
  /**
   * 处理错误并返回用户友好的错误信息
   */
  handleError(error: unknown): TranscriptionErrorInfo {
    if (error instanceof Error) {
      return this.parseError(error);
    }

    return {
      type: TranscriptionErrorType.UNKNOWN_ERROR,
      message: String(error),
      userMessage: '发生未知错误，请稍后重试',
      retryable: true,
    };
  }

  /**
   * 解析错误对象
   */
  private parseError(error: Error): TranscriptionErrorInfo {
    const message = error.message.toLowerCase();

    // 超时错误（需要在网络错误之前检查）
    if (message.includes('timeout')) {
      return {
        type: TranscriptionErrorType.TIMEOUT_ERROR,
        message: error.message,
        userMessage: '转录超时，请稍后重试',
        retryable: true,
      };
    }

    // 网络错误
    if (message.includes('network') || message.includes('connection')) {
      return {
        type: TranscriptionErrorType.NETWORK_ERROR,
        message: error.message,
        userMessage: '网络连接失败，请检查网络设置后重试',
        retryable: true,
      };
    }

    // 认证错误
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('403')) {
      return {
        type: TranscriptionErrorType.AUTH_ERROR,
        message: error.message,
        userMessage: '认证失败，请检查 API 密钥配置',
        retryable: false,
      };
    }

    // 音频文件错误
    if (
      message.includes('audio') ||
      message.includes('file') ||
      message.includes('not found') ||
      message.includes('invalid')
    ) {
      return {
        type: TranscriptionErrorType.INVALID_AUDIO,
        message: error.message,
        userMessage: '音频文件无效或不存在，请重新录制',
        retryable: false,
      };
    }

    // 服务错误
    if (message.includes('service') || message.includes('500') || message.includes('502')) {
      return {
        type: TranscriptionErrorType.SERVICE_ERROR,
        message: error.message,
        userMessage: '服务暂时不可用，请稍后重试',
        retryable: true,
      };
    }

    return {
      type: TranscriptionErrorType.UNKNOWN_ERROR,
      message: error.message,
      userMessage: '转录失败，请稍后重试',
      retryable: true,
      originalError: error,
    };
  }

  /**
   * 记录错误
   */
  logError(errorInfo: TranscriptionErrorInfo, context?: Record<string, unknown>): void {
    logger.error('Transcription error', {
      type: errorInfo.type,
      message: errorInfo.message,
      userMessage: errorInfo.userMessage,
      retryable: errorInfo.retryable,
      ...context,
    });
  }

  /**
   * 检查错误是否可重试
   */
  isRetryable(error: unknown): boolean {
    const errorInfo = this.handleError(error);
    return errorInfo.retryable;
  }

  /**
   * 获取重试延迟时间（毫秒）
   */
  getRetryDelay(retryCount: number): number {
    // 指数退避策略：1s, 2s, 4s, 8s, 最多 30s
    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
    // 添加随机抖动以避免雷鸣羊群问题
    const jitter = Math.random() * 1000;
    return delay + jitter;
  }

  /**
   * 创建重试策略
   */
  createRetryStrategy(maxRetries: number = 3) {
    return {
      maxRetries,
      shouldRetry: (error: unknown, retryCount: number) => {
        return retryCount < maxRetries && this.isRetryable(error);
      },
      getDelay: (retryCount: number) => this.getRetryDelay(retryCount),
    };
  }
}

export const transcriptionErrorHandler = new TranscriptionErrorHandler();
