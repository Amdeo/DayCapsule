/**
 * 图片查看器组件
 * 支持放大、缩放、手势操作
 */

import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  cancelAnimation,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
}

export function ImageViewer({ visible, imageUri, onClose }: ImageViewerProps) {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const isMountedRef = useRef(true);

  // 组件卸载时清理所有动画
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cancelAnimation(scale);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
    };
  }, []);

  // 重置变换
  const resetTransform = () => {
    if (isMountedRef.current) {
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  };

  // 缩放到 1:1 (100%)
  const zoomTo100 = () => {
    if (isMountedRef.current) {
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  };

  // 双击手势 - 缩放到 100%
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (isMountedRef.current) {
        // 如果当前已经缩放到 1 附近，则缩放到适应屏幕；否则缩放到 1:1
        if (scale.value > 0.9 && scale.value < 1.1) {
          resetTransform();
        } else {
          zoomTo100();
        }
      }
    });

  // 捏合手势 - 使用新的 Gesture API
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newScale = savedScale.value * event.scale;
      // 限制缩放范围 0.5x - 5x
      scale.value = Math.min(Math.max(newScale, 0.5), 5);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      // 如果缩放小于1，自动恢复到1
      if (scale.value < 1 && isMountedRef.current) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      }
    });

  // 拖动手势 - 使用新的 Gesture API
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // 只有在放大时才允许拖动
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // 组合手势 - 捏合和拖动同时进行，双击单独处理
  const composedGesture = Gesture.Race(
    doubleTapGesture,
    Gesture.Simultaneous(pinchGesture, panGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // 关闭时重置
  const handleClose = () => {
    resetTransform();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          {/* 图片容器 - 放在最底层 */}
          <GestureDetector gesture={composedGesture}>
            <Animated.View style={styles.imageContainer}>
              <Animated.View style={animatedStyle}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.image}
                  resizeMode="contain"
                />
              </Animated.View>
            </Animated.View>
          </GestureDetector>

          {/* 关闭按钮 - 最高层级 */}
          <TouchableOpacity
            style={[styles.closeButton, { top: insets.top + 16 }]}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <View style={styles.closeButtonInner}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* 重置按钮 - 最高层级 */}
          <TouchableOpacity
            style={[styles.resetButton, { top: insets.top + 16 }]}
            onPress={resetTransform}
            activeOpacity={0.7}
          >
            <View style={styles.resetButtonInner}>
              <Ionicons name="contract-outline" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* 提示文字 */}
          <View style={[styles.hintContainer, { bottom: insets.bottom + 40 }]} pointerEvents="none">
            <View style={styles.hintBadge}>
              <Ionicons name="hand-left-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Ionicons name="hand-right-outline" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Ionicons name="text" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Ionicons name="text" size={14} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 1000,
    elevation: 1000,
  },
  closeButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  resetButton: {
    position: 'absolute',
    left: 16,
    zIndex: 1000,
    elevation: 1000,
  },
  resetButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  hintContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  hintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
});
