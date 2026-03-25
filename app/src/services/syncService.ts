/**
 * 数据同步服务
 * 支持：导出 ZIP、从 ZIP 导入（含完整性校验）、iCloud 备份目录信息
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import { Share, Platform } from 'react-native';
import { Entry } from '@/src/types/entry';
import { getMediaPaths } from '@/src/utils/fileSystem';
import { BackupService, BackupManifest } from './backupService';
import { logger } from '@/src/utils/logger';

// 最大备份文件大小：100MB
const MAX_BACKUP_SIZE_BYTES = 100 * 1024 * 1024;

export interface ImportResult {
  success: boolean;
  imported: number;
  total: number;
  error?: string;
}

export interface BackupData {
  exportedAt: string;
  appVersion: string;
  totalEntries: number;
  entries: Partial<Entry & { media: any }>[];
}

/** 解析后的备份数据（包含 ZIP 引用，用于延迟提取媒体） */
interface ParsedBackup {
  data: BackupData;
  zip: JSZip;
}

export class SyncService {
  /**
   * 导出所有记录为 ZIP 并调起系统分享
   */
  static async exportAndShare(entries: Entry[]): Promise<string> {
    const uri = await BackupService.createBackup(entries);
    await Share.share({ url: uri, title: 'DayCapsule 备份' });
    return uri;
  }

  /**
   * 从设备文件选择器导入备份（ZIP 格式）
   * 流程：选文件 → 解压 → 校验完整性 → 返回数据和 ZIP 引用（媒体未提取）
   */
  static async pickAndParseBackup(): Promise<ParsedBackup | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/zip',
        'application/x-zip-compressed',
        'application/octet-stream',
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.length) return null;

    const asset = result.assets[0];
    return this.parseZipBackup(asset.uri);
  }

  /**
   * 解析 ZIP 备份文件
   * 校验顺序：① 文件大小检查 → ② manifest 存在 → ③ data.json 存在 → ④ 条目数一致 → ⑤ 媒体文件完整
   */
  private static async parseZipBackup(uri: string): Promise<ParsedBackup> {
    // ① 预检文件大小，避免大文件导致 OOM
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists && 'size' in fileInfo && fileInfo.size > MAX_BACKUP_SIZE_BYTES) {
      throw new Error(
        `备份文件过大（${(fileInfo.size / 1024 / 1024).toFixed(1)}MB），超过 ${MAX_BACKUP_SIZE_BYTES / 1024 / 1024}MB 上限`
      );
    }

    // 读取 ZIP（base64）
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(base64, { base64: true });
    } catch {
      throw new Error('无法解析备份文件，文件可能已损坏');
    }

    // ① 读取 manifest
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      throw new Error('备份文件损坏：缺少 manifest.json');
    }
    const manifest = JSON.parse(await manifestFile.async('string')) as BackupManifest;

    // ② 读取 data.json
    const dataFile = zip.file('data.json');
    if (!dataFile) {
      throw new Error('备份文件损坏：缺少 data.json');
    }
    const dataContent = await dataFile.async('string');

    // ③ 校验 data.json 字节长度
    const actualDataSize = new TextEncoder().encode(dataContent).length;
    if (actualDataSize !== manifest.dataSize) {
      throw new Error(
        `数据完整性校验失败：data.json 大小不匹配（期望 ${manifest.dataSize} 字节，实际 ${actualDataSize} 字节）`
      );
    }

    const data = JSON.parse(dataContent) as BackupData;
    if (!Array.isArray(data.entries)) {
      throw new Error('无效的备份文件格式：entries 字段缺失');
    }

    // ④ 校验条目数
    if (data.entries.length !== manifest.entryCount) {
      throw new Error(
        `数据完整性校验失败：条目数不匹配（期望 ${manifest.entryCount} 条，实际 ${data.entries.length} 条）`
      );
    }

    // ⑤ 校验媒体文件完整性
    const missingFiles = manifest.mediaFiles.filter(
      (f) => !zip.file(`media/${f}`)
    );
    if (missingFiles.length > 0) {
      throw new Error(
        `备份不完整：${missingFiles.length} 个媒体文件缺失（${missingFiles.slice(0, 3).join(', ')}${missingFiles.length > 3 ? '...' : ''}）`
      );
    }

    logger.log(`📥 ZIP 备份解析完成：${data.entries.length} 条记录，${manifest.mediaFiles.length} 个媒体文件（媒体未提取）`);
    return { data, zip };
  }

  /**
   * 从 ZIP 中提取媒体文件，写入应用媒体目录
   * 公开方法，允许在数据库恢复成功后调用
   */
  static async extractMediaFromZip(
    zip: JSZip,
    entries: BackupData['entries']
  ): Promise<BackupData['entries']> {
    return Promise.all(
      entries.map(async (e) => {
        // 兼容旧格式（单对象）和新格式（数组）
        const mediaArray: any[] = Array.isArray(e.media)
          ? e.media
          : e.media
          ? [e.media]
          : [];

        if (mediaArray.length === 0) return e;

        const processedMedia = await Promise.all(
          mediaArray.map(async (mediaItem: any) => {
            if (!mediaItem?.relativeUri) {
              // 无本地文件可提取（remoteUri 仍可用于显示）
              return mediaItem;
            }

            const zipFile = zip.file(mediaItem.relativeUri as string);
            if (!zipFile) {
              logger.warn(`[restore] ZIP 中找不到媒体文件: ${mediaItem.relativeUri}`);
              return { ...mediaItem, uri: mediaItem.remoteUri ?? mediaItem.uri };
            }

            try {
              const base64 = await zipFile.async('base64');
              const filename = (mediaItem.relativeUri as string).split('/').pop()!;
              const mediaPaths = getMediaPaths();
              const targetDir =
                e.type === 'voice' ? mediaPaths.voiceOriginal : mediaPaths.photoOriginal;

              const dirInfo = await FileSystem.getInfoAsync(targetDir);
              if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
              }

              const targetUri = `${targetDir}${filename}`;
              await FileSystem.writeAsStringAsync(targetUri, base64, {
                encoding: FileSystem.EncodingType.Base64,
              });

              logger.log(`[restore] 媒体文件已恢复: ${filename}`);
              return { ...mediaItem, uri: targetUri };
            } catch (err) {
              logger.warn(`[restore] 无法恢复媒体文件 ${mediaItem.relativeUri}:`, err);
              return { ...mediaItem, uri: mediaItem.remoteUri ?? mediaItem.uri };
            }
          })
        );

        return { ...e, media: processedMedia };
      })
    );
  }

  /**
   * iCloud 备份目录路径（iOS 专用）
   */
  static getICloudBackupPath(): string | null {
    if (Platform.OS !== 'ios') return null;
    return FileSystem.documentDirectory ?? null;
  }

  /**
   * 检查 iCloud 是否可用
   */
  static isICloudAvailable(): boolean {
    return Platform.OS === 'ios' && !!FileSystem.documentDirectory;
  }
}
