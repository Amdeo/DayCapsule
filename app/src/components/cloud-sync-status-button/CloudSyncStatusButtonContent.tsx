import React from 'react';
import { Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CloudSyncIndicatorUiState } from '@/src/store/cloudSyncIndicatorStore';
import { CLOUD_SYNC_DOT_COLORS } from './cloudSyncStatusButtonConfig';
import { cloudSyncStatusButtonStyles as styles } from './CloudSyncStatusButton.styles';

interface CloudSyncStatusButtonContentProps {
  uiState: Exclude<CloudSyncIndicatorUiState, 'hidden'>;
  breathe: Animated.Value;
  rotation: Animated.AnimatedInterpolation<string | number>;
}

export function CloudSyncStatusButtonContent({
  uiState,
  breathe,
  rotation,
}: CloudSyncStatusButtonContentProps) {
  if (uiState === 'syncing') {
    return (
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
    );
  }

  return (
    <>
      <View style={styles.cloudWrap}>
        <Ionicons name="cloud-outline" size={22} color="#6A89CC" />
      </View>
      <View
        style={[
          styles.statusDot,
          { backgroundColor: CLOUD_SYNC_DOT_COLORS[uiState] },
        ]}
        testID={`cloud-sync-dot-${uiState}`}
      />
    </>
  );
}
