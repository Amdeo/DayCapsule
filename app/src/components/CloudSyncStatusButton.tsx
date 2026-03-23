import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CloudSyncIndicatorUiState } from '@/src/store/cloudSyncIndicatorStore';

type CloudSyncStatusButtonProps = {
  uiState: Exclude<CloudSyncIndicatorUiState, 'hidden'>;
  onPress: () => void;
};

const DOT_COLORS = {
  synced: '#35B46F',
  pending: '#F5A623',
  failed: '#EF5350',
} as const;

export function CloudSyncStatusButton({ uiState, onPress }: CloudSyncStatusButtonProps) {
  const breathe = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (uiState !== 'syncing') {
      breathe.stopAnimation();
      spin.stopAnimation();
      breathe.setValue(1);
      spin.setValue(0);
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
      breathe.stopAnimation();
      spin.stopAnimation();
      breathe.setValue(1);
      spin.setValue(0);
    };
  }, [breathe, spin, uiState]);

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-12 w-12 items-center justify-center rounded-full bg-background-elevated shadow-sm shadow-black/10"
      testID="cloud-sync-button"
    >
      {uiState === 'syncing' ? (
        <>
          <Animated.View
            className="absolute h-7 w-7 rounded-full border-2 border-[rgba(106,137,204,0.18)] border-t-primary"
            style={{ transform: [{ rotate: rotation }] }}
            testID="cloud-sync-spinner"
          />
          <Animated.View
            className="h-6 w-6 items-center justify-center"
            style={{ transform: [{ scale: breathe }] }}
            testID="cloud-sync-shell"
          >
            <Ionicons name="cloud-outline" size={22} color="#6A89CC" />
          </Animated.View>
        </>
      ) : (
        <>
          <View className="h-6 w-6 items-center justify-center" testID="cloud-sync-shell">
            <Ionicons name="cloud-outline" size={22} color="#6A89CC" />
          </View>
          <View
            className="absolute right-[11px] top-[11px] h-[10px] w-[10px] rounded-full border-2 border-white"
            style={{ backgroundColor: DOT_COLORS[uiState] }}
            testID={`cloud-sync-dot-${uiState}`}
          />
        </>
      )}
    </Pressable>
  );
}
