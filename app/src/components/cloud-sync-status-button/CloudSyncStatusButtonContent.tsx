import React from 'react';
import { Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CloudSyncIndicatorUiState } from '@/src/store/cloudSyncIndicatorStore';
import { CLOUD_SYNC_STATE_CONFIG } from './cloudSyncStatusButtonConfig';
import { cloudSyncStatusButtonStyles as styles } from './CloudSyncStatusButton.styles';

interface CloudSyncStatusButtonContentProps {
  uiState: Exclude<CloudSyncIndicatorUiState, 'hidden'>;
  breathe: Animated.Value;
  rotation: Animated.AnimatedInterpolation<string | number>;
  floatY: Animated.Value;
  completionScale: Animated.Value;
}

export function CloudSyncStatusButtonContent({
  uiState,
  breathe,
  rotation,
  floatY,
  completionScale,
}: CloudSyncStatusButtonContentProps) {
  if (uiState === 'syncing') {
    return (
      <>
        <Animated.View
          style={[styles.syncRing, { transform: [{ rotate: rotation }] }]}
          testID="cloud-sync-spinner"
        />
        <Animated.View
          style={[styles.cloudWrap, { transform: [{ scale: breathe }] }]}
        >
          <Ionicons name="cloud-outline" size={22} color="#6A89CC" />
        </Animated.View>
      </>
    );
  }

  const config = CLOUD_SYNC_STATE_CONFIG[uiState];

  if (uiState === 'pending') {
    return (
      <Animated.View style={[styles.cloudWrap, { transform: [{ translateY: floatY }] }]}>
        <Ionicons name={config.iconName} size={22} color={config.color} testID={`cloud-sync-icon-${uiState}`} />
      </Animated.View>
    );
  }

  if (uiState === 'synced') {
    return (
      <Animated.View style={[styles.cloudWrap, { transform: [{ scale: completionScale }] }]}>
        <Ionicons name={config.iconName} size={22} color={config.color} testID={`cloud-sync-icon-${uiState}`} />
      </Animated.View>
    );
  }

  return (
    <View style={styles.cloudWrap} testID={`cloud-sync-icon-${uiState}`}>
      <Ionicons name={config.iconName} size={22} color={config.color} />
    </View>
  );
}
