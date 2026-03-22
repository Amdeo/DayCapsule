import { Alert } from 'react-native';
import { createCloudSyncService } from '@/src/services/cloudSyncService';
import { logger } from '@/src/utils/logger';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { buildCloudSyncFailedFeedback } from '@/src/services/errorFeedbackPresets';

function formatCloudSyncStatusMessage(status: Awaited<ReturnType<ReturnType<typeof createCloudSyncService>['getStatus']>>): string {
  const last = status.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString()
    : '从未同步';

  return `上次同步：${last}\n待同步条数：${status.pendingEntries}\n失败条数：${status.failedEntries}\n冲突副本：${status.conflictCopies}`;
}

export async function showCloudSyncStatusAlert(): Promise<void> {
  try {
    const cloudSync = createCloudSyncService();
    const status = await cloudSync.getStatus();

    Alert.alert(
      '云同步状态',
      formatCloudSyncStatusMessage(status),
      [
        { text: '关闭', style: 'cancel' },
        {
          text: '立即同步',
          onPress: async () => {
            try {
              await cloudSync.syncNow();
              const refreshed = await cloudSync.getStatus();
              Alert.alert(
                '云同步完成',
                formatCloudSyncStatusMessage(refreshed),
              );
            } catch (error) {
              logger.warn('[showCloudSyncStatusAlert] 手动云同步失败:', error);
              showErrorFeedback(buildCloudSyncFailedFeedback(error));
            }
          },
        },
      ],
    );
  } catch (error) {
    logger.warn('[showCloudSyncStatusAlert] 获取云同步状态失败:', error);
    showErrorFeedback(buildCloudSyncFailedFeedback(error));
  }
}

export { formatCloudSyncStatusMessage };
