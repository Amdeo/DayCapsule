import { createCloudRecoveryFlowService } from '../cloudRecoveryFlowService';

describe('cloudRecoveryFlowService', () => {
  it('runs sync, upload recovery, and indicator refresh in order', async () => {
    const steps: string[] = [];
    const syncNow = jest.fn(async () => {
      steps.push('sync');
    });
    const flushPendingUploads = jest.fn(async () => {
      steps.push('upload recovery');
      return {
        voiceError: null,
        photoError: null,
      };
    });
    const refreshCloudSyncIndicator = jest.fn(async () => {
      steps.push('indicator refresh');
    });

    const service = createCloudRecoveryFlowService({
      syncNow,
      flushPendingUploads,
      refreshCloudSyncIndicator,
    });

    await expect(service.run()).resolves.toEqual({
      syncError: null,
      queueRecovery: {
        voiceError: null,
        photoError: null,
      },
      refreshError: null,
    });

    expect(steps).toEqual(['sync', 'upload recovery', 'indicator refresh']);
    expect(syncNow.mock.invocationCallOrder[0]).toBeLessThan(
      flushPendingUploads.mock.invocationCallOrder[0]
    );
    expect(flushPendingUploads.mock.invocationCallOrder[0]).toBeLessThan(
      refreshCloudSyncIndicator.mock.invocationCallOrder[0]
    );
  });
});
