import React from 'react';
import { Text, View } from 'react-native';
import { settingsPageStyles as styles } from './SettingsPage.styles';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

const SETTINGS_SECTION_TEST_IDS: Record<string, string> = {
  '账户与同步': 'settings-section-account-sync',
  '外观': 'settings-section-display',
  '数据管理': 'settings-section-data-storage',
  '关于与支持': 'settings-section-support',
  '高级': 'settings-section-advanced',
  // Legacy keys kept for test compatibility
  '账户与云同步': 'settings-section-account-sync',
  '提醒': 'settings-section-reminders',
  '内容显示': 'settings-section-display',
  '数据与存储': 'settings-section-data-storage',
  '标签管理': 'settings-section-tags',
  '支持': 'settings-section-support',
  '危险操作': 'settings-section-danger',
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View testID={SETTINGS_SECTION_TEST_IDS[title]} style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
