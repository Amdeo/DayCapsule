import type { ComponentProps } from 'react';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { settingsPageStyles as styles } from './SettingsPage.styles';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface SettingItemProps {
  icon: IoniconName;
  title: string;
  subtitle: string;
  rightComponent?: React.ReactNode;
}

export function SettingItem({
  icon,
  title,
  subtitle,
  rightComponent,
}: SettingItemProps) {
  return (
    <View style={styles.settingItem}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={20} color="#6A89CC" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      {rightComponent}
    </View>
  );
}

interface SettingButtonProps {
  icon: IoniconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
  testID?: string;
}

export function SettingButton({
  icon,
  title,
  subtitle,
  onPress,
  danger,
  testID,
}: SettingButtonProps) {
  return (
    <Pressable testID={testID} style={styles.settingItem} onPress={onPress}>
      <View style={[styles.settingIcon, danger && styles.dangerIcon]}>
        <Ionicons name={icon} size={20} color={danger ? '#EF4444' : '#6A89CC'} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, danger && styles.dangerText]}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
    </Pressable>
  );
}
