import {launchCamera, launchImageLibrary, ImagePickerResponse} from 'react-native-image-picker';
import {Platform} from 'react-native';
import {logger} from '@services/telemetry/logger';

export interface PhotoResult {
  uri: string;
  width: number;
  height: number;
  size: number;
  type: string;
  fileName: string;
}

export interface CameraServiceError {
  code: string;
  message: string;
}

/**
 * 相机服务
 * 封装拍照和相册选择逻辑
 */
class CameraService {
  private static instance: CameraService;

  private constructor() {}

  static getInstance(): CameraService {
    if (!CameraService.instance) {
      CameraService.instance = new CameraService();
    }
    return CameraService.instance;
  }

  /**
   * 打开相机拍照
   */
  async takePhoto(): Promise<PhotoResult | null> {
    return new Promise((resolve, reject) => {
      launchCamera(
        {
          mediaType: 'photo',
          cameraType: 'back',
          quality: 0.8,
          maxWidth: 1920,
          maxHeight: 1920,
          includeBase64: false,
          saveToPhotos: true,
        },
        (response: ImagePickerResponse) => {
          if (response.didCancel) {
            logger.info('Camera cancelled by user');
            resolve(null);
          } else if (response.errorCode) {
            const error: CameraServiceError = {
              code: response.errorCode,
              message: response.errorMessage || 'Unknown camera error',
            };
            logger.error(`Camera error: ${error.code} - ${error.message}`);
            reject(error);
          } else if (response.assets && response.assets.length > 0) {
            const asset = response.assets[0];
            const result: PhotoResult = {
              uri: asset.uri || '',
              width: asset.width || 0,
              height: asset.height || 0,
              size: asset.fileSize || 0,
              type: asset.type || 'image/jpeg',
              fileName: asset.fileName || `photo_${Date.now()}.jpg`,
            };
            logger.info(`Photo taken: ${result.fileName}`);
            resolve(result);
          }
        },
      );
    });
  }

  /**
   * 从相册选择照片
   */
  async pickPhotoFromGallery(): Promise<PhotoResult | null> {
    return new Promise((resolve, reject) => {
      launchImageLibrary(
        {
          mediaType: 'photo',
          quality: 0.8,
          maxWidth: 1920,
          maxHeight: 1920,
          includeBase64: false,
          selectionLimit: 1,
        },
        (response: ImagePickerResponse) => {
          if (response.didCancel) {
            logger.info('Gallery selection cancelled by user');
            resolve(null);
          } else if (response.errorCode) {
            const error: CameraServiceError = {
              code: response.errorCode,
              message: response.errorMessage || 'Unknown gallery error',
            };
            logger.error(`Gallery error: ${error.code} - ${error.message}`);
            reject(error);
          } else if (response.assets && response.assets.length > 0) {
            const asset = response.assets[0];
            const result: PhotoResult = {
              uri: asset.uri || '',
              width: asset.width || 0,
              height: asset.height || 0,
              size: asset.fileSize || 0,
              type: asset.type || 'image/jpeg',
              fileName: asset.fileName || `photo_${Date.now()}.jpg`,
            };
            logger.info(`Photo selected from gallery: ${result.fileName}`);
            resolve(result);
          }
        },
      );
    });
  }

  /**
   * 从相册选择多张照片（最多 9 张）
   */
  async pickMultiplePhotos(maxCount: number = 9): Promise<PhotoResult[] | null> {
    return new Promise((resolve, reject) => {
      launchImageLibrary(
        {
          mediaType: 'photo',
          quality: 0.8,
          maxWidth: 1920,
          maxHeight: 1920,
          includeBase64: false,
          selectionLimit: maxCount,
        },
        (response: ImagePickerResponse) => {
          if (response.didCancel) {
            logger.info('Multiple photo selection cancelled by user');
            resolve(null);
          } else if (response.errorCode) {
            const error: CameraServiceError = {
              code: response.errorCode,
              message: response.errorMessage || 'Unknown gallery error',
            };
            logger.error(`Gallery error: ${error.code} - ${error.message}`);
            reject(error);
          } else if (response.assets && response.assets.length > 0) {
            const results: PhotoResult[] = response.assets.map(asset => ({
              uri: asset.uri || '',
              width: asset.width || 0,
              height: asset.height || 0,
              size: asset.fileSize || 0,
              type: asset.type || 'image/jpeg',
              fileName: asset.fileName || `photo_${Date.now()}.jpg`,
            }));
            logger.info(`${results.length} photos selected from gallery`);
            resolve(results);
          }
        },
      );
    });
  }

  /**
   * 检查相机权限
   */
  async checkCameraPermission(): Promise<boolean> {
    try {
      // 权限检查由 permissionService 处理
      // 这里只是返回 true，实际权限检查在调用前进行
      return true;
    } catch (error) {
      logger.error(`Camera permission check failed: ${error}`);
      return false;
    }
  }

  /**
   * 检查相册权限
   */
  async checkGalleryPermission(): Promise<boolean> {
    try {
      // 权限检查由 permissionService 处理
      return true;
    } catch (error) {
      logger.error(`Gallery permission check failed: ${error}`);
      return false;
    }
  }

  /**
   * 获取照片的 EXIF 数据（如果可用）
   */
  async getPhotoMetadata(photoUri: string): Promise<Record<string, any> | null> {
    try {
      // 这是一个占位符，实际 EXIF 提取需要额外的库
      logger.info(`Getting metadata for photo: ${photoUri}`);
      return null;
    } catch (error) {
      logger.error(`Failed to get photo metadata: ${error}`);
      return null;
    }
  }

  /**
   * 验证照片是否有效
   */
  validatePhoto(photo: PhotoResult): boolean {
    if (!photo.uri) {
      logger.warn('Photo URI is empty');
      return false;
    }

    if (photo.size === 0) {
      logger.warn('Photo size is 0');
      return false;
    }

    if (photo.width === 0 || photo.height === 0) {
      logger.warn('Photo dimensions are invalid');
      return false;
    }

    return true;
  }

  /**
   * 获取照片的文件大小（MB）
   */
  getPhotoSizeInMB(photo: PhotoResult): number {
    return photo.size / (1024 * 1024);
  }

  /**
   * 检查照片是否超过大小限制
   */
  isPhotoSizeExceeded(photo: PhotoResult, maxSizeMB: number = 10): boolean {
    return this.getPhotoSizeInMB(photo) > maxSizeMB;
  }
}

export const cameraService = CameraService.getInstance();

