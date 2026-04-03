import type { PhotoFileFingerprint } from '../photoIntegrityService';

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
