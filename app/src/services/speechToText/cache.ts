/**
 * 转录缓存管理器
 *
 * 支持内存缓存和持久化存储
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {logger} from '@services/telemetry/logger';
import type {TranscriptionResult} from './config';

interface CacheEntry {
  result: TranscriptionResult;
  timestamp: number;
  ttl?: number; // 缓存过期时间（毫秒）
}

interface CacheStats {
  size: number;
  entries: number;
  oldestEntry?: number;
  newestEntry?: number;
}

class TranscriptionCacheManager {
  private readonly CACHE_PREFIX = '@transcription_cache_';
  private readonly CACHE_INDEX_KEY = '@transcription_cache_index';
  private readonly MAX_CACHE_SIZE = 100; // 最多缓存 100 个转录结果
  private readonly DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 天
  private memoryCache: Map<string, CacheEntry> = new Map();
  private isInitialized = false;

  /**
   * 初始化缓存管理器
   */
  async init(): Promise<void> {
    try {
      // 从 AsyncStorage 加载缓存索引
      const indexJson = await AsyncStorage.getItem(this.CACHE_INDEX_KEY);
      if (indexJson) {
        const index = JSON.parse(indexJson) as string[];
        logger.info('Loaded cache index', {count: index.length});
      }

      this.isInitialized = true;
      logger.info('TranscriptionCacheManager initialized');
    } catch (error) {
      logger.error('Failed to initialize cache manager', {error});
      throw error;
    }
  }

  /**
   * 获取缓存的转录结果
   */
  async get(key: string): Promise<TranscriptionResult | null> {
    try {
      // 先检查内存缓存
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && !this.isExpired(memoryEntry)) {
        logger.info('Cache hit (memory)', {key});
        return memoryEntry.result;
      }

      // 从 AsyncStorage 获取
      const storageKey = this.CACHE_PREFIX + key;
      const entryJson = await AsyncStorage.getItem(storageKey);

      if (entryJson) {
        const entry = JSON.parse(entryJson) as CacheEntry;

        if (!this.isExpired(entry)) {
          // 加载到内存缓存
          this.memoryCache.set(key, entry);
          logger.info('Cache hit (storage)', {key});
          return entry.result;
        } else {
          // 删除过期的缓存
          await this.delete(key);
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to get cache', {key, error});
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set(key: string, result: TranscriptionResult, ttl?: number): Promise<void> {
    try {
      const entry: CacheEntry = {
        result,
        timestamp: Date.now(),
        ttl: ttl || this.DEFAULT_TTL,
      };

      // 保存到内存缓存
      this.memoryCache.set(key, entry);

      // 保存到 AsyncStorage
      const storageKey = this.CACHE_PREFIX + key;
      await AsyncStorage.setItem(storageKey, JSON.stringify(entry));

      // 更新缓存索引
      await this.updateCacheIndex(key);

      // 检查缓存大小
      await this.checkCacheSize();

      logger.info('Cache set', {key, ttl});
    } catch (error) {
      logger.error('Failed to set cache', {key, error});
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    try {
      // 从内存缓存删除
      this.memoryCache.delete(key);

      // 从 AsyncStorage 删除
      const storageKey = this.CACHE_PREFIX + key;
      await AsyncStorage.removeItem(storageKey);

      // 更新缓存索引
      await this.removeFromCacheIndex(key);

      logger.info('Cache deleted', {key});
    } catch (error) {
      logger.error('Failed to delete cache', {key, error});
    }
  }

  /**
   * 清除所有缓存
   */
  async clear(): Promise<void> {
    try {
      // 清除内存缓存
      this.memoryCache.clear();

      // 获取所有缓存键
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.CACHE_PREFIX));

      // 删除所有缓存
      await AsyncStorage.multiRemove(cacheKeys);

      // 清除缓存索引
      await AsyncStorage.removeItem(this.CACHE_INDEX_KEY);

      logger.info('All cache cleared', {count: cacheKeys.length});
    } catch (error) {
      logger.error('Failed to clear cache', {error});
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<CacheStats> {
    try {
      const indexJson = await AsyncStorage.getItem(this.CACHE_INDEX_KEY);
      const index = indexJson ? (JSON.parse(indexJson) as string[]) : [];

      let totalSize = 0;
      let oldestEntry: number | undefined;
      let newestEntry: number | undefined;

      for (const key of index) {
        const storageKey = this.CACHE_PREFIX + key;
        const entryJson = await AsyncStorage.getItem(storageKey);

        if (entryJson) {
          totalSize += entryJson.length;
          const entry = JSON.parse(entryJson) as CacheEntry;

          if (!oldestEntry || entry.timestamp < oldestEntry) {
            oldestEntry = entry.timestamp;
          }
          if (!newestEntry || entry.timestamp > newestEntry) {
            newestEntry = entry.timestamp;
          }
        }
      }

      return {
        size: totalSize,
        entries: index.length,
        oldestEntry,
        newestEntry,
      };
    } catch (error) {
      logger.error('Failed to get cache stats', {error});
      return {size: 0, entries: 0};
    }
  }

  /**
   * 检查缓存是否过期
   */
  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) {
      return false;
    }

    const now = Date.now();
    const expiryTime = entry.timestamp + entry.ttl;

    return now > expiryTime;
  }

  /**
   * 更新缓存索引
   */
  private async updateCacheIndex(key: string): Promise<void> {
    try {
      const indexJson = await AsyncStorage.getItem(this.CACHE_INDEX_KEY);
      const index = indexJson ? (JSON.parse(indexJson) as string[]) : [];

      if (!index.includes(key)) {
        index.push(key);
        await AsyncStorage.setItem(this.CACHE_INDEX_KEY, JSON.stringify(index));
      }
    } catch (error) {
      logger.error('Failed to update cache index', {error});
    }
  }

  /**
   * 从缓存索引中移除
   */
  private async removeFromCacheIndex(key: string): Promise<void> {
    try {
      const indexJson = await AsyncStorage.getItem(this.CACHE_INDEX_KEY);
      if (indexJson) {
        let index = JSON.parse(indexJson) as string[];
        index = index.filter(k => k !== key);
        await AsyncStorage.setItem(this.CACHE_INDEX_KEY, JSON.stringify(index));
      }
    } catch (error) {
      logger.error('Failed to remove from cache index', {error});
    }
  }

  /**
   * 检查缓存大小并清理过期项
   */
  private async checkCacheSize(): Promise<void> {
    try {
      const indexJson = await AsyncStorage.getItem(this.CACHE_INDEX_KEY);
      const index = indexJson ? (JSON.parse(indexJson) as string[]) : [];

      if (index.length > this.MAX_CACHE_SIZE) {
        // 删除最旧的缓存项
        const keysToDelete = index.slice(0, index.length - this.MAX_CACHE_SIZE);

        for (const key of keysToDelete) {
          await this.delete(key);
        }

        logger.info('Cache cleaned up', {removed: keysToDelete.length});
      }
    } catch (error) {
      logger.error('Failed to check cache size', {error});
    }
  }

  /**
   * 销毁缓存管理器
   */
  dispose(): void {
    this.memoryCache.clear();
    this.isInitialized = false;
    logger.info('TranscriptionCacheManager disposed');
  }
}

export const transcriptionCacheManager = new TranscriptionCacheManager();
