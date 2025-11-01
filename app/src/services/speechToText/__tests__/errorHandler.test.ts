import {
  transcriptionErrorHandler,
  TranscriptionErrorType,
} from '@services/speechToText/errorHandler';

jest.mock('@services/telemetry/logger');

describe('TranscriptionErrorHandler', () => {
  describe('handleError', () => {
    it('should handle network error', () => {
      const error = new Error('Network connection failed');
      const errorInfo = transcriptionErrorHandler.handleError(error);

      expect(errorInfo.type).toBe(TranscriptionErrorType.NETWORK_ERROR);
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.userMessage).toContain('网络');
    });

    it('should handle auth error', () => {
      const error = new Error('Unauthorized: Invalid API key');
      const errorInfo = transcriptionErrorHandler.handleError(error);

      expect(errorInfo.type).toBe(TranscriptionErrorType.AUTH_ERROR);
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.userMessage).toContain('认证');
    });

    it('should handle invalid audio error', () => {
      const error = new Error('Audio file not found');
      const errorInfo = transcriptionErrorHandler.handleError(error);

      expect(errorInfo.type).toBe(TranscriptionErrorType.INVALID_AUDIO);
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.userMessage).toContain('音频');
    });

    it('should handle timeout error', () => {
      const error = new Error('Request timeout');
      const errorInfo = transcriptionErrorHandler.handleError(error);

      expect(errorInfo.type).toBe(TranscriptionErrorType.TIMEOUT_ERROR);
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.userMessage).toContain('超时');
    });

    it('should handle service error', () => {
      const error = new Error('Service error 500');
      const errorInfo = transcriptionErrorHandler.handleError(error);

      expect(errorInfo.type).toBe(TranscriptionErrorType.SERVICE_ERROR);
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.userMessage).toContain('服务');
    });

    it('should handle unknown error', () => {
      const error = new Error('Some random error');
      const errorInfo = transcriptionErrorHandler.handleError(error);

      expect(errorInfo.type).toBe(TranscriptionErrorType.UNKNOWN_ERROR);
      expect(errorInfo.retryable).toBe(true);
    });

    it('should handle non-Error objects', () => {
      const errorInfo = transcriptionErrorHandler.handleError('String error');

      expect(errorInfo.type).toBe(TranscriptionErrorType.UNKNOWN_ERROR);
      expect(errorInfo.message).toBe('String error');
    });
  });

  describe('isRetryable', () => {
    it('should return true for network errors', () => {
      const error = new Error('Network timeout');
      expect(transcriptionErrorHandler.isRetryable(error)).toBe(true);
    });

    it('should return false for auth errors', () => {
      const error = new Error('Unauthorized');
      expect(transcriptionErrorHandler.isRetryable(error)).toBe(false);
    });

    it('should return false for invalid audio errors', () => {
      const error = new Error('File not found');
      expect(transcriptionErrorHandler.isRetryable(error)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should return exponential backoff delay', () => {
      const delay0 = transcriptionErrorHandler.getRetryDelay(0);
      const delay1 = transcriptionErrorHandler.getRetryDelay(1);
      const delay2 = transcriptionErrorHandler.getRetryDelay(2);

      expect(delay0).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeGreaterThanOrEqual(4000);
    });

    it('should cap delay at 30 seconds', () => {
      const delay = transcriptionErrorHandler.getRetryDelay(10);
      expect(delay).toBeLessThanOrEqual(31000); // 30s + 1s jitter
    });
  });

  describe('createRetryStrategy', () => {
    it('should create retry strategy with default max retries', () => {
      const strategy = transcriptionErrorHandler.createRetryStrategy();

      expect(strategy.maxRetries).toBe(3);
      expect(strategy.shouldRetry).toBeDefined();
      expect(strategy.getDelay).toBeDefined();
    });

    it('should create retry strategy with custom max retries', () => {
      const strategy = transcriptionErrorHandler.createRetryStrategy(5);

      expect(strategy.maxRetries).toBe(5);
    });

    it('should determine if should retry', () => {
      const strategy = transcriptionErrorHandler.createRetryStrategy(3);
      const networkError = new Error('Network timeout');
      const authError = new Error('Unauthorized');

      expect(strategy.shouldRetry(networkError, 0)).toBe(true);
      expect(strategy.shouldRetry(networkError, 3)).toBe(false);
      expect(strategy.shouldRetry(authError, 0)).toBe(false);
    });
  });

  describe('logError', () => {
    it('should log error with context', () => {
      const error = new Error('Test error');
      const errorInfo = transcriptionErrorHandler.handleError(error);

      transcriptionErrorHandler.logError(errorInfo, {audioPath: '/path/to/audio.m4a'});

      // Should not throw
      expect(true).toBe(true);
    });
  });
});
