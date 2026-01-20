/**
 * 设置页面组件
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface SettingsPageProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsPage({ visible, onClose }: SettingsPageProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // 设置状态
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);
  const [highQualityPhotos, setHighQualityPhotos] = useState(true);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!shouldRender) {
    return null;
  }

  const handleClearCache = () => {
    Alert.alert(
      '清除缓存',
      '确定要清除所有缓存数据吗？这不会删除您的记录。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清除',
          style: 'destructive',
          onPress: () => {
            Alert.alert('成功', '缓存已清除');
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert('导出数据', '数据导出功能即将推出');
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
          onPress: () => {
            setDarkMode(false);
            setNotifications(true);
            setAutoBackup(false);
            setHighQualityPhotos(true);
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
                {/* 外观设置 */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>外观</Text>
                  <SettingItem
                    icon="moon"
                    title="深色模式"
                    subtitle="切换深色主题"
                    rightComponent={
                      <Switch
                        value={darkMode}
                        onValueChange={setDarkMode}
                        trackColor={{ false: '#D1D1D1', true: '#6A89CC' }}
                        thumbColor="#FFFFFF"
                      />
                    }
                  />
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
                        onValueChange={setNotifications}
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
                    subtitle="自动备份到云端"
                    rightComponent={
                      <Switch
                        value={autoBackup}
                        onValueChange={setAutoBackup}
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
                        onValueChange={setHighQualityPhotos}
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
                      <Text style={styles.storageValue}>12.5 MB</Text>
                    </View>
                    <View style={styles.storageRow}>
                      <Text style={styles.storageLabel}>记录数量</Text>
                      <Text style={styles.storageValue}>5 条</Text>
                    </View>
                    <View style={styles.storageRow}>
                      <Text style={styles.storageLabel}>照片数量</Text>
                      <Text style={styles.storageValue}>0 张</Text>
                    </View>
                    <View style={styles.storageRow}>
                      <Text style={styles.storageLabel}>语音数量</Text>
                      <Text style={styles.storageValue}>0 条</Text>
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
                <View style={{ height: 40 }} />
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
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
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
