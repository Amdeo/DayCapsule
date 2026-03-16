/**
 * ImageViewer - 微信朋友圈风格图片查看器
 * 手势：单击关闭 | 双击缩放 | 长按操作菜单 | 下滑关闭 | 捏合/平移
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Image,
  StyleSheet,
  Alert,
  Share,
  Text,
  TouchableOpacity,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  cancelAnimation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';

const DISMISS_THRESHOLD = 80;

type Phase = 'idle' | 'opening' | 'open' | 'closing' | 'closing-fade';

export interface OriginLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageViewerProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  originLayout?: OriginLayout;
  thumbnailRef?: React.RefObject<React.ElementRef<typeof Image>>;
}

export function ImageViewer({ visible, imageUri, onClose, originLayout, thumbnailRef }: ImageViewerProps) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const isMountedRef = useRef(true);
  const canAnimateBackRef = useRef(Boolean(originLayout));
  const shouldIgnoreSharedTransitionRef = useRef(false);
  const prevDimensions = useRef({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });

  // ─── Zoom / pan ────────────────────────────────────────────────────────
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // ─── Dismiss ────────────────────────────────────────────────────────────
  const dismissY = useSharedValue(0);
  const dismissScale = useSharedValue(1);
  const backdropOpacity = useSharedValue(0);

  // ─── Pan mode lock (0 = translate image, 1 = dismiss) ──────────────────
  const panMode = useSharedValue<0 | 1>(0);

  // 英雄覆盖层动画值（position: absolute 坐标）
  const heroLeft = useSharedValue(0);
  const heroTop = useSharedValue(0);
  const heroWidth = useSharedValue(SCREEN_WIDTH);
  const heroHeight = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      shouldIgnoreSharedTransitionRef.current = true;
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
    };
  }, []);

  // 每次打开时重置所有状态
  useEffect(() => {
    if (visible) {
      shouldIgnoreSharedTransitionRef.current = false;
      canAnimateBackRef.current = Boolean(originLayout);

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

      // 重置手势层状态
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
        // 有坐标：初始化英雄图位置，启动 opening 动画
        heroLeft.value = originLayout.x;
        heroTop.value = originLayout.y;
        heroWidth.value = originLayout.width;
        heroHeight.value = originLayout.height;
        backdropOpacity.value = 0;
        setPhase('opening');
      } else {
        // 无坐标：降级为淡入
        backdropOpacity.value = withTiming(1, { duration: 250 });
        setPhase('open');
      }
    } else {
      setPhase('idle');
    }
  }, [visible]);

  // opening 动画：图片直接显示，无飞入回弹效果
  useEffect(() => {
    if (phase !== 'opening') return;

    // 图片直接全屏显示，无动画
    heroLeft.value = 0;
    heroTop.value = 0;
    heroWidth.value = SCREEN_WIDTH;
    heroHeight.value = SCREEN_HEIGHT;
    runOnJS(setPhase)('open');

    // 背景直接全黑，无动画
    backdropOpacity.value = 1;
  }, [phase, SCREEN_WIDTH, SCREEN_HEIGHT]);

  const performClose = () => {
    if (isMountedRef.current) {
      onClose();
    }
  };

  const startFadeClose = () => {
    setShowActionSheet(false);
    cancelAnimation(dismissY);
    cancelAnimation(dismissScale);
    cancelAnimation(heroLeft);
    cancelAnimation(heroTop);
    cancelAnimation(heroWidth);
    cancelAnimation(heroHeight);
    cancelAnimation(backdropOpacity);
    dismissY.value = 0;
    dismissScale.value = 1;
    setPhase('closing-fade');
    backdropOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(performClose)();
      }
    });
  };

  const triggerClose = (capturedDismissY: number = 0) => {
    if (phase === 'idle' || phase === 'closing' || phase === 'closing-fade') {
      return;
    }

    setShowActionSheet(false);
    cancelAnimation(dismissY);
    cancelAnimation(dismissScale);
    cancelAnimation(backdropOpacity);
    cancelAnimation(heroLeft);
    cancelAnimation(heroTop);
    cancelAnimation(heroWidth);
    cancelAnimation(heroHeight);

    // 关闭时直接淡出，不要有飞回缩略图的回弹效果
    dismissY.value = 0;
    dismissScale.value = 1;
    startFadeClose();
  };

  // closing 阶段动画：在英雄图挂载后（useEffect）执行
  const triggerCloseAnimation = () => {
    if (!canAnimateBackRef.current || !thumbnailRef?.current) {
      startFadeClose();
      return;
    }

    thumbnailRef.current.measureInWindow((x, y, width, height) => {
      if (!isMountedRef.current || shouldIgnoreSharedTransitionRef.current) {
        return;
      }

      const isVisible = y + height > 0 && y < SCREEN_HEIGHT;
      if (isVisible) {
        // 背景慢慢淡出（柔和渐变）
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
      } else {
        startFadeClose();
      }
    });
  };

  // closing 动画：英雄图已挂载，安全启动飞回或淡出
  useEffect(() => {
    if (phase !== 'closing') return;
    triggerCloseAnimation();
  }, [phase]);

  // 旋转降级处理
  // - opening/closing 阶段：立即中止动画并淡出关闭
  // - open 阶段：保持查看器打开，但后续关闭强制降级为淡出
  useEffect(() => {
    if (
      prevDimensions.current.width === SCREEN_WIDTH &&
      prevDimensions.current.height === SCREEN_HEIGHT
    ) {
      return;
    }

    prevDimensions.current = { width: SCREEN_WIDTH, height: SCREEN_HEIGHT };

    if (phase === 'opening' || phase === 'closing') {
      shouldIgnoreSharedTransitionRef.current = true;
      canAnimateBackRef.current = false;
      startFadeClose();
      return;
    }

    if (phase === 'open') {
      canAnimateBackRef.current = false;
    }
  }, [SCREEN_WIDTH, SCREEN_HEIGHT, phase]);

  // ─── Double tap: toggle zoom 1x ↔ 2x ──────────────────────────────────
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withSpring(2);
        savedScale.value = 2;
      }
    });

  // ─── Single tap: close (waits ~200ms for double tap to fail) ──────────
  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .requireExternalGestureToFail(doubleTapGesture)
    .onEnd(() => {
      runOnJS(triggerClose)(0);
    });

  // ─── Long press: show action sheet ────────────────────────────────────
  // onStart fires after minDuration while finger is still down (WeChat style)
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      runOnJS(setShowActionSheet)(true);
    });

  // ─── Pinch: zoom 0.5x–5x ──────────────────────────────────────────────
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const newScale = savedScale.value * e.scale;
      scale.value = Math.min(Math.max(newScale, 0.5), 5);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  // ─── Pan: dismiss (scale≈1 + drag down) or translate (scale>1) ────────
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // Lock mode once at gesture start, never change during drag
      panMode.value = scale.value >= 0.9 && scale.value <= 1.1 ? 1 : 0;
    })
    .onUpdate((e) => {
      if (panMode.value === 1 && e.translationY > 0) {
        // Dismiss mode: follow finger down, shrink + fade backdrop
        dismissY.value = e.translationY;
        dismissScale.value = Math.min(
          Math.max(1 - (e.translationY / SCREEN_HEIGHT) * 0.8, 0.6),
          1,
        );
        backdropOpacity.value = Math.min(
          Math.max(1 - (e.translationY / SCREEN_HEIGHT) * 1.5, 0),
          1,
        );
      } else if (panMode.value === 0) {
        // Translate mode: pan the zoomed image
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      panMode.value = 0;
      if (dismissY.value > DISMISS_THRESHOLD) {
        // 记录当前偏移，启动飞回关闭
        const currentDismissY = dismissY.value;
        runOnJS(triggerClose)(currentDismissY);
      } else if (dismissY.value > 0) {
        // Spring back
        dismissY.value = withSpring(0);
        dismissScale.value = withSpring(1);
        backdropOpacity.value = withSpring(1);
      } else {
        // Save pan position for next drag
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    })
    .onFinalize(() => {
      panMode.value = 0;
    });

  // ─── Composed gesture ─────────────────────────────────────────────────
  const composedGesture = Gesture.Race(
    singleTapGesture,
    doubleTapGesture,
    longPressGesture,
    Gesture.Simultaneous(pinchGesture, panGesture),
  );

  // ─── Animated styles ──────────────────────────────────────────────────
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

  // ─── Save to album ────────────────────────────────────────────────────
  const handleSaveToAlbum = async () => {
    setShowActionSheet(false);
    try {
      const { granted } = await MediaLibrary.getPermissionsAsync();
      if (!granted) {
        const { granted: asked } = await MediaLibrary.requestPermissionsAsync();
        if (!asked) {
          Alert.alert('权限不足', '请在设置中允许访问相册');
          return;
        }
      }
      await MediaLibrary.saveToLibraryAsync(imageUri);
      Alert.alert('已保存', '图片已保存到相册');
    } catch {
      Alert.alert('保存失败', '无法保存图片，请重试');
    }
  };

  // ─── Share ────────────────────────────────────────────────────────────
  const handleShare = async () => {
    setShowActionSheet(false);
    try {
      await Share.share(
        Platform.OS === 'ios' ? { url: imageUri } : { message: imageUri },
      );
    } catch {
      // User cancelled — no error needed
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => {
        triggerClose(0);
      }}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* 遮罩（始终渲染）*/}
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnimatedStyle]}
        />

        {/* 英雄覆盖层：opening / closing 阶段 */}
        {(phase === 'opening' || phase === 'closing') && (
          <Animated.Image
            source={{ uri: imageUri }}
            style={heroAnimatedStyle}
            resizeMode="contain"
          />
        )}

        {/* 手势交互层：open 阶段 */}
        {phase === 'open' && (
          <GestureDetector gesture={composedGesture}>
            <Animated.View style={styles.imageContainer}>
              <Animated.View style={imageAnimatedStyle}>
                <Image
                  source={{ uri: imageUri }}
                  style={[styles.image, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}
                  resizeMode="contain"
                />
              </Animated.View>
            </Animated.View>
          </GestureDetector>
        )}

        {/* Action Sheet — 完整保留原有 JSX，位置移至手势层之后 */}
        {showActionSheet && (
          <View style={styles.actionSheetOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowActionSheet(false)}
            />
            <View style={[styles.actionSheet, { paddingBottom: insets.bottom + 8 }]}>
              <View style={styles.actionSheetHandle} />
              <TouchableOpacity
                style={styles.actionSheetItem}
                onPress={handleSaveToAlbum}
                activeOpacity={0.7}
              >
                <Text style={styles.actionSheetItemText}>保存到相册</Text>
              </TouchableOpacity>
              <View style={styles.actionSheetDivider} />
              <TouchableOpacity
                style={styles.actionSheetItem}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <Text style={styles.actionSheetItemText}>分享</Text>
              </TouchableOpacity>
              <View style={styles.actionSheetGap} />
              <TouchableOpacity
                style={styles.actionSheetItem}
                onPress={() => setShowActionSheet(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.actionSheetCancelText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#000000',
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
  },
  actionSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
    elevation: 100,
  },
  actionSheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingTop: 8,
  },
  actionSheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  actionSheetItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionSheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actionSheetItemText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
  },
  actionSheetGap: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  actionSheetCancelText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
  },
});
