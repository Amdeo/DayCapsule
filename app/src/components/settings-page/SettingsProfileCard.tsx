import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { settingsProfileCardStyles as styles } from './SettingsProfileCard.styles';

interface SettingsProfileCardProps {
  isAuthenticated: boolean;
  isCloudProtectionEnabled: boolean;
  userEmail?: string;
  entryCount: number;
  photoCount: number;
  usedSpace: string;
  onShowLogin: () => void;
}

function getAvatarLetter(email?: string): string {
  if (!email) return '?';
  return email.charAt(0).toUpperCase();
}

interface StatCardProps {
  value: string | number;
  label: string;
}

function StatCard({ value, label }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function SettingsProfileCard({
  isAuthenticated,
  isCloudProtectionEnabled,
  userEmail,
  entryCount,
  photoCount,
  usedSpace,
  onShowLogin,
}: SettingsProfileCardProps) {
  if (!isAuthenticated) {
    return (
      <View testID="settings-profile-card" style={styles.container}>
        <View style={styles.unauthRow}>
          <View style={styles.placeholderAvatar}>
            <Ionicons name="person-outline" size={22} color="#9CA3AF" />
          </View>
          <View style={styles.unauthText}>
            <Text style={styles.unauthTitle}>未登录</Text>
            <Text style={styles.unauthSubtitle}>本地优先，当前数据仅保存在本机</Text>
          </View>
          <Pressable style={styles.loginButton} onPress={onShowLogin}>
            <Text style={styles.loginButtonText}>登录</Text>
          </Pressable>
        </View>
        <View style={[styles.statsRow, styles.unauthStatsRow]}>
          <StatCard value={usedSpace} label="本地占用" />
        </View>
      </View>
    );
  }

  return (
    <View testID="settings-profile-card" style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{getAvatarLetter(userEmail)}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.email} numberOfLines={1} ellipsizeMode="middle">
            {userEmail ?? '已登录'}
          </Text>
          <View style={styles.syncRow}>
            <View style={styles.syncDotActive} />
            <Text style={styles.syncLabel}>
              {isCloudProtectionEnabled ? '云端已保护当前记忆' : '当前数据仍仅保存在本机'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.statsRow}>
        <StatCard value={entryCount} label="记录" />
        <StatCard value={photoCount} label="照片" />
        <StatCard value={usedSpace} label="占用" />
      </View>
    </View>
  );
}
