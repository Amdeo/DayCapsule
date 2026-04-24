/**
 * 搜索栏组件（只读引导，点击后打开搜索覆盖层）
 */

import React, { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchBarActions } from './search-bar/SearchBarActions';
import { searchBarStyles as styles } from './search-bar/SearchBar.styles';
import type { ViewMode } from './timeline-v2/timelineTypes';
import { useSearchBarController } from './search-bar/useSearchBarController';

interface SearchBarProps {
  onMenuPress?: () => void;
  onSearchFocus?: () => void;
  onViewModePress?: () => void;
  showViewModeActive?: boolean;
  viewMode?: ViewMode;
  rightActions?: ReactNode;
}

export function SearchBar({
  onMenuPress,
  onSearchFocus,
  onViewModePress,
  showViewModeActive,
  viewMode,
  rightActions,
}: SearchBarProps) {
  const insets = useSafeAreaInsets();
  const { animatedStyle, handlePressIn, handlePressOut } = useSearchBarController();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <SearchBarActions
        menuButtonAnimatedStyle={animatedStyle}
        onMenuPress={onMenuPress}
        onMenuPressIn={handlePressIn}
        onMenuPressOut={handlePressOut}
        onSearchFocus={onSearchFocus}
        onViewModePress={onViewModePress}
        showViewModeActive={showViewModeActive}
        viewMode={viewMode}
        rightActions={rightActions}
      />
    </View>
  );
}
