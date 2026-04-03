import { useCloudSyncMonitorStore } from '@/src/store/cloudSyncMonitorStore';

export function showCloudSyncMonitor(): void {
  useCloudSyncMonitorStore.getState().show();
}

export function hideCloudSyncMonitor(): void {
  useCloudSyncMonitorStore.getState().hide();
}
