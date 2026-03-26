import React from 'react';
import { Text, View } from 'react-native';
import { settingsPageStyles as styles } from './SettingsPage.styles';

interface SettingsOverviewCardProps {
  isAuthenticated: boolean;
  userEmail?: string;
  cloudMode: boolean | 'switching';
  currentServerUrl: string;
  usedSpace: string;
}

interface OverviewRowProps {
  label: string;
  value: string;
}

function OverviewRow({ label, value }: OverviewRowProps) {
  return (
    <View style={styles.overviewRow}>
      <Text style={styles.overviewLabel}>{label}</Text>
      <Text style={styles.overviewValue}>{value}</Text>
    </View>
  );
}

function getSyncModeLabel(cloudMode: boolean | 'switching'): string {
  if (cloudMode === true) {
    return '云端';
  }
  if (cloudMode === 'switching') {
    return '切换中';
  }
  return '本地';
}

export function SettingsOverviewCard({
  isAuthenticated,
  userEmail,
  cloudMode,
  currentServerUrl,
  usedSpace,
}: SettingsOverviewCardProps) {
  return (
    <View testID="settings-overview-card" style={styles.overviewCard}>
      <OverviewRow
        label="当前账号"
        value={isAuthenticated ? userEmail ?? '已登录' : '未登录'}
      />
      <OverviewRow label="同步模式" value={getSyncModeLabel(cloudMode)} />
      <OverviewRow label="当前后端" value={currentServerUrl} />
      <OverviewRow label="存储概览" value={usedSpace} />
    </View>
  );
}
