/**
 * 照片服务
 * 处理拍照、选择、压缩、存储等照片相关操作
 */

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import {
  COMPRESSION_PRESETS,
  STORAGE_QUOTA,
  ERROR_MESSAGES,
} from '@/src/utils/constants';
import {
  MEDIA_PATHS,
  generateUniqueFilename,
  deleteFile,
  getFileInfo,
} from '@/src/utils/fileSystem';
import { MediaError } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';

/**
 * 照片结果
 */
export interface PhotoResult {
  uri: string;
  width: number;
  height: number;
  aspectRatio: number; // width / height
  exif?: any;
}

/**
 * 压缩后的照片
 */
export interface CompressedPhoto {
  original: {
    uri: string;
    size: number;
  };
  compressed: {
    uri: string;
    size: number;
  };
  ratio: number;
  quality: 'low' | 'medium' | 'high';
}

/**
 * 保存照片结果
 */
export interface SavedPhotoResult {
  originalUri: string;
  thumbnailUri: string;
  aspectRatio: number;
  width: number;
  height: number;
}

/**
 * 照片元数据
 */
export interface PhotoMetadata {
  width: number;
  height: number;
  size: number;
  orientation?: number;
  timestamp?: number;
  camera?: string;
  lens?: string;
  aperture?: number;
  shutterSpeed?: number;
  iso?: number;
}

/**
 * 照片选择选项
 */
export interface PickPhotoOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}

/**
 * 照片服务类
 */
export class PhotoService {
  /**
   * 解析照片 URI：兼容旧绝对路径（沙盒 UUID 可能已变）
   * 统一提取文件名后用当前 documentDirectory 重建路径
   */
  static resolvePhotoUri(uri: string): string {
    const photoOriginalRelative = 'media/photos/original/';
    if (uri.includes(photoOriginalRelative)) {
      const filename = uri.split(photoOriginalRelative).pop();
      if (filename) {
        return `${MEDIA_PATHS.photoOriginal}${filename}`;
      }
    }
    return uri;
  }

  /**
   * 请求相机权限
   */
  static async requestCameraPermission(): Promise<boolean> {
    try {
      const { granted } = await Camera.requestCameraPermissionsAsync();
      return granted;
    } catch (error) {
      logger.error('Failed to request camera permission:', error);
      throw this.createError(
        'PERMISSION_DENIED',
        ERROR_MESSAGES.CAMERA_ERROR
      );
    }
  }

  /**
   * 拍照
   * 保持原始尺寸，不裁剪
   */
  static async takePhoto(): Promise<PhotoResult> {
    try {
      // 检查权限
      const granted = await this.requestCameraPermission();
      if (!granted) {
        throw this.createError(
          'PERMISSION_DENIED',
          ERROR_MESSAGES.CAMERA_ERROR
        );
      }

      // 打开相机 - 保持原始尺寸，不裁剪
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.95,
      });

      if (result.canceled) {
        throw new Error('User cancelled camera');
      }

      const asset = result.assets[0];
      const width = asset.width || 0;
      const height = asset.height || 0;
      return {
        uri: asset.uri,
        width,
        height,
        aspectRatio: height > 0 ? width / height : 1,
        exif: asset.exif,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'User cancelled camera') {
        throw error;
      }
      logger.error('Failed to take photo:', error);
      throw this.createError('CAMERA_ERROR', ERROR_MESSAGES.CAMERA_ERROR);
    }
  }

  /**
   * 从相册选择照片
   * 保持原始尺寸，不裁剪
   */
  static async pickPhotoFromLibrary(
    options?: PickPhotoOptions
  ): Promise<PhotoResult[]> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 9,
        allowsEditing: false,
        quality: options?.quality ?? 0.95,
      });

      if (result.canceled) {
        throw new Error('User cancelled photo library');
      }

      return result.assets.map((asset) => {
        const width = asset.width || 0;
        const height = asset.height || 0;
        return {
          uri: asset.uri,
          width,
          height,
          aspectRatio: height > 0 ? width / height : 1,
          exif: asset.exif,
        };
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'User cancelled photo library') {
        throw error;
      }
      logger.error('Failed to pick photo:', error);
      throw this.createError('INVALID_FILE', ERROR_MESSAGES.INVALID_FILE);
    }
  }

  /**
   * 压缩照片
   */
  static async compressPhoto(
    uri: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<CompressedPhoto> {
    try {
      const { size: originalSize } = await getFileInfo(uri);

      // 获取压缩预设
      const preset = COMPRESSION_PRESETS[quality.toUpperCase() as keyof typeof COMPRESSION_PRESETS];

      // 使用 expo-image-manipulator 进行压缩
      const result = await ImageManipulator.manipulateAsync(uri, [], {
        compress: preset.quality,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      const { size: compressedSize } = await getFileInfo(result.uri);
      const ratio = compressedSize / originalSize;

      return {
        original: {
          uri,
          size: originalSize,
        },
        compressed: {
          uri: result.uri,
          size: compressedSize,
        },
        ratio,
        quality,
      };
    } catch (error) {
      logger.error('Failed to compress photo:', error);
      throw this.createError('CODEC_ERROR', ERROR_MESSAGES.CODEC_ERROR);
    }
  }

  /**
   * 生成缩略图
   * 保持宽高比，只限制最大宽度
   * @param uri 原图 URI
   * @param maxWidth 最大宽度（默认 1200px）
   */
  static async generateThumbnail(
    uri: string,
    maxWidth: number = 1200
  ): Promise<string> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: maxWidth } }],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return result.uri;
    } catch (error) {
      logger.error('Failed to generate thumbnail:', error);
      // 不抛出错误，缩略图生成失败不应该中断流程
      return uri;
    }
  }

  /**
   * 保存照片到本地
   * 双轨制：保存原图 + 生成缩略图
   * @returns SavedPhotoResult 包含原图、缩略图路径和宽高比信息
   */
  static async savePhotoToStorage(
    sourceUri: string,
    entryId: string,
    quality: 'low' | 'medium' | 'high' = 'medium',
    aspectRatio?: number
  ): Promise<SavedPhotoResult> {
    try {
      // 检查存储空间
      const { size } = await getFileInfo(sourceUri);
      if (size > STORAGE_QUOTA.MAX_PHOTO_SIZE) {
        throw this.createError(
          'DEVICE_STORAGE_FULL',
          ERROR_MESSAGES.FILE_TOO_LARGE
        );
      }

      // 获取图片真实元数据
      const metadata = await this.getPhotoMetadata(sourceUri);
      const width = metadata.width;
      const height = metadata.height;
      // 优先使用传入的 aspectRatio，否则从实际尺寸计算
      const finalAspectRatio = aspectRatio || (height > 0 ? width / height : 1);

      // 压缩照片（原图质量压缩）
      const compressed = await this.compressPhoto(sourceUri, quality);

      // 生成缩略图（保持比例，限制宽度）
      const thumbnailUri = await this.generateThumbnail(compressed.compressed.uri);

      // 保存原图到存储
      const filename = generateUniqueFilename(entryId, 'photo', 'jpg');
      const targetUri = `${MEDIA_PATHS.photoOriginal}${filename}`;

      // 确保目录存在
      const dirInfo = await FileSystem.getInfoAsync(MEDIA_PATHS.photoOriginal);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(MEDIA_PATHS.photoOriginal, {
          intermediates: true,
        });
      }

      // 复制压缩后的文件作为原图
      await FileSystem.copyAsync({
        from: compressed.compressed.uri,
        to: targetUri,
      });

      // 保存缩略图
      const thumbnailFilename = generateUniqueFilename(entryId, 'thumb', 'jpg');
      const targetThumbnailUri = `${MEDIA_PATHS.photoOriginal}${thumbnailFilename}`;
      await FileSystem.copyAsync({
        from: thumbnailUri,
        to: targetThumbnailUri,
      });

      // 清理临时文件
      await deleteFile(compressed.compressed.uri);
      // 缩略图是新生成的临时文件，需要清理
      if (thumbnailUri !== compressed.compressed.uri) {
        await deleteFile(thumbnailUri).catch(() => {});
      }

      return {
        originalUri: targetUri,
        thumbnailUri: targetThumbnailUri,
        aspectRatio: finalAspectRatio,
        width,
        height,
      };
    } catch (error) {
      if (error instanceof MediaError) {
        throw error;
      }
      logger.error('Failed to save photo:', error);
      throw this.createError('DEVICE_STORAGE_FULL', ERROR_MESSAGES.STORAGE_FULL);
    }
  }

  /**
   * 获取照片元数据
   * 注意：ImageManipulator.manipulateAsync 会创建临时文件，使用后会自动清理
   */
  static async getPhotoMetadata(uri: string): Promise<PhotoMetadata> {
    try {
      const { size } = await getFileInfo(uri);

      // 获取图片信息
      const result = await ImageManipulator.manipulateAsync(uri, [], {
        compress: 1,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      // 清理临时文件（manipulateAsync 生成的临时文件）
      if (result.uri !== uri) {
        await deleteFile(result.uri).catch(() => {});
      }

      // 这里简化处理，实际应该读取 EXIF 数据
      return {
        width: result.width || 0,
        height: result.height || 0,
        size,
      };
    } catch (error) {
      logger.error('Failed to get photo metadata:', error);
      return {
        width: 0,
        height: 0,
        size: 0,
      };
    }
  }

  /**
   * 删除照片文件
   * @param uri 照片 URI（原图或缩略图路径）
   */
  static async deletePhoto(uri: string): Promise<void> {
    try {
      await deleteFile(uri);
    } catch (error) {
      logger.error('Failed to delete photo:', error);
      // 不抛出错误，删除失败不应该中断流程
    }
  }

  /**
   * 解析缩略图 URI
   * 根据原图路径获取对应的缩略图路径
   */
  static resolveThumbnailUri(originalUri: string): string | null {
    // 如果已经是缩略图路径，直接返回
    if (originalUri.includes('_thumb.')) {
      return originalUri;
    }
    // 根据原图路径生成缩略图路径
    const photoOriginalRelative = 'media/photos/original/';
    if (originalUri.includes(photoOriginalRelative)) {
      const filename = originalUri.split(photoOriginalRelative).pop();
      if (filename) {
        // 将 _photo_ 替换为 _thumb_ 获取缩略图文件名
        const thumbFilename = filename.replace('_photo_', '_thumb_');
        return `${MEDIA_PATHS.photoOriginal}${thumbFilename}`;
      }
    }
    return null;
  }

  /**
   * 创建媒体错误
   */
  private static createError(
    code: MediaError['code'],
    userMessage: string
  ): MediaError {
    const error = new Error(userMessage) as MediaError;
    error.code = code;
    error.userMessage = userMessage;
    return error;
  }
}

/**
 * 照片相关的 Hook - 直接委托给 PhotoService
 */
export function usePhotoEntry() {
  return {
    takePhoto: PhotoService.takePhoto.bind(PhotoService),
    pickPhotos: PhotoService.pickPhotoFromLibrary.bind(PhotoService),
    compressPhoto: PhotoService.compressPhoto.bind(PhotoService),
    savePhoto: PhotoService.savePhotoToStorage.bind(PhotoService),
  };
}
