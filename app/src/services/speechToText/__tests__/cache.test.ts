import {transcriptionCacheManager} from '@services/speechToText/cache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {TranscriptionResult} from '@services/speechToText';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@services/telemetry/logger');

describe('TranscriptionCacheManager', () => {
  const mockResult: TranscriptionResult = {
    text: 'Test transcription',
    confidence: 95,
    language: 'zh-CN',
    duration: 1000,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await transcriptionCacheManager.clear();
  });

  describe('init', () => {
    it('should initialize cache manager', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await transcriptionCacheManager.init();

      expect(AsyncStorage.getItem).toHaveBeenCalled();
    });
  });

  describe('set and get', () => {
    beforeEach(async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await transcriptionCacheManager.init();
    });

    it('should set and get cache', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({
          result: mockResult,
          timestamp: Date.now(),
          ttl: 7 * 24 * 60 * 60 * 1000,
        }),
      );

      const key = 'test-key';
      await transcriptionCacheManager.set(key, mockResult);

      const result = await transcriptionCacheManager.get(key);

      expect(result).toBeDefined();
      expect(result?.text).toBe(mockResult.text);
    });

    it('should return null for non-existent cache', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await transcriptionCacheManager.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should handle expired cache', async () => {
      const expiredEntry = {
        result: mockResult,
        timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days TTL
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(expiredEntry));
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      const result = await transcriptionCacheManager.get('expired-key');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await transcriptionCacheManager.init();
    });

    it('should delete cache', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await transcriptionCacheManager.delete('test-key');

      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await transcriptionCacheManager.init();
    });

    it('should clear all cache', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        '@transcription_cache_key1',
        '@transcription_cache_key2',
      ]);
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await transcriptionCacheManager.clear();

      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await transcriptionCacheManager.init();
    });

    it('should return cache stats', async () => {
      const indexJson = JSON.stringify(['key1', 'key2']);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(indexJson);

      const stats = await transcriptionCacheManager.getStats();

      expect(stats).toBeDefined();
      expect(stats.entries).toBeGreaterThanOrEqual(0);
      expect(stats.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('dispose', () => {
    it('should dispose cache manager', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await transcriptionCacheManager.init();

      transcriptionCacheManager.dispose();

      // Should not throw error
      expect(true).toBe(true);
    });
  });
});
