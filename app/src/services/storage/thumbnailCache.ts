import RNFS from 'react-native-fs';
import {logger} from '@services/telemetry/logger';

export interface CachedThumbnail {
  originalPath: string;
  thumbnailPath: string;
  size: number;
  createdAt: number;
  accessedAt: number;
  accessCount: number;
}

class ThumbnailCache {
  private cache: Map<string, CachedThumbnail> = new Map();
  private cacheDir: string = `${RNFS.DocumentsDirectoryPath}/thumbnails`;
  private maxCacheSize: number = 100 * 1024 * 1024; // 100MB
  private currentCacheSize: number = 0;
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) return;

      // 创建缓存目录
      const exists = await RNFS.exists(this.cacheDir);
      if (!exists) {
        await RNFS.mkdir(this.cacheDir);
      }

      // 加载现有缓存
      await this.loadCache();

      this.isInitialized = true;
      logger.info('Thumbnail cache initialized', {
        cacheDir: this.cacheDir,
        cacheSize: this.currentCacheSize,
      });
    } catch (error) {
      logger.error('Failed to initialize thumbnail cache', {error});
    }
  }

  async getThumbnail(originalPath: string): Promise<string | null> {
    try {
      const cached = this.cache.get(originalPath);

      if (cached) {
        // 更新访问信息
        cached.accessedAt = Date.now();
        cached.accessCount++;

        logger.info('Thumbnail cache hit', {
          originalPath,
          accessCount: cached.accessCount,
        });

        return cached.thumbnailPath;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get thumbnail', {error});
      return null;
    }
  }

  async cacheThumbnail(originalPath: string, thumbnailPath: string): Promise<boolean> {
    try {
      // 检查文件是否存在
      const exists = await RNFS.exists(thumbnailPath);
      if (!exists) {
        logger.warn('Thumbnail file does not exist', {thumbnailPath});
        return false;
      }

      // 获取文件大小
      const stat = await RNFS.stat(thumbnailPath);
      const fileSize = stat.size;

      // 检查缓存空间
      if (this.currentCacheSize + fileSize > this.maxCacheSize) {
        await this.evictOldest();
      }

      // 生成缓存路径
      const cacheFileName = `thumb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const cachedPath = `${this.cacheDir}/${cacheFileName}`;

      // 复制文件到缓存目录
      await RNFS.copyFile(thumbnailPath, cachedPath);

      // 记录缓存
      const thumbnail: CachedThumbnail = {
        originalPath,
        thumbnailPath: cachedPath,
        size: fileSize,
        createdAt: Date.now(),
        accessedAt: Date.now(),
        accessCount: 0,
      };

      this.cache.set(originalPath, thumbnail);
      this.currentCacheSize += fileSize;

      logger.info('Thumbnail cached', {
        originalPath,
        cachedPath,
        size: fileSize,
      });

      return true;
    } catch (error) {
      logger.error('Failed to cache thumbnail', {error});
      return false;
    }
  }

  async removeThumbnail(originalPath: string): Promise<boolean> {
    try {
      const cached = this.cache.get(originalPath);
      if (!cached) {
        return false;
      }

      // 删除缓存文件
      const exists = await RNFS.exists(cached.thumbnailPath);
      if (exists) {
        await RNFS.unlink(cached.thumbnailPath);
      }

      // 更新缓存大小
      this.currentCacheSize -= cached.size;

      // 移除缓存记录
      this.cache.delete(originalPath);

      logger.info('Thumbnail removed', {originalPath});
      return true;
    } catch (error) {
      logger.error('Failed to remove thumbnail', {error});
      return false;
    }
  }

  async clearCache(): Promise<void> {
    try {
      // 删除所有缓存文件
      const files = await RNFS.readDir(this.cacheDir);
      for (const file of files) {
        if (file.isFile()) {
          await RNFS.unlink(file.path);
        }
      }

      // 清空缓存记录
      this.cache.clear();
      this.currentCacheSize = 0;

      logger.info('Thumbnail cache cleared');
    } catch (error) {
      logger.error('Failed to clear thumbnail cache', {error});
    }
  }

  async getCacheStats(): Promise<{
    totalSize: number;
    itemCount: number;
    maxSize: number;
    usagePercent: number;
  }> {
    return {
      totalSize: this.currentCacheSize,
      itemCount: this.cache.size,
      maxSize: this.maxCacheSize,
      usagePercent: (this.currentCacheSize / this.maxCacheSize) * 100,
    };
  }

  private async evictOldest(): Promise<void> {
    try {
      // 找到最少使用的缓存项
      let leastUsed: [string, CachedThumbnail] | null = null;
      let minAccessCount = Infinity;

      for (const [key, value] of this.cache.entries()) {
        if (value.accessCount < minAccessCount) {
          minAccessCount = value.accessCount;
          leastUsed = [key, value];
        }
      }

      if (leastUsed) {
        const [key, value] = leastUsed;
        await this.removeThumbnail(key);
        logger.info('Evicted least used thumbnail', {
          originalPath: key,
          accessCount: value.accessCount,
        });
      }
    } catch (error) {
      logger.error('Failed to evict oldest thumbnail', {error});
    }
  }

  private async loadCache(): Promise<void> {
    try {
      const files = await RNFS.readDir(this.cacheDir);

      for (const file of files) {
        if (file.isFile()) {
          const stat = await RNFS.stat(file.path);
          this.currentCacheSize += stat.size;
        }
      }

      logger.info('Cache loaded', {
        itemCount: files.length,
        totalSize: this.currentCacheSize,
      });
    } catch (error) {
      logger.error('Failed to load cache', {error});
    }
  }

  getCacheSize(): number {
    return this.currentCacheSize;
  }

  getCacheItemCount(): number {
    return this.cache.size;
  }
}

export const thumbnailCache = new ThumbnailCache();

