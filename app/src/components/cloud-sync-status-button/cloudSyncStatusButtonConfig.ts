import type { CloudSyncIndicatorUiState } from '@/src/store/cloudSyncIndicatorStore';

type VisibleNonSyncingState = Exclude<CloudSyncIndicatorUiState, 'hidden' | 'syncing'>;

interface StateConfig {
  iconName: 'cloud-outline' | 'cloud-done-outline' | 'cloud-upload-outline' | 'cloud-offline-outline';
  color: string;
}

export const CLOUD_SYNC_STATE_CONFIG: Record<VisibleNonSyncingState, StateConfig> = {
  synced: {
    iconName: 'cloud-done-outline',
    color: '#35B46F',
  },
  pending: {
    iconName: 'cloud-upload-outline',
    color: '#F5A623',
  },
  failed: {
    iconName: 'cloud-offline-outline',
    color: '#EF5350',
  },
  offline: {
    iconName: 'cloud-offline-outline',
    color: '#9CA3AF',
  },
};
