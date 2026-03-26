import React from 'react';
import { Text, View } from 'react-native';
import { settingsPageStyles as styles } from './SettingsPage.styles';

interface SettingsStorageInfoProps {
  usedSpace: string;
  entryCount: number;
  photoCount: number;
  voiceCount: number;
}

export function SettingsStorageInfo({
  usedSpace,
  entryCount,
  photoCount,
  voiceCount,
}: SettingsStorageInfoProps) {
  const rows = [
    { label: '已用空间', value: usedSpace },
    { label: '记录数量', value: `${entryCount} 条` },
    { label: '照片数量', value: `${photoCount} 张` },
    { label: '语音数量', value: `${voiceCount} 条` },
  ];

  return (
    <View testID="settings-storage-card" style={styles.storageInfo}>
      <Text style={styles.storageCardTitle}>空间与内容统计</Text>
      {rows.map((row) => (
        <View key={row.label} style={styles.storageRow}>
          <Text style={styles.storageLabel}>{row.label}</Text>
          <Text style={styles.storageValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}
