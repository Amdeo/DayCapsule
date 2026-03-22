/**
 * 侧边栏菜单组件
 */

import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SettingsPage } from './SettingsPage';
import { AboutPage } from './AboutPage';
import { StatsPage } from './StatsPage';
import { TagsPage } from './TagsPage';
import { BackupPage } from './BackupPage';
import { HelpPage } from './HelpPage';

const { width: SCREEN_WIDTH } = Dimensions.get('screen');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);

interface SidebarProps {
  drawerProgress: SharedValue<number>;
  onClose: () => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  showAbout: boolean;
  setShowAbout: (v: boolean) => void;
  showStats: boolean;
  setShowStats: (v: boolean) => void;
  showTags: boolean;
  setShowTags: (v: boolean) => void;
  showBackup: boolean;
  setShowBackup: (v: boolean) => void;
  showHelp: boolean;
  setShowHelp: (v: boolean) => void;
}

export function Sidebar({
  drawerProgress, onClose,
  showSettings, setShowSettings,
  showAbout, setShowAbout,
  showStats, setShowStats,
  showTags, setShowTags,
  showBackup, setShowBackup,
  showHelp, setShowHelp,
}: SidebarProps) {
  const insets = useSafeAreaInsets();
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drawerProgress.value, [0, 1], [-SIDEBAR_WIDTH, 0]) },
    ],
  }));

  const handleMenuItemPress = (action: 'settings' | 'about' | 'stats' | 'tags' | 'backup' | 'help') => {
    onClose();
    switch (action) {
      case 'settings': setShowSettings(true); break;
      case 'about':    setShowAbout(true);    break;
      case 'stats':    setShowStats(true);    break;
      case 'tags':     setShowTags(true);     break;
      case 'backup':   setShowBackup(true);   break;
      case 'help':     setShowHelp(true);     break;
    }
  };

  return (
    <>
      <Animated.View
        testID="sidebar-shell"
        className="absolute bottom-0 left-0 top-0 z-10 bg-home-surface shadow-lg"
        style={[styles.sidebar, animatedStyle]}
      >
        <View className="flex-1">
          <View
            className="flex-row items-center justify-between border-b border-border-subtle px-5 pb-5"
            style={[styles.header, { paddingTop: insets.top + 20 }]}
          >
            <Text style={styles.headerTitle} className="text-2xl font-bold text-copy-primary">
              菜单
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              className="h-10 w-10 items-center justify-center rounded-full"
            >
              <Ionicons name="close" size={24} color="#4A4A4A" />
            </TouchableOpacity>
          </View>

          <View style={styles.menuList} className="flex-1 pt-2">
            <TouchableOpacity
              style={styles.menuItem}
              className="flex-row items-center px-5 py-4"
              activeOpacity={0.7}
              onPress={() => handleMenuItemPress('stats')}
            >
              <View
                style={styles.menuIconContainer}
                className="mr-4 h-10 w-10 items-center justify-center rounded-xl bg-neutral-100"
              >
                <Ionicons name="stats-chart-outline" size={22} color="#6A89CC" />
              </View>
              <Text style={styles.menuText} className="flex-1 text-base font-medium text-copy-primary">
                统计
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              className="flex-row items-center px-5 py-4"
              activeOpacity={0.7}
              onPress={() => handleMenuItemPress('tags')}
            >
              <View
                style={styles.menuIconContainer}
                className="mr-4 h-10 w-10 items-center justify-center rounded-xl bg-neutral-100"
              >
                <Ionicons name="pricetags-outline" size={22} color="#A491D3" />
              </View>
              <Text style={styles.menuText} className="flex-1 text-base font-medium text-copy-primary">
                标签管理
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              className="flex-row items-center px-5 py-4"
              activeOpacity={0.7}
              onPress={() => handleMenuItemPress('backup')}
            >
              <View
                style={styles.menuIconContainer}
                className="mr-4 h-10 w-10 items-center justify-center rounded-xl bg-neutral-100"
              >
                <Ionicons name="cloud-upload-outline" size={22} color="#77C9D4" />
              </View>
              <Text style={styles.menuText} className="flex-1 text-base font-medium text-copy-primary">
                备份与同步
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
            </TouchableOpacity>

            <View style={styles.divider} className="mx-5 my-2 h-px bg-border-subtle" />

            <TouchableOpacity
              style={styles.menuItem}
              className="flex-row items-center px-5 py-4"
              activeOpacity={0.7}
              onPress={() => handleMenuItemPress('settings')}
            >
              <View
                style={styles.menuIconContainer}
                className="mr-4 h-10 w-10 items-center justify-center rounded-xl bg-neutral-100"
              >
                <Ionicons name="settings-outline" size={22} color="#737373" />
              </View>
              <Text style={styles.menuText} className="flex-1 text-base font-medium text-copy-primary">
                设置
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              className="flex-row items-center px-5 py-4"
              activeOpacity={0.7}
              onPress={() => handleMenuItemPress('help')}
            >
              <View
                style={styles.menuIconContainer}
                className="mr-4 h-10 w-10 items-center justify-center rounded-xl bg-neutral-100"
              >
                <Ionicons name="help-circle-outline" size={22} color="#737373" />
              </View>
              <Text style={styles.menuText} className="flex-1 text-base font-medium text-copy-primary">
                帮助与反馈
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              className="flex-row items-center px-5 py-4"
              activeOpacity={0.7}
              onPress={() => handleMenuItemPress('about')}
            >
              <View
                style={styles.menuIconContainer}
                className="mr-4 h-10 w-10 items-center justify-center rounded-xl bg-neutral-100"
              >
                <Ionicons name="information-circle-outline" size={22} color="#737373" />
              </View>
              <Text style={styles.menuText} className="flex-1 text-base font-medium text-copy-primary">
                关于
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
            </TouchableOpacity>
          </View>

          <View
            testID="sidebar-footer"
            className="items-center border-t border-border-subtle bg-home-surface p-5"
            style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
          >
            <Text style={styles.versionText} className="text-xs text-copy-muted">
              MemoryCapsule v1.0.0
            </Text>
          </View>
        </View>
      </Animated.View>

      <SettingsPage visible={showSettings} onClose={() => setShowSettings(false)} />
      <AboutPage    visible={showAbout}    onClose={() => setShowAbout(false)} />
      <StatsPage    visible={showStats}    onClose={() => setShowStats(false)} />
      <TagsPage     visible={showTags}     onClose={() => setShowTags(false)} />
      <BackupPage   visible={showBackup}   onClose={() => setShowBackup(false)} />
      <HelpPage     visible={showHelp}     onClose={() => setShowHelp(false)} />
    </>
  );
}

const styles: Record<string, any> = {
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
    backgroundColor: '#FFFFFF',
  },
  versionText: {
    fontSize: 12,
    color: '#A3A3A3',
  },
};
