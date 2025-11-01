import {Image} from 'react-native';
import RNFS from 'react-native-fs';
import ImageResizer from 'react-native-image-resizer';
import {logger} from '@services/telemetry/logger';

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'JPEG' | 'PNG' | 'WEBP';
}

export interface ThumbnailResult {
  uri: string;
  width: number;
  height: number;
  size: number;
}

/**
 * 缩略图生成服务
 * 为照片生成缩略图以提高性能
 */
class ThumbnailGenerator {
  private static instance: ThumbnailGenerator;
  private readonly DEFAULT_WIDTH = 200;
  private readonly DEFAULT_HEIGHT = 200;
  private readonly DEFAULT_QUALITY = 80;
  private readonly THUMBNAIL_DIR = `${RNFS.DocumentDirectoryPath}/thumbnails`;

  private constructor() {
    this.initializeThumbnailDir();
  }

  static getInstance(): ThumbnailGenerator {
    if (!ThumbnailGenerator.instance) {
      ThumbnailGenerator.instance = new ThumbnailGenerator();
    }
    return ThumbnailGenerator.instance;
  }

  /**
   * 初始化缩略图目录
   */
  private async initializeThumbnailDir(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.THUMBNAIL_DIR);
      if (!exists) {
        await RNFS.mkdir(this.THUMBNAIL_DIR);
        logger.info(`Thumbnail directory created: ${this.THUMBNAIL_DIR}`);
      }
    } catch (error) {
      logger.error(`Failed to initialize thumbnail directory: ${error}`);
    }
  }

  /**
   * 生成缩略图
   */
  async generateThumbnail(
    sourceUri: string,
    options: ThumbnailOptions = {},
  ): Promise<ThumbnailResult | null> {
    try {
      const width = options.width || this.DEFAULT_WIDTH;
      const height = options.height || this.DEFAULT_HEIGHT;
      const quality = options.quality || this.DEFAULT_QUALITY;
      const format = options.format || 'JPEG';

      logger.info(`Generating thumbnail: ${sourceUri} (${width}x${height})`);

      // 获取原始图片尺寸
      const originalSize = await this.getImageSize(sourceUri);
      if (!originalSize) {
        throw new Error('Failed to get image size');
      }

      // 计算缩放比例
      const scale = Math.min(width / originalSize.width, height / originalSize.height);
      const scaledWidth = Math.round(originalSize.width * scale);
      const scaledHeight = Math.round(originalSize.height * scale);

      // 生成缩略图
      const thumbnailUri = await ImageResizer.createResizedImage(
        sourceUri,
        scaledWidth,
        scaledHeight,
        format,
        quality,
      );

      // 移动到缩略图目录
      const fileName = `thumb_${Date.now()}.${format.toLowerCase()}`;
      const thumbnailPath = `${this.THUMBNAIL_DIR}/${fileName}`;

      await RNFS.moveFile(thumbnailUri.uri, thumbnailPath);

      // 获取文件大小
      const fileInfo = await RNFS.stat(thumbnailPath);

      const result: ThumbnailResult = {
        uri: `file://${thumbnailPath}`,
        width: scaledWidth,
        height: scaledHeight,
        size: fileInfo.size,
      };

      logger.info(`Thumbnail generated: ${result.uri} (${result.size} bytes)`);
      return result;
    } catch (error) {
      logger.error(`Failed to generate thumbnail: ${error}`);
      return null;
    }
  }

  /**
   * 批量生成缩略图
   */
  async generateThumbnails(
    sourceUris: string[],
    options: ThumbnailOptions = {},
  ): Promise<ThumbnailResult[]> {
    const results: ThumbnailResult[] = [];

    for (const uri of sourceUris) {
      const thumbnail = await this.generateThumbnail(uri, options);
      if (thumbnail) {
        results.push(thumbnail);
      }
    }

    return results;
  }

  /**
   * 获取图片尺寸
   */
  private getImageSize(uri: string): Promise<{width: number; height: number} | null> {
    return new Promise(resolve => {
      Image.getSize(
        uri,
        (width, height) => {
          resolve({width, height});
        },
        error => {
          logger.error(`Failed to get image size: ${error}`);
          resolve(null);
        },
      );
    });
  }

  /**
   * 删除缩略图
   */
  async deleteThumbnail(thumbnailUri: string): Promise<boolean> {
    try {
      const path = thumbnailUri.replace('file://', '');
      const exists = await RNFS.exists(path);

      if (exists) {
        await RNFS.unlink(path);
        logger.info(`Thumbnail deleted: ${path}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Failed to delete thumbnail: ${error}`);
      return false;
    }
  }

  /**
   * 清空所有缩略图
   */
  async clearAllThumbnails(): Promise<boolean> {
    try {
      const exists = await RNFS.exists(this.THUMBNAIL_DIR);

      if (exists) {
        const files = await RNFS.readDir(this.THUMBNAIL_DIR);

        for (const file of files) {
          if (file.isFile()) {
            await RNFS.unlink(file.path);
          }
        }

        logger.info(`All thumbnails cleared: ${files.length} files deleted`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Failed to clear thumbnails: ${error}`);
      return false;
    }
  }

  /**
   * 获取缩略图目录大小
   */
  async getThumbnailDirSize(): Promise<number> {
    try {
      const exists = await RNFS.exists(this.THUMBNAIL_DIR);

      if (!exists) {
        return 0;
      }

      const files = await RNFS.readDir(this.THUMBNAIL_DIR);
      let totalSize = 0;

      for (const file of files) {
        if (file.isFile()) {
          totalSize += file.size;
        }
      }

      return totalSize;
    } catch (error) {
      logger.error(`Failed to get thumbnail directory size: ${error}`);
      return 0;
    }
  }

  /**
   * 获取缩略图数量
   */
  async getThumbnailCount(): Promise<number> {
    try {
      const exists = await RNFS.exists(this.THUMBNAIL_DIR);

      if (!exists) {
        return 0;
      }

      const files = await RNFS.readDir(this.THUMBNAIL_DIR);
      return files.filter(f => f.isFile()).length;
    } catch (error) {
      logger.error(`Failed to get thumbnail count: ${error}`);
      return 0;
    }
  }

  /**
   * 验证缩略图
   */
  async validateThumbnail(thumbnailUri: string): Promise<boolean> {
    try {
      const path = thumbnailUri.replace('file://', '');
      const exists = await RNFS.exists(path);

      if (!exists) {
        logger.warn(`Thumbnail not found: ${path}`);
        return false;
      }

      const stat = await RNFS.stat(path);

      if (stat.size === 0) {
        logger.warn(`Thumbnail is empty: ${path}`);
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`Failed to validate thumbnail: ${error}`);
      return false;
    }
  }
}

export const thumbnailGenerator = ThumbnailGenerator.getInstance();

