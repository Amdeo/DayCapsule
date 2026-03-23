import type { ComponentProps } from 'react';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { backupPageStyles as styles } from './BackupPage.styles';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface BackupInfoRowProps {
  label: string;
  value: string;
  noDivider?: boolean;
}

interface BackupActionCardProps {
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

interface BackupHistoryRowProps {
  title: string;
  sizeText: string | null;
  fileUri: string;
  noDivider?: boolean;
  onShare: () => void;
}

export function BackupInfoRow({
  label,
  value,
  noDivider,
}: BackupInfoRowProps) {
  return (
    <View style={[styles.row, noDivider && styles.rowNoDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function BackupActionCard({
  title,
  subtitle,
  icon,
  iconColor,
  buttonColor = '#6A89CC',
  iconBackgroundColor = '#EEF2FF',
  buttonLabel,
  disabled,
  onPress,
}: BackupActionCardProps) {
  return (
    <View style={styles.actionCard}>
      <View style={[styles.actionIcon, { backgroundColor: iconBackgroundColor }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <TouchableOpacity
        style={[
          styles.actionButton,
          { backgroundColor: buttonColor },
          disabled && styles.actionButtonDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={styles.actionButtonText}>{buttonLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function BackupHistoryRow({
  title,
  sizeText,
  fileUri,
  noDivider,
  onShare,
}: BackupHistoryRowProps) {
  return (
    <View style={[styles.row, noDivider && styles.rowNoDivider]}>
      <View style={styles.historyMeta}>
        <Text style={styles.rowValue}>{title}</Text>
        {sizeText ? <Text style={styles.rowLabel}>{sizeText}</Text> : null}
      </View>
      <TouchableOpacity
        testID={`backup-history-share-${fileUri}`}
        onPress={onShare}
      >
        <Ionicons name="share-outline" size={20} color="#6A89CC" />
      </TouchableOpacity>
    </View>
  );
}
