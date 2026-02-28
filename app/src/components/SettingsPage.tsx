/**
 * 设置页面组件
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  Dimensions,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEntryStore } from '@/src/store/entryStore';
import { Storage } from '@/src/utils/storage';
import { getStorageStats } from '@/src/utils/fileSystem';
import { VoiceService } from '@/src/services/voiceService';
import { NotificationService } from '@/src/services/notificationService';
import { Share } from 'react-native';

interface SettingsPageProps {
  visible: boolean;
  onClose: () => void;
}

const SETTINGS_KEYS = {
  notifications: 'settings:notifications',
  autoBackup: 'settings:autoBackup',
  highQualityPhotos: 'settings:highQualityPhotos',
};

const DEFAULT_SETTINGS = {
  notifications: true,
  autoBackup: false,
  highQualityPhotos: true,
};

export function SettingsPage({ visible, onClose }: SettingsPageProps) {
  const insets = useSafeAreaInsets();
  const { entries } = useEntryStore();
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // 设置状态
  const [notifications, setNotifications] = useState(DEFAULT_SETTINGS.notifications);
  const [autoBackup, setAutoBackup] = useState(DEFAULT_SETTINGS.autoBackup);
  const [highQualityPhotos, setHighQualityPhotos] = useState(DEFAULT_SETTINGS.highQualityPhotos);

  // 存储统计
  const [usedSpace, setUsedSpace] = useState('计算中...');

  // 从持久化存储加载设置，并同步通知调度状态
  useEffect(() => {
    const loadSettings = async () => {
      const [notif, backup, hq] = await Promise.all([
        Storage.getString(SETTINGS_KEYS.notifications),
        Storage.getString(SETTINGS_KEYS.autoBackup),
        Storage.getString(SETTINGS_KEYS.highQualityPhotos),
      ]);
      if (notif !== null) setNotifications(notif === 'true');
      if (backup !== null) setAutoBackup(backup === 'true');
      if (hq !== null) setHighQualityPhotos(hq === 'true');

      // 若设置为开启通知但调度已丢失（如重装后），重新调度
      if (notif === 'true') {
        const isScheduled = await NotificationService.isReminderScheduled();
        if (!isScheduled) {
          const granted = await NotificationService.requestPermission();
          if (granted) await NotificationService.scheduleDailyReminder();
        }
      }
    };
    loadSettings();
  }, []);

  // 加载存储统计
  useEffect(() => {
    if (!visible) return;
    getStorageStats().then((stats) => {
      const mb = stats.totalSize / (1024 * 1024);
      setUsedSpace(mb < 0.1 ? '< 0.1 MB' : `${mb.toFixed(1)} MB`);
    }).catch(() => setUsedSpace('未知'));
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // 推送通知：请求权限并调度/取消每日提醒
  const handleNotifications = useCallback(async (v: boolean) => {
    if (v) {
      const granted = await NotificationService.requestPermission();
      if (!granted) {
        Alert.alert('权限不足', '请在系统设置中允许通知权限后再开启');
        return;
      }
      await NotificationService.scheduleDailyReminder();
    } else {
      await NotificationService.cancelDailyReminder();
    }
    setNotifications(v);
    Storage.setString(SETTINGS_KEYS.notifications, String(v));
  }, []);

  const handleAutoBackup = useCallback((v: boolean) => {
    setAutoBackup(v);
    Storage.setString(SETTINGS_KEYS.autoBackup, String(v));
  }, []);

  const handleHighQualityPhotos = useCallback((v: boolean) => {
    setHighQualityPhotos(v);
    Storage.setString(SETTINGS_KEYS.highQualityPhotos, String(v));
  }, []);

  // 真实统计数据
  const { photoCount, voiceCount } = useMemo(() => ({
    photoCount: entries.filter((e) => e.type === 'photo').length,
    voiceCount: entries.filter((e) => e.type === 'voice').length,
  }), [entries]);

  if (!shouldRender) return null;

  const handleClearCache = () => {
    Alert.alert(
      '清除缓存',
      '确定要清除所有缓存数据吗？这不会删除您的记录。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清除',
          style: 'destructive',
          onPress: async () => {
            await VoiceService.clearSoundCache();
            setUsedSpace('计算中...');
            getStorageStats().then((stats) => {
              const mb = stats.totalSize / (1024 * 1024);
              setUsedSpace(mb < 0.1 ? '< 0.1 MB' : `${mb.toFixed(1)} MB`);
            }).catch(() => setUsedSpace('未知'));
            Alert.alert('成功', '缓存已清除');
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        entries: entries.map((e) => ({
          id: e.id,
          type: e.type,
          content: e.content,
          tags: e.tags,
          timestamp: e.timestamp,
          media: e.media ? { mimeType: e.media.mimeType, size: e.media.size } : undefined,
        })),
      };
      await Share.share({
        message: JSON.stringify(exportData, null, 2),
        title: 'MemoryCapsule 数据导出',
      });
    } catch {
      Alert.alert('导出失败', '无法导出数据，请重试');
    }
  };

  const handleResetSettings = () => {
    Alert.alert(
      '重置设置',
      '确定要重置所有设置为默认值吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '重置',
          style: 'destructive',
          onPress: async () => {
            setNotifications(DEFAULT_SETTINGS.notifications);
            setAutoBackup(DEFAULT_SETTINGS.autoBackup);
            setHighQualityPhotos(DEFAULT_SETTINGS.highQualityPhotos);
            await Promise.all(
              Object.values(SETTINGS_KEYS).map((k) => Storage.delete(k))
            );
            Alert.alert('成功', '设置已重置');
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* 半透明背景 */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          {isAnimating && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={styles.backdrop}
              pointerEvents="none"
            />
          )}
        </Pressable>

        {/* 页面内容 */}
        {isAnimating && (
          <Animated.View
            entering={SlideInRight.duration(300).springify()}
            exiting={SlideOutRight.duration(250)}
            style={styles.page}
          >
            <View
              style={{ flex: 1 }}
              onStartShouldSetResponder={() => true}
              onResponderRelease={() => {}}
            >
              {/* 头部 */}
              <View style={styles.header}>
                <Pressable onPress={onClose} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="#4A4A4A" />
                </Pressable>
                <Text style={styles.headerTitle}>设置</Text>
                <View style={{ width: 40 }} />
              </View>

              {/* 内容区域 */}
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* 通知设置 */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>通知</Text>
                  <SettingItem
                    icon="notifications"
                    title="推送通知"
                    subtitle="接收提醒和更新"
                    rightComponent={
                      <Switch
                        value={notifications}
                        onValueChange={handleNotifications}
                        trackColor={{ false: '#D1D1D1', true: '#6A89CC' }}
                        thumbColor="#FFFFFF"
                      />
                    }
                  />
                </View>

                {/* 数据设置 */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>数据</Text>
                  <SettingItem
                    icon="cloud-upload"
                    title="自动备份"
                    subtitle="进入后台时自动保存到本地"
                    rightComponent={
                      <Switch
                        value={autoBackup}
                        onValueChange={handleAutoBackup}
                        trackColor={{ false: '#D1D1D1', true: '#6A89CC' }}
                        thumbColor="#FFFFFF"
                      />
                    }
                  />
                  <SettingItem
                    icon="image"
                    title="高质量照片"
                    subtitle="保存原始质量照片"
                    rightComponent={
                      <Switch
                        value={highQualityPhotos}
                        onValueChange={handleHighQualityPhotos}
                        trackColor={{ false: '#D1D1D1', true: '#6A89CC' }}
                        thumbColor="#FFFFFF"
                      />
                    }
                  />
                  <SettingButton
                    icon="download"
                    title="导出数据"
                    subtitle="导出所有记录"
                    onPress={handleExportData}
                  />
                  <SettingButton
                    icon="trash"
                    title="清除缓存"
                    subtitle="释放存储空间"
                    onPress={handleClearCache}
                  />
                </View>

                {/* 存储信息 */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>存储</Text>
                  <View style={styles.storageInfo}>
                    <View style={styles.storageRow}>
                      <Text style={styles.storageLabel}>已用空间</Text>
                      <Text style={styles.storageValue}>{usedSpace}</Text>
                    </View>
                    <View style={styles.storageRow}>
                      <Text style={styles.storageLabel}>记录数量</Text>
                      <Text style={styles.storageValue}>{entries.length} 条</Text>
                    </View>
                    <View style={styles.storageRow}>
                      <Text style={styles.storageLabel}>照片数量</Text>
                      <Text style={styles.storageValue}>{photoCount} 张</Text>
                    </View>
                    <View style={styles.storageRow}>
                      <Text style={styles.storageLabel}>语音数量</Text>
                      <Text style={styles.storageValue}>{voiceCount} 条</Text>
                    </View>
                  </View>
                </View>

                {/* 其他设置 */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>其他</Text>
                  <SettingButton
                    icon="refresh"
                    title="重置设置"
                    subtitle="恢复默认设置"
                    onPress={handleResetSettings}
                    danger
                  />
                </View>

                {/* 底部间距 */}
                <View style={{ height: 40 + insets.bottom }} />
              </ScrollView>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

// 设置项组件（带开关）
function SettingItem({
  icon,
  title,
  subtitle,
  rightComponent,
}: {
  icon: string;
  title: string;
  subtitle: string;
  rightComponent: React.ReactNode;
}) {
  return (
    <View style={styles.settingItem}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={20} color="#6A89CC" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      {rightComponent}
    </View>
  );
}

// 设置按钮组件
function SettingButton({
  icon,
  title,
  subtitle,
  onPress,
  danger,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={styles.settingItem} onPress={onPress}>
      <View style={[styles.settingIcon, danger && styles.dangerIcon]}>
        <Ionicons name={icon as any} size={20} color={danger ? '#EF4444' : '#6A89CC'} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, danger && styles.dangerText]}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
    </Pressable>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('screen');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  page: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A3A3A3',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 8,
  },
  settingIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
    borderRadius: 20,
    marginRight: 12,
  },
  dangerIcon: {
    backgroundColor: '#FEE2E2',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 2,
  },
  dangerText: {
    color: '#EF4444',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#A3A3A3',
  },
  storageInfo: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  storageLabel: {
    fontSize: 15,
    color: '#737373',
  },
  storageValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A4A4A',
  },
});
