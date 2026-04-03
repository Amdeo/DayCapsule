import React from 'react';
import { CloudSyncMonitorModal } from '@/src/components/cloud-sync-monitor/CloudSyncMonitorModal';
import { useCloudSyncMonitorStore } from '@/src/store/cloudSyncMonitorStore';
import { useSyncStore } from '@/src/store/syncStore';
import { createCloudSyncService } from '@/src/services/cloudSyncService';

export function CloudSyncMonitorHost() {
  const isVisible = useCloudSyncMonitorStore((state) => state.isVisible);
  const activeRun = useCloudSyncMonitorStore((state) => state.activeRun);
  const lastRunSummary = useCloudSyncMonitorStore((state) => state.lastRunSummary);
  const hide = useCloudSyncMonitorStore((state) => state.hide);
  const lastSyncError = useSyncStore((state) => state.lastSyncError);
  const lastMediaValidationSummary = useSyncStore((state) => state.lastMediaValidationSummary);

  const handleSyncNow = React.useCallback(() => {
    hide();
    void createCloudSyncService().syncNow();
  }, [hide]);

  if (!isVisible) {
    return null;
  }

  return (
    <CloudSyncMonitorModal
      activeRun={activeRun}
      lastRunSummary={lastRunSummary}
      lastSyncError={lastSyncError}
      mediaValidationStatus={lastMediaValidationSummary?.status ?? null}
      onSyncNow={handleSyncNow}
      onDismiss={hide}
    />
  );
}
