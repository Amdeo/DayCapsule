import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import {
  buildBackupCreateFailedFeedback,
  buildBackupExportFailedFeedback,
  buildBackupImportFailedFeedback,
} from '@/src/services/errorFeedbackPresets';
import { getStorageStats } from '@/src/utils/fileSystem';
import { BackupService } from '@/src/services/backupService';
import { SyncService } from '@/src/services/syncService';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { logger } from '@/src/utils/logger';
import type { Entry } from '@/src/types/entry';
import { getFileNameFromUri } from './backupPageHelpers';
import type { BackupFile, ExportTarget } from './backupPageTypes';
import type { BackupEntryInput } from '@/src/services/syncService';

interface UseBackupPageControllerOptions {
  visible: boolean;
  entries: Entry[];
  restoreEntries: (entries: Entry[]) => Promise<string[]>;
  updateEntry: (id: string, updates: Partial<Entry>) => Promise<void> | void;
}

function toRestorableEntries(entries: BackupEntryInput[]): Entry[] {
  return entries.map((entry) => ({
    ...entry,
    media: SyncService.getMediaInfoArray(entry.media),
  }));
}

function formatUsedSpace(totalSize: number) {
  const mb = totalSize / (1024 * 1024);
  return mb < 0.1 ? '< 0.1 MB' : `${mb.toFixed(1)} MB`;
}

export function useBackupPageController({
  visible,
  entries,
  restoreEntries,
  updateEntry,
}: UseBackupPageControllerOptions) {
  const [usedSpace, setUsedSpace] = useState('计算中...');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingToFiles, setIsSavingToFiles] = useState(false);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [lastBackupTime, setLastBackupTime] = useState<number | null>(null);
  const [exportTarget, setExportTarget] = useState<ExportTarget>(null);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const primaryActionLabel = process.env.EXPO_OS === 'ios' ? '导出/分享' : '保存到文件';

  const refreshStorageInfo = useCallback(async () => {
    try {
      const stats = await getStorageStats();
      setUsedSpace(formatUsedSpace(stats.totalSize));
    } catch {
      setUsedSpace('未知');
    }
  }, []);

  const refreshBackupInfo = useCallback(async () => {
    const files = await BackupService.listBackups();
    const backupTime = await BackupService.getLastBackupTime();
    setBackupFiles(files.slice(0, 3));
    setLastBackupTime(backupTime);
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    void refreshStorageInfo();
    void refreshBackupInfo();
  }, [refreshBackupInfo, refreshStorageInfo, visible]);

  const openExportSheet = useCallback((target: NonNullable<ExportTarget>) => {
    setExportTarget(target);
    setShowExportSheet(true);
  }, []);

  const closeExportSheet = useCallback(() => {
    setShowExportSheet(false);
    setExportTarget(null);
  }, []);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const uri = await BackupService.createBackup(entries);
      await refreshBackupInfo();
      openExportSheet({ name: getFileNameFromUri(uri), uri });
    } catch {
      showErrorFeedback(buildBackupCreateFailedFeedback());
    } finally {
      setIsExporting(false);
    }
  }, [entries, openExportSheet, refreshBackupInfo]);

  const handleExportPrimaryAction = useCallback(async () => {
    if (!exportTarget) {
      return;
    }

    setIsSavingToFiles(true);
    try {
      if (process.env.EXPO_OS === 'ios') {
        await BackupService.shareBackup(exportTarget.uri);
        closeExportSheet();
        return;
      }

      const result = await BackupService.saveBackupToUserDirectory(
        exportTarget.uri,
        exportTarget.name,
      );
      if (result.canceled) {
        return;
      }
      if (result.saved && result.fileName) {
        Alert.alert('保存成功', `备份已保存为 ${result.fileName}`);
        closeExportSheet();
        return;
      }
      showErrorFeedback(buildBackupExportFailedFeedback());
    } catch {
      showErrorFeedback(buildBackupExportFailedFeedback());
    } finally {
      setIsSavingToFiles(false);
    }
  }, [closeExportSheet, exportTarget]);

  const handleImport = useCallback(async () => {
    setIsImporting(true);

    try {
      const parsedBackup = await SyncService.pickAndParseBackup();
      if (!parsedBackup) {
        return;
      }

      const { data, zip } = parsedBackup;
      const insertedIds = await restoreEntries(toRestorableEntries(data.entries));

      if (insertedIds.length > 0) {
        try {
          const entriesWithMedia = await SyncService.extractMediaFromZip(
            zip,
            data.entries,
          );
          const insertedIdSet = new Set(insertedIds);

          for (const entry of entriesWithMedia) {
            const hasRestoredMedia = Array.isArray(entry.media)
              ? entry.media.length > 0
              : Boolean(entry.media);

            if (entry.id && insertedIdSet.has(entry.id) && hasRestoredMedia) {
              await updateEntry(entry.id, {
                media: entry.media,
              });
            }
          }
        } catch (mediaError) {
          logger.warn('[BackupPage] 媒体文件提取失败:', mediaError);
          Alert.alert(
            '部分恢复',
            `已恢复 ${insertedIds.length} 条记录，但部分媒体文件未能还原。您可以重新导入备份尝试恢复媒体。`,
          );
          await refreshBackupInfo();
          return;
        }
      }

      await refreshBackupInfo();
      Alert.alert('导入成功', `已恢复 ${insertedIds.length} / ${data.entries.length} 条记录`);
    } catch (error: any) {
      showErrorFeedback(buildBackupImportFailedFeedback(error));
    } finally {
      setIsImporting(false);
    }
  }, [refreshBackupInfo, restoreEntries, updateEntry]);

  return {
    usedSpace,
    isExporting,
    isImporting,
    backupFiles,
    lastBackupTime,
    exportTarget,
    showExportSheet,
    primaryActionLabel,
    refreshBackupInfo,
    handleExport,
    openExportSheet,
    closeExportSheet,
    handleExportPrimaryAction,
    handleImport,
  };
}
