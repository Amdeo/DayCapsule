import React from 'react';
import { CloudSyncMonitorModal } from '@/src/components/cloud-sync-monitor/CloudSyncMonitorModal';
import { useCloudSyncMonitorStore } from '@/src/store/cloudSyncMonitorStore';

export function CloudSyncMonitorHost() {
  const isVisible = useCloudSyncMonitorStore((state) => state.isVisible);
  const activeRun = useCloudSyncMonitorStore((state) => state.activeRun);
  const lastRunSummary = useCloudSyncMonitorStore((state) => state.lastRunSummary);
  const hide = useCloudSyncMonitorStore((state) => state.hide);

  if (!isVisible) {
    return null;
  }

  return (
    <CloudSyncMonitorModal
      activeRun={activeRun}
      lastRunSummary={lastRunSummary}
      onDismiss={hide}
    />
  );
}
