import { Alert } from 'react-native';
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

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await showCloudSyncStatusAlert();

    expect(alertSpy).toHaveBeenCalledWith(
      '云同步状态',
      expect.stringContaining('待同步条数：2'),
      expect.any(Array),
    );
    expect(alertSpy).toHaveBeenCalledWith(
      '云同步状态',
      expect.stringContaining('冲突副本：1'),
      expect.any(Array),
    );

    const actions = alertSpy.mock.calls[0]?.[2] as Array<{ text?: string; onPress?: () => void }>;
    const syncAction = actions.find((action) => action.text === '立即同步');

    mockGetStatus.mockResolvedValueOnce({
      lastSyncAt: 1700000001000,
      pendingEntries: 0,
      failedEntries: 0,
      conflictCopies: 1,
    });

    await syncAction?.onPress?.();

    expect(mockSyncNow).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      '云同步完成',
      expect.stringContaining('待同步条数：0'),
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

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await showCloudSyncStatusAlert();

    const actions = alertSpy.mock.calls[0]?.[2] as Array<{ text?: string; onPress?: () => void }>;
    const syncAction = actions.find((action) => action.text === '立即同步');

    await syncAction?.onPress?.();

    expect(showErrorFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '云同步失败',
        dedupeKey: 'cloud-sync-failed',
      })
    );
  });
});
