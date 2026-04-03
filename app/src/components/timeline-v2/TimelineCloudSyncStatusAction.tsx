import React from 'react';
import { useCloudSyncIndicatorStore } from '@/src/store/cloudSyncIndicatorStore';
import { showCloudSyncStatusAlert } from '@/src/services/showCloudSyncStatusAlert';
import { CloudSyncStatusButton } from '@/src/components/CloudSyncStatusButton';

export function TimelineCloudSyncStatusAction() {
  const cloudSyncUiState = useCloudSyncIndicatorStore((state) => state.uiState);

  if (cloudSyncUiState === 'hidden') {
    return null;
  }

  return (
    <CloudSyncStatusButton
      uiState={cloudSyncUiState}
      onPress={() => {
        void showCloudSyncStatusAlert();
      }}
    />
  );
}
