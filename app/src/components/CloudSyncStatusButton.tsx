import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
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
      style={styles.button}
      testID="cloud-sync-button"
    >
      {uiState === 'syncing' ? (
        <>
          <Animated.View
            style={[
              styles.syncRing,
              { transform: [{ rotate: rotation }] },
            ]}
            testID="cloud-sync-spinner"
          />
          <Animated.View
            style={[
              styles.cloudWrap,
              { transform: [{ scale: breathe }] },
            ]}
          >
            <Ionicons name="cloud-outline" size={22} color="#6A89CC" />
          </Animated.View>
        </>
      ) : (
        <>
          <View style={styles.cloudWrap}>
            <Ionicons name="cloud-outline" size={22} color="#6A89CC" />
          </View>
          <View
            style={[
              styles.statusDot,
              uiState === 'synced' && { backgroundColor: DOT_COLORS.synced },
              uiState === 'pending' && { backgroundColor: DOT_COLORS.pending },
              uiState === 'failed' && { backgroundColor: DOT_COLORS.failed },
            ]}
            testID={`cloud-sync-dot-${uiState}`}
          />
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cloudWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(106, 137, 204, 0.18)',
    borderTopColor: '#6A89CC',
  },
  statusDot: {
    position: 'absolute',
    top: 11,
    right: 11,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
