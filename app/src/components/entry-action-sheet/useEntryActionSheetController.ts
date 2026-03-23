import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import type { ActionSheetMode, EntryType } from './entryActionSheetConfig';
import {
  ENTRY_ACTION_SHEET_EXIT_DURATION,
  ENTRY_TYPE_COLORS,
  SHEET_ENTER_DURATION,
  SHEET_RETURN_DURATION,
} from './entryActionSheetConfig';

interface UseEntryActionSheetControllerOptions {
  visible: boolean;
  entryType: EntryType;
  screenHeight: number;
  onClose: () => void;
}

export function useEntryActionSheetController({
  visible,
  entryType,
  screenHeight,
  onClose,
}: UseEntryActionSheetControllerOptions) {
  const [mode, setMode] = useState<ActionSheetMode>('menu');
  const [shouldRender, setShouldRender] = useState(visible);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateY = Reanimated.useSharedValue(screenHeight);
  const backdropOpacity = Reanimated.useSharedValue(0);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (visible) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setShouldRender(true);
      setMode('menu');
      translateY.value = screenHeight;
      backdropOpacity.value = 0;
      translateY.value = Reanimated.withTiming(0, {
        duration: SHEET_ENTER_DURATION,
        easing: Reanimated.Easing.out(Reanimated.Easing.cubic),
      });
      backdropOpacity.value = Reanimated.withTiming(1, { duration: 180 });
      return;
    }

    setMode('menu');

    if (!shouldRender) {
      return;
    }

    translateY.value = Reanimated.withTiming(screenHeight, {
      duration: ENTRY_ACTION_SHEET_EXIT_DURATION,
    });
    backdropOpacity.value = Reanimated.withTiming(0, { duration: 180 });
    closeTimeoutRef.current = setTimeout(() => {
      setShouldRender(false);
      closeTimeoutRef.current = null;
    }, ENTRY_ACTION_SHEET_EXIT_DURATION);
  }, [screenHeight, shouldRender, visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_event, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.value = gestureState.dy;
          }
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.vy > 0.5 || gestureState.dy > 120) {
            onClose();
            return;
          }
          translateY.value = Reanimated.withTiming(0, {
            duration: SHEET_RETURN_DURATION,
            easing: Reanimated.Easing.out(Reanimated.Easing.cubic),
          });
        },
        onPanResponderTerminate: () => {
          translateY.value = Reanimated.withTiming(0, {
            duration: SHEET_RETURN_DURATION,
            easing: Reanimated.Easing.out(Reanimated.Easing.cubic),
          });
        },
      }),
    [onClose, translateY],
  );

  const backdropStyle = Reanimated.useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = Reanimated.useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return {
    mode,
    setMode,
    shouldRender,
    typeColor: ENTRY_TYPE_COLORS[entryType],
    panHandlers: panResponder.panHandlers,
    backdropStyle,
    sheetStyle,
  };
}
