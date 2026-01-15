/**
 * 照片服务
 * 处理拍照、选择、压缩、存储等照片相关操作
 */

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import {
  COMPRESSION_PRESETS,
  MIME_TYPES,
  STORAGE_QUOTA,
  ERROR_MESSAGES,
} from '@/src/utils/constants';
import {
  MEDIA_PATHS,
  generateUniqueFilename,
  getMimeType,
  fileExists,
  deleteFile,
  getFileInfo,
} from '@/src/utils/fileSystem';
import { MediaError } from '@/src/types/entry';

/**
 * 照片结果
 */
export interface PhotoResult {
  uri: string;
  width: number;
  height: number;
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
   * 请求相机权限
   */
  static async requestCameraPermission(): Promise<boolean> {
    try {
      const { granted } = await Camera.requestCameraPermissionsAsync();
      return granted;
    } catch (error) {
      console.error('Failed to request camera permission:', error);
      throw this.createError(
        'PERMISSION_DENIED',
        ERROR_MESSAGES.CAMERA_ERROR
      );
    }
  }

  /**
   * 拍照
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

      // 打开相机
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.95,
      });

      if (result.canceled) {
        throw new Error('User cancelled camera');
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        exif: asset.exif,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'User cancelled camera') {
        throw error;
      }
      console.error('Failed to take photo:', error);
      throw this.createError('CAMERA_ERROR', ERROR_MESSAGES.CAMERA_ERROR);
    }
  }

  /**
   * 从相册选择照片
   */
  static async pickPhotoFromLibrary(
    options?: PickPhotoOptions
  ): Promise<PhotoResult[]> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options?.allowsEditing ?? false,
        aspect: options?.aspect,
        quality: options?.quality ?? 0.8,
        allowsMultiple: true,
      });

      if (result.canceled) {
        throw new Error('User cancelled photo library');
      }

      return result.assets.map((asset) => ({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        exif: asset.exif,
      }));
    } catch (error) {
      if (error instanceof Error && error.message === 'User cancelled photo library') {
        throw error;
      }
      console.error('Failed to pick photo:', error);
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
      console.error('Failed to compress photo:', error);
      throw this.createError('CODEC_ERROR', ERROR_MESSAGES.CODEC_ERROR);
    }
  }

  /**
   * 生成缩略图
   */
  static async generateThumbnail(
    uri: string,
    size: number = 256
  ): Promise<string> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: size, height: size } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return result.uri;
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      // 不抛出错误，缩略图生成失败不应该中断流程
      return uri;
    }
  }

  /**
   * 保存照片到本地
   */
  static async savePhotoToStorage(
    sourceUri: string,
    entryId: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    try {
      // 检查存储空间
      const { size } = await getFileInfo(sourceUri);
      if (size > STORAGE_QUOTA.MAX_PHOTO_SIZE) {
        throw this.createError(
          'DEVICE_STORAGE_FULL',
          ERROR_MESSAGES.FILE_TOO_LARGE
        );
      }

      // 压缩照片
      const compressed = await this.compressPhoto(sourceUri, quality);

      // 保存到存储
      const filename = generateUniqueFilename(entryId, 'photo', 'jpg');
      const targetUri = `${MEDIA_PATHS.photoOriginal}${filename}`;

      // 确保目录存在
      const dirInfo = await FileSystem.getInfoAsync(MEDIA_PATHS.photoOriginal);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(MEDIA_PATHS.photoOriginal, {
          intermediates: true,
        });
      }

      // 复制压缩后的文件
      await FileSystem.copyAsync({
        from: compressed.compressed.uri,
        to: targetUri,
      });

      // 清理临时文件
      await deleteFile(compressed.compressed.uri);

      return targetUri;
    } catch (error) {
      if (error instanceof MediaError) {
        throw error;
      }
      console.error('Failed to save photo:', error);
      throw this.createError('DEVICE_STORAGE_FULL', ERROR_MESSAGES.STORAGE_FULL);
    }
  }

  /**
   * 获取照片元数据
   */
  static async getPhotoMetadata(uri: string): Promise<PhotoMetadata> {
    try {
      const { size } = await getFileInfo(uri);

      // 获取图片信息
      const result = await ImageManipulator.manipulateAsync(uri, [], {
        compress: 1,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      // 这里简化处理，实际应该读取 EXIF 数据
      return {
        width: result.width || 0,
        height: result.height || 0,
        size,
      };
    } catch (error) {
      console.error('Failed to get photo metadata:', error);
      return {
        width: 0,
        height: 0,
        size: 0,
      };
    }
  }

  /**
   * 删除照片文件
   */
  static async deletePhoto(uri: string): Promise<void> {
    try {
      await deleteFile(uri);
    } catch (error) {
      console.error('Failed to delete photo:', error);
      // 不抛出错误，删除失败不应该中断流程
    }
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
 * 照片相关的 Hook
 */
export function usePhotoEntry() {
  const takePhoto = async () => {
    try {
      return await PhotoService.takePhoto();
    } catch (error) {
      console.error('Failed to take photo:', error);
      throw error;
    }
  };

  const pickPhotos = async (options?: PickPhotoOptions) => {
    try {
      return await PhotoService.pickPhotoFromLibrary(options);
    } catch (error) {
      console.error('Failed to pick photos:', error);
      throw error;
    }
  };

  const compressPhoto = async (
    uri: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    try {
      return await PhotoService.compressPhoto(uri, quality);
    } catch (error) {
      console.error('Failed to compress photo:', error);
      throw error;
    }
  };

  const savePhoto = async (
    uri: string,
    entryId: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    try {
      return await PhotoService.savePhotoToStorage(uri, entryId, quality);
    } catch (error) {
      console.error('Failed to save photo:', error);
      throw error;
    }
  };

  return {
    takePhoto,
    pickPhotos,
    compressPhoto,
    savePhoto,
  };
}
