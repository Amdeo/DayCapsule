import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import type { CloudSyncIndicatorUiState } from '@/src/store/cloudSyncIndicatorStore';

type VisibleCloudSyncIndicatorUiState = Exclude<CloudSyncIndicatorUiState, 'hidden'>;

function resetAnimation(value: Animated.Value) {
  value.stopAnimation();
  value.setValue(0);
}

function resetScaleAnimation(value: Animated.Value) {
  value.stopAnimation();
  value.setValue(1);
}

export function useCloudSyncStatusButtonAnimation(
  uiState: VisibleCloudSyncIndicatorUiState,
) {
  const breathe = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (uiState !== 'syncing') {
      resetScaleAnimation(breathe);
      resetAnimation(spin);
      return;
    }

    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1.08,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    breatheLoop.start();
    spinLoop.start();

    return () => {
      breatheLoop.stop();
      spinLoop.stop();
      resetScaleAnimation(breathe);
      resetAnimation(spin);
    };
  }, [breathe, spin, uiState]);

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return {
    breathe,
    rotation,
  };
}
