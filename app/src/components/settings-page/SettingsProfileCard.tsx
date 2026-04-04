import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SettingsProfileCardProps {
  isAuthenticated: boolean;
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
            <Text style={styles.unauthSubtitle}>未登录时仅显示本地数据</Text>
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
            <View style={[styles.syncDot, { backgroundColor: '#34D399' }]} />
            <Text style={styles.syncLabel}>账号同步（本地优先）</Text>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EEF8FA',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#D7EEF2',
    marginTop: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6A89CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  email: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  syncLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unauthStatsRow: {
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  unauthRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeholderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  unauthText: {
    flex: 1,
  },
  unauthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  unauthSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  loginButton: {
    backgroundColor: '#6A89CC',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
