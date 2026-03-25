/**
 * 本地自动备份服务
 * 备份格式：ZIP 压缩包，包含 manifest.json + data.json + media/ 子目录
 * 完整性校验：manifest 记录条目数、媒体文件列表和 data.json 字节长度
 */

import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import { Platform, Share } from 'react-native';
import { Entry } from '@/src/types/entry';
import { Storage } from '@/src/utils/storage';
import { logger } from '@/src/utils/logger';
import { PhotoService } from './photoService';
import { VoiceService } from './voiceService';

const BACKUP_DIR = `${FileSystem.documentDirectory}backups/`;
const LAST_BACKUP_KEY = 'backup:lastTime';
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 小时
const MAX_BACKUPS = 7;
const MAX_SAVE_NAME_ATTEMPTS = 50;

export interface BackupManifest {
  version: string;
  exportedAt: string;
  appVersion: string;
  entryCount: number;
  mediaFiles: string[];   // media/ 目录下的文件名列表
  dataSize: number;       // data.json 的字节长度（完整性校验用）
}

export interface SaveBackupResult {
  saved: boolean;
  canceled: boolean;
  fileName: string | null;
}

export class BackupService {
  private static splitFileName(fileName: string): { baseName: string; extension: string } {
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex <= 0) {
      return { baseName: fileName, extension: '' };
    }
    return {
      baseName: fileName.slice(0, dotIndex),
      extension: fileName.slice(dotIndex),
    };
  }

  private static buildCandidateFileName(fileName: string, attempt: number): string {
    if (attempt === 0) {
      return fileName;
    }
    const { baseName, extension } = this.splitFileName(fileName);
    return `${baseName} (${attempt})${extension}`;
  }

  private static isFileAlreadyExistsError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    const message = error.message.toLowerCase();
    return message.includes('exists') || message.includes('already');
  }

  /** 确保备份根目录存在 */
  static async ensureBackupDir(): Promise<void> {
    const info = await FileSystem.getInfoAsync(BACKUP_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
    }
  }

  /**
   * 创建 ZIP 备份，返回 .zip 文件 URI
   * ZIP 结构：
   *   manifest.json  — 完整性元数据
   *   data.json      — 所有条目（含 media.relativeUri）
   *   media/         — 实际媒体文件
   */
  static async createBackup(entries: Entry[]): Promise<string> {
    await this.ensureBackupDir();

    const zip = new JSZip();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipUri = `${BACKUP_DIR}backup_${timestamp}.zip`;
    const mediaFiles: string[] = [];

    // 构建导出条目，同时将媒体文件写入 zip
    const exportEntries = await Promise.all(
      entries.map(async (e) => {
        const mediaExports: Record<string, unknown>[] = [];

        for (const mediaItem of e.media ?? []) {
          if (!mediaItem.uri) continue;

          try {
            const resolvedUri =
              e.type === 'voice'
                ? VoiceService.resolveAudioUri(mediaItem.uri)
                : PhotoService.resolvePhotoUri(mediaItem.uri);

            const fileInfo = await FileSystem.getInfoAsync(resolvedUri);

            if (fileInfo.exists) {
              const fname = resolvedUri.split('/').pop()!;
              const base64 = await FileSystem.readAsStringAsync(resolvedUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              zip.file(`media/${fname}`, base64, { base64: true });
              mediaFiles.push(fname);
              mediaExports.push({
                ...mediaItem,
                relativeUri: `media/${fname}`,
              });
            } else if (mediaItem.remoteUri) {
              // 本地文件不存在（云端恢复的 entry），保留完整 mediaItem 含 remoteUri
              mediaExports.push({ ...mediaItem });
            } else {
              mediaExports.push({ mimeType: mediaItem.mimeType, size: mediaItem.size });
            }
          } catch {
            if (mediaItem.remoteUri) {
              mediaExports.push({ ...mediaItem });
            } else {
              mediaExports.push({ mimeType: mediaItem.mimeType, size: mediaItem.size });
            }
          }
        }

        return {
          id: e.id,
          type: e.type,
          content: e.content,
          tags: e.tags ?? [],
          timestamp: e.timestamp,
          transcription: e.transcription,
          media: mediaExports.length > 0 ? mediaExports : undefined,
        };
      })
    );

    const dataJson = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        appVersion: '1.0.0',
        totalEntries: entries.length,
        entries: exportEntries,
      },
      null,
      2
    );

    zip.file('data.json', dataJson);

    // manifest：用于导入时完整性校验
    const manifest: BackupManifest = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      entryCount: entries.length,
      mediaFiles,
      dataSize: new TextEncoder().encode(dataJson).length,
    };
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    // 生成 ZIP（DEFLATE 压缩）
    const zipBase64 = await zip.generateAsync({
      type: 'base64',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    await FileSystem.writeAsStringAsync(zipUri, zipBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Storage.setString(LAST_BACKUP_KEY, String(Date.now()));
    await this.pruneOldBackups(MAX_BACKUPS);

    logger.log('✅ ZIP 备份完成:', zipUri);
    return zipUri;
  }

  /** 获取上次备份时间戳（毫秒），未备份过返回 null */
  static async getLastBackupTime(): Promise<number | null> {
    const val = await Storage.getString(LAST_BACKUP_KEY);
    return val ? Number(val) : null;
  }

  /** 判断是否需要执行备份（距上次超过 24 小时） */
  static async shouldBackup(): Promise<boolean> {
    const last = await this.getLastBackupTime();
    if (!last) return true;
    return Date.now() - last > BACKUP_INTERVAL_MS;
  }

  /** 将内部 file:// URI 转为 Android 可分享的 content:// URI */
  static async getAndroidShareableUri(fileUri: string): Promise<string> {
    if (Platform.OS !== 'android') {
      return fileUri;
    }
    return FileSystem.getContentUriAsync(fileUri);
  }

  /** 通过系统分享面板导出备份（当前用于 iOS） */
  static async shareBackup(fileUri: string): Promise<void> {
    await Share.share({
      title: 'DayCapsule 备份',
      url: fileUri,
    });
  }

  /** 将备份保存到用户选择的目录（Android SAF） */
  static async saveBackupToUserDirectory(
    fileUri: string,
    fileName: string
  ): Promise<SaveBackupResult> {
    const permissions =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

    if (!permissions.granted || !permissions.directoryUri) {
      return { saved: false, canceled: true, fileName: null };
    }

    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    for (let attempt = 0; attempt < MAX_SAVE_NAME_ATTEMPTS; attempt += 1) {
      const candidateName = this.buildCandidateFileName(fileName, attempt);
      const { baseName } = this.splitFileName(candidateName);

      try {
        const targetUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          baseName,
          'application/zip'
        );
        await FileSystem.StorageAccessFramework.writeAsStringAsync(targetUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return { saved: true, canceled: false, fileName: candidateName };
      } catch (error) {
        if (this.isFileAlreadyExistsError(error)) {
          continue;
        }
        throw error;
      }
    }

    throw new Error('无法在所选目录创建备份文件，请更换目录后重试');
  }

  /** 保留最近 keep 个备份，删除旧文件（兼容旧版文件夹格式） */
  static async pruneOldBackups(keep: number): Promise<void> {
    try {
      const items = await FileSystem.readDirectoryAsync(BACKUP_DIR);

      // 新格式：.zip 文件
      const zips = items.filter((f) => f.startsWith('backup_') && f.endsWith('.zip')).sort().reverse();
      for (const f of zips.slice(keep)) {
        await FileSystem.deleteAsync(`${BACKUP_DIR}${f}`, { idempotent: true });
      }

      // 旧格式：文件夹 / .json 文件（一并清理）
      const legacy = items.filter(
        (f) => f.startsWith('backup_') && !f.endsWith('.zip')
      );
      for (const f of legacy) {
        await FileSystem.deleteAsync(`${BACKUP_DIR}${f}`, { idempotent: true });
      }
    } catch {
      // 静默失败
    }
  }

  /** 列出所有本地 ZIP 备份（最新在前） */
  static async listBackups(): Promise<{ name: string; uri: string; sizeBytes?: number }[]> {
    try {
      await this.ensureBackupDir();
      const items = await FileSystem.readDirectoryAsync(BACKUP_DIR);
      const zips = items
        .filter((f) => f.startsWith('backup_') && f.endsWith('.zip'))
        .sort()
        .reverse();

      const results = await Promise.all(
        zips.map(async (f) => {
          const uri = `${BACKUP_DIR}${f}`;
          const info = await FileSystem.getInfoAsync(uri);
          return {
            name: f,
            uri,
            sizeBytes:
              info.exists && 'size' in info
                ? (info as { exists: true; size: number; uri: string; isDirectory: boolean; modificationTime: number }).size
                : undefined,
          };
        })
      );

      return results;
    } catch {
      return [];
    }
  }
}
