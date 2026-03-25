import { useMediaRepairStore } from '@/src/store/mediaRepairStore';
import { showCloudSyncStatusAlert } from '../showCloudSyncStatusAlert';
import { showErrorFeedback } from '../showErrorFeedback';

const mockGetSnapshot = jest.fn();
const mockSyncNow = jest.fn(async () => undefined);
const mockShowPhotoRepairPrompt = jest.fn();

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

jest.mock('../showPhotoRepairPrompt', () => ({
  showPhotoRepairPrompt: (...args: unknown[]) => mockShowPhotoRepairPrompt(...args),
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
    useMediaRepairStore.setState({ issues: [] });
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
      lastMediaValidationSummary: null,
    });

    await showCloudSyncStatusAlert();

    expect(showErrorFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '云同步失败',
        tone: 'error',
        details: expect.arrayContaining([
          expect.objectContaining({ label: '同步状态', value: '失败' }),
          expect.objectContaining({ label: '待同步条数', value: '2' }),
          expect.objectContaining({ label: '待上传媒体', value: '3' }),
          expect.objectContaining({ label: '上传中', value: '1' }),
          expect.objectContaining({ label: '最近错误', value: 'network timeout' }),
          expect.objectContaining({ label: '冲突副本', value: '1' }),
          expect.objectContaining({ label: '媒体同步状态', value: '未执行' }),
          expect.objectContaining({ label: '需校验媒体数', value: '0' }),
          expect.objectContaining({ label: '已落地媒体数', value: '0' }),
          expect.objectContaining({ label: '缺失媒体数', value: '0' }),
          expect.objectContaining({ label: '下载失败媒体数', value: '0' }),
          expect.objectContaining({ label: '最近媒体错误', value: '无' }),
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
      lastMediaValidationSummary: null,
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

  it('元数据成功但媒体部分成功时展示部分成功和媒体明细', async () => {
    mockGetSnapshot.mockResolvedValueOnce({
      lastSyncAt: 1700000000000,
      lastSyncError: null,
      pendingEntries: 0,
      pendingUploads: 0,
      uploadingEntries: 0,
      failedEntries: 0,
      conflictCopies: 0,
      local: {
        entryCount: 5,
        photoCount: 3,
        voiceCount: 1,
        mediaBytes: 1024,
      },
      cloud: {
        entryCount: 5,
        photoCount: 3,
        voiceCount: 1,
        mediaCount: 4,
        mediaBytes: 2048,
      },
      cloudError: null,
      lastMediaValidationSummary: {
        status: 'partial',
        total: 4,
        downloaded: 3,
        missing: 1,
        failed: 0,
        lastError: 'missing thumbnail',
        lastValidatedAt: 1700000002000,
      },
    });

    await showCloudSyncStatusAlert();

    expect(showErrorFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '云同步部分完成',
        details: expect.arrayContaining([
          expect.objectContaining({ label: '同步状态', value: '部分成功' }),
          expect.objectContaining({ label: '媒体同步状态', value: '部分成功' }),
          expect.objectContaining({ label: '需校验媒体数', value: '4' }),
          expect.objectContaining({ label: '已落地媒体数', value: '3' }),
          expect.objectContaining({ label: '缺失媒体数', value: '1' }),
          expect.objectContaining({ label: '下载失败媒体数', value: '0' }),
          expect.objectContaining({ label: '最近媒体错误', value: 'missing thumbnail' }),
        ]),
      }),
    );
  });

  it('展示异常媒体与可修复计数，并提供修复异常媒体操作', async () => {
    useMediaRepairStore.getState().replaceIssues([
      {
        entryId: 'entry-photo-1',
        mediaIndex: 0,
        localMediaId: 'local-1',
        localUri: 'file:///documents/media/photos/original/photo-1.jpg',
        remoteUri: 'https://cdn.example.com/photo-1.jpg',
        persistedHash: 'local-good',
        remoteHash: 'remote-bad',
        downloadedHash: 'remote-bad',
        integrityStatus: 'repair_prompt_required',
        integrityReason: 'cloud hash mismatch while local original is still healthy',
      },
    ]);
    mockGetSnapshot.mockResolvedValueOnce({
      lastSyncAt: 1700000000000,
      lastSyncError: null,
      pendingEntries: 0,
      pendingUploads: 0,
      uploadingEntries: 0,
      failedEntries: 0,
      conflictCopies: 0,
      local: {
        entryCount: 5,
        photoCount: 3,
        voiceCount: 1,
        mediaBytes: 1024,
      },
      cloud: {
        entryCount: 5,
        photoCount: 3,
        voiceCount: 1,
        mediaCount: 4,
        mediaBytes: 2048,
      },
      cloudError: null,
      lastMediaValidationSummary: {
        status: 'partial',
        total: 4,
        downloaded: 3,
        missing: 1,
        failed: 0,
        suspect: 1,
        repairable: 1,
        lastError: 'missing thumbnail',
        lastValidatedAt: 1700000002000,
      },
    });

    await showCloudSyncStatusAlert();

    const firstRequest = (showErrorFeedback as jest.Mock).mock.calls[0]?.[0] as {
      details?: Array<{ label?: string; value?: string }>;
      actions?: Array<{ label?: string; onPress?: () => void | Promise<void> }>;
    };

    expect(firstRequest.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '异常媒体数', value: '1' }),
      expect.objectContaining({ label: '可修复媒体数', value: '1' }),
    ]));

    const repairAction = firstRequest.actions?.find((action) => action.label === '修复异常媒体');
    expect(repairAction).toBeTruthy();
    expect(repairAction).toEqual(expect.objectContaining({
      testID: 'error-feedback-action-repair-media',
    }));

    const syncAction = firstRequest.actions?.find((action) => action.label === '立即同步');
    expect(syncAction).toEqual(expect.objectContaining({
      testID: 'error-feedback-action-sync-now',
    }));

    await repairAction?.onPress?.();

    expect(mockShowPhotoRepairPrompt).toHaveBeenCalledTimes(1);
  });

  it('元数据成功但媒体校验整体失败时展示失败态和媒体错误', async () => {
    mockGetSnapshot.mockResolvedValueOnce({
      lastSyncAt: 1700000000000,
      lastSyncError: null,
      pendingEntries: 0,
      pendingUploads: 0,
      uploadingEntries: 0,
      failedEntries: 0,
      conflictCopies: 0,
      local: {
        entryCount: 5,
        photoCount: 3,
        voiceCount: 1,
        mediaBytes: 1024,
      },
      cloud: {
        entryCount: 5,
        photoCount: 3,
        voiceCount: 1,
        mediaCount: 4,
        mediaBytes: 2048,
      },
      cloudError: null,
      lastMediaValidationSummary: {
        status: 'failed',
        total: 4,
        downloaded: 0,
        missing: 0,
        failed: 4,
        lastError: 'download service unavailable',
        lastValidatedAt: 1700000002000,
      },
    });

    await showCloudSyncStatusAlert();

    expect(showErrorFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '云同步失败',
        tone: 'error',
        details: expect.arrayContaining([
          expect.objectContaining({ label: '同步状态', value: '失败' }),
          expect.objectContaining({ label: '媒体同步状态', value: '失败' }),
          expect.objectContaining({ label: '需校验媒体数', value: '4' }),
          expect.objectContaining({ label: '已落地媒体数', value: '0' }),
          expect.objectContaining({ label: '缺失媒体数', value: '0' }),
          expect.objectContaining({ label: '下载失败媒体数', value: '4' }),
          expect.objectContaining({ label: '最近媒体错误', value: 'download service unavailable' }),
        ]),
      }),
    );
  });

  it('cloudError 存在时不会沿用旧媒体摘要显示完成或部分完成', async () => {
    mockGetSnapshot.mockResolvedValueOnce({
      lastSyncAt: 1700000000000,
      lastSyncError: null,
      pendingEntries: 0,
      pendingUploads: 0,
      uploadingEntries: 0,
      failedEntries: 0,
      conflictCopies: 0,
      local: {
        entryCount: 5,
        photoCount: 3,
        voiceCount: 1,
        mediaBytes: 1024,
      },
      cloud: null,
      cloudError: 'overview unavailable',
      lastMediaValidationSummary: {
        status: 'success',
        total: 4,
        downloaded: 4,
        missing: 0,
        failed: 0,
        lastError: null,
        lastValidatedAt: 1700000002000,
      },
    });

    await showCloudSyncStatusAlert();

    expect(showErrorFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '云同步状态',
        tone: 'accent',
        details: expect.arrayContaining([
          expect.objectContaining({ label: '同步状态', value: '状态待确认' }),
          expect.objectContaining({ label: '云端数据', value: '获取失败' }),
          expect.objectContaining({ label: '云端错误原因', value: 'overview unavailable' }),
          expect.objectContaining({ label: '媒体同步状态', value: '成功' }),
        ]),
      }),
    );

    const feedback = (showErrorFeedback as jest.Mock).mock.calls.at(-1)?.[0] as { title?: string };
    expect(feedback.title).not.toBe('云同步完成');
    expect(feedback.title).not.toBe('云同步部分完成');
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
        lastMediaValidationSummary: null,
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
        lastMediaValidationSummary: {
          status: 'success',
          total: 4,
          downloaded: 4,
          missing: 0,
          failed: 0,
          lastError: null,
          lastValidatedAt: 1700000001000,
        },
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
      lastMediaValidationSummary: null,
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
