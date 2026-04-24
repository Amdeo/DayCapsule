import type { ReactNode } from 'react';
import React from 'react';
import { Pressable, Text } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { searchBarStyles as styles, TOPBAR_TOGGLE_INACTIVE } from './SearchBar.styles';
import type { ViewMode } from '@/src/components/timeline-v2/timelineTypes';

interface SearchBarActionsProps {
  menuButtonAnimatedStyle: AnimatedStyle<any>;
  onMenuPress?: () => void;
  onMenuPressIn: () => void;
  onMenuPressOut: () => void;
  onSearchFocus?: () => void;
  onViewModePress?: () => void;
  showViewModeActive?: boolean;
  viewMode?: ViewMode;
  rightActions?: ReactNode;
}

export function SearchBarActions({
  menuButtonAnimatedStyle,
  onMenuPress,
  onMenuPressIn,
  onMenuPressOut,
  onSearchFocus,
  onViewModePress,
  showViewModeActive,
  viewMode,
  rightActions,
}: SearchBarActionsProps) {
  return (
    <>
      <Pressable
        testID="searchbar-menu-button-pressable"
        onPress={onMenuPress}
        onPressIn={onMenuPressIn}
        onPressOut={onMenuPressOut}
      >
        <Animated.View testID="searchbar-menu-button" style={[styles.toolButton, menuButtonAnimatedStyle]}>
          <Ionicons name="menu" size={24} color="#4A4A4A" />
        </Animated.View>
      </Pressable>

      <Pressable testID="searchbar-search-box" style={styles.searchBox} onPress={onSearchFocus}>
        <Text style={styles.placeholder}>搜索记忆...</Text>
        <Ionicons name="search" size={20} color="#6A89CC" />
      </Pressable>

      {onViewModePress ? (
        <Pressable testID="searchbar-view-mode-toggle" onPress={onViewModePress} style={styles.toolButton}>
          <Ionicons
            name={
              viewMode === 'card'
                ? 'grid-outline'
                : viewMode === 'calendar'
                ? 'calendar'
                : 'list'
            }
            size={22}
            color={showViewModeActive ? '#6A89CC' : TOPBAR_TOGGLE_INACTIVE}
          />
        </Pressable>
      ) : null}

      {rightActions}
    </>
  );
}
