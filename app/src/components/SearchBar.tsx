/**
 * 搜索栏组件（只读引导，点击后打开搜索覆盖层）
 */

import React, { ReactNode, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 菜单按钮 */}
      <Pressable
        onPress={onMenuPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[styles.menuButton, animatedStyle]}>
          <Ionicons name="menu" size={24} color="#4A4A4A" />
        </Animated.View>
      </Pressable>

      {/* 只读搜索框，点击打开搜索覆盖层 */}
      <Pressable style={styles.searchBox} onPress={onSearchFocus}>
        <Text style={styles.placeholder}>搜索记忆...</Text>
        <Ionicons name="search" size={20} color="#6A89CC" />
      </Pressable>

      {/* 视图模式切换按钮 */}
      {onViewModePress && (
        <Pressable onPress={onViewModePress} style={styles.viewModeButton}>
          <Ionicons
            name={showViewModeActive ? 'layers' : 'layers-outline'}
            size={22}
            color={showViewModeActive ? '#6A89CC' : '#A3A3A3'}
          />
        </Pressable>
      )}

      {rightActions ? (
        <View style={styles.rightActions} testID="searchbar-right-actions">
          {rightActions}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAF8F5',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  placeholder: {
    flex: 1,
    fontSize: 15,
    color: '#A3A3A3',
  },
  menuButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  viewModeButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
