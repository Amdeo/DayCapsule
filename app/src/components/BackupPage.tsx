/**
 * 备份与同步页面
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEntryStore } from '@/src/store/entryStore';
import { getStorageStats } from '@/src/utils/fileSystem';
import { BackupService } from '@/src/services/backupService';
import { SyncService } from '../services/syncService';
import { logger } from '@/src/utils/logger';
import { DetailPageShell } from './DetailPageShell';
import { BackupExportSheet } from './BackupExportSheet';
import { formatDetailedTime } from '@/src/utils/timeUtils';

interface BackupPageProps {
  visible: boolean;
  onClose: () => void;
}

type BackupFile = { name: string; uri: string; sizeBytes?: number };
type ExportTarget = { name: string; uri: string } | null;

function formatBackupName(name: string): string {
  // backup_2026-02-24T12-00-00-000Z.json → 2026-02-24 12:00
  const match = name.match(/backup_(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})/);
  if (!match) return name;
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}`;
}

function formatLastBackupTime(ts: number | null): string {
  if (!ts) return '从未备份';
  return formatDetailedTime(ts);
}

function getFileNameFromUri(uri: string): string {
  return uri.split('/').pop() ?? 'backup.zip';
}

export function BackupPage({ visible, onClose }: BackupPageProps) {
  const { entries, restoreEntries, updateEntry } = useEntryStore();
  const [usedSpace, setUsedSpace] = useState('计算中...');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingToFiles, setIsSavingToFiles] = useState(false);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [lastBackupTime, setLastBackupTime] = useState<number | null>(null);
  const [exportTarget, setExportTarget] = useState<ExportTarget>(null);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const iCloudAvailable = SyncService.isICloudAvailable();

  const refreshBackupInfo = useCallback(async () => {
    const files = await BackupService.listBackups();
    const backupTime = await BackupService.getLastBackupTime();
    setBackupFiles(files.slice(0, 3));
    setLastBackupTime(backupTime);
  }, []);

  useEffect(() => {
    if (visible) {
      getStorageStats().then((s) => {
        const mb = s.totalSize / (1024 * 1024);
        setUsedSpace(mb < 0.1 ? '< 0.1 MB' : `${mb.toFixed(1)} MB`);
      }).catch(() => setUsedSpace('未知'));
      refreshBackupInfo();
    }
  }, [visible, refreshBackupInfo]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const uri = await BackupService.createBackup(entries);
      await refreshBackupInfo();
      setExportTarget({ name: getFileNameFromUri(uri), uri });
      setShowExportSheet(true);
    } catch {
      Alert.alert('导出失败', '无法导出数据，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenExportSheet = (target: { name: string; uri: string }) => {
    setExportTarget(target);
    setShowExportSheet(true);
  };

  const handleCloseExportSheet = () => {
    setShowExportSheet(false);
    setExportTarget(null);
  };

  const handleSaveToFiles = async () => {
    if (!exportTarget) return;

    setIsSavingToFiles(true);
    try {
      const result = await BackupService.saveBackupToUserDirectory(
        exportTarget.uri,
        exportTarget.name
      );
      if (result.canceled) {
        return;
      }
      if (result.saved && result.fileName) {
        Alert.alert('保存成功', `备份已保存为 ${result.fileName}`);
        handleCloseExportSheet();
      }
    } catch {
      Alert.alert('保存失败', '无法将备份保存到所选目录，请重试');
    } finally {
      setIsSavingToFiles(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    let parsedBackup: { data: any; zip: any } | null = null;

    try {
      // ① 解析备份（不提取媒体）
      parsedBackup = await SyncService.pickAndParseBackup();
      if (!parsedBackup) return;

      const { data, zip } = parsedBackup;

      // ② 先恢复数据库记录，获取实际插入的 ID 列表
      const insertedIds = await restoreEntries(data.entries as any);

      // ③ 数据库恢复成功后，再提取媒体文件
      if (insertedIds.length > 0) {
        try {
          const entriesWithMedia = await SyncService.extractMediaFromZip(
            zip,
            data.entries
          );

          // 仅对本次实际插入的记录更新媒体 URI（保持幂等性）
          const insertedIdSet = new Set(insertedIds);
          for (const entry of entriesWithMedia) {
            if (entry.id && insertedIdSet.has(entry.id) && entry.media?.uri) {
              await updateEntry(entry.id as string, {
                media: entry.media as any,
              });
            }
          }
        } catch (mediaError) {
          logger.warn('[BackupPage] 媒体文件提取失败:', mediaError);
          // 媒体提取失败不阻断流程，但提示用户
          Alert.alert(
            '部分恢复',
            `已恢复 ${insertedIds.length} 条记录，但部分媒体文件未能还原。您可以重新导入备份尝试恢复媒体。`
          );
          await refreshBackupInfo();
          return;
        }
      }

      await refreshBackupInfo();
      Alert.alert('导入成功', `已恢复 ${insertedIds.length} / ${data.entries.length} 条记录`);
    } catch (e: any) {
      Alert.alert('导入失败', e?.message ?? '无法解析备份文件，请确认格式正确');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <DetailPageShell visible={visible} title="备份与同步" onClose={onClose}>
      {/* 本地存储状态 */}
      <Text style={styles.sectionTitle}>本地存储</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>存储位置</Text>
          <Text style={styles.rowValue}>设备本地</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>已用空间</Text>
          <Text style={styles.rowValue}>{usedSpace}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>记录总数</Text>
          <Text style={styles.rowValue}>{entries.length} 条</Text>
        </View>
        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <Text style={styles.rowLabel}>上次备份</Text>
          <Text style={styles.rowValue}>{formatLastBackupTime(lastBackupTime)}</Text>
        </View>
      </View>

      {/* 本地备份 */}
      <Text style={styles.sectionTitle}>本地备份</Text>
      <View style={styles.actionCard}>
        <View style={styles.actionIcon}>
          <Ionicons name="download-outline" size={24} color="#6A89CC" />
        </View>
        <View style={styles.actionContent}>
          <Text style={styles.actionTitle}>导出为 ZIP</Text>
          <Text style={styles.actionSubtitle}>
            将所有记录和媒体文件打包为 ZIP，可保存到文件 App 或通过邮件发送
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.actionButton, isExporting && styles.actionButtonDisabled]}
          onPress={handleExport}
          disabled={isExporting}
        >
          <Text style={styles.actionButtonText}>{isExporting ? '导出中...' : '导出'}</Text>
        </TouchableOpacity>
      </View>

      {/* 备份历史 */}
      {backupFiles.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>备份历史</Text>
          <View style={styles.infoCard}>
            {backupFiles.map((f, idx) => (
              <View
                key={f.uri}
                style={[styles.row, idx === backupFiles.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowValue}>{formatBackupName(f.name)}</Text>
                  {f.sizeBytes !== undefined && (
                    <Text style={styles.rowLabel}>
                      {f.sizeBytes < 1024
                        ? `${f.sizeBytes} B`
                        : `${(f.sizeBytes / 1024).toFixed(1)} KB`}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  testID={`backup-history-share-${f.uri}`}
                  onPress={() => handleOpenExportSheet({ name: f.name, uri: f.uri })}
                >
                  <Ionicons name="share-outline" size={20} color="#6A89CC" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}

      {/* 导入备份 */}
      <Text style={styles.sectionTitle}>导入备份</Text>
      <View style={styles.actionCard}>
        <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
          <Ionicons name="cloud-upload-outline" size={24} color="#F5A623" />
        </View>
        <View style={styles.actionContent}>
          <Text style={styles.actionTitle}>从文件导入</Text>
          <Text style={styles.actionSubtitle}>
            选择之前导出的 JSON 备份文件，恢复记录（已存在的记录将跳过）
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#F5A623' }, isImporting && styles.actionButtonDisabled]}
          onPress={handleImport}
          disabled={isImporting}
        >
          <Text style={styles.actionButtonText}>{isImporting ? '导入中...' : '导入'}</Text>
        </TouchableOpacity>
      </View>

      {/* iCloud 同步说明 */}
      <Text style={styles.sectionTitle}>iCloud 同步</Text>
      <View style={styles.iCloudCard}>
        <View style={styles.iCloudHeader}>
          <Ionicons
            name="cloud-done-outline"
            size={24}
            color={iCloudAvailable ? '#6A89CC' : '#D1D1D1'}
          />
          <Text style={[styles.iCloudTitle, !iCloudAvailable && { color: '#D1D1D1' }]}>
            {iCloudAvailable ? 'iCloud Drive 可用' : '仅限 iOS 设备'}
          </Text>
        </View>
        <Text style={styles.iCloudText}>
          备份文件保存在应用的 Documents 目录。在 iOS 上，前往{' '}
          <Text style={styles.iCloudHighlight}>设置 → Apple ID → iCloud → iCloud Drive</Text>
          {' '}并开启 MemoryCapsule，即可自动同步备份到 iCloud，实现跨设备访问。
        </Text>
      </View>

      <BackupExportSheet
        visible={showExportSheet}
        fileName={exportTarget?.name ?? ''}
        onSaveToFiles={handleSaveToFiles}
        onClose={handleCloseExportSheet}
      />
    </DetailPageShell>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#A3A3A3',
    marginTop: 24, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  infoCard: { backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
  },
  rowLabel: { fontSize: 15, color: '#737373' },
  rowValue: { fontSize: 15, fontWeight: '600', color: '#4A4A4A' },
  actionCard: {
    backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '600', color: '#4A4A4A', marginBottom: 4 },
  actionSubtitle: { fontSize: 12, color: '#A3A3A3', lineHeight: 16 },
  actionButton: {
    backgroundColor: '#6A89CC', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  actionButtonDisabled: { backgroundColor: '#D1D1D1' },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  iCloudCard: {
    backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, gap: 10,
  },
  iCloudHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iCloudTitle: { fontSize: 15, fontWeight: '600', color: '#6A89CC' },
  iCloudText: { fontSize: 13, color: '#737373', lineHeight: 20 },
  iCloudHighlight: { fontWeight: '600', color: '#4A4A4A' },
});
