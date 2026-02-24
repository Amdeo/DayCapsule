import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

interface WaveformAnimationProps {
  isRecording: boolean;
  color?: string;
}

const WAVE_COUNT = 50; // 更密集的波形条
const BAR_WIDTH = 2;
const BAR_GAP = 1; // 更小的间隔
const BAR_RADIUS = 1;
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 24;
const CONTAINER_HEIGHT = 28;

const WaveformAnimation: React.FC<WaveformAnimationProps> = ({
  isRecording,
  color = '#F5A623',
}) => {
  const waveHeights = Array.from({ length: WAVE_COUNT }, () =>
    useSharedValue(MIN_HEIGHT)
  );

  useEffect(() => {
    if (isRecording) {
      waveHeights.forEach((height) => {
        const randomDuration = 100 + Math.random() * 100;
        const randomHeight = MIN_HEIGHT + Math.random() * (MAX_HEIGHT - MIN_HEIGHT);

        height.value = withRepeat(
          withTiming(randomHeight, {
            duration: randomDuration,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
        );
      });
    } else {
      waveHeights.forEach((height) => {
        cancelAnimation(height);
        height.value = withTiming(MIN_HEIGHT, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
      });
    }

    // 组件卸载时清理所有动画
    return () => {
      waveHeights.forEach((height) => {
        cancelAnimation(height);
      });
    };
  }, [isRecording, waveHeights]);

  return (
    <View style={styles.container}>
      {waveHeights.map((height, index) => (
        <WaveBar key={index} height={height} color={color} />
      ))}
    </View>
  );
};

interface WaveBarProps {
  height: Animated.SharedValue<number>;
  color: string;
}

const WaveBar: React.FC<WaveBarProps> = ({ height, color }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: height.value,
      backgroundColor: color,
    };
  });

  return <Animated.View style={[styles.bar, animatedStyle]} />;
};

const styles = StyleSheet.create({
  container: {
    height: CONTAINER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: BAR_GAP,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: BAR_RADIUS,
  },
});

export default WaveformAnimation;
