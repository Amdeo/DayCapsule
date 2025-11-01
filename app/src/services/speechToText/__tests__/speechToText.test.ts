import {speechToTextService} from '@services/speechToText';
import {fileSystemService} from '@services/storage/fileSystem';
import {transcriptionCacheManager} from '@services/speechToText/cache';
import type {TencentCloudConfig} from '@services/speechToText';

jest.mock('@services/storage/fileSystem');
jest.mock('@services/telemetry/logger');
jest.mock('@services/speechToText/cache');

describe('SpeechToTextService', () => {
  const mockConfig: TencentCloudConfig = {
    secretId: 'test-secret-id',
    secretKey: 'test-secret-key',
    region: 'ap-beijing',
    projectId: 'test-project-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    speechToTextService.dispose();
  });

  describe('init', () => {
    it('should initialize service with valid config', async () => {
      (transcriptionCacheManager.init as jest.Mock).mockResolvedValue(undefined);

      await speechToTextService.init(mockConfig);
      expect(speechToTextService.isReady()).toBe(true);
    });

    it('should throw error with missing secretId', async () => {
      const invalidConfig = {...mockConfig, secretId: ''};
      await expect(speechToTextService.init(invalidConfig)).rejects.toThrow();
    });

    it('should throw error with missing secretKey', async () => {
      const invalidConfig = {...mockConfig, secretKey: ''};
      await expect(speechToTextService.init(invalidConfig)).rejects.toThrow();
    });
  });

  describe('transcribe', () => {
    beforeEach(async () => {
      (transcriptionCacheManager.init as jest.Mock).mockResolvedValue(undefined);
      (transcriptionCacheManager.get as jest.Mock).mockResolvedValue(null);
      (transcriptionCacheManager.set as jest.Mock).mockResolvedValue(undefined);

      await speechToTextService.init(mockConfig);
    });

    it('should transcribe audio file successfully', async () => {
      (fileSystemService.fileExists as jest.Mock).mockResolvedValue(true);
      (fileSystemService.readFile as jest.Mock).mockResolvedValue('mock-audio-data');

      const result = await speechToTextService.transcribe('/path/to/audio.m4a');

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.language).toBe('zh-CN');
    });

    it('should throw error if audio file not found', async () => {
      (fileSystemService.fileExists as jest.Mock).mockResolvedValue(false);

      await expect(speechToTextService.transcribe('/path/to/nonexistent.m4a')).rejects.toThrow();
    });

    it('should use cache for repeated transcriptions', async () => {
      (fileSystemService.fileExists as jest.Mock).mockResolvedValue(true);
      (fileSystemService.readFile as jest.Mock).mockResolvedValue('mock-audio-data');

      const audioPath = '/path/to/audio.m4a';
      const mockTranscriptionResult = {
        text: 'Test',
        confidence: 95,
        language: 'zh-CN',
        duration: 1000,
      };

      // First call - cache miss
      (transcriptionCacheManager.get as jest.Mock).mockResolvedValueOnce(null);
      (transcriptionCacheManager.set as jest.Mock).mockResolvedValueOnce(undefined);

      const result1 = await speechToTextService.transcribe(audioPath);

      // Second call - cache hit
      (transcriptionCacheManager.get as jest.Mock).mockResolvedValueOnce(mockTranscriptionResult);

      const result2 = await speechToTextService.transcribe(audioPath);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(fileSystemService.readFile).toHaveBeenCalledTimes(1);
    });

    it('should support different languages', async () => {
      (fileSystemService.fileExists as jest.Mock).mockResolvedValue(true);
      (fileSystemService.readFile as jest.Mock).mockResolvedValue('mock-audio-data');

      const result = await speechToTextService.transcribe('/path/to/audio.m4a', {
        language: 'en-US',
      });

      expect(result.language).toBe('en-US');
    });

    it('should support word info option', async () => {
      (fileSystemService.fileExists as jest.Mock).mockResolvedValue(true);
      (fileSystemService.readFile as jest.Mock).mockResolvedValue('mock-audio-data');

      const result = await speechToTextService.transcribe('/path/to/audio.m4a', {
        wordInfo: true,
      });

      expect(result.words).toBeDefined();
      expect(Array.isArray(result.words)).toBe(true);
    });

    it('should throw error if service not initialized', async () => {
      speechToTextService.dispose();

      await expect(speechToTextService.transcribe('/path/to/audio.m4a')).rejects.toThrow();
    });
  });

  describe('cache', () => {
    beforeEach(async () => {
      (transcriptionCacheManager.init as jest.Mock).mockResolvedValue(undefined);
      (transcriptionCacheManager.get as jest.Mock).mockResolvedValue(null);
      (transcriptionCacheManager.set as jest.Mock).mockResolvedValue(undefined);
      (transcriptionCacheManager.clear as jest.Mock).mockResolvedValue(undefined);

      await speechToTextService.init(mockConfig);
    });

    it('should clear cache', async () => {
      (fileSystemService.fileExists as jest.Mock).mockResolvedValue(true);
      (fileSystemService.readFile as jest.Mock).mockResolvedValue('mock-audio-data');

      const audioPath = '/path/to/audio.m4a';

      // First call
      await speechToTextService.transcribe(audioPath);

      // Clear cache
      await speechToTextService.clearCache();

      // Verify cache was cleared
      expect(transcriptionCacheManager.clear).toHaveBeenCalled();
    });
  });

  describe('isReady', () => {
    it('should return false before initialization', () => {
      speechToTextService.dispose();
      expect(speechToTextService.isReady()).toBe(false);
    });

    it('should return true after initialization', async () => {
      await speechToTextService.init(mockConfig);
      expect(speechToTextService.isReady()).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should dispose service', async () => {
      await speechToTextService.init(mockConfig);
      expect(speechToTextService.isReady()).toBe(true);

      speechToTextService.dispose();
      expect(speechToTextService.isReady()).toBe(false);
    });
  });
});
