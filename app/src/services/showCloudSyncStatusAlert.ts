import { createCloudSyncService } from '@/src/services/cloudSyncService';
import { logger } from '@/src/utils/logger';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { buildCloudSyncFailedFeedback } from '@/src/services/errorFeedbackPresets';
import type { ErrorFeedbackRequest } from '@/src/store/errorFeedbackStore';

function formatCloudSyncStatusMessage(status: Awaited<ReturnType<ReturnType<typeof createCloudSyncService>['getStatus']>>): string {
  const last = status.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString()
    : '从未同步';

  const lines = [
    `上次同步：${last}`,
    `待同步条数：${status.pendingEntries}`,
    `待上传媒体：${status.pendingUploads}`,
    `上传中：${status.uploadingEntries}`,
    `失败条数：${status.failedEntries}`,
    `冲突副本：${status.conflictCopies}`,
  ];
  if (status.lastSyncError) {
    lines.push(`最近错误：${status.lastSyncError}`);
  }

  return lines.join('\n');
}

function buildCloudSyncStatusFeedback(
  status: Awaited<ReturnType<ReturnType<typeof createCloudSyncService>['getStatus']>>,
  onSyncNow: () => Promise<void>,
  title = '云同步状态',
): ErrorFeedbackRequest {
  const last = status.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString()
    : '从未同步';
  const hasFailure = !!status.lastSyncError || status.failedEntries > 0;

  return {
    title,
    tone: hasFailure ? 'error' : 'accent',
    details: [
      { label: '上次同步', value: last },
      { label: '待同步条数', value: String(status.pendingEntries) },
      { label: '待上传媒体', value: String(status.pendingUploads) },
      { label: '上传中', value: String(status.uploadingEntries) },
      { label: '失败条数', value: String(status.failedEntries) },
      { label: '冲突副本', value: String(status.conflictCopies) },
      ...(status.lastSyncError
        ? [{ label: '最近错误', value: status.lastSyncError }]
        : []),
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
  try {
    const cloudSync = createCloudSyncService();
    const status = await cloudSync.getStatus();
    showErrorFeedback(
      buildCloudSyncStatusFeedback(status, async () => {
        try {
          await cloudSync.syncNow();
          const refreshed = await cloudSync.getStatus();
          showErrorFeedback(
            buildCloudSyncStatusFeedback(refreshed, async () => {
              await cloudSync.syncNow();
            }, '云同步完成'),
          );
        } catch (error) {
          logger.warn('[showCloudSyncStatusAlert] 手动云同步失败:', error);
          showErrorFeedback(buildCloudSyncFailedFeedback(error));
        }
      }),
    );
  } catch (error) {
    logger.warn('[showCloudSyncStatusAlert] 获取云同步状态失败:', error);
    showErrorFeedback(buildCloudSyncFailedFeedback(error));
  }
}

export { buildCloudSyncStatusFeedback, formatCloudSyncStatusMessage };
