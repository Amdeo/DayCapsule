import { hideCloudSyncMonitor, showCloudSyncMonitor } from '../showCloudSyncMonitor';
import { useCloudSyncMonitorStore } from '@/src/store/cloudSyncMonitorStore';

describe('showCloudSyncMonitor', () => {
  beforeEach(() => {
    useCloudSyncMonitorStore.setState({
      activeRun: null,
      lastRunSummary: null,
      isVisible: false,
    });
  });

  it('shows the cloud sync monitor', () => {
    showCloudSyncMonitor();

    expect(useCloudSyncMonitorStore.getState().isVisible).toBe(true);
  });

  it('hides the cloud sync monitor', () => {
    useCloudSyncMonitorStore.getState().show();

    hideCloudSyncMonitor();

    expect(useCloudSyncMonitorStore.getState().isVisible).toBe(false);
  });
});
