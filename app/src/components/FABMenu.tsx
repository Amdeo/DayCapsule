/**
 * FABMenu - 花瓣展开动画菜单
 * 点击加号按钮，三个选项以花瓣形式展开
 */

import React, { useState, useCallback, useReducer, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated as RNAnimated,
  BackHandler,
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
  useDerivedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { PhotoService, PhotoResult } from '@/src/services/photoService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

// 展开距离
const EXPAND_DISTANCE = 80;
const SECONDARY_DISTANCE = 75;

// 动画配置
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 1,
  overshootClamping: true,
};

// 状态管理
type MenuState = 'closed' | 'primary' | 'secondary';
type MenuAction =
  | { type: 'OPEN_PRIMARY' }
  | { type: 'OPEN_SECONDARY' }
  | { type: 'CLOSE_ALL' }
  | { type: 'BACK' };

function menuReducer(state: MenuState, action: MenuAction): MenuState {
  switch (action.type) {
    case 'OPEN_PRIMARY':
      return state === 'closed' ? 'primary' : state;
    case 'OPEN_SECONDARY':
      return state === 'primary' ? 'secondary' : state;
    case 'BACK':
      return state === 'secondary' ? 'primary' : 'closed';
    case 'CLOSE_ALL':
      return 'closed';
    default:
      return state;
  }
}

// 选项配置
interface OptionConfig {
  type: 'text' | 'photo' | 'voice';
  icon: string;
  label: string;
  color: string;
  angle: number;
  hasSecondary?: boolean;
}

const OPTIONS: OptionConfig[] = [
  { type: 'text', icon: 'create-outline', label: '文字', color: '#A491D3', angle: -45 },
  { type: 'photo', icon: 'camera-outline', label: '照片', color: '#77C9D4', angle: 0, hasSecondary: true },
  { type: 'voice', icon: 'mic-outline', label: '语音', color: '#F5A623', angle: 45 },
];

// 二级选项配置
interface SecondaryOption {
  type: 'camera' | 'library';
  icon: string;
  label: string;
  color: string;
  angle: number;
}

const SECONDARY_OPTIONS: SecondaryOption[] = [
  { type: 'camera', icon: 'camera', label: '拍照', color: '#77C9D4', angle: -30 },
  { type: 'library', icon: 'images', label: '相册', color: '#57B8C8', angle: 30 },
];

interface FABMenuProps {
  onSelect: (type: 'text' | 'photo' | 'voice', photoResult?: PhotoResult) => void;
  fabOpacity?: RNAnimated.Value;
  fabScale?: RNAnimated.Value;
}

export function FABMenu({ onSelect, fabOpacity, fabScale }: FABMenuProps) {
  const [menuState, dispatch] = useReducer(menuReducer, 'closed');

  // 共享动画值
  const primaryProgress = useSharedValue(0);
  const secondaryProgress = useSharedValue(0);

  // 派生值
  const mainRotation = useDerivedValue(() => {
    return primaryProgress.value * 45 + secondaryProgress.value * 45;
  });

  const primaryOpacity = useDerivedValue(() => {
    return secondaryProgress.value > 0 ? 0.3 : 1.0;
  });

  const backdropOpacity = useDerivedValue(() => {
    return Math.max(primaryProgress.value, secondaryProgress.value) * 0.4;
  });

  // 监听状态变化触发动画
  useEffect(() => {
    switch (menuState) {
      case 'primary':
        primaryProgress.value = withSpring(1, SPRING_CONFIG);
        secondaryProgress.value = withTiming(0, { duration: 200 });
        break;
      case 'secondary':
        primaryProgress.value = 1;
        secondaryProgress.value = withSpring(1, SPRING_CONFIG);
        break;
      case 'closed':
        primaryProgress.value = withTiming(0, { duration: 200 });
        secondaryProgress.value = withTiming(0, { duration: 200 });
        break;
    }
  }, [menuState]);

  // Android 返回键处理
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (menuState !== 'closed') {
        dispatch({ type: 'BACK' });
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [menuState]);

  // 主按钮点击
  const toggle = useCallback(() => {
    if (menuState === 'closed') {
      dispatch({ type: 'OPEN_PRIMARY' });
    } else {
      dispatch({ type: 'CLOSE_ALL' });
    }
  }, [menuState]);

  // 一级选项选择
  const handleSelect = useCallback((type: 'text' | 'photo' | 'voice') => {
    if (type === 'photo') {
      dispatch({ type: 'OPEN_SECONDARY' });
    } else {
      dispatch({ type: 'CLOSE_ALL' });
      setTimeout(() => onSelect(type), 200);
    }
  }, [onSelect]);

  // 二级选项选择
  const handleSecondarySelect = useCallback(async (type: 'camera' | 'library') => {
    dispatch({ type: 'CLOSE_ALL' });

    try {
      const result = type === 'camera'
        ? await PhotoService.takePhoto()
        : await PhotoService.pickPhotoFromLibrary();

      // 处理单张或多张照片
      const photoResult = Array.isArray(result) ? result[0] : result;
      if (photoResult) {
        onSelect('photo', photoResult);
      }
    } catch (error) {
      // 用户取消，静默处理
    }
  }, [onSelect]);

  // 遮罩点击
  const handleBackdropPress = useCallback(() => {
    dispatch({ type: 'BACK' });
  }, []);

  // 计算一级按钮位置
  const getOptionPosition = useCallback((angle: number, progress: number) => {
    'worklet';
    const rad = (angle * Math.PI) / 180;
    const distance = EXPAND_DISTANCE * progress;
    return {
      x: Math.sin(rad) * distance,
      y: -Math.cos(rad) * distance,
    };
  }, []);

  // 计算二级按钮位置
  const getSecondaryPosition = useCallback((angle: number, progress: number) => {
    'worklet';
    const photoPos = getOptionPosition(0, primaryProgress.value);
    const rad = (angle * Math.PI) / 180;
    const distance = SECONDARY_DISTANCE * progress;
    return {
      x: photoPos.x + Math.sin(rad) * distance,
      y: photoPos.y - Math.cos(rad) * distance,
    };
  }, []);

  // 主按钮动画样式
  const mainButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${mainRotation.value}deg` }],
  }));

  // 遮罩动画样式
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const buttonAreaStyle = {
    opacity: fabOpacity !== undefined ? fabOpacity : 1,
    transform: [{ scale: fabScale !== undefined ? fabScale : 1 }],
  };

  return (
    <>
      {/* 遮罩层 */}
      {menuState !== 'closed' && (
        <Animated.View
          style={[styles.backdropOverlay, backdropAnimatedStyle]}
          pointerEvents="auto"
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
        </Animated.View>
      )}

      {/* FAB 主按钮 */}
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

      {/* 一级选项按钮组 */}
      <View style={styles.optionsWrapper} pointerEvents={menuState !== 'closed' ? 'auto' : 'none'}>
        <View style={styles.optionsContainer}>
          {OPTIONS.map((option) => (
            <OptionButton
              key={option.type}
              option={option}
              expandProgress={primaryProgress}
              primaryOpacity={option.type === 'photo' ? 1 : primaryOpacity}
              disabled={menuState === 'secondary' && option.type !== 'photo'}
              getOptionPosition={getOptionPosition}
              onPress={() => handleSelect(option.type)}
            />
          ))}
        </View>
      </View>

      {/* 二级选项按钮组 */}
      {menuState === 'secondary' && (
        <View style={styles.optionsWrapper} pointerEvents="auto">
          <View style={styles.optionsContainer}>
            {SECONDARY_OPTIONS.map((option) => (
              <SecondaryButton
                key={option.type}
                option={option}
                secondaryProgress={secondaryProgress}
                getSecondaryPosition={getSecondaryPosition}
                onPress={() => handleSecondarySelect(option.type)}
              />
            ))}
          </View>
        </View>
      )}
    </>
  );
}

// 选项按钮组件
interface OptionButtonProps {
  option: OptionConfig;
  expandProgress: SharedValue<number>;
  primaryOpacity: number | SharedValue<number> | { value: number };
  disabled: boolean;
  getOptionPosition: (angle: number, progress: number) => { x: number; y: number };
  onPress: () => void;
}

const OptionButton = React.memo(function OptionButton({
  option,
  expandProgress,
  primaryOpacity,
  disabled,
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
    const baseOpacity = interpolate(
      progress,
      [0, 0.3],
      [0, 1],
      Extrapolate.CLAMP
    );

    // 处理不同类型的 primaryOpacity
    let opacityMultiplier = 1;
    if (typeof primaryOpacity === 'number') {
      opacityMultiplier = primaryOpacity;
    } else if ('value' in primaryOpacity) {
      opacityMultiplier = primaryOpacity.value;
    }

    const finalOpacity = baseOpacity * opacityMultiplier;

    return {
      transform: [
        { translateX: pos.x },
        { translateY: pos.y },
        { scale },
      ],
      opacity: finalOpacity,
    };
  });

  return (
    <Animated.View style={[styles.optionWrapper, animatedStyle]} pointerEvents={disabled ? 'none' : 'auto'}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        disabled={disabled}
        style={[styles.optionButton, { backgroundColor: option.color }]}
      >
        <Ionicons name={option.icon as any} size={22} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={styles.optionLabelContainer}>
        <Text style={styles.optionLabel}>{option.label}</Text>
      </View>
    </Animated.View>
  );
});

// 二级按钮组件
interface SecondaryButtonProps {
  option: SecondaryOption;
  secondaryProgress: SharedValue<number>;
  getSecondaryPosition: (angle: number, progress: number) => { x: number; y: number };
  onPress: () => void;
}

const SecondaryButton = React.memo(function SecondaryButton({
  option,
  secondaryProgress,
  getSecondaryPosition,
  onPress,
}: SecondaryButtonProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = secondaryProgress.value;
    const pos = getSecondaryPosition(option.angle, progress);
    const scale = interpolate(
      progress,
      [0, 0.5, 1],
      [0.5, 1.1, 1],
      Extrapolate.CLAMP
    );
    const opacity = interpolate(progress, [0, 0.3], [0, 1], Extrapolate.CLAMP);

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
    <Animated.View style={[styles.secondaryWrapper, animatedStyle]}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.secondaryButton, { backgroundColor: option.color }]}
      >
        <Ionicons name={option.icon as any} size={18} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={styles.optionLabelContainer}>
        <Text style={styles.optionLabel}>{option.label}</Text>
      </View>
    </Animated.View>
  );
});

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
  secondaryWrapper: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 40,
    height: 64,
    alignItems: 'center',
  },
  secondaryButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
});
