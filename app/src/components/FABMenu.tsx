/**
 * FABMenu - 花瓣展开动画菜单
 * 点击加号按钮，三个选项以花瓣形式展开
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

// 展开距离（从中心到选项按钮的距离）
const EXPAND_DISTANCE = 80;

// 动画配置 - 无回弹，平滑停止
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 1,
  overshootClamping: true, // 禁止超调
};

// 选项配置
interface OptionConfig {
  type: 'text' | 'photo' | 'voice';
  icon: string;
  label: string;
  color: string;
  angle: number; // 角度：0°为正上方，-45°左上，45°右上
}

const OPTIONS: OptionConfig[] = [
  { type: 'text', icon: 'create-outline', label: '文字', color: '#A491D3', angle: -45 },
  { type: 'photo', icon: 'camera-outline', label: '照片', color: '#77C9D4', angle: 0 },
  { type: 'voice', icon: 'mic-outline', label: '语音', color: '#F5A623', angle: 45 },
];

interface FABMenuProps {
  onSelect: (type: 'text' | 'photo' | 'voice') => void;
  fabOpacity?: RNAnimated.Value;
  fabScale?: RNAnimated.Value;
}

export function FABMenu({ onSelect, fabOpacity, fabScale }: FABMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 共享动画值
  const expandProgress = useSharedValue(0);
  const rotateProgress = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  // 展开/收起切换
  const toggle = useCallback(() => {
    if (isExpanded) {
      // 收起 - 立即更新状态，避免事件拦截问题
      setIsExpanded(false);
      expandProgress.value = withTiming(0, { duration: 200 });
      rotateProgress.value = withTiming(0, { duration: 250 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    } else {
      // 展开
      setIsExpanded(true);
      expandProgress.value = withSpring(1, SPRING_CONFIG);
      rotateProgress.value = withSpring(1, SPRING_CONFIG);
      backdropOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [isExpanded, expandProgress, rotateProgress, backdropOpacity]);

  // 选择选项
  const handleSelect = useCallback((type: 'text' | 'photo' | 'voice') => {
    // 先收起动画
    expandProgress.value = withTiming(0, { duration: 200 });
    rotateProgress.value = withTiming(0, { duration: 250 });
    backdropOpacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(setIsExpanded)(false);
      runOnJS(onSelect)(type);
    });
  }, [onSelect, expandProgress, rotateProgress, backdropOpacity]);

  // 点击遮罩关闭
  const handleBackdropPress = useCallback(() => {
    if (isExpanded) {
      toggle();
    }
  }, [isExpanded, toggle]);

  // 主按钮旋转动画样式
  const mainButtonAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      rotateProgress.value,
      [0, 1],
      [0, 45],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ rotate: `${rotate}deg` }],
    };
  });

  // 遮罩动画样式
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // 按钮区域样式（包含主按钮和选项）- RNAnimated.Value 直接传入 style
  const buttonAreaStyle = {
    opacity: fabOpacity !== undefined ? fabOpacity : 1,
    transform: [{ scale: fabScale !== undefined ? fabScale : 1 }],
  };

  // 计算选项按钮位置（极坐标转直角坐标）
  const getOptionPosition = (angle: number, progress: number) => {
    'worklet';
    const rad = (angle * Math.PI) / 180;
    const distance = EXPAND_DISTANCE * progress;
    return {
      x: Math.sin(rad) * distance,
      y: -Math.cos(rad) * distance, // 负Y表示向上
    };
  };

  return (
    <>
      {/* 遮罩层 - 全屏覆盖，不依赖父容器大小 */}
      {isExpanded && (
        <Animated.View
          style={[styles.backdropOverlay, backdropAnimatedStyle]}
          pointerEvents="auto"
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
        </Animated.View>
      )}

      {/* FAB 主按钮 - 高 zIndex 确保可点击 */}
      <View style={styles.fabContainer} pointerEvents="box-none">
        <RNAnimated.View style={[styles.mainButtonWrapper, buttonAreaStyle]}>
          <TouchableOpacity
            onPress={toggle}
            activeOpacity={0.8}
            style={styles.mainButton}
          >
            <Animated.View style={[styles.mainButtonInner, mainButtonAnimatedStyle]}>
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </Animated.View>
          </TouchableOpacity>
        </RNAnimated.View>
      </View>

      {/* 选项按钮组 - 放在主按钮下方 */}
      <View style={styles.optionsWrapper} pointerEvents={isExpanded ? 'auto' : 'none'}>
        <View style={styles.optionsContainer}>
          {OPTIONS.map((option) => (
            <OptionButton
              key={option.type}
              option={option}
              expandProgress={expandProgress}
              getOptionPosition={getOptionPosition}
              onPress={() => handleSelect(option.type)}
            />
          ))}
        </View>
      </View>
    </>
  );
}

// 选项按钮组件
interface OptionButtonProps {
  option: OptionConfig;
  expandProgress: SharedValue<number>;
  getOptionPosition: (angle: number, progress: number) => { x: number; y: number };
  onPress: () => void;
}

function OptionButton({
  option,
  expandProgress,
  getOptionPosition,
  onPress,
}: OptionButtonProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = expandProgress.value;
    const pos = getOptionPosition(option.angle, progress);
    const scale = interpolate(
      progress,
      [0, 0.5, 1],
      [0.5, 1.1, 1],
      Extrapolate.CLAMP
    );
    const opacity = interpolate(
      progress,
      [0, 0.3],
      [0, 1],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: pos.x },
        { translateY: pos.y },
        { scale },
      ],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.optionWrapper, animatedStyle]}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.optionButton, { backgroundColor: option.color }]}
      >
        <Ionicons name={option.icon as any} size={22} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={styles.optionLabelContainer}>
        <Text style={styles.optionLabel}>{option.label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 遮罩层 - 真正的全屏覆盖
  backdropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 998,
  },
  // FAB 主按钮容器 - 最高层级确保可点击
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    zIndex: 1000,
  },
  // 主按钮包装器
  mainButtonWrapper: {
    width: 56,
    height: 56,
  },
  // 选项按钮包装器
  optionsWrapper: {
    position: 'absolute',
    bottom: 32,
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    zIndex: 999,
  },
  optionsContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 56,
    height: 56,
  },
  optionWrapper: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 48,
    height: 72,
    alignItems: 'center',
  },
  optionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
  mainButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6A89CC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  mainButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
