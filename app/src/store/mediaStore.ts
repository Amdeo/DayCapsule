/**
 * 媒体文件管理 Store
 * 使用 Zustand 管理媒体文件的缓存和状态
 */

import { create } from 'zustand';
import { MediaFile } from '@/src/types/entry';

interface MediaStore {
  // 状态
  mediaFiles: Map<string, MediaFile>;
  uploadingFiles: Set<string>;
  isLoading: boolean;

  // 操作
  addMediaFile: (file: MediaFile) => void;
  removeMediaFile: (fileId: string) => void;
  updateMediaFile: (fileId: string, updates: Partial<MediaFile>) => void;
  getMediaFile: (fileId: string) => MediaFile | undefined;
  getMediaFilesByEntry: (entryId: string) => MediaFile[];

  // 上传管理
  setUploading: (fileId: string, isUploading: boolean) => void;
  isUploading: (fileId: string) => boolean;

  // 缓存管理
  clearCache: () => void;
  getStorageStats: () => {
    totalFiles: number;
    totalSize: number;
    byType: Record<string, { count: number; size: number }>;
  };
}

export const useMediaStore = create<MediaStore>((set, get) => ({
  mediaFiles: new Map(),
  uploadingFiles: new Set(),
  isLoading: false,

  /**
   * 添加媒体文件
   */
  addMediaFile: (file) => {
    set((state) => {
      const newFiles = new Map(state.mediaFiles);
      newFiles.set(file.id, file);
      return { mediaFiles: newFiles };
    });
  },

  /**
   * 移除媒体文件
   */
  removeMediaFile: (fileId) => {
    set((state) => {
      const newFiles = new Map(state.mediaFiles);
      newFiles.delete(fileId);
      return { mediaFiles: newFiles };
    });
  },

  /**
   * 更新媒体文件
   */
  updateMediaFile: (fileId, updates) => {
    set((state) => {
      const file = state.mediaFiles.get(fileId);
      if (!file) return state;

      const newFiles = new Map(state.mediaFiles);
      newFiles.set(fileId, { ...file, ...updates });
      return { mediaFiles: newFiles };
    });
  },

  /**
   * 获取媒体文件
   */
  getMediaFile: (fileId) => {
    return get().mediaFiles.get(fileId);
  },

  /**
   * 获取特定 entry 关联的所有媒体文件
   */
  getMediaFilesByEntry: (entryId) => {
    const { mediaFiles } = get();
    const result: MediaFile[] = [];

    for (const file of mediaFiles.values()) {
      if (file.entryId === entryId) {
        result.push(file);
      }
    }

    return result;
  },

  /**
   * 设置文件上传状态
   */
  setUploading: (fileId, isUploading) => {
    set((state) => {
      const newUploading = new Set(state.uploadingFiles);
      if (isUploading) {
        newUploading.add(fileId);
      } else {
        newUploading.delete(fileId);
      }
      return { uploadingFiles: newUploading };
    });
  },

  /**
   * 检查文件是否正在上传
   */
  isUploading: (fileId) => {
    return get().uploadingFiles.has(fileId);
  },

  /**
   * 清空缓存
   */
  clearCache: () => {
    set({
      mediaFiles: new Map(),
      uploadingFiles: new Set(),
      isLoading: false,
    });
  },

  /**
   * 获取存储统计
   */
  getStorageStats: () => {
    const { mediaFiles } = get();
    let totalSize = 0;
    const byType: Record<string, { count: number; size: number }> = {
      photo: { count: 0, size: 0 },
      voice: { count: 0, size: 0 },
      video: { count: 0, size: 0 },
    };

    for (const file of mediaFiles.values()) {
      totalSize += file.size;
      byType[file.type].count += 1;
      byType[file.type].size += file.size;
    }

    return {
      totalFiles: mediaFiles.size,
      totalSize,
      byType,
    };
  },
}));
