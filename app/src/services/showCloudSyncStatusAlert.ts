import { createCloudSyncService } from '@/src/services/cloudSyncService';
import {
  createCloudSyncOverviewService,
  type SyncOverviewSnapshot,
} from '@/src/services/cloudSyncOverviewService';
import { showPhotoRepairPrompt } from '@/src/services/showPhotoRepairPrompt';
import { useMediaRepairStore } from '@/src/store/mediaRepairStore';
import { logger } from '@/src/utils/logger';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { buildCloudSyncFailedFeedback } from '@/src/services/errorFeedbackPresets';
import type { ErrorFeedbackRequest } from '@/src/store/errorFeedbackStore';
import { formatFileSize } from '@/src/utils/fileSystem';

type OverallCloudSyncState = {
  title: string;
  statusLabel: string;
  tone: 'accent' | 'error';
};

const EMPTY_MEDIA_SUMMARY: NonNullable<SyncOverviewSnapshot['lastMediaValidationSummary']> = {
  status: 'idle',
  total: 0,
  downloaded: 0,
  missing: 0,
  failed: 0,
  suspect: 0,
  repairable: 0,
  lastError: null,
  lastValidatedAt: null,
};

function getMediaValidationSummary(snapshot: SyncOverviewSnapshot) {
  const summary = snapshot.lastMediaValidationSummary;
  if (!summary) {
    return EMPTY_MEDIA_SUMMARY;
  }

  return {
    ...EMPTY_MEDIA_SUMMARY,
    ...summary,
    suspect: typeof summary.suspect === 'number' ? summary.suspect : 0,
    repairable: typeof summary.repairable === 'number' ? summary.repairable : 0,
  };
}

function hasRepairableIssues(): boolean {
  return useMediaRepairStore.getState().issues.some(
    (issue) => issue.integrityStatus === 'repair_prompt_required'
  );
}

function formatMediaStatus(status: NonNullable<SyncOverviewSnapshot['lastMediaValidationSummary']>['status']): string {
  switch (status) {
    case 'running':
      return '校验中';
    case 'success':
      return '成功';
    case 'partial':
      return '部分成功';
    case 'failed':
      return '失败';
    case 'idle':
    default:
      return '未执行';
  }
}

function getOverallCloudSyncState(snapshot: SyncOverviewSnapshot): OverallCloudSyncState {
  const metadataFailed = !!snapshot.lastSyncError || snapshot.failedEntries > 0;
  const mediaSummary = getMediaValidationSummary(snapshot);

  if (metadataFailed) {
    return {
      title: '云同步失败',
      statusLabel: '失败',
      tone: 'error',
    };
  }

  if (snapshot.cloudError) {
    return {
      title: '云同步状态',
      statusLabel: '状态待确认',
      tone: 'accent',
    };
  }

  if (mediaSummary.status === 'failed') {
    return {
      title: '云同步失败',
      statusLabel: '失败',
      tone: 'error',
    };
  }

  if (mediaSummary.status === 'partial') {
    return {
      title: '云同步部分完成',
      statusLabel: '部分成功',
      tone: 'error',
    };
  }

  if (mediaSummary.status === 'success') {
    return {
      title: '云同步完成',
      statusLabel: '完成',
      tone: 'accent',
    };
  }

  return {
    title: '云同步状态',
    statusLabel: mediaSummary.status === 'running' ? '校验中' : '未执行',
    tone: 'accent',
  };
}

function formatCloudSyncStatusMessage(snapshot: SyncOverviewSnapshot): string {
  const last = snapshot.lastSyncAt
    ? new Date(snapshot.lastSyncAt).toLocaleString()
    : '从未同步';
  const overallState = getOverallCloudSyncState(snapshot);
  const mediaSummary = getMediaValidationSummary(snapshot);

  const lines = [
    `同步状态：${overallState.statusLabel}`,
    `上次同步：${last}`,
    `待同步条数：${snapshot.pendingEntries}`,
    `待上传媒体：${snapshot.pendingUploads}`,
    `上传中：${snapshot.uploadingEntries}`,
    `失败条数：${snapshot.failedEntries}`,
    `冲突副本：${snapshot.conflictCopies}`,
    '媒体同步',
    `媒体同步状态：${formatMediaStatus(mediaSummary.status)}`,
    `需校验媒体数：${mediaSummary.total}`,
    `已落地媒体数：${mediaSummary.downloaded}`,
    `缺失媒体数：${mediaSummary.missing}`,
    `下载失败媒体数：${mediaSummary.failed}`,
    `异常媒体数：${mediaSummary.suspect}`,
    `可修复媒体数：${mediaSummary.repairable}`,
    `最近媒体错误：${mediaSummary.lastError ?? '无'}`,
  ];
  if (snapshot.lastSyncError) {
    lines.push(`最近错误：${snapshot.lastSyncError}`);
  }
  lines.push(
    '本地数据',
    `本地记录总数：${snapshot.local.entryCount}`,
    `本地图片数：${snapshot.local.photoCount}`,
    `本地音频数：${snapshot.local.voiceCount}`,
    `本地媒体总大小：${formatFileSize(snapshot.local.mediaBytes)}`,
  );
  if (snapshot.cloud) {
    lines.push(
      '云端数据',
      `云端记录总数：${snapshot.cloud.entryCount}`,
      `云端图片数：${snapshot.cloud.photoCount}`,
      `云端音频数：${snapshot.cloud.voiceCount}`,
      `云端媒体总大小：${formatFileSize(snapshot.cloud.mediaBytes)}`,
    );
  } else {
    lines.push('云端数据：获取失败');
    if (snapshot.cloudError) {
      lines.push(`云端错误原因：${snapshot.cloudError}`);
    }
  }

  return lines.join('\n');
}

function buildCloudSyncStatusFeedback(
  snapshot: SyncOverviewSnapshot,
  onSyncNow: () => Promise<void>,
): ErrorFeedbackRequest {
  const last = snapshot.lastSyncAt
    ? new Date(snapshot.lastSyncAt).toLocaleString()
    : '从未同步';
  const overallState = getOverallCloudSyncState(snapshot);
  const mediaSummary = getMediaValidationSummary(snapshot);
  const cloudDetails = snapshot.cloud
    ? [
        { label: '云端数据', value: '---' },
        { label: '云端记录总数', value: String(snapshot.cloud.entryCount) },
        { label: '云端图片数', value: String(snapshot.cloud.photoCount) },
        { label: '云端音频数', value: String(snapshot.cloud.voiceCount) },
        { label: '云端媒体总大小', value: formatFileSize(snapshot.cloud.mediaBytes) },
      ]
    : [
        { label: '云端数据', value: '获取失败' },
        ...(snapshot.cloudError
          ? [{ label: '云端错误原因', value: snapshot.cloudError }]
          : []),
      ];
  const actions: ErrorFeedbackRequest['actions'] = [
    { label: '关闭', role: 'secondary' },
    ...(hasRepairableIssues()
      ? [{
          label: '修复异常媒体',
          role: 'secondary' as const,
          testID: 'error-feedback-action-repair-media',
          onPress: () => {
            showPhotoRepairPrompt();
          },
        }]
      : []),
    {
      label: '立即同步',
      role: 'primary',
      testID: 'error-feedback-action-sync-now',
      onPress: onSyncNow,
    },
  ];

  return {
    title: overallState.title,
    tone: overallState.tone,
    details: [
      { label: '同步状态', value: overallState.statusLabel },
      { label: '上次同步', value: last },
      { label: '待同步条数', value: String(snapshot.pendingEntries) },
      { label: '待上传媒体', value: String(snapshot.pendingUploads) },
      { label: '上传中', value: String(snapshot.uploadingEntries) },
      { label: '失败条数', value: String(snapshot.failedEntries) },
      { label: '冲突副本', value: String(snapshot.conflictCopies) },
      ...(snapshot.lastSyncError
        ? [{ label: '最近错误', value: snapshot.lastSyncError }]
        : []),
      { label: '媒体同步状态', value: formatMediaStatus(mediaSummary.status) },
      { label: '需校验媒体数', value: String(mediaSummary.total) },
      { label: '已落地媒体数', value: String(mediaSummary.downloaded) },
      { label: '缺失媒体数', value: String(mediaSummary.missing) },
      { label: '下载失败媒体数', value: String(mediaSummary.failed) },
      { label: '异常媒体数', value: String(mediaSummary.suspect) },
      { label: '可修复媒体数', value: String(mediaSummary.repairable) },
      { label: '最近媒体错误', value: mediaSummary.lastError ?? '无' },
      { label: '本地数据', value: '---' },
      { label: '本地记录总数', value: String(snapshot.local.entryCount) },
      { label: '本地图片数', value: String(snapshot.local.photoCount) },
      { label: '本地音频数', value: String(snapshot.local.voiceCount) },
      { label: '本地媒体总大小', value: formatFileSize(snapshot.local.mediaBytes) },
      ...cloudDetails,
    ],
    actions,
  };
}

export async function showCloudSyncStatusAlert(): Promise<void> {
  const cloudSync = createCloudSyncService();
  const overviewService = createCloudSyncOverviewService();

  const onSyncNow = async (): Promise<void> => {
    try {
      await cloudSync.syncNow();
      const refreshed = await overviewService.getSnapshot();
      showErrorFeedback(buildCloudSyncStatusFeedback(refreshed, onSyncNow));
    } catch (error) {
      logger.warn('[showCloudSyncStatusAlert] 手动云同步失败:', error);
      showErrorFeedback(buildCloudSyncFailedFeedback(error));
    }
  };

  try {
    const snapshot = await overviewService.getSnapshot();
    showErrorFeedback(
      buildCloudSyncStatusFeedback(snapshot, onSyncNow),
    );
  } catch (error) {
    logger.warn('[showCloudSyncStatusAlert] 获取云同步状态失败:', error);
    showErrorFeedback(buildCloudSyncFailedFeedback(error));
  }
}

export { buildCloudSyncStatusFeedback, formatCloudSyncStatusMessage };
