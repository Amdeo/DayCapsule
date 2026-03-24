/**
 * 文件系统管理工具
 * 统一处理媒体文件的保存、删除和检索
 */

import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '@/src/utils/logger';
import { getCurrentServerUrlSync, getServerKey } from '@/src/services/backendEnvironmentService';

/**
 * 应用文件目录路径
 */
export const MEDIA_DIRS = {
  // 文档目录（备份、持久化）
  documents: FileSystem.documentDirectory || '',

  // 缓存目录（临时、可被清除）
  cache: FileSystem.cacheDirectory || '',

  // 临时目录（最快、最容易被清除）- 如果不可用则使用缓存目录
  temp: FileSystem.cacheDirectory || '',
};

export interface MediaPaths {
  photoOriginal: string;
  photoDisplay: string;
  photoThumbnail: string;
  voiceOriginal: string;
  voiceCompressed: string;
  temp: string;
  database: string;
}

const DEFAULT_SERVER_SCOPE = 'env_default';

const getCurrentServerScope = (): string => {
  const serverUrl = getCurrentServerUrlSync();
  return serverUrl ? getServerKey(serverUrl) : DEFAULT_SERVER_SCOPE;
};

const joinDir = (baseDir: string, relativePath: string): string => `${baseDir}${relativePath}`;

/**
 * 媒体存储路径配置
 */
export const getMediaPaths = (): MediaPaths => {
  const scope = getCurrentServerScope();
  const documentsBase = joinDir(MEDIA_DIRS.documents, `environments/${scope}/`);
  const cacheBase = joinDir(MEDIA_DIRS.cache, `environments/${scope}/`);
  const tempBase = joinDir(MEDIA_DIRS.temp, `environments/${scope}/`);

  return {
    photoOriginal: `${documentsBase}media/photos/original/`,
    photoDisplay: `${cacheBase}media/photos/display/`,
    photoThumbnail: `${cacheBase}media/photos/thumbnails/`,
    voiceOriginal: `${documentsBase}media/voice/original/`,
    voiceCompressed: `${cacheBase}media/voice/compressed/`,
    temp: `${tempBase}media/temp/`,
    database: `${documentsBase}db/`,
  };
};

export const MEDIA_PATHS = getMediaPaths();

/**
 * 确保目录存在
 */
export async function ensureDirectories(): Promise<void> {
  const directories = Object.values(getMediaPaths());
  await Promise.all(
    directories.map(async (dir) => {
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
    })
  );
}

/**
 * 获取文件信息
 */
export async function getFileInfo(
  uri: string
): Promise<{ size: number; exists: boolean }> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return {
      exists: info.exists,
      size: info.exists ? (info as any).size || 0 : 0,
    };
  } catch (error) {
    logger.error('Failed to get file info:', error);
    return { exists: false, size: 0 };
  }
}

/**
 * 复制文件到目标目录
 */
export async function copyFile(
  sourceUri: string,
  targetDir: string,
  filename: string
): Promise<string> {
  try {
    const targetUri = `${targetDir}${filename}`;

    // 确保目标目录存在
    const dirInfo = await FileSystem.getInfoAsync(targetDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    }

    await FileSystem.copyAsync({
      from: sourceUri,
      to: targetUri,
    });

    return targetUri;
  } catch (error) {
    logger.error('Failed to copy file:', error);
    throw error;
  }
}

/**
 * 删除文件
 */
export async function deleteFile(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (error) {
    logger.error('Failed to delete file:', error);
    // 不抛出错误，删除失败不应该中断流程
  }
}

/**
 * 删除目录及其内容
 */
export async function deleteDirectory(dirUri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(dirUri);
    if (info.exists && info.isDirectory) {
      await FileSystem.deleteAsync(dirUri, { idempotent: true });
    }
  } catch (error) {
    logger.error('Failed to delete directory:', error);
  }
}

/**
 * 获取目录大小
 */
export async function getDirectorySize(dirUri: string): Promise<number> {
  try {
    const files = await FileSystem.readDirectoryAsync(dirUri);
    const sizes = await Promise.all(
      files.map(async (file) => {
        const fileUri = `${dirUri}${file}`;
        const info = await FileSystem.getInfoAsync(fileUri);
        if (info.isDirectory) return getDirectorySize(fileUri);
        return info.exists ? (info as any).size || 0 : 0;
      })
    );
    return sizes.reduce((sum, s) => sum + s, 0);
  } catch (error) {
    logger.error('Failed to get directory size:', error);
    return 0;
  }
}

/**
 * 清空目录
 */
export async function clearDirectory(dirUri: string): Promise<void> {
  try {
    const files = await FileSystem.readDirectoryAsync(dirUri);

    for (const file of files) {
      const fileUri = `${dirUri}${file}`;
      await deleteFile(fileUri);
    }
  } catch (error) {
    logger.error('Failed to clear directory:', error);
  }
}

/**
 * 获取存储统计信息
 */
export async function getStorageStats(): Promise<{
  photoSize: number;
  voiceSize: number;
  databaseSize: number;
  cacheSize: number;
  totalSize: number;
  available: number;
}> {
  try {
    const mediaPaths = getMediaPaths();
    const [photoOriginalSize, photoDisplaySize, voiceOriginalSize, voiceCompressedSize, databaseSize, tempSize] =
      await Promise.all([
        getDirectorySize(mediaPaths.photoOriginal),
        getDirectorySize(mediaPaths.photoDisplay),
        getDirectorySize(mediaPaths.voiceOriginal),
        getDirectorySize(mediaPaths.voiceCompressed),
        getDirectorySize(mediaPaths.database),
        getDirectorySize(mediaPaths.temp),
      ]);

    return {
      photoSize: photoOriginalSize + photoDisplaySize,
      voiceSize: voiceOriginalSize + voiceCompressedSize,
      databaseSize,
      cacheSize: tempSize,
      totalSize:
        photoOriginalSize +
        photoDisplaySize +
        voiceOriginalSize +
        voiceCompressedSize +
        databaseSize +
        tempSize,
      available: -1, // TODO: 实现可用空间查询
    };
  } catch (error) {
    logger.error('Failed to get storage stats:', error);
    return {
      photoSize: 0,
      voiceSize: 0,
      databaseSize: 0,
      cacheSize: 0,
      totalSize: 0,
      available: 0,
    };
  }
}

/**
 * 生成唯一的文件名
 */
export function generateUniqueFilename(entryId: string, type: string, ext: string): string {
  const timestamp = Date.now();
  return `${entryId}_${timestamp}.${ext}`;
}

/**
 * 获取 MIME 类型
 */
export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    m4a: 'audio/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    aac: 'audio/aac',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 格式化文件大小（人类可读）
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 验证文件存在
 */
export async function fileExists(uri: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
}

/**
 * 初始化文件系统
 * 应在应用启动时调用
 */
export async function initializeFileSystem(): Promise<void> {
  try {
    await ensureDirectories();
    logger.log('✅ File system initialized');
  } catch (error) {
    logger.error('❌ Failed to initialize file system:', error);
  }
}
