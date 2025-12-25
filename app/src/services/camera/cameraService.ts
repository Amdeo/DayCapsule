import { Platform, Alert } from 'react-native';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import RNFS from 'react-native-fs';
import { ImageResize } from 'react-native-image-resizer';
import { v4 as uuidv4 } from 'uuid';

export interface CameraOptions {
  mediaType: 'photo' | 'video' | 'mixed';
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  includeBase64?: boolean;
  saveToPhotos?: boolean;
  durationLimit?: number; // 视频录制时长限制
}

export interface CameraResult {
  uri: string;
  fileName: string;
  fileSize: number;
  type: string;
  width?: number;
  height?: number;
  base64?: string;
  duration?: number; // 视频时长
}

class CameraService {
  private readonly CAMERA_PERMISSION = Platform.select({
    ios: PERMISSIONS.IOS.CAMERA,
    android: PERMISSIONS.ANDROID.CAMERA,
  });

  private readonly PHOTO_LIBRARY_PERMISSION = Platform.select({
    ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
    android: PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
  });

  /**
   * 检查相机权限
   */
  async checkCameraPermission(): Promise<boolean> {
    try {
      const permission = await request(this.CAMERA_PERMISSION!);
      return permission === RESULTS.GRANTED;
    } catch (error) {
      console.error('检查相机权限失败:', error);
      return false;
    }
  }

  /**
   * 检查相册权限
   */
  async checkPhotoLibraryPermission(): Promise<boolean> {
    try {
      const permission = await request(this.PHOTO_LIBRARY_PERMISSION!);
      return permission === RESULTS.GRANTED;
    } catch (error) {
      console.error('检查相册权限失败:', error);
      return false;
    }
  }

  /**
   * 请求所有必要的权限
   */
  async requestPermissions(): Promise<{
    camera: boolean;
    photoLibrary: boolean;
  }> {
    const [cameraPermission, photoLibraryPermission] = await Promise.all([
      this.checkCameraPermission(),
      this.checkPhotoLibraryPermission(),
    ]);

    return {
      camera: cameraPermission,
      photoLibrary: photoLibraryPermission,
    };
  }

  /**
   * 拍摄照片
   */
  async takePhoto(options?: Partial<CameraOptions>): Promise<CameraResult> {
    // 检查权限
    const hasPermission = await this.checkCameraPermission();
    if (!hasPermission) {
      throw new Error('没有相机权限');
    }

    const defaultOptions: CameraOptions = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
      saveToPhotos: false,
    };

    const cameraOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      launchCamera(cameraOptions, (response: ImagePickerResponse) => {
        if (response.didCancel) {
          reject(new Error('用户取消了拍摄'));
          return;
        }

        if (response.errorCode) {
          reject(new Error(response.errorMessage || '拍摄失败'));
          return;
        }

        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          const result: CameraResult = {
            uri: asset.uri!,
            fileName: asset.fileName || `photo_${Date.now()}.jpg`,
            fileSize: asset.fileSize || 0,
            type: asset.type || 'image/jpeg',
            width: asset.width,
            height: asset.height,
            base64: asset.base64,
          };

          resolve(result);
        } else {
          reject(new Error('没有获取到图像数据'));
        }
      });
    });
  }

  /**
   * 从相册选择照片
   */
  async selectFromGallery(options?: Partial<CameraOptions>): Promise<CameraResult> {
    // 检查权限
    const hasPermission = await this.checkPhotoLibraryPermission();
    if (!hasPermission) {
      throw new Error('没有相册访问权限');
    }

    const defaultOptions: CameraOptions = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
      saveToPhotos: false,
    };

    const galleryOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      launchImageLibrary(galleryOptions, (response: ImagePickerResponse) => {
        if (response.didCancel) {
          reject(new Error('用户取消了选择'));
          return;
        }

        if (response.errorCode) {
          reject(new Error(response.errorMessage || '选择失败'));
          return;
        }

        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          const result: CameraResult = {
            uri: asset.uri!,
            fileName: asset.fileName || `gallery_${Date.now()}.jpg`,
            fileSize: asset.fileSize || 0,
            type: asset.type || 'image/jpeg',
            width: asset.width,
            height: asset.height,
            base64: asset.base64,
          };

          resolve(result);
        } else {
          reject(new Error('没有获取到图像数据'));
        }
      });
    });
  }

  /**
   * 批量选择照片
   */
  async selectMultiplePhotos(maxCount: number = 9): Promise<CameraResult[]> {
    const hasPermission = await this.checkPhotoLibraryPermission();
    if (!hasPermission) {
      throw new Error('没有相册访问权限');
    }

    const options: CameraOptions = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
    };

    return new Promise((resolve, reject) => {
      launchImageLibrary(
        {
          ...options,
          selectionLimit: maxCount,
        },
        (response: ImagePickerResponse) => {
          if (response.didCancel) {
            reject(new Error('用户取消了选择'));
            return;
          }

          if (response.errorCode) {
            reject(new Error(response.errorMessage || '选择失败'));
            return;
          }

          if (response.assets && response.assets.length > 0) {
            const results: CameraResult[] = response.assets.map(asset => ({
              uri: asset.uri!,
              fileName: asset.fileName || `gallery_${Date.now()}.jpg`,
              fileSize: asset.fileSize || 0,
              type: asset.type || 'image/jpeg',
              width: asset.width,
              height: asset.height,
              base64: asset.base64,
            }));

            resolve(results);
          } else {
            reject(new Error('没有获取到图像数据'));
          }
        }
      );
    });
  }

  /**
   * 录制视频
   */
  async recordVideo(options?: Partial<CameraOptions>): Promise<CameraResult> {
    const hasPermission = await this.checkCameraPermission();
    if (!hasPermission) {
      throw new Error('没有相机权限');
    }

    const defaultOptions: CameraOptions = {
      mediaType: 'video',
      quality: 0.8,
      durationLimit: 60, // 最多录制60秒
    };

    const videoOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      launchCamera(videoOptions, (response: ImagePickerResponse) => {
        if (response.didCancel) {
          reject(new Error('用户取消了录制'));
          return;
        }

        if (response.errorCode) {
          reject(new Error(response.errorMessage || '录制失败'));
          return;
        }

        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          const result: CameraResult = {
            uri: asset.uri!,
            fileName: asset.fileName || `video_${Date.now()}.mp4`,
            fileSize: asset.fileSize || 0,
            type: asset.type || 'video/mp4',
            width: asset.width,
            height: asset.height,
            duration: asset.duration,
          };

          resolve(result);
        } else {
          reject(new Error('没有获取到视频数据'));
        }
      });
    });
  }

  /**
   * 压缩图像
   */
  async compressImage(
    uri: string,
    quality: number = 0.8,
    maxWidth?: number,
    maxHeight?: number
  ): Promise<string> {
    try {
      const compressedUri = await ImageResize.createResizedImage(
        uri,
        maxWidth || 1920,
        maxHeight || 1080,
        'JPEG',
        quality * 100,
        0,
        undefined,
        false,
        { mode: 'contain', onlyScaleDown: false },
        80
      );

      return compressedUri.uri;
    } catch (error) {
      console.error('图像压缩失败:', error);
      return uri; // 返回原始图像
    }
  }

  /**
   * 生成缩略图
   */
  async generateThumbnail(uri: string, size: number = 200): Promise<string> {
    try {
      const thumbnailUri = await ImageResize.createResizedImage(
        uri,
        size,
        size,
        'JPEG',
        70, // 较低质量用于缩略图
        0,
        undefined,
        false,
        { mode: 'cover', onlyScaleDown: false }
      );

      return thumbnailUri.uri;
    } catch (error) {
      console.error('缩略图生成失败:', error);
      throw error;
    }
  }

  /**
   * 保存图像到应用目录
   */
  async saveImageToAppDirectory(imageUri: string, fileName?: string): Promise<string> {
    try {
      const appDirectory = `${RNFS.DocumentDirectoryPath}/images`;
      
      // 确保目录存在
      await RNFS.mkdir(appDirectory).catch(() => {});

      const finalFileName = fileName || `${uuidv4()}.jpg`;
      const destinationPath = `${appDirectory}/${finalFileName}`;

      // 复制文件
      await RNFS.copyFile(imageUri, destinationPath);

      return destinationPath;
    } catch (error) {
      console.error('保存图像失败:', error);
      throw error;
    }
  }

  /**
   * 获取图像信息
   */
  async getImageInfo(uri: string): Promise<{
    size: number;
    exists: boolean;
    isDirectory: boolean;
  }> {
    try {
      const stats = await RNFS.stat(uri);
      return {
        size: stats.size,
        exists: true,
        isDirectory: stats.isDirectory(),
      };
    } catch (error) {
      return {
        size: 0,
        exists: false,
        isDirectory: false,
      };
    }
  }

  /**
   * 删除图像文件
   */
  async deleteImage(uri: string): Promise<void> {
    try {
      await RNFS.unlink(uri);
    } catch (error) {
      console.error('删除图像失败:', error);
      throw error;
    }
  }

  /**
   * 检查相机是否可用
   */
  isCameraAvailable(): boolean {
    return Platform.OS === 'android' || Platform.OS === 'ios';
  }

  /**
   * 获取支持的媒体类型
   */
  getSupportedMediaTypes(): string[] {
    return ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
  }

  /**
   * 显示权限请求对话框
   */
  showPermissionAlert(permissionType: 'camera' | 'gallery'): void {
    const messages = {
      camera: {
        title: '需要相机权限',
        message: '应用需要访问相机来拍摄照片和录制视频。',
        button: '去设置',
      },
      gallery: {
        title: '需要相册权限',
        message: '应用需要访问相册来选择照片。',
        button: '去设置',
      },
    };

    const config = messages[permissionType];

    Alert.alert(
      config.title,
      config.message,
      [
        { text: '取消', style: 'cancel' },
        {
          text: config.button,
          onPress: () => {
            // 在实际应用中，这里会打开系统设置
            // Linking.openSettings();
          },
        },
      ]
    );
  }
}

// 单例实例
export const cameraService = new CameraService();
export default cameraService;
