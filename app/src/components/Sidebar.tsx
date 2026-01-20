/**
 * 侧边栏菜单组件
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, TouchableWithoutFeedback } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInLeft, SlideOutLeft } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SettingsPage } from './SettingsPage';
import { AboutPage } from './AboutPage';

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

export function Sidebar({ visible, onClose }: SidebarProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      // 延迟关闭 Modal，让动画有时间播放
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // 等待动画完成
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!shouldRender) {
    return null;
  }

  const handleMenuItemPress = (action: 'settings' | 'about' | 'stats' | 'tags' | 'backup' | 'help') => {
    onClose(); // 先关闭侧边栏
    setTimeout(() => {
      switch (action) {
        case 'settings':
          setShowSettings(true);
          break;
        case 'about':
          setShowAbout(true);
          break;
        case 'stats':
          // TODO: 实现统计功能
          alert('统计功能即将推出');
          break;
        case 'tags':
          // TODO: 实现标签管理
          alert('标签管理功能即将推出');
          break;
        case 'backup':
          // TODO: 实现备份与同步
          alert('备份与同步功能即将推出');
          break;
        case 'help':
          // TODO: 实现帮助与反馈
          alert('帮助与反馈功能即将推出');
          break;
      }
    }, 300); // 等待侧边栏关闭动画完成
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
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        >
          {isAnimating && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={styles.backdrop}
              pointerEvents="none"
            />
          )}
        </Pressable>

        {/* 侧边栏内容 */}
        {isAnimating && (
          <Animated.View
            entering={SlideInLeft.duration(300).springify()}
            exiting={SlideOutLeft.duration(250)}
            style={styles.sidebar}
          >
          <View
            style={{ flex: 1 }}
            onStartShouldSetResponder={() => true}
            onResponderRelease={() => {}}
          >
            {/* 头部 */}
            <View style={styles.header}>
            <Text style={styles.headerTitle}>菜单</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#4A4A4A" />
            </TouchableOpacity>
          </View>

          {/* 菜单项 */}
          <View style={styles.menuList}>
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => handleMenuItemPress('stats')}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="stats-chart-outline" size={22} color="#6A89CC" />
              </View>
              <Text style={styles.menuText}>统计</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => handleMenuItemPress('tags')}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="pricetags-outline" size={22} color="#A491D3" />
              </View>
              <Text style={styles.menuText}>标签管理</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => handleMenuItemPress('backup')}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="cloud-upload-outline" size={22} color="#77C9D4" />
              </View>
              <Text style={styles.menuText}>备份与同步</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => handleMenuItemPress('settings')}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="settings-outline" size={22} color="#737373" />
              </View>
              <Text style={styles.menuText}>设置</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => handleMenuItemPress('help')}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="help-circle-outline" size={22} color="#737373" />
              </View>
              <Text style={styles.menuText}>帮助与反馈</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => handleMenuItemPress('about')}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="information-circle-outline" size={22} color="#737373" />
              </View>
              <Text style={styles.menuText}>关于</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
            </TouchableOpacity>
          </View>

          {/* 底部版本信息 */}
          <View style={styles.footer}>
            <Text style={styles.versionText}>MemoryCapsule v1.0.0</Text>
          </View>
          </View>
        </Animated.View>
        )}
      </View>

      {/* 设置页面 */}
      <SettingsPage visible={showSettings} onClose={() => setShowSettings(false)} />

      {/* 关于页面 */}
      <AboutPage visible={showAbout} onClose={() => setShowAbout(false)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  menuList: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginRight: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#4A4A4A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 8,
    marginHorizontal: 20,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  versionText: {
    fontSize: 12,
    color: '#A3A3A3',
  },
});
