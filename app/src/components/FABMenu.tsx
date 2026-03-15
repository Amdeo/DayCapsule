/**
 * FABMenu - 智能记忆 FAB
 * 单击触发上次操作；长按 300ms 后扇形展开，拖动到选项松手触发。
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  PanResponder,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { PhotoService, PhotoResult } from '@/src/services/photoService';
import { useSettingsStore, LastAddType } from '@/src/store/settingsStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

// ─── 布局常量 ───────────────────────────────────────────────────────────────────
const FAB_SIZE = 56;
const FAB_BOTTOM = 32;
const FAB_CENTER_X = SCREEN_WIDTH / 2;
const FAB_CENTER_Y = SCREEN_HEIGHT - FAB_BOTTOM - FAB_SIZE / 2;
const OPTION_SIZE = 48;
const OPTION_ICON_HALF = OPTION_SIZE / 2;
const DEAD_ZONE_DP = 30;
const LONG_PRESS_MS = 300;

// 扇形 4 个选项配置（角度：0° = 正上方，顺时针为正）
const FAN_OPTIONS = [
  { type: 'text'   as LastAddType, icon: 'create-outline', label: '文字', color: '#A491D3', angle: -60, dist: 80 },
  { type: 'photo'  as LastAddType, icon: 'images',         label: '相册', color: '#57B8C8', angle: -20, dist: 85 },
  { type: 'camera' as LastAddType, icon: 'camera',         label: '拍照', color: '#77C9D4', angle:  20, dist: 85 },
  { type: 'voice'  as LastAddType, icon: 'mic-outline',    label: '语音', color: '#F5A623', angle:  60, dist: 80 },
] as const;

// 角度区间 → 选项 index（-1 = 死区）
function hitTest(dx: number, dy: number): number {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < DEAD_ZONE_DP) return -1;
  // atan2(dx, -dy)：以正上方为 0°，顺时针为正
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (angle < -40) return 0; // 文字
  if (angle < 0)   return 1; // 相册
  if (angle < 40)  return 2; // 拍照
  return 3;                  // 语音
}

// 各 LastAddType 的外观
const TYPE_CONFIG: Record<LastAddType, { icon: string; color: string; label: string }> = {
  text:   { icon: 'create-outline', color: '#A491D3', label: '文字' },
  camera: { icon: 'camera',         color: '#77C9D4', label: '拍照' },
  photo:  { icon: 'images',         color: '#57B8C8', label: '相册' },
  voice:  { icon: 'mic-outline',    color: '#F5A623', label: '语音' },
};

const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 1, overshootClamping: true };

interface FABMenuProps {
  onSelect: (type: 'text' | 'photo' | 'voice', photoResult?: PhotoResult) => void;
  fabOpacity?: RNAnimated.Value;
  fabScale?: RNAnimated.Value;
}

export function FABMenu({ onSelect, fabOpacity, fabScale }: FABMenuProps) {
  const { lastAddType, setLastAddType } = useSettingsStore();

  // React state 驱动遮罩显示/pointerEvents（SharedValue 不触发重渲染）
  const [isExpanded, setIsExpanded] = useState(false);

  // 扇形展开进度 [0,1]（驱动 Reanimated 动画）
  const fanProgress = useSharedValue(0);
  // 当前悬停的选项 index（-1 = 无）
  const hoveredIndex = useSharedValue(-1);
  // SharedValue 供 PanResponder 回调快速读取展开状态（无需等 re-render）
  const isExpandedRef = useSharedValue(0);

  // lastAddType ref：供 PanResponder 闭包读取最新值（避免 stale closure）
  const lastAddTypeRef = useRef<LastAddType | null>(lastAddType);
  useEffect(() => {
    lastAddTypeRef.current = lastAddType;
  }, [lastAddType]);

  // refs（供 PanResponder 回调，不触发重渲染）
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPressing = useRef(false);

  // refs for callbacks（避免 PanResponder 捕获过期函数引用）
  const onSelectRef = useRef(onSelect);
  const setLastAddTypeRef = useRef(setLastAddType);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { setLastAddTypeRef.current = setLastAddType; }, [setLastAddType]);

  // 清理 timer
  const clearTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // 触发某个选项（内部）
  const triggerOption = useCallback(async (type: LastAddType) => {
    try {
      await setLastAddTypeRef.current(type);
    } catch (err) {
      console.warn('[FABMenu] Failed to persist lastAddType:', err);
    }

    if (type === 'camera') {
      try {
        const photo = await PhotoService.takePhoto();
        if (photo) onSelectRef.current('photo', photo);
      } catch { /* 用户取消 */ }
    } else if (type === 'photo') {
      try {
        const result = await PhotoService.pickPhotoFromLibrary();
        const photo = result[0];
        if (photo) onSelectRef.current('photo', photo);
      } catch { /* 用户取消 */ }
    } else {
      onSelectRef.current(type as 'text' | 'voice');
    }
  }, []);

  // 关闭扇形
  const closeFan = useCallback(() => {
    fanProgress.value = withTiming(0, { duration: 200 });
    isExpandedRef.value = 0;
    hoveredIndex.value = -1;
    setIsExpanded(false);
  }, [fanProgress, isExpandedRef, hoveredIndex]);

  // 展开扇形
  const openFan = useCallback(() => {
    isExpandedRef.value = 1;
    setIsExpanded(true);
    fanProgress.value = withSpring(1, SPRING_CONFIG);
  }, [fanProgress, isExpandedRef]);

  const actionsRef = useRef({ openFan, closeFan, triggerOption, clearTimer });
  useEffect(() => {
    actionsRef.current = { openFan, closeFan, triggerOption, clearTimer };
  }, [openFan, closeFan, triggerOption, clearTimer]);

  // PanResponder（惰性初始化，避免每次渲染调用 create）
  const panResponder = useRef<ReturnType<typeof PanResponder.create> | null>(null);
  if (panResponder.current === null) {
    panResponder.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        isPressing.current = true;
        longPressTimer.current = setTimeout(() => {
          if (isPressing.current) actionsRef.current.openFan();
        }, LONG_PRESS_MS);
      },

      onPanResponderMove: (_evt, gestureState) => {
        if (isExpandedRef.value !== 1) return;
        hoveredIndex.value = hitTest(gestureState.dx, gestureState.dy);
      },

      onPanResponderRelease: (_evt, gestureState) => {
        isPressing.current = false;
        actionsRef.current.clearTimer();

        if (isExpandedRef.value === 1) {
          const idx = hitTest(gestureState.dx, gestureState.dy);
          actionsRef.current.closeFan();
          if (idx >= 0) {
            setTimeout(() => actionsRef.current.triggerOption(FAN_OPTIONS[idx].type), 250);
          }
        } else {
          // 单击：触发上次记忆（从 ref 读取最新值）
          const current = lastAddTypeRef.current;
          if (current !== null) actionsRef.current.triggerOption(current);
        }
      },

      onPanResponderTerminate: () => {
        isPressing.current = false;
        actionsRef.current.clearTimer();
        if (isExpandedRef.value === 1) actionsRef.current.closeFan();
      },
    });
  }

  // FAB 外观
  const fabConfig = lastAddType ? TYPE_CONFIG[lastAddType] : null;
  const fabBgColor = fabConfig?.color ?? '#6A89CC';
  const fabIcon = fabConfig?.icon ?? 'add';
  const fabLabel = fabConfig?.label ?? null;

  const buttonAreaStyle = {
    opacity: fabOpacity !== undefined ? fabOpacity : 1,
    transform: [{ scale: fabScale !== undefined ? fabScale : 1 }],
  };

  // 遮罩动画（backgroundColor 已含 alpha=0.4，opacity 仅做淡入淡出）
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fanProgress.value,
  }));

  return (
    <>
      {/* 遮罩层（React state 驱动 pointerEvents，SharedValue 驱动透明度动画） */}
      <Animated.View
        style={[styles.backdropOverlay, backdropAnimatedStyle]}
        pointerEvents={isExpanded ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeFan} />
      </Animated.View>

      {/* 扇形选项 */}
      <View style={styles.optionsOverlay} pointerEvents="none">
        {FAN_OPTIONS.map((opt, idx) => (
          <FanOptionButton
            key={opt.type}
            option={opt}
            index={idx}
            fanProgress={fanProgress}
            hoveredIndex={hoveredIndex}
          />
        ))}
      </View>

      {/* FAB 主按钮 */}
      <View style={styles.fabContainer} pointerEvents="box-none">
        <RNAnimated.View style={[styles.mainButtonWrapper, buttonAreaStyle]}>
          <View
            {...panResponder.current.panHandlers}
            style={[styles.mainButton, { backgroundColor: fabBgColor }]}
          >
            <Ionicons name={fabIcon as any} size={28} color="#FFFFFF" />
          </View>

          {/* 首次启动气泡提示 */}
          {lastAddType === null && (
            <View style={styles.tipBubble}>
              <Text style={styles.tipText}>长按选择记录类型</Text>
              <View style={styles.tipArrow} />
            </View>
          )}

          {/* 记忆标签 */}
          {fabLabel !== null && (
            <View style={styles.labelContainer}>
              <Text style={styles.labelText}>{fabLabel}</Text>
            </View>
          )}
        </RNAnimated.View>
      </View>
    </>
  );
}

// ─── 扇形选项按钮 ────────────────────────────────────────────────────────────────
interface FanOptionButtonProps {
  option: typeof FAN_OPTIONS[number];
  index: number;
  fanProgress: SharedValue<number>;
  hoveredIndex: SharedValue<number>;
}

const FanOptionButton = React.memo(function FanOptionButton({
  option,
  index,
  fanProgress,
  hoveredIndex,
}: FanOptionButtonProps) {
  const rad = (option.angle * Math.PI) / 180;

  const animatedStyle = useAnimatedStyle(() => {
    const progress = fanProgress.value;
    const dist = option.dist * progress;
    const cx = FAB_CENTER_X + Math.sin(rad) * dist;
    const cy = FAB_CENTER_Y - Math.cos(rad) * dist;

    const isHovered = hoveredIndex.value === index;
    const scale = interpolate(progress, [0, 0.5, 1], [0.5, 1.1, 1], Extrapolate.CLAMP)
      * (isHovered ? 1.2 : 1.0);
    const opacity = interpolate(progress, [0, 0.3], [0, 1], Extrapolate.CLAMP);

    return {
      left: cx - OPTION_ICON_HALF,
      top: cy - OPTION_ICON_HALF,
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.optionWrapper, animatedStyle]}>
      <View style={[styles.optionButton, { backgroundColor: option.color }]}>
        <Ionicons name={option.icon as any} size={22} color="#FFFFFF" />
      </View>
      <View style={styles.optionLabelContainer}>
        <Text style={styles.optionLabel}>{option.label}</Text>
      </View>
    </Animated.View>
  );
});

// ─── 样式 ──────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdropOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 998,
  },
  fabContainer: {
    position: 'absolute',
    bottom: FAB_BOTTOM,
    left: '50%',
    marginLeft: -(FAB_SIZE / 2),
    width: FAB_SIZE,
    zIndex: 1000,
    alignItems: 'center',
  },
  mainButtonWrapper: {
    alignItems: 'center',
  },
  mainButton: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  tipBubble: {
    position: 'absolute',
    bottom: FAB_SIZE + 8,
    backgroundColor: 'rgba(50,50,50,0.88)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 130,
  },
  tipText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  tipArrow: {
    position: 'absolute',
    bottom: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(50,50,50,0.88)',
  },
  labelContainer: {
    marginTop: 5,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  optionsOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999,
  },
  optionWrapper: {
    position: 'absolute',
    width: OPTION_SIZE,
    height: OPTION_SIZE + 24,
    alignItems: 'center',
  },
  optionButton: {
    width: OPTION_SIZE,
    height: OPTION_SIZE,
    borderRadius: OPTION_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  optionLabelContainer: {
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4A4A4A',
  },
});
