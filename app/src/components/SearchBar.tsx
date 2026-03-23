/**
 * 搜索栏组件（只读引导，点击后打开搜索覆盖层）
 */

import React, { ReactNode, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, cancelAnimation } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SearchBarProps {
  onMenuPress?: () => void;
  onSearchFocus?: () => void;
  onViewModePress?: () => void;
  showViewModeActive?: boolean;
  rightActions?: ReactNode;
}

const MENU_BUTTON_SIZE = 48;
const MENU_BUTTON_RADIUS = 24;
const SEARCH_BOX_HEIGHT = 48;

const MENU_BUTTON_STYLE = {
  width: MENU_BUTTON_SIZE,
  height: MENU_BUTTON_SIZE,
  borderRadius: MENU_BUTTON_RADIUS,
};

const SEARCH_BOX_STYLE = {
  height: SEARCH_BOX_HEIGHT,
};

export function SearchBar({
  onMenuPress,
  onSearchFocus,
  onViewModePress,
  showViewModeActive,
  rightActions,
}: SearchBarProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    return () => {
      cancelAnimation(scale);
    };
  }, []);

  const insets = useSafeAreaInsets();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const menuButtonStyle = [MENU_BUTTON_STYLE, animatedStyle];

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <View
      className="flex-row items-center gap-3 bg-home-background px-4 pb-3"
      style={{ paddingTop: insets.top }}
    >
      {/* 菜单按钮 */}
      <Pressable
        onPress={onMenuPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          testID="searchbar-menu-button"
          className="h-12 w-12 items-center justify-center rounded-full bg-home-surface shadow-sm"
          style={menuButtonStyle}
        >
          <Ionicons name="menu" size={24} color="#4A4A4A" />
        </Animated.View>
      </Pressable>

      {/* 只读搜索框，点击打开搜索覆盖层 */}
      <Pressable
        testID="searchbar-search-box"
        className="h-12 flex-1 flex-row items-center justify-between rounded-full bg-home-surface px-4 shadow-sm"
        style={SEARCH_BOX_STYLE}
        onPress={onSearchFocus}
      >
        <Text className="flex-1 text-[15px] text-copy-muted">搜索记忆...</Text>
        <Ionicons name="search" size={20} color="#6A89CC" />
      </Pressable>

      {/* 视图模式切换按钮 */}
      {onViewModePress && (
        <Pressable
          onPress={onViewModePress}
          className="h-12 w-12 items-center justify-center rounded-full bg-home-surface shadow-sm"
        >
          <Ionicons
            name={showViewModeActive ? 'layers' : 'layers-outline'}
            size={22}
            color={showViewModeActive ? '#6A89CC' : '#A3A3A3'}
          />
        </Pressable>
      )}

      {rightActions ? (
        <View className="flex-row items-center gap-3" testID="searchbar-right-actions">
          {rightActions}
        </View>
      ) : null}
    </View>
  );
}
