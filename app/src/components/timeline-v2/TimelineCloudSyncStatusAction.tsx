import React from 'react';
import { useCloudSyncIndicatorStore } from '@/src/store/cloudSyncIndicatorStore';
import { showCloudSyncMonitor } from '@/src/services/showCloudSyncMonitor';
import { CloudSyncStatusButton } from '../CloudSyncStatusButton';

export function TimelineCloudSyncStatusAction() {
  const cloudSyncUiState = useCloudSyncIndicatorStore((state) => state.uiState);

  if (cloudSyncUiState === 'hidden') {
    return null;
  }

  return (
    <CloudSyncStatusButton
      uiState={cloudSyncUiState}
      onPress={() => {
        showCloudSyncMonitor();
      }}
    />
  );
}
