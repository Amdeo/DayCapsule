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
  | 'failed'
  | 'offline';

interface CloudSyncIndicatorState extends DB.CloudSyncIndicatorSummary {
  uiState: CloudSyncIndicatorUiState;
  isNetworkReachable: boolean;
  setNetworkReachable: (reachable: boolean) => void;
  init: () => void;
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
    isNetworkReachable: boolean;
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

  const hasPendingContent = summary.pendingEntries > 0 || summary.pendingUploads > 0;
  const hasFailedContent =
    summary.failedEntries > 0
    || options.mediaValidationStatus === 'partial'
    || options.mediaValidationStatus === 'failed';

  if (!options.isNetworkReachable && (hasPendingContent || hasFailedContent)) {
    return 'offline';
  }

  if (hasFailedContent) {
    return 'failed';
  }

  if (hasPendingContent) {
    return 'pending';
  }

  return 'synced';
}

let unsubscribeSyncStore: (() => void) | null = null;

export const useCloudSyncIndicatorStore = create<CloudSyncIndicatorState>((set, get) => ({
  ...EMPTY_SUMMARY,
  uiState: 'hidden',
  isNetworkReachable: true,

  setNetworkReachable: (reachable) => {
    set({ isNetworkReachable: reachable });
    get().refresh().catch((err) => {
      logger.warn('[cloudSyncIndicatorStore] refresh after network change failed:', err);
    });
  },

  init: () => {
    if (unsubscribeSyncStore) return;

    let prevIsSyncing = useSyncStore.getState().isSyncing;
    unsubscribeSyncStore = useSyncStore.subscribe((state) => {
      if (state.isSyncing !== prevIsSyncing) {
        prevIsSyncing = state.isSyncing;
        get().refresh().catch((err) => {
          logger.warn('[cloudSyncIndicatorStore] refresh after isSyncing change failed:', err);
        });
      }
    });
  },

  refresh: async () => {
    const { isAuthenticated } = useAuthStore.getState();
    const { cloudMode } = useSettingsStore.getState();

    if (!isAuthenticated || cloudMode !== true) {
      set({ ...EMPTY_SUMMARY, uiState: 'hidden' });
      return;
    }

    try {
      const summary = await DB.getCloudSyncIndicatorSummary();
      const { isSyncing, lastSyncError, lastMediaValidationSummary } = useSyncStore.getState();
      const { isNetworkReachable } = get();

      // 清除陈旧错误：有 lastSyncError 但 DB 中无失败条目且网络可达
      if (lastSyncError && summary.failedEntries === 0 && isNetworkReachable) {
        useSyncStore.getState().markSyncSuccess().catch((err) => {
          logger.warn('[cloudSyncIndicatorStore] failed to clear stale error:', err);
        });
      }

      const mediaValidationStatus = lastMediaValidationSummary?.status ?? null;
      const uiState = resolveUiState(summary, {
        isAuthenticated,
        cloudMode,
        isSyncing,
        isNetworkReachable,
        mediaValidationStatus,
      });

      set({ ...summary, uiState });

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

    } catch (error) {
      logger.warn('[cloudSyncIndicatorStore] refresh failed:', error);
    }
  },
}));

export { resolveUiState as resolveCloudSyncIndicatorUiState };
