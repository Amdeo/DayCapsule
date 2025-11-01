/**
 * 相机服务
 * 封装相机拍照和图片选择功能
 */

import {launchCamera, launchImageLibrary, ImagePickerResponse} from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';
import {permissionsService} from '@services/permissions';
import {logger} from '@services/telemetry/logger';
import {performanceMonitor} from '@services/telemetry/performance';

export interface CameraPhoto {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
  type: string;
  fileName: string;
}

export interface ThumbnailOptions {
  width: number;
  height: number;
  quality: number;
}

class CameraService {
  private readonly DEFAULT_THUMBNAIL_SIZE = 200;
  private readonly DEFAULT_QUALITY = 0.8;

  /**
   * 拍照
   */
  async takePhoto(): Promise<CameraPhoto | null> {
    const timerId = performanceMonitor.start('camera_take_photo');

    try {
      // 检查相机权限
      const hasPermission = await permissionsService.ensurePermission('camera');
      if (!hasPermission) {
        logger.warn('Camera permission denied');
        return null;
      }

      const result = await launchCamera({
        mediaType: 'photo',
        quality: this.DEFAULT_QUALITY,
        saveToPhotos: false,
        includeBase64: false,
      });

      performanceMonitor.end(timerId, {success: !result.didCancel});

      if (result.didCancel) {
        logger.info('User cancelled camera');
        return null;
      }

      if (result.errorCode) {
        logger.error('Camera error', {code: result.errorCode, message: result.errorMessage});
        return null;
      }

      const asset = result.assets?.[0];
      if (!asset || !asset.uri) {
        logger.error('No photo captured');
        return null;
      }

      return this.formatPhoto(asset);
    } catch (error) {
      performanceMonitor.end(timerId, {success: false, error: true});
      logger.error('Failed to take photo', error);
      return null;
    }
  }

  /**
   * 从相册选择照片
   */
  async pickFromGallery(): Promise<CameraPhoto | null> {
    const timerId = performanceMonitor.start('camera_pick_gallery');

    try {
      // 检查相册权限
      const hasPermission = await permissionsService.ensurePermission('photos');
      if (!hasPermission) {
        logger.warn('Photo library permission denied');
        return null;
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: this.DEFAULT_QUALITY,
        selectionLimit: 1,
        includeBase64: false,
      });

      performanceMonitor.end(timerId, {success: !result.didCancel});

      if (result.didCancel) {
        logger.info('User cancelled gallery picker');
        return null;
      }

      if (result.errorCode) {
        logger.error('Gallery picker error', {
          code: result.errorCode,
          message: result.errorMessage,
        });
        return null;
      }

      const asset = result.assets?.[0];
      if (!asset || !asset.uri) {
        logger.error('No photo selected');
        return null;
      }

      return this.formatPhoto(asset);
    } catch (error) {
      performanceMonitor.end(timerId, {success: false, error: true});
      logger.error('Failed to pick from gallery', error);
      return null;
    }
  }

  /**
   * 生成缩略图
   */
  async generateThumbnail(
    photoUri: string,
    options?: Partial<ThumbnailOptions>,
  ): Promise<string | null> {
    const timerId = performanceMonitor.start('camera_generate_thumbnail');

    try {
      const {
        width = this.DEFAULT_THUMBNAIL_SIZE,
        height = this.DEFAULT_THUMBNAIL_SIZE,
        quality = 80,
      } = options || {};

      const result = await ImageResizer.createResizedImage(
        photoUri,
        width,
        height,
        'JPEG',
        quality,
        0,
        undefined,
      );

      performanceMonitor.end(timerId, {success: true});
      logger.info('Thumbnail generated', {originalUri: photoUri, thumbnailUri: result.uri});

      return result.uri;
    } catch (error) {
      performanceMonitor.end(timerId, {success: false, error: true});
      logger.error('Failed to generate thumbnail', error);
      return null;
    }
  }

  /**
   * 格式化照片信息
   */
  private formatPhoto(asset: any): CameraPhoto {
    return {
      uri: asset.uri,
      width: asset.width || 0,
      height: asset.height || 0,
      fileSize: asset.fileSize || 0,
      type: asset.type || 'image/jpeg',
      fileName: asset.fileName || `photo_${Date.now()}.jpg`,
    };
  }

  /**
   * 批量选择照片（未来扩展）
   */
  async pickMultipleFromGallery(limit: number = 5): Promise<CameraPhoto[]> {
    try {
      const hasPermission = await permissionsService.ensurePermission('photos');
      if (!hasPermission) {
        logger.warn('Photo library permission denied');
        return [];
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: this.DEFAULT_QUALITY,
        selectionLimit: limit,
        includeBase64: false,
      });

      if (result.didCancel || result.errorCode || !result.assets) {
        return [];
      }

      return result.assets.filter(asset => asset.uri).map(asset => this.formatPhoto(asset));
    } catch (error) {
      logger.error('Failed to pick multiple photos', error);
      return [];
    }
  }
}

export const cameraService = new CameraService();
