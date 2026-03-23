import type { ComponentProps } from 'react';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { backupPageStyles as styles } from './BackupPage.styles';
import {
  BackupActionCard,
  BackupHistoryRow,
  BackupInfoRow,
} from './BackupPageItems';
import { formatBackupFileSize, formatBackupName, formatLastBackupTime } from './backupPageHelpers';
import type { BackupFile } from './backupPageTypes';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface BackupPageSectionTitleProps {
  children: string;
}

interface BackupStorageSectionProps {
  usedSpace: string;
  entryCount: number;
  lastBackupTime: number | null;
}

interface BackupActionSectionProps {
  title: string;
  subtitle: string;
  icon: IoniconName;
  iconColor: string;
  buttonColor?: string;
  iconBackgroundColor?: string;
  buttonLabel: string;
  disabled?: boolean;
  onPress: () => void;
}

interface BackupHistorySectionProps {
  backupFiles: BackupFile[];
  onOpenExportSheet: (target: { name: string; uri: string }) => void;
}

interface BackupICloudSectionProps {
  available: boolean;
}

export function BackupPageSectionTitle({
  children,
}: BackupPageSectionTitleProps) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function BackupStorageSection({
  usedSpace,
  entryCount,
  lastBackupTime,
}: BackupStorageSectionProps) {
  return (
    <View testID="backup-page-storage-card" style={styles.infoCard}>
      <BackupInfoRow label="存储位置" value="设备本地" />
      <BackupInfoRow label="已用空间" value={usedSpace} />
      <BackupInfoRow label="记录总数" value={`${entryCount} 条`} />
      <BackupInfoRow
        label="上次备份"
        value={formatLastBackupTime(lastBackupTime)}
        noDivider
      />
    </View>
  );
}

export function BackupActionSection({
  title,
  subtitle,
  icon,
  iconColor,
  buttonColor = '#6A89CC',
  iconBackgroundColor = '#EEF2FF',
  buttonLabel,
  disabled,
  onPress,
}: BackupActionSectionProps) {
  return (
    <BackupActionCard
      title={title}
      subtitle={subtitle}
      icon={icon}
      iconColor={iconColor}
      buttonColor={buttonColor}
      iconBackgroundColor={iconBackgroundColor}
      buttonLabel={buttonLabel}
      disabled={disabled}
      onPress={onPress}
    />
  );
}

export function BackupHistorySection({
  backupFiles,
  onOpenExportSheet,
}: BackupHistorySectionProps) {
  if (backupFiles.length === 0) {
    return null;
  }

  return (
    <View style={styles.infoCard}>
      {backupFiles.map((file, index) => {
        const sizeText = formatBackupFileSize(file.sizeBytes);

        return (
          <BackupHistoryRow
            key={file.uri}
            title={formatBackupName(file.name)}
            sizeText={sizeText}
            fileUri={file.uri}
            noDivider={index === backupFiles.length - 1}
            onShare={() => onOpenExportSheet({ name: file.name, uri: file.uri })}
          />
        );
      })}
    </View>
  );
}

export function BackupICloudSection({
  available,
}: BackupICloudSectionProps) {
  return (
    <View testID="backup-page-icloud-card" style={styles.iCloudCard}>
      <View style={styles.iCloudHeader}>
        <Ionicons
          name="cloud-done-outline"
          size={24}
          color={available ? '#6A89CC' : '#D1D1D1'}
        />
        <Text
          style={[
            styles.iCloudTitle,
            !available && styles.iCloudTitleDisabled,
          ]}
        >
          {available ? 'iCloud Drive 可用' : '仅限 iOS 设备'}
        </Text>
      </View>
      <Text style={styles.iCloudText}>
        备份文件保存在应用的 Documents 目录。在 iOS 上，前往{' '}
        <Text style={styles.iCloudHighlight}>设置 → Apple ID → iCloud → iCloud Drive</Text>
        {' '}并开启 DayCapsule，即可自动同步备份到 iCloud，实现跨设备访问。
      </Text>
    </View>
  );
}
