import React, { useEffect } from 'react';
import { View } from 'react-native';
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
const MAX_HEIGHT = 18;
const BASE_WAVE = [4, 6, 9, 7, 5, 8, 11, 8, 6, 10, 7, 5];

// 每个 bar 自管理 useSharedValue，避免在父组件循环中调用 Hook（违反 Rules of Hooks）
interface WaveBarProps {
  isRecording: boolean;
  color: string;
}

const WaveBar = React.memo(function WaveBar({ isRecording, color }: WaveBarProps) {
  const testID = React.useRef(`waveform-bar-${Math.random().toString(36).slice(2)}`).current;
  const barIndex = React.useRef(Math.floor(Math.random() * BASE_WAVE.length)).current;
  const baseHeight = BASE_WAVE[barIndex];
  const height = useSharedValue(baseHeight);

  useEffect(() => {
    if (isRecording) {
      const randomDuration = 160 + Math.random() * 140;
      const randomHeight = Math.min(MAX_HEIGHT, baseHeight + 3 + Math.random() * 6);
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
      height.value = withTiming(baseHeight, {
        duration: 220,
        easing: Easing.out(Easing.ease),
      });
    }
    return () => {
      cancelAnimation(height);
    };
  }, [baseHeight, isRecording]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    backgroundColor: color,
  }));

  return (
    <Animated.View
      testID={testID}
      className="rounded-[1px]"
      style={[{ width: BAR_WIDTH }, animatedStyle]}
    />
  );
});

const WaveformAnimation: React.FC<WaveformAnimationProps> = ({
  isRecording,
  color = '#F5A623',
}) => {
  return (
    <View
      className="h-7 flex-row items-center justify-center overflow-hidden"
      style={{ gap: BAR_GAP }}
      testID="waveform-animation-root"
    >
      {Array.from({ length: WAVE_COUNT }, (_, index) => (
        <WaveBar key={index} isRecording={isRecording} color={color} />
      ))}
    </View>
  );
};

export default WaveformAnimation;
