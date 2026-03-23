import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Extrapolate,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { fabMenuStyles as styles } from './FABMenu.styles';
import {
  type FanOption,
  FAB_CENTER_X,
  FAB_CENTER_Y,
  OPTION_ICON_HALF,
} from './fabMenuConfig';

interface FanOptionButtonProps {
  option: FanOption;
  index: number;
  fanProgress: SharedValue<number>;
  hoveredIndex: SharedValue<number>;
}

export const FanOptionButton = React.memo(function FanOptionButton({
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
    const scale =
      interpolate(progress, [0, 0.5, 1], [0.5, 1.1, 1], Extrapolate.CLAMP) *
      (isHovered ? 1.2 : 1.0);
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
        <Ionicons name={option.icon} size={24} color="#FFFFFF" />
      </View>
      <View style={styles.optionLabelContainer}>
        <Text style={styles.optionLabel}>{option.label}</Text>
      </View>
    </Animated.View>
  );
});
