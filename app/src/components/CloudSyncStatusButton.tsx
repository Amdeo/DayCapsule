import React from 'react';
import { Pressable, View } from 'react-native';
import type { CloudSyncIndicatorUiState } from '@/src/store/cloudSyncIndicatorStore';
import { CloudSyncStatusButtonContent } from './cloud-sync-status-button/CloudSyncStatusButtonContent';
import { cloudSyncStatusButtonStyles as styles } from './cloud-sync-status-button/CloudSyncStatusButton.styles';
import { useCloudSyncStatusButtonAnimation } from './cloud-sync-status-button/useCloudSyncStatusButtonAnimation';

type CloudSyncStatusButtonProps = {
  uiState: Exclude<CloudSyncIndicatorUiState, 'hidden'>;
  onPress: () => void;
};

export function CloudSyncStatusButton({ uiState, onPress }: CloudSyncStatusButtonProps) {
  const { breathe, rotation } = useCloudSyncStatusButtonAnimation(uiState);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.button}
      testID="cloud-sync-button"
    >
      <View testID="cloud-sync-shell">
        <CloudSyncStatusButtonContent
          uiState={uiState}
          breathe={breathe}
          rotation={rotation}
        />
      </View>
    </Pressable>
  );
}
