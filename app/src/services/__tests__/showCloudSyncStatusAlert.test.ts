import { showCloudSyncStatusAlert } from '../showCloudSyncStatusAlert';
import { showErrorFeedback } from '../showErrorFeedback';

const mockGetStatus = jest.fn();
const mockSyncNow = jest.fn(async () => undefined);

jest.mock('../cloudSyncService', () => ({
  createCloudSyncService: jest.fn(() => ({
    getStatus: mockGetStatus,
    syncNow: mockSyncNow,
  })),
}));

jest.mock('../showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('showCloudSyncStatusAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the same summary fields and offers syncNow action', async () => {
    mockGetStatus.mockResolvedValueOnce({
      lastSyncAt: 1700000000000,
      pendingEntries: 2,
      failedEntries: 1,
      conflictCopies: 1,
    });

    await showCloudSyncStatusAlert();

    expect(showErrorFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '云同步状态',
        tone: 'accent',
        details: expect.arrayContaining([
          expect.objectContaining({ label: '待同步条数', value: '2' }),
          expect.objectContaining({ label: '冲突副本', value: '1' }),
        ]),
      }),
    );

    const firstRequest = (showErrorFeedback as jest.Mock).mock.calls[0]?.[0] as {
      actions?: Array<{ label?: string; onPress?: () => void | Promise<void> }>;
    };
    const syncAction = firstRequest.actions?.find((action) => action.label === '立即同步');

    mockGetStatus.mockResolvedValueOnce({
      lastSyncAt: 1700000001000,
      pendingEntries: 0,
      failedEntries: 0,
      conflictCopies: 1,
    });

    await syncAction?.onPress?.();

    expect(mockSyncNow).toHaveBeenCalledTimes(1);
    expect(showErrorFeedback).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: '云同步完成',
        tone: 'accent',
        details: expect.arrayContaining([
          expect.objectContaining({ label: '待同步条数', value: '0' }),
        ]),
      }),
    );
  });

  it('uses branded feedback when getStatus fails', async () => {
    mockGetStatus.mockRejectedValueOnce(new Error('network down'));

    await showCloudSyncStatusAlert();

    expect(showErrorFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '云同步失败',
        dedupeKey: 'cloud-sync-failed',
      })
    );
  });

  it('uses branded feedback when syncNow fails inside the status alert action', async () => {
    mockGetStatus.mockResolvedValueOnce({
      lastSyncAt: 1700000000000,
      pendingEntries: 2,
      failedEntries: 1,
      conflictCopies: 1,
    });
    mockSyncNow.mockRejectedValueOnce(new Error('network down'));

    await showCloudSyncStatusAlert();

    const firstRequest = (showErrorFeedback as jest.Mock).mock.calls[0]?.[0] as {
      actions?: Array<{ label?: string; onPress?: () => void | Promise<void> }>;
    };
    const syncAction = firstRequest.actions?.find((action) => action.label === '立即同步');

    await syncAction?.onPress?.();

    expect(showErrorFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '云同步失败',
        dedupeKey: 'cloud-sync-failed',
      })
    );
  });
});
