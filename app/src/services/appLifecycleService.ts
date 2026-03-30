import type { AppStateStatus } from 'react-native';
import * as Network from 'expo-network';
import { BackupService } from '@/src/services/backupService';
import { createCloudSyncService } from '@/src/services/cloudSyncService';
import { createUploadQueueRecoveryService } from '@/src/services/uploadQueueRecoveryService';
import { useEntryStore } from '@/src/store/entryStore';
import { useAuthStore } from '@/src/store/authStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { logger } from '@/src/utils/logger';

export interface CloudRecoveryDependencies {
  refreshCloudSyncIndicator: (label: string) => Promise<void>;
  wasNetworkReachableRef?: { current: boolean | null };
}

async function initializeNetworkReachability(reachabilityRef: {
  current: boolean | null;
}): Promise<void> {
  try {
    const state = await Network.getNetworkStateAsync();
    reachabilityRef.current = state.isConnected === true && state.isInternetReachable !== false;
  } catch (error) {
    logger.warn('⚠️ 初始化网络状态监听失败:', error);
  }
}

export function createCloudRecoveryRunner(
  deps: CloudRecoveryDependencies
): (label: string) => Promise<void> {
  let pendingRecovery: Promise<void> | null = null;

  if (deps.wasNetworkReachableRef) {
    void initializeNetworkReachability(deps.wasNetworkReachableRef);
  }

  return async (label: string) => {
    if (pendingRecovery) {
      return pendingRecovery;
    }

    pendingRecovery = (async () => {
      if (useAuthStore.getState().isAuthenticated && useSettingsStore.getState().cloudMode === true) {
        await createCloudSyncService().syncNow().catch((syncError) =>
          logger.warn(`⚠️ ${label}entry 云同步失败:`, syncError)
        );
      }

      await createUploadQueueRecoveryService().flushPendingUploads().catch((queueError) =>
        logger.warn(`⚠️ ${label}补传待上传内容失败:`, queueError)
      );
      await deps.refreshCloudSyncIndicator(`${label}后`);
    })().finally(() => {
      pendingRecovery = null;
    });

    return pendingRecovery;
  };
}

export async function handleAppStateChange(
  previousState: AppStateStatus,
  nextState: AppStateStatus,
  runRecovery: (label: string) => Promise<void>
): Promise<void> {
  if (previousState !== 'background' && nextState === 'background') {
    try {
      const shouldBackup = await BackupService.shouldBackup();
      if (shouldBackup) {
        const entries = useEntryStore.getState().entries;
        await BackupService.createBackup(entries).catch((error) =>
          logger.error('自动备份失败:', error)
        );
      }
    } catch (error) {
      logger.error('❌ 自动备份检查失败:', error);
    }
    return;
  }

  if (previousState !== 'active' && nextState === 'active') {
    await runRecovery('回到前台时').catch((error) => {
      logger.error('❌ 回到前台恢复失败:', error);
    });
  }
}
