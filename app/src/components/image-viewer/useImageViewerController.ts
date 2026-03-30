import { useCallback, useEffect, useState } from 'react';
import {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { ImageViewerProps, ImageViewerPhase } from './imageViewerTypes';
import { useImageViewerActions } from './useImageViewerActions';
import { useImageViewerCloseTransition } from './useImageViewerCloseTransition';
import { useImageViewerGestures } from './useImageViewerGestures';

interface UseImageViewerControllerOptions {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  originLayout?: ImageViewerProps['originLayout'];
  thumbnailRef?: ImageViewerProps['thumbnailRef'];
  screenWidth: number;
  screenHeight: number;
}

export function useImageViewerController({
  visible,
  imageUri,
  onClose,
  originLayout,
  thumbnailRef,
  screenWidth,
  screenHeight,
}: UseImageViewerControllerOptions) {
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [phase, setPhase] = useState<ImageViewerPhase>('idle');

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const dismissY = useSharedValue(0);
  const dismissScale = useSharedValue(1);
  const backdropOpacity = useSharedValue(0);
  const panMode = useSharedValue<0 | 1>(0);

  const heroLeft = useSharedValue(0);
  const heroTop = useSharedValue(0);
  const heroWidth = useSharedValue(screenWidth);
  const heroHeight = useSharedValue(screenHeight);

  const cancelAllAnimations = useCallback(() => {
    cancelAnimation(scale);
    cancelAnimation(translateX);
    cancelAnimation(translateY);
    cancelAnimation(dismissY);
    cancelAnimation(dismissScale);
    cancelAnimation(backdropOpacity);
    cancelAnimation(heroLeft);
    cancelAnimation(heroTop);
    cancelAnimation(heroWidth);
    cancelAnimation(heroHeight);
  }, [
    backdropOpacity,
    dismissScale,
    dismissY,
    heroHeight,
    heroLeft,
    heroTop,
    heroWidth,
    scale,
    translateX,
    translateY,
  ]);

  const { triggerClose, handleRequestClose } = useImageViewerCloseTransition({
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
  });

  useEffect(() => {
    if (visible) {
      cancelAllAnimations();

      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      dismissY.value = 0;
      dismissScale.value = 1;
      panMode.value = 0;
      setShowActionSheet(false);

      if (originLayout) {
        heroLeft.value = originLayout.x;
        heroTop.value = originLayout.y;
        heroWidth.value = originLayout.width;
        heroHeight.value = originLayout.height;
        backdropOpacity.value = 0;
        setPhase('opening');
      } else {
        backdropOpacity.value = withTiming(1, { duration: 250 });
        setPhase('open');
      }
      return;
    }

    setPhase('idle');
  }, [visible]);

  useEffect(() => {
    if (phase !== 'opening') {
      return;
    }

    heroLeft.value = 0;
    heroTop.value = 0;
    heroWidth.value = screenWidth;
    heroHeight.value = screenHeight;
    setPhase('open');
    backdropOpacity.value = 1;
  }, [
    backdropOpacity,
    heroHeight,
    heroLeft,
    heroTop,
    heroWidth,
    phase,
    screenHeight,
    screenWidth,
  ]);

  const closeActionSheet = useCallback(() => {
    setShowActionSheet(false);
  }, []);

  const composedGesture = useImageViewerGestures({
    screenHeight,
    scale,
    savedScale,
    translateX,
    translateY,
    savedTranslateX,
    savedTranslateY,
    dismissY,
    dismissScale,
    backdropOpacity,
    panMode,
    onTriggerClose: triggerClose,
    onShowActionSheet: () => setShowActionSheet(true),
  });

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value + dismissY.value },
      { scale: scale.value * dismissScale.value },
    ],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const heroAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: heroLeft.value,
    top: heroTop.value,
    width: heroWidth.value,
    height: heroHeight.value,
  }));

  const { handleSaveToAlbum, handleShare } = useImageViewerActions({
    imageUri,
    onHideActionSheet: closeActionSheet,
  });

  return {
    phase,
    showActionSheet,
    backdropAnimatedStyle,
    heroAnimatedStyle,
    imageAnimatedStyle,
    composedGesture,
    handleRequestClose,
    closeActionSheet,
    handleSaveToAlbum,
    handleShare,
  };
}
