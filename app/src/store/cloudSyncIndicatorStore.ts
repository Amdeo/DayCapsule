import { create } from 'zustand';
import * as DB from '@/src/database/operations';
import { useAuthStore } from '@/src/store/authStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useSyncStore } from '@/src/store/syncStore';
import { logger } from '@/src/utils/logger';

export type CloudSyncIndicatorUiState =
  | 'hidden'
  | 'syncing'
  | 'synced'
  | 'pending'
  | 'failed';

interface CloudSyncIndicatorState extends DB.CloudSyncIndicatorSummary {
  uiState: CloudSyncIndicatorUiState;
  refresh: () => Promise<void>;
}

const EMPTY_SUMMARY: DB.CloudSyncIndicatorSummary = {
  pendingEntries: 0,
  pendingUploads: 0,
  uploadingEntries: 0,
  failedEntries: 0,
};

function resolveUiState(
  summary: DB.CloudSyncIndicatorSummary,
  options: {
    isAuthenticated: boolean;
    cloudMode: boolean | 'switching';
    isSyncing: boolean;
    lastSyncError: string | null;
  },
): CloudSyncIndicatorUiState {
  if (!options.isAuthenticated || options.cloudMode !== true) {
    return 'hidden';
  }

  if (options.isSyncing || summary.uploadingEntries > 0) {
    return 'syncing';
  }

  if (options.lastSyncError || summary.failedEntries > 0) {
    return 'failed';
  }

  if (summary.pendingEntries > 0 || summary.pendingUploads > 0) {
    return 'pending';
  }

  return 'synced';
}

export const useCloudSyncIndicatorStore = create<CloudSyncIndicatorState>((set) => ({
  ...EMPTY_SUMMARY,
  uiState: 'hidden',

  refresh: async () => {
    const { isAuthenticated } = useAuthStore.getState();
    const { cloudMode } = useSettingsStore.getState();

    if (!isAuthenticated || cloudMode !== true) {
      set({
        ...EMPTY_SUMMARY,
        uiState: 'hidden',
      });
      return;
    }

    try {
      const summary = await DB.getCloudSyncIndicatorSummary();
      const { isSyncing, lastSyncError } = useSyncStore.getState();

      set({
        ...summary,
        uiState: resolveUiState(summary, {
          isAuthenticated,
          cloudMode,
          isSyncing,
          lastSyncError,
        }),
      });
    } catch (error) {
      logger.warn('[cloudSyncIndicatorStore] refresh failed:', error);
    }
  },
}));

export { resolveUiState as resolveCloudSyncIndicatorUiState };
