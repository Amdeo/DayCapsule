import React from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImageViewerScene } from './image-viewer/ImageViewerScene';
import type { ImageViewerProps } from './image-viewer/imageViewerTypes';
export type { OriginLayout } from './image-viewer/imageViewerTypes';
import { useImageViewerController } from './image-viewer/useImageViewerController';

export function ImageViewer({
  visible,
  imageUri,
  onClose,
  originLayout,
  thumbnailRef,
  debugShowActionSheet = false,
}: ImageViewerProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
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
  } = useImageViewerController({
    visible,
    imageUri,
    onClose,
    originLayout,
    thumbnailRef,
    screenWidth,
    screenHeight,
  });

  return (
    <ImageViewerScene
      visible={visible}
      imageUri={imageUri}
      phase={phase}
      showActionSheet={showActionSheet || debugShowActionSheet}
      bottomInset={insets.bottom}
      screenWidth={screenWidth}
      screenHeight={screenHeight}
      backdropAnimatedStyle={backdropAnimatedStyle}
      heroAnimatedStyle={heroAnimatedStyle}
      imageAnimatedStyle={imageAnimatedStyle}
      composedGesture={composedGesture}
      onRequestClose={handleRequestClose}
      onCloseActionSheet={closeActionSheet}
      onSaveToAlbum={handleSaveToAlbum}
      onShare={handleShare}
    />
  );
}
