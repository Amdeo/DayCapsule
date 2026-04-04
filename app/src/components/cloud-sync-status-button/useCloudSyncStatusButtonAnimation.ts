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
  const floatY = useRef(new Animated.Value(0)).current;
  const completionScale = useRef(new Animated.Value(1)).current;
  const prevUiStateRef = useRef<VisibleCloudSyncIndicatorUiState>(uiState);

  // syncing 动画：呼吸 + 旋转
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

  // pending 浮动动画
  useEffect(() => {
    if (uiState !== 'pending') {
      floatY.stopAnimation();
      floatY.setValue(0);
      return;
    }

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    floatLoop.start();

    return () => {
      floatLoop.stop();
      floatY.setValue(0);
    };
  }, [floatY, uiState]);

  // syncing → synced 弹跳完成动画（一次性）
  useEffect(() => {
    const prev = prevUiStateRef.current;
    prevUiStateRef.current = uiState;

    if (prev === 'syncing' && uiState === 'synced') {
      completionScale.setValue(1);
      Animated.sequence([
        Animated.timing(completionScale, {
          toValue: 1.15,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(completionScale, {
          toValue: 1,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (uiState !== 'synced') {
      completionScale.setValue(1);
    }
  }, [completionScale, uiState]);

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return { breathe, rotation, floatY, completionScale };
}
