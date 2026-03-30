import type { UploadQueueRecoveryResult } from './uploadQueueRecoveryService';

export interface CloudRecoveryFlowServiceDeps {
  syncNow: () => Promise<void>;
  flushPendingUploads: () => Promise<UploadQueueRecoveryResult>;
  refreshCloudSyncIndicator: () => Promise<void>;
}

export interface CloudRecoveryFlowResult {
  syncError: unknown | null;
  queueRecovery: UploadQueueRecoveryResult;
  refreshError: unknown | null;
}

export function createCloudRecoveryFlowService(deps: CloudRecoveryFlowServiceDeps) {
  return {
    async run(): Promise<CloudRecoveryFlowResult> {
      let syncError: unknown | null = null;

      try {
        await deps.syncNow();
      } catch (error) {
        syncError = error;
      }

      const queueRecovery = await deps.flushPendingUploads();

      let refreshError: unknown | null = null;
      try {
        await deps.refreshCloudSyncIndicator();
      } catch (error) {
        refreshError = error;
      }

      return {
        syncError,
        queueRecovery,
        refreshError,
      };
    },
  };
}
