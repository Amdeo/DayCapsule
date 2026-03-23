import React from 'react';
import { Text, View } from 'react-native';
import { settingsPageStyles as styles } from './SettingsPage.styles';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

const SETTINGS_SECTION_TEST_IDS: Record<string, string> = {
  账户: 'settings-section-account',
  通知: 'settings-section-notifications',
  数据: 'settings-section-data',
  存储: 'settings-section-storage',
  其他: 'settings-section-other',
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View testID={SETTINGS_SECTION_TEST_IDS[title]} style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
