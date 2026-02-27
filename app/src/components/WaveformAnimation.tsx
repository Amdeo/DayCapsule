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

const WAVE_COUNT = 50;
const BAR_WIDTH = 2;
const BAR_GAP = 1;
const BAR_RADIUS = 1;
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 24;
const CONTAINER_HEIGHT = 28;

// 每个 bar 自管理 useSharedValue，避免在父组件循环中调用 Hook（违反 Rules of Hooks）
interface WaveBarProps {
  isRecording: boolean;
  color: string;
}

const WaveBar = React.memo(function WaveBar({ isRecording, color }: WaveBarProps) {
  const height = useSharedValue(MIN_HEIGHT);

  useEffect(() => {
    if (isRecording) {
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
    } else {
      cancelAnimation(height);
      height.value = withTiming(MIN_HEIGHT, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
    }
    return () => {
      cancelAnimation(height);
    };
  }, [isRecording]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    backgroundColor: color,
  }));

  return <Animated.View style={[styles.bar, animatedStyle]} />;
});

const WaveformAnimation: React.FC<WaveformAnimationProps> = ({
  isRecording,
  color = '#F5A623',
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: WAVE_COUNT }, (_, index) => (
        <WaveBar key={index} isRecording={isRecording} color={color} />
      ))}
    </View>
  );
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
