import { useCallback, useEffect, useRef } from 'react';
import type React from 'react';
import type { Image } from 'react-native';
import {
  Easing,
  runOnJS,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { OriginLayout, ImageViewerPhase } from './imageViewerTypes';

interface UseImageViewerCloseTransitionOptions {
  visible: boolean;
  originLayout?: OriginLayout;
  thumbnailRef?: React.RefObject<React.ElementRef<typeof Image>>;
  screenWidth: number;
  screenHeight: number;
  phase: ImageViewerPhase;
  setPhase: React.Dispatch<React.SetStateAction<ImageViewerPhase>>;
  onClose: () => void;
  setShowActionSheet: React.Dispatch<React.SetStateAction<boolean>>;
  cancelAllAnimations: () => void;
  dismissY: SharedValue<number>;
  dismissScale: SharedValue<number>;
  backdropOpacity: SharedValue<number>;
  heroLeft: SharedValue<number>;
  heroTop: SharedValue<number>;
  heroWidth: SharedValue<number>;
  heroHeight: SharedValue<number>;
}

export function useImageViewerCloseTransition({
  visible,
  originLayout,
  thumbnailRef,
  screenWidth,
  screenHeight,
  phase,
  setPhase,
  onClose,
  setShowActionSheet,
  cancelAllAnimations,
  dismissY,
  dismissScale,
  backdropOpacity,
  heroLeft,
  heroTop,
  heroWidth,
  heroHeight,
}: UseImageViewerCloseTransitionOptions) {
  const isMountedRef = useRef(true);
  const canAnimateBackRef = useRef(Boolean(originLayout));
  const shouldIgnoreSharedTransitionRef = useRef(false);
  const prevDimensions = useRef({ width: screenWidth, height: screenHeight });

  const performClose = useCallback(() => {
    if (isMountedRef.current) {
      onClose();
    }
  }, [onClose]);

  const startFadeClose = useCallback(() => {
    setShowActionSheet(false);
    cancelAllAnimations();
    dismissY.value = 0;
    dismissScale.value = 1;
    setPhase('closing-fade');
    backdropOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(performClose)();
      }
    });
  }, [
    backdropOpacity,
    cancelAllAnimations,
    dismissScale,
    dismissY,
    performClose,
    setPhase,
    setShowActionSheet,
  ]);

  const triggerClose = useCallback(
    (_capturedDismissY: number = 0) => {
      if (phase === 'idle' || phase === 'closing' || phase === 'closing-fade') {
        return;
      }

      setShowActionSheet(false);
      cancelAllAnimations();
      dismissY.value = 0;
      dismissScale.value = 1;

      if (canAnimateBackRef.current && thumbnailRef?.current) {
        setPhase('closing');
        return;
      }

      startFadeClose();
    },
    [
      cancelAllAnimations,
      dismissScale,
      dismissY,
      phase,
      setPhase,
      setShowActionSheet,
      startFadeClose,
      thumbnailRef,
    ],
  );

  const triggerCloseAnimation = useCallback(() => {
    if (!canAnimateBackRef.current || !thumbnailRef?.current) {
      startFadeClose();
      return;
    }

    thumbnailRef.current.measureInWindow((x, y, width, height) => {
      if (!isMountedRef.current || shouldIgnoreSharedTransitionRef.current) {
        return;
      }

      const isVisible = y + height > 0 && y < screenHeight;
      if (!isVisible) {
        startFadeClose();
        return;
      }

      const closingTiming = {
        duration: 500,
        easing: Easing.in(Easing.ease),
      };
      heroLeft.value = withTiming(x, closingTiming);
      heroTop.value = withTiming(y, closingTiming);
      heroWidth.value = withTiming(width, closingTiming);
      heroHeight.value = withTiming(height, closingTiming, (finished) => {
        if (finished) {
          runOnJS(performClose)();
        }
      });
      backdropOpacity.value = withTiming(0, closingTiming);
    });
  }, [
    backdropOpacity,
    heroHeight,
    heroLeft,
    heroTop,
    heroWidth,
    performClose,
    screenHeight,
    startFadeClose,
    thumbnailRef,
  ]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      shouldIgnoreSharedTransitionRef.current = true;
      cancelAllAnimations();
    };
  }, [cancelAllAnimations]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    shouldIgnoreSharedTransitionRef.current = false;
    canAnimateBackRef.current = Boolean(originLayout);
  }, [originLayout, visible]);

  useEffect(() => {
    if (phase !== 'closing') {
      return;
    }
    triggerCloseAnimation();
  }, [phase, triggerCloseAnimation]);

  useEffect(() => {
    if (
      prevDimensions.current.width === screenWidth &&
      prevDimensions.current.height === screenHeight
    ) {
      return;
    }

    prevDimensions.current = { width: screenWidth, height: screenHeight };

    if (phase === 'opening' || phase === 'closing') {
      shouldIgnoreSharedTransitionRef.current = true;
      canAnimateBackRef.current = false;
      startFadeClose();
      return;
    }

    if (phase === 'open') {
      canAnimateBackRef.current = false;
    }
  }, [phase, screenHeight, screenWidth, startFadeClose]);

  return {
    triggerClose,
    handleRequestClose: () => triggerClose(0),
  };
}
