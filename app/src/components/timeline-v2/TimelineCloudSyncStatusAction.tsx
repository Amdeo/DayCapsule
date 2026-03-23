import React, { useCallback } from 'react';
import { CloudSyncStatusButton } from '../CloudSyncStatusButton';
import { useCloudSyncIndicatorStore } from '@/src/store/cloudSyncIndicatorStore';
import { showCloudSyncStatusAlert } from '@/src/services/showCloudSyncStatusAlert';

export function TimelineCloudSyncStatusAction() {
  const uiState = useCloudSyncIndicatorStore((state) => state.uiState);
  const handlePress = useCallback(() => {
    void showCloudSyncStatusAlert();
  }, []);

  if (uiState === 'hidden') {
    return null;
  }

  return <CloudSyncStatusButton uiState={uiState} onPress={handlePress} />;
}
