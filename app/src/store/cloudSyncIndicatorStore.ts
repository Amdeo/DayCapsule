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
    mediaValidationStatus: ReturnType<typeof useSyncStore.getState>['lastMediaValidationSummary'] extends infer T
      ? T extends { status: infer S } ? S | null : null
      : null;
  },
): CloudSyncIndicatorUiState {
  if (!options.isAuthenticated || options.cloudMode !== true) {
    return 'hidden';
  }

  if (options.isSyncing || summary.uploadingEntries > 0 || options.mediaValidationStatus === 'running') {
    return 'syncing';
  }

  if (
    options.lastSyncError
    || summary.failedEntries > 0
    || options.mediaValidationStatus === 'partial'
    || options.mediaValidationStatus === 'failed'
  ) {
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
      const { isSyncing, lastSyncError, lastMediaValidationSummary } = useSyncStore.getState();

      const mediaValidationStatus = lastMediaValidationSummary?.status ?? null;
      const uiState = resolveUiState(summary, {
        isAuthenticated,
        cloudMode,
        isSyncing,
        lastSyncError,
        mediaValidationStatus,
      });

      logger.log('[cloudSyncIndicator] refresh →', {
        uiState,
        isSyncing,
        lastSyncError,
        mediaValidationStatus,
        pendingEntries: summary.pendingEntries,
        pendingUploads: summary.pendingUploads,
        uploadingEntries: summary.uploadingEntries,
        failedEntries: summary.failedEntries,
      });

      set({ ...summary, uiState });
    } catch (error) {
      logger.warn('[cloudSyncIndicatorStore] refresh failed:', error);
    }
  },
}));

export { resolveUiState as resolveCloudSyncIndicatorUiState };
