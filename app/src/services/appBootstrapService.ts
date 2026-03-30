import { logger } from '@/src/utils/logger';
import { Alert } from 'react-native';
import { initializeFileSystem } from '@/src/utils/fileSystem';
import { VoiceService } from '@/src/services/voiceService';
import { initDatabase } from '@/src/database/sqlite';
import {
  migrateFromAsyncStorage,
  migrateTagsToNormalized,
  migrateMediaMetadataColumns,
  migrateToMediaJson,
  migrateSyncStatusColumn,
  migrateCloudSyncCoreColumns,
  migrateLocalReadyStateColumn,
} from '@/src/database/migration';
import { cleanupIncompleteLocalEntries } from '@/src/services/localEntryRecoveryService';
import { useAuthStore } from '@/src/store/authStore';
import { useSyncStore } from '@/src/store/syncStore';
import { Storage } from '@/src/utils/storage';
import { createSyncBootstrapService } from '@/src/services/syncBootstrapService';
import { createCloudSyncService } from '@/src/services/cloudSyncService';
import { createUploadQueueRecoveryService } from '@/src/services/uploadQueueRecoveryService';
import { createCloudRecoveryFlowService } from '@/src/services/cloudRecoveryFlowService';

export interface AppBootstrapDependencies {
  refreshCloudSyncIndicator: (label: string) => Promise<void>;
  onInitializationFailed: () => void;
}

export async function runAppBootstrap(
  deps: AppBootstrapDependencies
): Promise<void> {
  try {
    await Promise.all([
      initializeFileSystem().then(() => logger.log('✅ 文件系统初始化成功')),
      VoiceService.initializeAudio().then(() => logger.log('✅ 音频系统初始化成功')),
    ]);

    const dbSuccess = await initDatabase();
    if (!dbSuccess) {
      throw new Error('数据库初始化失败');
    }
    logger.log('✅ SQLite 数据库初始化成功');

    const migrationResult = await migrateFromAsyncStorage();
    if (migrationResult.success) {
      logger.log(`✅ 数据迁移完成，迁移了 ${migrationResult.migratedCount} 条记录`);
    } else {
      logger.warn('⚠️ 数据迁移警告:', migrationResult.error);
      Alert.alert('数据迁移警告', '部分数据可能未正确导入，但应用可以正常使用');
    }

    await migrateTagsToNormalized();
    logger.log('✅ Tags 规范化迁移完成');

    await migrateMediaMetadataColumns();
    logger.log('✅ 媒体元数据列迁移完成');

    await migrateToMediaJson();
    logger.log('✅ media_json 列迁移完成');

    await migrateSyncStatusColumn();
    logger.log('✅ sync_status 列迁移完成');

    await migrateCloudSyncCoreColumns();
    logger.log('✅ cloud sync core 列迁移完成');

    await migrateLocalReadyStateColumn();
    logger.log('✅ local_ready_state 列迁移完成');

    await cleanupIncompleteLocalEntries().catch((cleanupError) => {
      logger.warn('⚠️ 启动时清理未完成本地 entry 失败:', cleanupError);
    });

    await useAuthStore.getState().loadAuth();
    await useSyncStore.getState().load();

    const cloudModeRaw = await Storage.getString('settings:cloudMode');
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (cloudModeRaw === 'switching') {
      logger.warn('⚠️ 检测到上次云端模式切换未完成，重置为离线模式');
      await Storage.setString('settings:cloudMode', 'false');
      Alert.alert('提示', '上次云端模式切换未完成，已恢复为离线模式。您可以在设置中重新切换。');
    }

    let shouldSyncCloud = false;

    if (cloudModeRaw === 'true' && isAuthenticated) {
      try {
        logger.log('✅ 恢复云端模式，执行本地优先同步初始化');
        const bootstrap = createSyncBootstrapService();
        const inspection = await bootstrap.inspectInitialState();
        const flow = bootstrap.buildInitialFlow(inspection);

        if (flow.type === 'restoring') {
          await bootstrap.runInitialFlow('cloud');
        } else if (flow.type === 'backing-up') {
          await bootstrap.runInitialFlow('local');
        } else if (flow.type === 'needs-decision') {
          await useSyncStore.getState().setInitialSyncState('needs-decision');
        }
        if (flow.type !== 'needs-decision') {
          shouldSyncCloud = true;
        }
      } catch (syncError) {
        logger.warn('⚠️ 启动时云同步失败:', syncError);
      }
    }

    const recoveryResult = await createCloudRecoveryFlowService({
      syncNow: async () => {
        if (!shouldSyncCloud) {
          return;
        }

        await createCloudSyncService().syncNow();
      },
      flushPendingUploads: () => createUploadQueueRecoveryService().flushPendingUploads(),
      refreshCloudSyncIndicator: () => deps.refreshCloudSyncIndicator('启动后'),
    }).run();

    if (recoveryResult.syncError) {
      logger.warn('⚠️ 启动时云同步失败:', recoveryResult.syncError);
    }

    const queueRecoveryResult = recoveryResult.queueRecovery;
    if (queueRecoveryResult.voiceError) {
      logger.warn('⚠️ 启动时补传待上传语音失败:', queueRecoveryResult.voiceError);
    }
    if (queueRecoveryResult.photoError) {
      logger.warn('⚠️ 启动时补传待上传照片失败:', queueRecoveryResult.photoError);
    }

    if (recoveryResult.refreshError) {
      throw recoveryResult.refreshError;
    }
  } catch (error) {
    logger.error('❌ 应用初始化失败:', error);
    deps.onInitializationFailed();
  }
}
