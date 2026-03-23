import type { ReactNode } from 'react';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { searchBarStyles as styles } from './SearchBar.styles';

interface SearchBarActionsProps {
  menuButtonAnimatedStyle: AnimatedStyle<any>;
  onMenuPress?: () => void;
  onMenuPressIn: () => void;
  onMenuPressOut: () => void;
  onSearchFocus?: () => void;
  onViewModePress?: () => void;
  showViewModeActive?: boolean;
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
  rightActions,
}: SearchBarActionsProps) {
  return (
    <>
      <Pressable
        onPress={onMenuPress}
        onPressIn={onMenuPressIn}
        onPressOut={onMenuPressOut}
      >
        <Animated.View style={[styles.circularButton, menuButtonAnimatedStyle]}>
          <Ionicons name="menu" size={24} color="#4A4A4A" />
        </Animated.View>
      </Pressable>

      <Pressable style={styles.searchBox} onPress={onSearchFocus}>
        <Text style={styles.placeholder}>搜索记忆...</Text>
        <Ionicons name="search" size={20} color="#6A89CC" />
      </Pressable>

      {onViewModePress ? (
        <Pressable onPress={onViewModePress} style={styles.circularButton}>
          <Ionicons
            name={showViewModeActive ? 'layers' : 'layers-outline'}
            size={22}
            color={showViewModeActive ? '#6A89CC' : '#A3A3A3'}
          />
        </Pressable>
      ) : null}

      {rightActions ? (
        <View style={styles.rightActions} testID="searchbar-right-actions">
          {rightActions}
        </View>
      ) : null}
    </>
  );
}
