/**
 * 语音转文字服务
 *
 * 使用腾讯云 ASR API 将语音文件转换为文本
 */

import {fileSystemService} from '@services/storage/fileSystem';
import {logger} from '@services/telemetry/logger';
import {transcriptionCacheManager} from './cache';
import {transcriptionErrorHandler} from './errorHandler';
import {
  TencentCloudConfig,
  SpeechToTextOptions,
  TranscriptionResult,
  TranscriptionError,
  DEFAULT_SPEECH_TO_TEXT_OPTIONS,
  ERROR_CODES,
} from './config';

class SpeechToTextService {
  private config: TencentCloudConfig | null = null;
  private isInitialized = false;

  /**
   * 初始化服务
   */
  async init(config: TencentCloudConfig): Promise<void> {
    try {
      if (!config.secretId || !config.secretKey) {
        throw new Error('Missing Tencent Cloud credentials');
      }

      // 初始化缓存管理器
      await transcriptionCacheManager.init();

      this.config = config;
      this.isInitialized = true;
      logger.info('SpeechToTextService initialized', {
        region: config.region,
        projectId: config.projectId,
      });
    } catch (error) {
      logger.error('Failed to initialize SpeechToTextService', {error});
      throw error;
    }
  }

  /**
   * 转录音频文件
   */
  async transcribe(
    audioPath: string,
    options: SpeechToTextOptions = DEFAULT_SPEECH_TO_TEXT_OPTIONS,
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();

    try {
      if (!this.isInitialized || !this.config) {
        throw new Error('Service not initialized');
      }

      // 检查缓存
      const cacheKey = this.getCacheKey(audioPath, options);
      const cachedResult = await transcriptionCacheManager.get(cacheKey);
      if (cachedResult) {
        logger.info('Transcription cache hit', {audioPath});
        return cachedResult;
      }

      // 验证音频文件
      const fileExists = await fileSystemService.fileExists(audioPath);
      if (!fileExists) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      // 读取音频文件
      const audioData = await fileSystemService.readFile(audioPath);

      // 调用腾讯云 ASR API
      const result = await this.callTencentCloudAPI(audioData, options);

      // 缓存结果
      await transcriptionCacheManager.set(cacheKey, result);

      logger.info('Transcription completed', {
        audioPath,
        duration: Date.now() - startTime,
        textLength: result.text.length,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      const errorInfo = transcriptionErrorHandler.handleError(error);
      transcriptionErrorHandler.logError(errorInfo, {
        audioPath,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * 获取错误处理器
   */
  getErrorHandler() {
    return transcriptionErrorHandler;
  }

  /**
   * 调用腾讯云 ASR API
   *
   * 注意：这是一个模拟实现，实际使用时需要集成真实的腾讯云 SDK
   */
  private async callTencentCloudAPI(
    audioData: string,
    options: SpeechToTextOptions,
  ): Promise<TranscriptionResult> {
    // TODO: 集成真实的腾讯云 ASR API
    // 这里使用模拟数据进行演示

    return new Promise((resolve, reject) => {
      // 模拟 API 调用延迟
      setTimeout(() => {
        try {
          // 模拟转录结果
          const result: TranscriptionResult = {
            text: '这是一条语音记录的转录文本',
            confidence: 95,
            language: options.language || 'zh-CN',
            duration: 2000,
            words: options.wordInfo
              ? [
                  {word: '这是', startTime: 0, endTime: 500, confidence: 98},
                  {word: '一条', startTime: 500, endTime: 1000, confidence: 95},
                  {word: '语音', startTime: 1000, endTime: 1500, confidence: 92},
                  {word: '记录', startTime: 1500, endTime: 2000, confidence: 96},
                ]
              : undefined,
          };

          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, 1000);
    });
  }

  /**
   * 清除缓存
   */
  async clearCache(): Promise<void> {
    await transcriptionCacheManager.clear();
    logger.info('Transcription cache cleared');
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats() {
    return transcriptionCacheManager.getStats();
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(audioPath: string, options: SpeechToTextOptions): string {
    return `${audioPath}:${options.language || 'zh-CN'}`;
  }

  /**
   * 检查服务是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 销毁服务
   */
  dispose(): void {
    transcriptionCacheManager.dispose();
    this.isInitialized = false;
    logger.info('SpeechToTextService disposed');
  }
}

// 导出单例
export const speechToTextService = new SpeechToTextService();

// 导出类型
export type {TencentCloudConfig, SpeechToTextOptions, TranscriptionResult, TranscriptionError};
export {DEFAULT_SPEECH_TO_TEXT_OPTIONS, ERROR_CODES};
export {SUPPORTED_LANGUAGES} from './config';
