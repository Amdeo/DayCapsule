import { createCloudSyncService } from '@/src/services/cloudSyncService';
import {
  createCloudSyncOverviewService,
  type SyncOverviewSnapshot,
} from '@/src/services/cloudSyncOverviewService';
import { logger } from '@/src/utils/logger';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { buildCloudSyncFailedFeedback } from '@/src/services/errorFeedbackPresets';
import type { ErrorFeedbackRequest } from '@/src/store/errorFeedbackStore';
import { formatFileSize } from '@/src/utils/fileSystem';

function formatCloudSyncStatusMessage(snapshot: SyncOverviewSnapshot): string {
  const last = snapshot.lastSyncAt
    ? new Date(snapshot.lastSyncAt).toLocaleString()
    : '从未同步';

  const lines = [
    '同步状态',
    `上次同步：${last}`,
    `待同步条数：${snapshot.pendingEntries}`,
    `待上传媒体：${snapshot.pendingUploads}`,
    `上传中：${snapshot.uploadingEntries}`,
    `失败条数：${snapshot.failedEntries}`,
    `冲突副本：${snapshot.conflictCopies}`,
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
  title = '云同步状态',
): ErrorFeedbackRequest {
  const last = snapshot.lastSyncAt
    ? new Date(snapshot.lastSyncAt).toLocaleString()
    : '从未同步';
  const hasFailure = !!snapshot.lastSyncError || snapshot.failedEntries > 0;
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

  return {
    title,
    tone: hasFailure ? 'error' : 'accent',
    details: [
      { label: '同步状态', value: '---' },
      { label: '上次同步', value: last },
      { label: '待同步条数', value: String(snapshot.pendingEntries) },
      { label: '待上传媒体', value: String(snapshot.pendingUploads) },
      { label: '上传中', value: String(snapshot.uploadingEntries) },
      { label: '失败条数', value: String(snapshot.failedEntries) },
      { label: '冲突副本', value: String(snapshot.conflictCopies) },
      ...(snapshot.lastSyncError
        ? [{ label: '最近错误', value: snapshot.lastSyncError }]
        : []),
      { label: '本地数据', value: '---' },
      { label: '本地记录总数', value: String(snapshot.local.entryCount) },
      { label: '本地图片数', value: String(snapshot.local.photoCount) },
      { label: '本地音频数', value: String(snapshot.local.voiceCount) },
      { label: '本地媒体总大小', value: formatFileSize(snapshot.local.mediaBytes) },
      ...cloudDetails,
    ],
    actions: [
      { label: '关闭', role: 'secondary' },
      {
        label: '立即同步',
        role: 'primary',
        onPress: onSyncNow,
      },
    ],
  };
}

export async function showCloudSyncStatusAlert(): Promise<void> {
  const cloudSync = createCloudSyncService();
  const overviewService = createCloudSyncOverviewService();

  const onSyncNow = async (): Promise<void> => {
    try {
      await cloudSync.syncNow();
      const refreshed = await overviewService.getSnapshot();
      showErrorFeedback(
        buildCloudSyncStatusFeedback(refreshed, onSyncNow, '云同步完成'),
      );
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
