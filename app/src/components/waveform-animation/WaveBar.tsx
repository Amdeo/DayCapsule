import React, { useEffect, useRef } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { waveformAnimationStyles as styles } from './WaveformAnimation.styles';
import {
  WAVEFORM_BASE_PATTERN,
  WAVEFORM_MAX_BAR_HEIGHT,
} from './waveformAnimationConfig';

interface WaveBarProps {
  isRecording: boolean;
  color: string;
}

export const WaveBar = React.memo(function WaveBar({
  isRecording,
  color,
}: WaveBarProps) {
  const barIndex = useRef(Math.floor(Math.random() * WAVEFORM_BASE_PATTERN.length)).current;
  const baseHeight = WAVEFORM_BASE_PATTERN[barIndex];
  const height = useSharedValue(baseHeight);

  useEffect(() => {
    if (isRecording) {
      const randomDuration = 160 + Math.random() * 140;
      const randomHeight = Math.min(
        WAVEFORM_MAX_BAR_HEIGHT,
        baseHeight + 3 + Math.random() * 6,
      );

      height.value = withRepeat(
        withTiming(randomHeight, {
          duration: randomDuration,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
    } else {
      cancelAnimation(height);
      height.value = withTiming(baseHeight, {
        duration: 220,
        easing: Easing.out(Easing.ease),
      });
    }

    return () => {
      cancelAnimation(height);
    };
  }, [baseHeight, height, isRecording]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: color,
    height: height.value,
  }));

  return <Animated.View style={[styles.bar, animatedStyle]} />;
});
