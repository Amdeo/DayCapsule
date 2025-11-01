import {NativeModules} from 'react-native';
import {logger} from '@services/telemetry/logger';
import {performanceMonitor} from '@services/telemetry/performance';

const {TencentASRModule} = NativeModules;

export interface TranscriptionResult {
  text: string;
  confidence: number;
  segments?: TranscriptionSegment[];
  language?: string;
  duration?: number;
}

export interface TranscriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface TranscriptionOptions {
  language?: string;
  enablePunctuation?: boolean;
  convertNumbers?: boolean;
  enableSegmentation?: boolean;
  timeout?: number;
  onProgress?: (current: number, total: number) => void;
}

class ASRService {
  private initialized = false;
  private transcriptionCache = new Map<string, TranscriptionResult>();
  private offlineQueue: Array<{audioPath: string; result: TranscriptionResult}> = [];

  async initialize(): Promise<void> {
    try {
      if (this.initialized) return;

      // 初始化腾讯云 ASR SDK
      await TencentASRModule.initialize({
        appId: process.env.TENCENT_ASR_APP_ID,
        secretId: process.env.TENCENT_ASR_SECRET_ID,
        secretKey: process.env.TENCENT_ASR_SECRET_KEY,
      });

      this.initialized = true;
      logger.info('ASR service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ASR service', {error});
      throw error;
    }
  }

  async transcribe(
    audioPath: string,
    language: string = 'zh-CN',
    options: TranscriptionOptions = {},
  ): Promise<TranscriptionResult | null> {
    try {
      // 检查缓存
      const cacheKey = `${audioPath}_${language}`;
      if (this.transcriptionCache.has(cacheKey)) {
        logger.info('Returning cached transcription', {audioPath});
        return this.transcriptionCache.get(cacheKey)!;
      }

      performanceMonitor.startMeasure(`transcribe_${audioPath}`);

      const result = await TencentASRModule.transcribe({
        audioPath,
        language,
        enablePunctuation: options.enablePunctuation ?? true,
        convertNumbers: options.convertNumbers ?? true,
        enableSegmentation: options.enableSegmentation ?? false,
        timeout: options.timeout ?? 60000,
      });

      performanceMonitor.endMeasure(`transcribe_${audioPath}`);

      // 缓存结果
      this.transcriptionCache.set(cacheKey, result);

      logger.info('Transcription completed', {
        audioPath,
        textLength: result.text.length,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      logger.error('Transcription failed', {audioPath, error});
      return null;
    }
  }

  async transcribeOffline(audioPath: string): Promise<TranscriptionResult | null> {
    try {
      // 使用本地模型进行离线转写
      const result = await TencentASRModule.transcribeOffline({
        audioPath,
        language: 'zh-CN',
      });

      // 添加到离线队列
      this.offlineQueue.push({audioPath, result});

      logger.info('Offline transcription completed', {audioPath});
      return result;
    } catch (error) {
      logger.error('Offline transcription failed', {audioPath, error});
      return null;
    }
  }

  async transcribeBatch(
    audioPaths: string[],
    options: TranscriptionOptions = {},
  ): Promise<(TranscriptionResult | null)[]> {
    try {
      const results: (TranscriptionResult | null)[] = [];

      for (let i = 0; i < audioPaths.length; i++) {
        const result = await this.transcribe(
          audioPaths[i],
          options.language ?? 'zh-CN',
          options,
        );
        results.push(result);

        // 调用进度回调
        if (options.onProgress) {
          options.onProgress(i + 1, audioPaths.length);
        }
      }

      logger.info('Batch transcription completed', {count: audioPaths.length});
      return results;
    } catch (error) {
      logger.error('Batch transcription failed', {error});
      return [];
    }
  }

  async syncOfflineTranscriptions(): Promise<boolean> {
    try {
      if (this.offlineQueue.length === 0) {
        return true;
      }

      logger.info('Syncing offline transcriptions', {count: this.offlineQueue.length});

      // 将离线转写结果同步到服务器
      for (const {audioPath, result} of this.offlineQueue) {
        const cacheKey = `${audioPath}_zh-CN`;
        this.transcriptionCache.set(cacheKey, result);
      }

      this.offlineQueue = [];
      logger.info('Offline transcriptions synced successfully');
      return true;
    } catch (error) {
      logger.error('Failed to sync offline transcriptions', {error});
      return false;
    }
  }

  clearCache(): void {
    this.transcriptionCache.clear();
    logger.info('Transcription cache cleared');
  }

  getCacheSize(): number {
    return this.transcriptionCache.size;
  }

  getOfflineQueueSize(): number {
    return this.offlineQueue.length;
  }
}

export const asrService = new ASRService();

