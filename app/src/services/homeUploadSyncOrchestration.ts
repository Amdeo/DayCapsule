import type { Entry, MediaInfo } from '@/src/types/entry';
import type { PhotoUploadQueueDeps } from '@/src/services/photoUploadQueue';
import type { VoiceUploadQueueDeps } from '@/src/services/voiceUploadQueue';
import { useCloudSyncIndicatorStore } from '@/src/store/cloudSyncIndicatorStore';
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
    entries: state.entries.map((entry) => (entry.id === id ? updater(entry) : entry)),
  }));
  refreshCloudSyncIndicator(deps.refreshCloudSyncIndicator);
}

export interface HomeUploadSyncOrchestration {
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
    voiceCallbacks: {
      onEntryUploading: (id) => {
        updateEntryState(id, (entry) => ({ ...entry, syncStatus: 'uploading' }), resolvedDeps);
      },
      onEntryPending: (id) => {
        updateEntryState(id, (entry) => ({ ...entry, syncStatus: 'pending_upload' }), resolvedDeps);
      },
      onEntryPendingSync: (id, entry) => {
        updateEntryState(id, (item) => ({ ...item, syncStatus: 'pending', media: entry.media }), resolvedDeps);
      },
    },
    photoCallbacks: {
      onEntryUploading: (id) => {
        updateEntryState(id, (entry) => ({ ...entry, syncStatus: 'uploading' }), resolvedDeps);
      },
      onEntryPendingUpload: (id) => {
        updateEntryState(id, (entry) => ({ ...entry, syncStatus: 'pending_upload' }), resolvedDeps);
      },
      onEntryPendingSync: (id, media: MediaInfo[]) => {
        updateEntryState(id, (entry) => ({ ...entry, syncStatus: 'pending', media }), resolvedDeps);
      },
    },
  };
}
