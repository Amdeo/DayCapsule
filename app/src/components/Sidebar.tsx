import React from 'react';
import Animated, { SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SidebarPages } from './sidebar/SidebarPages';
import { SidebarPanel } from './sidebar/SidebarPanel';
import { sidebarStyles as styles } from './sidebar/Sidebar.styles';
import {
  SidebarPageStateProps,
  useSidebarController,
} from './sidebar/useSidebarController';

interface SidebarProps {
  drawerProgress: SharedValue<number>;
  onClose: () => void;
}

export function Sidebar({
  drawerProgress,
  onClose,
  ...pageState
}: SidebarProps & SidebarPageStateProps) {
  const insets = useSafeAreaInsets();
  const { animatedStyle, handleMenuItemPress, sidebarWidth } = useSidebarController({
    drawerProgress,
    onClose,
    ...pageState,
  });

  return (
    <>
      <Animated.View style={[styles.sidebar, { width: sidebarWidth }, animatedStyle]}>
        <SidebarPanel
          headerTopPadding={insets.top + 20}
          footerBottomPadding={Math.max(insets.bottom, 16)}
          onClose={onClose}
          onPressMenuItem={handleMenuItemPress}
        />
      </Animated.View>

      <SidebarPages
        {...pageState}
      />
    </>
  );
}
