/**
 * 设置页面组件
 * 使用 settingsStore 共享状态
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEntryStore } from '@/src/store/entryStore';
import {
  useSettingsStore,
  CardSpacing, SPACING_VALUES,
  PhotoHeightPreset, PHOTO_HEIGHT_VALUES,
  CalendarDensity,
} from '@/src/store/settingsStore';
import { getStorageStats } from '@/src/utils/fileSystem';
import { VoiceService } from '@/src/services/voiceService';
import { NotificationService } from '@/src/services/notificationService';
import { DetailPageShell } from './DetailPageShell';
import { TagManagementPage } from './TagManagementPage';
import { useAuthStore } from '@/src/store/authStore';
import { LoginPage } from './LoginPage';
import { switchDataSource, localDataSource, createRemoteDataSource } from '@/src/database/dataSource';
import { getApiClient } from '@/src/services/apiClient';
import * as DB from '@/src/database/operations';

interface SettingsPageProps {
  visible: boolean;
  onClose: () => void;
}

// 间距标签映射
const SPACING_LABELS: Record<CardSpacing, string> = {
  compact: '紧凑',
  default: '默认',
  loose: '宽松',
};

const PHOTO_HEIGHT_LABELS: Record<PhotoHeightPreset, string> = {
  compact: '紧凑',
  default: '默认',
  large:   '宽松',
};

const PHOTO_HEIGHT_PREVIEW_HEIGHTS: Record<PhotoHeightPreset, number> = {
  compact: 24,
  default: 34,
  large:   48,
};

const CALENDAR_DENSITY_LABELS: Record<CalendarDensity, string> = {
  comfortable: '舒展',
  default: '标准',
  compact: '紧凑',
};

export function SettingsPage({ visible, onClose }: SettingsPageProps) {
  const { entries } = useEntryStore();

  // 从共享 store 获取设置
  const {
    notifications,
    autoBackup,
    highQualityPhotos,
    cardSpacing,
    isLoaded,
    loadSettings,
    setNotifications: saveNotifications,
    setAutoBackup: saveAutoBackup,
    setHighQualityPhotos: saveHighQualityPhotos,
    setCardSpacing: saveCardSpacing,
    photoHeight,
    setPhotoHeight: savePhotoHeight,
    calendarDensity,
    setCalendarDensity: saveCalendarDensity,
    resetSettings,
  } = useSettingsStore();

  // 存储统计
  const [usedSpace, setUsedSpace] = useState('计算中...');
  const [showTagMgmt, setShowTagMgmt] = useState(false);

  const { user, isAuthenticated, logout } = useAuthStore();
  const { cloudMode, setCloudMode } = useSettingsStore();
  const [showLogin, setShowLogin] = useState(false);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);

  const handleCloudModeToggle = async (enable: boolean) => {
    if (enable) {
      if (!isAuthenticated) {
        setShowLogin(true);
        return;
      }
      await enableCloudMode();
    } else {
      await disableCloudMode();
    }
  };

  const enableCloudMode = async () => {
    setIsSwitchingMode(true);
    try {
      await setCloudMode('switching');
      const client = getApiClient();
      const status = await client.get<{ hasBackup: boolean; entryCount: number }>('/sync/status');

      if (status.hasBackup && status.entryCount > 0) {
        const localCount = await DB.getEntriesCount();
        Alert.alert(
          '数据同步',
          `云端 ${status.entryCount} 条记录\n本地 ${localCount} 条记录\n\n请选择数据来源：`,
          [
            { text: '使用云端数据', onPress: () => finishEnableCloud('cloud') },
            { text: '上传本地数据', onPress: () => finishEnableCloud('local') },
            { text: '取消', style: 'cancel', onPress: () => setCloudMode(false) },
          ],
        );
      } else {
        await finishEnableCloud('local');
      }
    } catch (e: any) {
      Alert.alert('切换失败', e?.message ?? '请检查网络连接');
      await setCloudMode(false);
    } finally {
      setIsSwitchingMode(false);
    }
  };

  const finishEnableCloud = async (source: 'cloud' | 'local') => {
    try {
      if (source === 'local') {
        const allEntries = await DB.getAllEntries();
        const client = getApiClient();
        const hash = String(Date.now());
        await client.post('/sync/upload', {
          data: { entries: allEntries, tags: [], version: 1 },
          hash,
          entryCount: allEntries.length,
          deviceName: 'DayCapsule App',
          encrypted: false,
          encryptionVersion: 0,
        });
      }
      switchDataSource(createRemoteDataSource());
      await useEntryStore.getState().loadEntries();
      await setCloudMode(true);
    } catch (e: any) {
      Alert.alert('切换失败', e?.message ?? '操作失败');
      await setCloudMode(false);
      switchDataSource(localDataSource);
    }
  };

  const disableCloudMode = async () => {
    setIsSwitchingMode(true);
    try {
      await setCloudMode('switching');
      const client = getApiClient();
      const status = await client.get<{ hasBackup: boolean; entryCount: number }>('/sync/status');
      const localCount = await DB.getEntriesCount();

      Alert.alert(
        '切换到离线模式',
        `云端 ${status.entryCount} 条记录\n本地 ${localCount} 条记录\n\n请选择数据保留方向：`,
        [
          {
            text: '云端 → 本地',
            onPress: async () => {
              try {
                const data = await client.get<{ data: { entries: any[] } }>('/sync/download');
                await DB.clearAllEntries();
                await DB.restoreEntries(data.data.entries);
                switchDataSource(localDataSource);
                await useEntryStore.getState().loadEntries();
                await setCloudMode(false);
              } catch (err: any) {
                Alert.alert('同步失败', err?.message);
                await setCloudMode(true);
              }
            },
          },
          {
            text: '本地 → 云端',
            onPress: async () => {
              try {
                const allEntries = await DB.getAllEntries();
                const hash = String(Date.now());
                await client.post('/sync/upload', {
                  data: { entries: allEntries, tags: [], version: 1 },
                  hash,
                  entryCount: allEntries.length,
                  deviceName: 'DayCapsule App',
                  encrypted: false,
                  encryptionVersion: 0,
                });
                switchDataSource(localDataSource);
                await useEntryStore.getState().loadEntries();
                await setCloudMode(false);
              } catch (err: any) {
                Alert.alert('同步失败', err?.message);
                await setCloudMode(true);
              }
            },
          },
          { text: '取消', style: 'cancel', onPress: () => setCloudMode(true) },
        ],
      );
    } catch (e: any) {
      Alert.alert('操作失败', e?.message);
      await setCloudMode(true);
    } finally {
      setIsSwitchingMode(false);
    }
  };

  const handleLoginSuccess = async () => {
    setShowLogin(false);
    await enableCloudMode();
  };

  const handleLogout = () => {
    Alert.alert('退出登录', '确定要退出登录吗？如果当前是云端模式，将自动切换到离线模式。', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: async () => {
          if (cloudMode === true) {
            switchDataSource(localDataSource);
            await setCloudMode(false);
            await useEntryStore.getState().loadEntries();
          }
          logout();
        },
      },
    ]);
  };

  // 加载设置（首次挂载时）
  useEffect(() => {
    if (!isLoaded) {
      loadSettings();
    }
  }, [isLoaded, loadSettings]);

  // 同步通知调度状态（仅在设置加载后）
  useEffect(() => {
    if (!isLoaded) return;

    const syncNotifications = async () => {
      if (notifications) {
        const isScheduled = await NotificationService.isReminderScheduled();
        if (!isScheduled) {
          const granted = await NotificationService.requestPermission();
          if (granted) await NotificationService.scheduleDailyReminder();
        }
      }
    };
    syncNotifications();
  }, [isLoaded, notifications]);

  // 加载存储统计
  useEffect(() => {
    if (!visible) return;
    getStorageStats().then((stats) => {
      const mb = stats.totalSize / (1024 * 1024);
      setUsedSpace(mb < 0.1 ? '< 0.1 MB' : `${mb.toFixed(1)} MB`);
    }).catch(() => setUsedSpace('未知'));
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
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
    await saveNotifications(v);
  }, [saveNotifications]);

  const handleAutoBackup = useCallback(async (v: boolean) => {
    await saveAutoBackup(v);
  }, [saveAutoBackup]);

  const handleHighQualityPhotos = useCallback(async (v: boolean) => {
    await saveHighQualityPhotos(v);
  }, [saveHighQualityPhotos]);

  const handleCardSpacing = useCallback(async (spacing: CardSpacing) => {
    await saveCardSpacing(spacing);
  }, [saveCardSpacing]);

  const handlePhotoHeight = useCallback(async (preset: PhotoHeightPreset) => {
    await savePhotoHeight(preset);
  }, [savePhotoHeight]);

  const handleCalendarDensity = useCallback(async (density: CalendarDensity) => {
    await saveCalendarDensity(density);
  }, [saveCalendarDensity]);

  // 真实统计数据
  const { photoCount, voiceCount } = useMemo(() => ({
    photoCount: entries.filter((e) => e.type === 'photo').length,
    voiceCount: entries.filter((e) => e.type === 'voice').length,
  }), [entries]);

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
            await resetSettings();
            Alert.alert('成功', '设置已重置');
          },
        },
      ]
    );
  };

  return (
    <DetailPageShell visible={visible} title="设置" onClose={onClose}>
      {/* 账户 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>账户</Text>
        {isAuthenticated ? (
          <>
            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="person" size={20} color="#6A89CC" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{user?.email}</Text>
                <Text style={styles.settingSubtitle}>已登录</Text>
              </View>
            </View>
            <SettingItem
              icon="cloud"
              title="云端模式"
              subtitle={cloudMode === 'switching' ? '切换中...' : cloudMode ? '数据存储在云端' : '数据存储在本地'}
              rightComponent={
                <Switch
                  value={cloudMode === true}
                  onValueChange={handleCloudModeToggle}
                  disabled={cloudMode === 'switching' || isSwitchingMode}
                  trackColor={{ false: '#D1D1D1', true: '#6A89CC' }}
                  thumbColor="#FFFFFF"
                />
              }
            />
            <SettingButton
              icon="log-out"
              title="退出登录"
              subtitle="退出当前账户"
              onPress={handleLogout}
              danger
            />
          </>
        ) : (
          <SettingButton
            icon="person-add"
            title="登录 / 注册"
            subtitle="登录后可使用云端同步功能"
            onPress={() => setShowLogin(true)}
          />
        )}
      </View>

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
        <CardSpacingSelector
          value={cardSpacing}
          onChange={handleCardSpacing}
        />
        <CalendarDensitySelector
          value={calendarDensity}
          onChange={handleCalendarDensity}
        />
        <PhotoHeightSelector
          value={photoHeight}
          onChange={handlePhotoHeight}
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
          icon="pricetag"
          title="预制标签管理"
          subtitle="管理可快速选择的预制标签"
          onPress={() => setShowTagMgmt(true)}
        />
        <SettingButton
          icon="refresh"
          title="重置设置"
          subtitle="恢复默认设置"
          onPress={handleResetSettings}
          danger
        />
      </View>
      <TagManagementPage visible={showTagMgmt} onClose={() => setShowTagMgmt(false)} />
      <LoginPage
        visible={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={handleLoginSuccess}
      />
    </DetailPageShell>
  );
}

function CalendarDensitySelector({
  value,
  onChange,
}: {
  value: CalendarDensity;
  onChange: (density: CalendarDensity) => void;
}) {
  const options: CalendarDensity[] = ['comfortable', 'default', 'compact'];

  return (
    <View style={csStyles.container}>
      <View style={csStyles.icon}>
        <Ionicons name="calendar-outline" size={20} color="#6A89CC" />
      </View>
      <View style={csStyles.content}>
        <Text style={csStyles.title}>日历内容区密度</Text>
        <Text style={csStyles.subtitle}>调整日历视图中卡片和时间轴的疏密程度</Text>
      </View>
      <View style={csStyles.segmentContainer}>
        {options.map((option) => (
          <Pressable
            key={option}
            style={[csStyles.segment, value === option && csStyles.segmentActive]}
            onPress={() => onChange(option)}
          >
            <Text style={[csStyles.segmentText, value === option && csStyles.segmentTextActive]}>
              {CALENDAR_DENSITY_LABELS[option]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
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

// 卡片间距选择器组件
function CardSpacingSelector({
  value,
  onChange,
}: {
  value: CardSpacing;
  onChange: (spacing: CardSpacing) => void;
}) {
  const options: CardSpacing[] = ['compact', 'default', 'loose'];

  return (
    <View style={csStyles.container}>
      <View style={csStyles.icon}>
        <Ionicons name="albums" size={20} color="#6A89CC" />
      </View>
      <View style={csStyles.content}>
        <Text style={csStyles.title}>卡片间距</Text>
        <Text style={csStyles.subtitle}>调整记录卡片之间的间距</Text>
      </View>
      <View style={csStyles.segmentContainer}>
        {options.map((option) => (
          <Pressable
            key={option}
            style={[csStyles.segment, value === option && csStyles.segmentActive]}
            onPress={() => onChange(option)}
          >
            <Text style={[csStyles.segmentText, value === option && csStyles.segmentTextActive]}>
              {SPACING_LABELS[option]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const csStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 8,
  },
  icon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
    borderRadius: 20,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#A3A3A3',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E5E5',
    borderRadius: 8,
    padding: 2,
  },
  segment: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    color: '#737373',
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#6A89CC',
    fontWeight: '600',
  },
});

// 照片高度选择器组件
function PhotoHeightSelector({
  value,
  onChange,
}: {
  value: PhotoHeightPreset;
  onChange: (preset: PhotoHeightPreset) => void;
}) {
  const options: PhotoHeightPreset[] = ['compact', 'default', 'large'];

  return (
    <View style={phStyles.container}>
      <View style={phStyles.header}>
        <View style={phStyles.icon}>
          <Ionicons name="image-outline" size={20} color="#77C9D4" />
        </View>
        <View style={phStyles.headerText}>
          <Text style={phStyles.title}>照片显示高度</Text>
          <Text style={phStyles.subtitle}>限制时间轴中照片卡片的最大高度</Text>
        </View>
      </View>
      <View style={phStyles.optionsRow}>
        {options.map((option) => {
          const isSelected = value === option;
          return (
            <Pressable
              key={option}
              style={[phStyles.optionCard, isSelected && phStyles.optionCardSelected]}
              onPress={() => onChange(option)}
            >
              <View style={[
                phStyles.previewBlock,
                { height: PHOTO_HEIGHT_PREVIEW_HEIGHTS[option] },
                isSelected && phStyles.previewBlockSelected,
              ]} />
              <Text style={[phStyles.optionLabel, isSelected && phStyles.optionLabelSelected]}>
                {PHOTO_HEIGHT_LABELS[option]}
              </Text>
              <Text style={[phStyles.optionValue, isSelected && phStyles.optionValueSelected]}>
                {PHOTO_HEIGHT_VALUES[option]}dp
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const phStyles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  icon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F8FA',
    borderRadius: 20,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#A3A3A3',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: '#77C9D4',
    backgroundColor: '#EEF8FA',
  },
  previewBlock: {
    width: '100%',
    borderRadius: 6,
    backgroundColor: '#D4EFF3',
  },
  previewBlockSelected: {
    backgroundColor: '#77C9D4',
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#737373',
  },
  optionLabelSelected: {
    color: '#4A9DAA',
    fontWeight: '600',
  },
  optionValue: {
    fontSize: 11,
    color: '#B0B0B0',
  },
  optionValueSelected: {
    color: '#77C9D4',
  },
});

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

const styles = StyleSheet.create({
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

export { CardSpacing, SPACING_VALUES, PhotoHeightPreset, PHOTO_HEIGHT_VALUES };
