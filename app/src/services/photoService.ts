import type { MediaInfo } from '@/src/types/entry';
import type { PhotoFileFingerprint } from './photoIntegrityService';
import {
  requestCameraPermission,
  takePhoto,
  pickPhotoFromLibrary,
} from './photo/photoPicker';
import {
  compressPhoto,
  generateThumbnail,
  getPhotoMetadata,
} from './photo/photoProcessor';
import {
  resolvePhotoUri,
  getPreferredPhotoUri,
  getFallbackPhotoUri,
  savePhotoToStorage,
  savePhotoToCache,
  resolveThumbnailUri,
  deletePhoto,
} from './photo/photoStorage';

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
    width: number;
    height: number;
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
  persistedFingerprint?: PhotoFileFingerprint;
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
  static resolvePhotoUri(uri: string): string {
    return resolvePhotoUri(uri);
  }

  static getPreferredPhotoUri(
    media: Pick<MediaInfo, 'uri' | 'remoteUri' | 'thumbnail' | 'remoteThumbnail'>,
    kind: 'thumbnail' | 'full'
  ): string {
    return getPreferredPhotoUri(media, kind);
  }

  static getFallbackPhotoUri(
    media: Pick<MediaInfo, 'uri' | 'remoteUri' | 'thumbnail' | 'remoteThumbnail'>,
    failedUri: string,
    kind: 'thumbnail' | 'full'
  ): string | null {
    return getFallbackPhotoUri(media, failedUri, kind);
  }

  /**
   * 请求相机权限
   */
  static async requestCameraPermission(): Promise<boolean> {
    return requestCameraPermission();
  }

  /**
   * 拍照
   * 保持原始尺寸，不裁剪
   */
  static async takePhoto(): Promise<PhotoResult> {
    return takePhoto();
  }

  /**
   * 从相册选择照片
   * 保持原始尺寸，不裁剪
   */
  static async pickPhotoFromLibrary(
    options?: PickPhotoOptions
  ): Promise<PhotoResult[]> {
    return pickPhotoFromLibrary(options);
  }

  /**
   * 压缩照片
   */
  static async compressPhoto(
    uri: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<CompressedPhoto> {
    return compressPhoto(uri, quality);
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
    return generateThumbnail(uri, maxWidth);
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
    return savePhotoToStorage(sourceUri, entryId, quality, aspectRatio, {
      compressPhoto: this.compressPhoto.bind(this),
      generateThumbnail: this.generateThumbnail.bind(this),
    });
  }

  static async savePhotoToCache(
    sourceUri: string,
    entryId: string,
    quality: 'low' | 'medium' | 'high' = 'medium',
    aspectRatio?: number
  ): Promise<SavedPhotoResult> {
    return savePhotoToCache(sourceUri, entryId, quality, aspectRatio, {
      compressPhoto: this.compressPhoto.bind(this),
      generateThumbnail: this.generateThumbnail.bind(this),
    });
  }

  /**
   * 获取照片元数据
   * 注意：ImageManipulator.manipulateAsync 会创建临时文件，使用后会自动清理
   */
  static async getPhotoMetadata(uri: string): Promise<PhotoMetadata> {
    return getPhotoMetadata(uri);
  }

  /**
   * 删除照片文件
   * @param uri 照片 URI（原图或缩略图路径）
   */
  static async deletePhoto(uri: string): Promise<void> {
    return deletePhoto(uri);
  }

  /**
   * 解析缩略图 URI
   * 根据原图路径获取对应的缩略图路径
   */
  static resolveThumbnailUri(originalUri: string): string | null {
    return resolveThumbnailUri(originalUri);
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
