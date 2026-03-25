import React from 'react';
import { Image, Modal } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { logger } from '@/src/utils/logger';
import { ImageViewerActionSheet } from './ImageViewerActionSheet';
import { imageViewerStyles as styles } from './ImageViewer.styles';
import type { ImageViewerSceneProps } from './imageViewerTypes';

export function ImageViewerScene({
  visible,
  imageUri,
  phase,
  showActionSheet,
  bottomInset,
  screenWidth,
  screenHeight,
  backdropAnimatedStyle,
  heroAnimatedStyle,
  imageAnimatedStyle,
  composedGesture,
  onRequestClose,
  onCloseActionSheet,
  onSaveToAlbum,
  onShare,
}: ImageViewerSceneProps) {
  const handleImageError = () => {
    logger.warn('[ImageViewer] image load failed', {
      phase,
      imageUri,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView testID="image-viewer-root" style={{ flex: 1 }}>
        <Animated.View style={[styles.backdropFill, backdropAnimatedStyle]} />

        {(phase === 'opening' || phase === 'closing') ? (
          <Animated.Image
            source={{ uri: imageUri }}
            style={heroAnimatedStyle}
            resizeMode="contain"
            onError={handleImageError}
          />
        ) : null}

        {phase === 'open' ? (
          <GestureDetector gesture={composedGesture}>
            <Animated.View style={styles.imageContainer}>
              <Animated.View style={imageAnimatedStyle}>
                <Image
                  source={{ uri: imageUri }}
                  style={[styles.image, { width: screenWidth, height: screenHeight }]}
                  resizeMode="contain"
                  onError={handleImageError}
                />
              </Animated.View>
            </Animated.View>
          </GestureDetector>
        ) : null}

        <ImageViewerActionSheet
          visible={showActionSheet}
          bottomInset={bottomInset}
          onClose={onCloseActionSheet}
          onSaveToAlbum={onSaveToAlbum}
          onShare={onShare}
        />
      </GestureHandlerRootView>
    </Modal>
  );
}
