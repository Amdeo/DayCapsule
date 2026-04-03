/**
 * 首页抽屉动画 Hook
 * 管理侧边栏的滑入/滑出动画、手势和 Android 返回键
 */

import { useState, useCallback, useEffect } from 'react';
import { BackHandler, Dimensions } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('screen');
export const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);
export const MAIN_TRANSLATE_X = SIDEBAR_WIDTH;

export function useDrawerAnimation() {
  const drawerProgress = useSharedValue(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    cancelAnimation(drawerProgress);
    drawerProgress.value = withTiming(1, { duration: 280 });
  }, [drawerProgress]);

  const closeDrawer = useCallback(() => {
    cancelAnimation(drawerProgress);
    drawerProgress.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) runOnJS(setDrawerOpen)(false);
    });
  }, [drawerProgress]);

  useEffect(() => {
    if (!drawerOpen) return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeDrawer();
      return true;
    });

    return () => sub.remove();
  }, [drawerOpen, closeDrawer]);

  const mainContentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drawerProgress.value, [0, 1], [0, MAIN_TRANSLATE_X]) },
    ],
  }));

  return { drawerProgress, drawerOpen, openDrawer, closeDrawer, mainContentStyle };
}
