import type { Entry, MediaInfo } from '@/src/types/entry';
import type { PhotoUploadQueueDeps } from '@/src/services/photoUploadQueue';
import type { VoiceUploadQueueDeps } from '@/src/services/voiceUploadQueue';
import { useCloudSyncIndicatorStore } from '@/src/store/cloudSyncIndicatorStore';
import { useCloudSyncMonitorStore } from '@/src/store/cloudSyncMonitorStore';
import { useEntryStore } from '@/src/store/entryStore';
import { logger } from '@/src/utils/logger';

type EntryStateUpdater = Parameters<typeof useEntryStore.setState>[0];

export interface HomeUploadSyncOrchestrationDeps {
  setEntryState?: (updater: EntryStateUpdater) => void;
  refreshCloudSyncIndicator?: () => Promise<void>;
}

function refreshCloudSyncIndicator(refresh: () => Promise<void>): void {
  void refresh().catch((error) => {
    logger.warn('[homeUploadSyncOrchestration] Failed to refresh cloud sync indicator:', error);
  });
}

function updateEntryState(
  id: string,
  updater: (entry: Entry) => Entry,
  deps: Required<HomeUploadSyncOrchestrationDeps>
): void {
  deps.setEntryState((state) => ({
    ...state,
    entries: state.entries.map((entry) => (entry.id === id ? updater(entry) : entry)),
  }));
  refreshCloudSyncIndicator(deps.refreshCloudSyncIndicator);
}

function updateMonitorQueueStatus(
  id: string,
  status: 'running' | 'failed' | 'completed'
): void {
  useCloudSyncMonitorStore.getState().updateQueueItem(id, { status });
}

function incrementMonitorMediaProgress(): void {
  const monitor = useCloudSyncMonitorStore.getState();
  const { activeRun } = monitor;
  if (!activeRun) {
    return;
  }

  monitor.updateMediaProgress(
    activeRun.mediaProgress.completed + 1,
    activeRun.mediaProgress.total,
    activeRun.mediaProgress.currentItemTitle
  );
}

export interface HomeUploadSyncOrchestration {
  shouldEnqueueVoiceUpload: (isCloudModeEnabled: boolean) => boolean;
  getPhotoCreationPolicy: (isCloudModeEnabled: boolean) => {
    shouldEnqueueUpload: boolean;
    initialSyncStatus: Entry['syncStatus'];
  };
  voiceCallbacks: Pick<VoiceUploadQueueDeps, 'onEntryUploading' | 'onEntryPending' | 'onEntryPendingSync'>;
  photoCallbacks: Pick<PhotoUploadQueueDeps, 'onEntryUploading' | 'onEntryPendingUpload' | 'onEntryPendingSync'>;
}

export function createHomeUploadSyncOrchestration(
  deps: HomeUploadSyncOrchestrationDeps = {}
): HomeUploadSyncOrchestration {
  const resolvedDeps: Required<HomeUploadSyncOrchestrationDeps> = {
    setEntryState: deps.setEntryState ?? useEntryStore.setState,
    refreshCloudSyncIndicator: deps.refreshCloudSyncIndicator ?? useCloudSyncIndicatorStore.getState().refresh,
  };

  return {
    shouldEnqueueVoiceUpload: (isCloudModeEnabled) => isCloudModeEnabled,
    getPhotoCreationPolicy: (isCloudModeEnabled) => ({
      shouldEnqueueUpload: isCloudModeEnabled,
      initialSyncStatus: isCloudModeEnabled ? 'pending_upload' : 'synced',
    }),
    voiceCallbacks: {
      onEntryUploading: (id) => {
        updateEntryState(id, (entry) => ({ ...entry, syncStatus: 'uploading' }), resolvedDeps);
        updateMonitorQueueStatus(id, 'running');
      },
      onEntryPending: (id) => {
        updateEntryState(id, (entry) => ({ ...entry, syncStatus: 'pending_upload' }), resolvedDeps);
        updateMonitorQueueStatus(id, 'failed');
      },
      onEntryPendingSync: (id, entry) => {
        updateEntryState(id, (item) => ({ ...item, syncStatus: 'pending', media: entry.media }), resolvedDeps);
        updateMonitorQueueStatus(id, 'completed');
        incrementMonitorMediaProgress();
      },
    },
    photoCallbacks: {
      onEntryUploading: (id) => {
        updateEntryState(id, (entry) => ({ ...entry, syncStatus: 'uploading' }), resolvedDeps);
        updateMonitorQueueStatus(id, 'running');
      },
      onEntryPendingUpload: (id) => {
        updateEntryState(id, (entry) => ({ ...entry, syncStatus: 'pending_upload' }), resolvedDeps);
        updateMonitorQueueStatus(id, 'failed');
      },
      onEntryPendingSync: (id, media: MediaInfo[]) => {
        updateEntryState(id, (entry) => ({ ...entry, syncStatus: 'pending', media }), resolvedDeps);
        updateMonitorQueueStatus(id, 'completed');
        incrementMonitorMediaProgress();
      },
    },
  };
}
