import { useRef, useCallback, useEffect, useState } from 'react';
import { PanResponder } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import { PhotoService, type PhotoResult } from '@/src/services/photoService';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { useSettingsStore, type LastAddType } from '@/src/store/settingsStore';
import {
  FAN_OPTIONS,
  hitTest,
  LONG_PRESS_MS,
  PEEK_TRANSLATE_Y,
  SPRING_CONFIG,
  TYPE_CONFIG,
} from './fabMenuConfig';

interface UseFABMenuControllerOptions {
  onSelect: (type: 'text' | 'photo' | 'voice', photos?: PhotoResult[]) => void;
  shouldHide?: boolean;
  onRevealRequest?: () => void;
}

export function useFABMenuController({
  onSelect,
  shouldHide,
  onRevealRequest,
}: UseFABMenuControllerOptions) {
  const { lastAddType, setLastAddType } = useSettingsStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const fanProgress = Reanimated.useSharedValue(0);
  const hoveredIndex = Reanimated.useSharedValue(-1);
  const isExpandedRef = Reanimated.useSharedValue(0);
  const fabTranslateY = Reanimated.useSharedValue(0);

  const lastAddTypeRef = useRef<LastAddType | null>(lastAddType);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPressing = useRef(false);
  const onSelectRef = useRef(onSelect);
  const setLastAddTypeRef = useRef(setLastAddType);
  const isHiddenRef = useRef(false);
  const hasRevealedInMoveRef = useRef(false);
  const revealRef = useRef(onRevealRequest);

  useEffect(() => {
    lastAddTypeRef.current = lastAddType;
  }, [lastAddType]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    setLastAddTypeRef.current = setLastAddType;
  }, [setLastAddType]);

  useEffect(() => {
    revealRef.current = onRevealRequest;
  }, [onRevealRequest]);

  useEffect(() => {
    if (shouldHide) {
      if (isExpandedRef.value === 1) return;
      fabTranslateY.value = Reanimated.withTiming(PEEK_TRANSLATE_Y, { duration: 200 });
      isHiddenRef.current = true;
      return;
    }

    fabTranslateY.value = Reanimated.withTiming(0, { duration: 200 });
    isHiddenRef.current = false;
  }, [fabTranslateY, isExpandedRef, shouldHide]);

  const clearTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const showPhotoActionError = useCallback(
    (title: string, fallbackMessage: string, error: unknown) => {
      showErrorFeedback({
        title,
        message: error instanceof Error ? error.message : fallbackMessage,
        actions: [{ label: '知道了', role: 'primary' }],
      });
    },
    [],
  );

  const runPhotoAction = useCallback(
    async <T,>({
      action,
      cancelledMessage,
      title,
      fallbackMessage,
      onSuccess,
    }: {
      action: () => Promise<T>;
      cancelledMessage: string;
      title: string;
      fallbackMessage: string;
      onSuccess: (result: T) => void;
    }) => {
      try {
        const result = await action();
        onSuccess(result);
      } catch (error) {
        if (error instanceof Error && error.message === cancelledMessage) {
          return;
        }

        showPhotoActionError(title, fallbackMessage, error);
      }
    },
    [showPhotoActionError],
  );

  const triggerOption = useCallback(async (type: LastAddType) => {
    try {
      await setLastAddTypeRef.current(type);
    } catch (err) {
      console.warn('[FABMenu] Failed to persist lastAddType:', err);
    }

    if (type === 'camera') {
      await runPhotoAction({
        action: () => PhotoService.takePhoto(),
        cancelledMessage: 'User cancelled camera',
        title: '拍照失败',
        fallbackMessage: '拍照失败，请重试',
        onSuccess: (photo) => {
          if (photo) {
            onSelectRef.current('photo', [photo]);
          }
        },
      });
      return;
    }

    if (type === 'photo') {
      await runPhotoAction({
        action: () => PhotoService.pickPhotoFromLibrary(),
        cancelledMessage: 'User cancelled photo library',
        title: '选取失败',
        fallbackMessage: '选取图片失败，请重试',
        onSuccess: (result) => {
          if (result.length > 0) {
            onSelectRef.current('photo', result);
          }
        },
      });
      return;
    }

    onSelectRef.current(type as 'text' | 'voice');
  }, [runPhotoAction]);

  const closeFan = useCallback(() => {
    fanProgress.value = Reanimated.withTiming(0, { duration: 200 });
    isExpandedRef.value = 0;
    hoveredIndex.value = -1;
    setIsExpanded(false);
  }, [fanProgress, hoveredIndex, isExpandedRef]);

  const openFan = useCallback(() => {
    isExpandedRef.value = 1;
    setIsExpanded(true);
    fanProgress.value = Reanimated.withSpring(1, SPRING_CONFIG);
  }, [fanProgress, isExpandedRef]);

  const actionsRef = useRef({ openFan, closeFan, triggerOption, clearTimer });
  useEffect(() => {
    actionsRef.current = { openFan, closeFan, triggerOption, clearTimer };
  }, [openFan, closeFan, triggerOption, clearTimer]);

  const panResponder = useRef<ReturnType<typeof PanResponder.create> | null>(null);
  if (panResponder.current === null) {
    panResponder.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        isPressing.current = true;
        hasRevealedInMoveRef.current = false;
        if (!isHiddenRef.current) {
          longPressTimer.current = setTimeout(() => {
            if (isPressing.current) actionsRef.current.openFan();
          }, LONG_PRESS_MS);
        }
      },

      onPanResponderMove: (_evt, gestureState) => {
        if (isHiddenRef.current) {
          if (gestureState.dy < -20 && !hasRevealedInMoveRef.current) {
            hasRevealedInMoveRef.current = true;
            revealRef.current?.();
          }
          return;
        }

        if (isExpandedRef.value !== 1) return;
        hoveredIndex.value = hitTest(gestureState.dx, gestureState.dy);
      },

      onPanResponderRelease: (_evt, gestureState) => {
        isPressing.current = false;
        actionsRef.current.clearTimer();

        if (isHiddenRef.current) {
          const isTap = Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10;
          if (isTap && !hasRevealedInMoveRef.current) {
            revealRef.current?.();
          }
          return;
        }

        if (isExpandedRef.value === 1) {
          const idx = hitTest(gestureState.dx, gestureState.dy);
          actionsRef.current.closeFan();
          if (idx >= 0) {
            setTimeout(() => {
              void actionsRef.current.triggerOption(FAN_OPTIONS[idx].type);
            }, 250);
          }
        } else {
          const current = lastAddTypeRef.current;
          if (current !== null) {
            void actionsRef.current.triggerOption(current);
          }
        }
      },

      onPanResponderTerminate: () => {
        isPressing.current = false;
        actionsRef.current.clearTimer();
        if (isExpandedRef.value === 1) actionsRef.current.closeFan();
      },
    });
  }

  const fabConfig = lastAddType ? TYPE_CONFIG[lastAddType] : null;

  const backdropAnimatedStyle = Reanimated.useAnimatedStyle(() => ({
    opacity: fanProgress.value,
  }));

  const fabTranslateYStyle = Reanimated.useAnimatedStyle(() => ({
    transform: [{ translateY: fabTranslateY.value }],
  }));

  return {
    isExpanded,
    fanProgress,
    hoveredIndex,
    panHandlers: panResponder.current.panHandlers,
    fabIcon: fabConfig?.icon ?? 'add',
    fabBgColor: fabConfig?.color ?? '#6A89CC',
    lastAddType,
    closeFan,
    backdropAnimatedStyle,
    fabTranslateYStyle,
  };
}
