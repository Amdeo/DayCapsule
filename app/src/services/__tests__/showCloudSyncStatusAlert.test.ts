import { showCloudSyncStatusAlert } from '../showCloudSyncStatusAlert';
import { showErrorFeedback } from '../showErrorFeedback';

const mockGetSnapshot = jest.fn();
const mockSyncNow = jest.fn(async () => undefined);

jest.mock('../cloudSyncOverviewService', () => ({
  createCloudSyncOverviewService: jest.fn(() => ({
    getSnapshot: mockGetSnapshot,
  })),
}));

jest.mock('../cloudSyncService', () => ({
  createCloudSyncService: jest.fn(() => ({
    syncNow: mockSyncNow,
  })),
}));

jest.mock('../showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

jest.mock('@/src/utils/fileSystem', () => ({
  formatFileSize: jest.fn((bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }),
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

  it('初次打开时展示同步状态 + 本地数据 + 云端数据', async () => {
    mockGetSnapshot.mockResolvedValueOnce({
      lastSyncAt: 1700000000000,
      lastSyncError: 'network timeout',
      pendingEntries: 2,
      pendingUploads: 3,
      uploadingEntries: 1,
      failedEntries: 1,
      conflictCopies: 1,
      local: {
        entryCount: 12,
        photoCount: 7,
        voiceCount: 4,
        mediaBytes: 1536,
      },
      cloud: {
        entryCount: 20,
        photoCount: 9,
        voiceCount: 5,
        mediaCount: 14,
        mediaBytes: 2097152,
      },
      cloudError: null,
    });

    await showCloudSyncStatusAlert();

    expect(showErrorFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '云同步状态',
        tone: 'error',
        details: expect.arrayContaining([
          expect.objectContaining({ label: '同步状态', value: '---' }),
          expect.objectContaining({ label: '待同步条数', value: '2' }),
          expect.objectContaining({ label: '待上传媒体', value: '3' }),
          expect.objectContaining({ label: '上传中', value: '1' }),
          expect.objectContaining({ label: '最近错误', value: 'network timeout' }),
          expect.objectContaining({ label: '冲突副本', value: '1' }),
          expect.objectContaining({ label: '本地数据', value: '---' }),
          expect.objectContaining({ label: '本地记录总数', value: '12' }),
          expect.objectContaining({ label: '本地图片数', value: '7' }),
          expect.objectContaining({ label: '本地音频数', value: '4' }),
          expect.objectContaining({ label: '本地媒体总大小', value: '1.50 KB' }),
          expect.objectContaining({ label: '云端数据', value: '---' }),
          expect.objectContaining({ label: '云端记录总数', value: '20' }),
          expect.objectContaining({ label: '云端图片数', value: '9' }),
          expect.objectContaining({ label: '云端音频数', value: '5' }),
          expect.objectContaining({ label: '云端媒体总大小', value: '2.00 MB' }),
        ]),
      }),
    );
  });

  it('云端概览失败时展示获取失败和错误原因，但不走整体失败弹窗', async () => {
    mockGetSnapshot.mockResolvedValueOnce({
      lastSyncAt: null,
      lastSyncError: null,
      pendingEntries: 1,
      pendingUploads: 0,
      uploadingEntries: 0,
      failedEntries: 0,
      conflictCopies: 0,
      local: {
        entryCount: 1,
        photoCount: 0,
        voiceCount: 0,
        mediaBytes: 0,
      },
      cloud: null,
      cloudError: 'cloud unavailable',
    });

    await showCloudSyncStatusAlert();

    expect(showErrorFeedback).toHaveBeenCalledTimes(1);
    expect(showErrorFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '云同步状态',
        details: expect.arrayContaining([
          expect.objectContaining({ label: '云端数据', value: '获取失败' }),
          expect.objectContaining({ label: '云端错误原因', value: 'cloud unavailable' }),
        ]),
      }),
    );
    expect(showErrorFeedback).not.toHaveBeenCalledWith(
      expect.objectContaining({
        dedupeKey: 'cloud-sync-failed',
      }),
    );
  });

  it('overview 快照获取失败时展示 branded failed feedback', async () => {
    mockGetSnapshot.mockRejectedValueOnce(new Error('snapshot unavailable'));

    await showCloudSyncStatusAlert();

    expect(showErrorFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '云同步失败',
        dedupeKey: 'cloud-sync-failed',
      }),
    );
  });

  it('点击立即同步成功后会重新拉取 overview 并展示更新后的数据', async () => {
    mockGetSnapshot
      .mockResolvedValueOnce({
        lastSyncAt: 1700000000000,
        lastSyncError: 'old error',
        pendingEntries: 2,
        pendingUploads: 3,
        uploadingEntries: 1,
        failedEntries: 1,
        conflictCopies: 1,
        local: {
          entryCount: 12,
          photoCount: 7,
          voiceCount: 4,
          mediaBytes: 1536,
        },
        cloud: {
          entryCount: 20,
          photoCount: 9,
          voiceCount: 5,
          mediaCount: 14,
          mediaBytes: 2097152,
        },
        cloudError: null,
      })
      .mockResolvedValueOnce({
        lastSyncAt: 1700000001000,
        lastSyncError: null,
        pendingEntries: 0,
        pendingUploads: 0,
        uploadingEntries: 0,
        failedEntries: 0,
        conflictCopies: 1,
        local: {
          entryCount: 12,
          photoCount: 7,
          voiceCount: 4,
          mediaBytes: 1536,
        },
        cloud: {
          entryCount: 21,
          photoCount: 10,
          voiceCount: 5,
          mediaCount: 15,
          mediaBytes: 3145728,
        },
        cloudError: null,
      });

    await showCloudSyncStatusAlert();

    const firstRequest = (showErrorFeedback as jest.Mock).mock.calls[0]?.[0] as {
      actions?: Array<{ label?: string; onPress?: () => void | Promise<void> }>;
    };
    const syncAction = firstRequest.actions?.find((action) => action.label === '立即同步');

    await syncAction?.onPress?.();

    expect(mockSyncNow).toHaveBeenCalledTimes(1);
    expect(mockGetSnapshot).toHaveBeenCalledTimes(2);
    expect(showErrorFeedback).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: '云同步完成',
        tone: 'accent',
        details: expect.arrayContaining([
          expect.objectContaining({ label: '待同步条数', value: '0' }),
          expect.objectContaining({ label: '待上传媒体', value: '0' }),
          expect.objectContaining({ label: '云端记录总数', value: '21' }),
          expect.objectContaining({ label: '云端媒体总大小', value: '3.00 MB' }),
        ]),
      }),
    );
  });

  it('点击立即同步失败时，仍走 branded failed feedback', async () => {
    mockGetSnapshot.mockResolvedValueOnce({
      lastSyncAt: 1700000000000,
      lastSyncError: null,
      pendingEntries: 2,
      pendingUploads: 0,
      uploadingEntries: 0,
      failedEntries: 1,
      conflictCopies: 1,
      local: {
        entryCount: 2,
        photoCount: 1,
        voiceCount: 1,
        mediaBytes: 0,
      },
      cloud: {
        entryCount: 2,
        photoCount: 1,
        voiceCount: 1,
        mediaCount: 2,
        mediaBytes: 0,
      },
      cloudError: null,
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
