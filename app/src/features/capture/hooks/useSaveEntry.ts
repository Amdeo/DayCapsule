import {useCallback, useState} from 'react';
import {useDispatch} from 'react-redux';
import {logger} from '@services/telemetry/logger';
import {performanceMonitor} from '@services/telemetry/performance';
import {databaseService} from '@services/storage/database';
import {fileSystemService} from '@services/storage/fileSystem';
import {encryptionService} from '@services/storage/encryption';

export interface SaveEntryParams {
  type: 'photo' | 'text';
  content: string;
  photos?: string[];
  tags: string[];
  mood: string;
  location?: {latitude: number; longitude: number};
  weather?: string;
}

export interface SaveEntryResult {
  entryId: string;
  timestamp: number;
  syncStatus: 'draft' | 'pending' | 'synced';
}

export interface UseSaveEntryReturn {
  saveEntry: (params: SaveEntryParams) => Promise<SaveEntryResult | null>;
  isLoading: boolean;
  error: string | null;
  progress: number; // 0-100
}

/**
 * 记录保存 Hook
 * 处理记录的保存、加密、文件管理等逻辑
 */
export const useSaveEntry = (): UseSaveEntryReturn => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const saveEntry = useCallback(
    async (params: SaveEntryParams): Promise<SaveEntryResult | null> => {
      try {
        performanceMonitor.startMeasure('save_entry');
        setIsLoading(true);
        setError(null);
        setProgress(0);

        // 验证参数
        if (!params.content || params.content.trim().length === 0) {
          throw new Error('记录内容不能为空');
        }

        if (params.type === 'photo' && (!params.photos || params.photos.length === 0)) {
          throw new Error('至少需要一张照片');
        }

        setProgress(10);

        // 处理照片
        let mediaAttachments: Array<{path: string; type: string}> = [];
        if (params.photos && params.photos.length > 0) {
          logger.info(`Processing ${params.photos.length} photos`);

          for (let i = 0; i < params.photos.length; i++) {
            const photoUri = params.photos[i];

            // 保存照片到文件系统
            const savedPath = await fileSystemService.saveMedia(photoUri, 'photo');
            if (savedPath) {
              mediaAttachments.push({
                path: savedPath,
                type: 'image/jpeg',
              });
            }

            setProgress(10 + (i + 1) * (30 / params.photos.length));
          }
        }

        setProgress(40);

        // 加密内容
        const encryptedContent = await encryptionService.encrypt(params.content);
        setProgress(50);

        // 构建数据库记录
        const entryData = {
          type: params.type,
          content: encryptedContent,
          contentPlaintext: params.content, // 用于搜索索引
          tags: params.tags.join(','),
          mood: params.mood,
          latitude: params.location?.latitude,
          longitude: params.location?.longitude,
          weather: params.weather,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          syncStatus: 'draft' as const,
          syncRetryCount: 0,
        };

        // 保存到数据库
        const entryId = await databaseService.insertEntry(entryData);
        if (!entryId) {
          throw new Error('Failed to save entry to database');
        }

        setProgress(70);

        // 保存媒体附件
        if (mediaAttachments.length > 0) {
          for (const attachment of mediaAttachments) {
            await databaseService.insertMediaAttachment({
              entryId,
              mediaPath: attachment.path,
              mediaType: attachment.type,
              createdAt: Date.now(),
            });
          }
        }

        setProgress(85);

        // 保存标签
        if (params.tags.length > 0) {
          for (const tag of params.tags) {
            // 先检查标签是否存在
            let tagId = await databaseService.getTagId(tag);
            if (!tagId) {
              tagId = await databaseService.insertTag({
                name: tag,
                createdAt: Date.now(),
              });
            }

            // 关联标签
            if (tagId) {
              await databaseService.insertEntryTag({
                entryId,
                tagId,
              });
            }
          }
        }

        setProgress(95);

        performanceMonitor.endMeasure('save_entry');
        const duration = performanceMonitor.getMeasure('save_entry');
        logger.info(`Entry saved successfully in ${duration}ms: ${entryId}`);

        setProgress(100);
        setIsLoading(false);

        return {
          entryId,
          timestamp: Date.now(),
          syncStatus: 'draft',
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error(`Failed to save entry: ${errorMessage}`);
        setError(errorMessage);
        setIsLoading(false);
        return null;
      }
    },
    [dispatch],
  );

  return {
    saveEntry,
    isLoading,
    error,
    progress,
  };
};

