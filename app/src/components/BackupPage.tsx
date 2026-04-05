import React from 'react';
import { View } from 'react-native';
import { useEntryStore } from '@/src/store/entryStore';
import { DetailPageShell } from './DetailPageShell';
import { BackupExportSheet } from './BackupExportSheet';
import {
  BackupActionSection,
  BackupHistorySection,
  BackupPageSectionTitle,
  BackupStorageSection,
} from './backup-page/BackupPageSections';
import { useBackupPageController } from './backup-page/useBackupPageController';

interface BackupPageProps {
  visible: boolean;
  onClose: () => void;
}

export function BackupPage({ visible, onClose }: BackupPageProps) {
  const { entries, restoreEntries, updateEntry } = useEntryStore();
  const {
    usedSpace,
    isExporting,
    isImporting,
    backupFiles,
    lastBackupTime,
    exportTarget,
    showExportSheet,
    primaryActionLabel,
    handleExport,
    openExportSheet,
    closeExportSheet,
    handleExportPrimaryAction,
    handleImport,
  } = useBackupPageController({
    visible,
    entries,
    restoreEntries,
    updateEntry,
  });

  return (
    <DetailPageShell visible={visible} title="备份与同步" onClose={onClose}>
      <View testID="backup-page-root">
        <BackupPageSectionTitle>本地存储</BackupPageSectionTitle>
        <BackupStorageSection
          usedSpace={usedSpace}
          entryCount={entries.length}
          lastBackupTime={lastBackupTime}
        />

        <BackupPageSectionTitle>本地备份</BackupPageSectionTitle>
        <BackupActionSection
          title="导出为 ZIP"
          subtitle="将所有记录和媒体文件打包为 ZIP，可保存到文件 App 或通过邮件发送"
          icon="download-outline"
          iconColor="#6A89CC"
          buttonLabel={isExporting ? '导出中...' : '导出'}
          disabled={isExporting}
          onPress={handleExport}
        />

        {backupFiles.length > 0 ? (
          <>
            <BackupPageSectionTitle>备份历史</BackupPageSectionTitle>
            <BackupHistorySection
              backupFiles={backupFiles}
              onOpenExportSheet={openExportSheet}
            />
          </>
        ) : null}

        <BackupPageSectionTitle>导入备份</BackupPageSectionTitle>
        <BackupActionSection
          title="从文件导入"
          subtitle="选择之前导出的 JSON 备份文件，恢复记录（已存在的记录将跳过）"
          icon="cloud-upload-outline"
          iconColor="#F5A623"
          iconBackgroundColor="#FFF3E0"
          buttonColor="#F5A623"
          buttonLabel={isImporting ? '导入中...' : '导入'}
          disabled={isImporting}
          onPress={handleImport}
        />
      </View>

      <BackupExportSheet
        visible={showExportSheet}
        fileName={exportTarget?.name ?? ''}
        primaryActionLabel={primaryActionLabel}
        onSaveToFiles={handleExportPrimaryAction}
        onClose={closeExportSheet}
      />
    </DetailPageShell>
  );
}
