import { logger } from '@/src/utils/logger';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { initializeFileSystem } from '@/src/utils/fileSystem';
import { VoiceService } from '@/src/services/voiceService';
import { initDatabase } from '@/src/database/sqlite';
import {
  migrateFromAsyncStorage,
  migrateTagsToNormalized,
  migrateMediaMetadataColumns,
  migrateToMediaJson,
  migrateEntriesContentToFts,
  migrateSyncStatusColumn,
  migrateCloudSyncCoreColumns,
  migrateLocalReadyStateColumn,
} from '@/src/database/migration';
import { cleanupIncompleteLocalEntries } from '@/src/services/localEntryRecoveryService';
import { cleanupOrphanWorkspaces } from '@/src/services/workspaceCleanupService';
import { getCurrentDataScopeKeySync, buildDataScopeKey } from '@/src/services/workspaceService';
import { migrateAuthKeysToUserScoped, getRegisteredAccounts } from '@/src/services/accountRegistryService';
import { useAuthStore } from '@/src/store/authStore';
import { useSyncStore } from '@/src/store/syncStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { buildWorkspaceSessionSnapshot } from '@/src/services/workspaceSessionState';
import { createSyncBootstrapService } from '@/src/services/syncBootstrapService';
import { createCloudSyncService } from '@/src/services/cloudSyncService';
import { createUploadQueueRecoveryService } from '@/src/services/uploadQueueRecoveryService';
import { createCloudRecoveryFlowService } from '@/src/services/cloudRecoveryFlowService';
import { NotificationService } from '@/src/services/notificationService';

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

    await migrateAuthKeysToUserScoped();
    logger.log('✅ auth key 迁移检查完成');

    await useAuthStore.getState().loadAuth();
    logger.log('✅ 认证状态已加载');

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
      showErrorFeedback({
        title: '数据迁移警告',
        message: '部分数据可能未正确导入，但应用可以正常使用',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    }

    await migrateTagsToNormalized();
    logger.log('✅ Tags 规范化迁移完成');

    await migrateMediaMetadataColumns();
    logger.log('✅ 媒体元数据列迁移完成');

    await migrateToMediaJson();
    logger.log('✅ media_json 列迁移完成');

    await migrateEntriesContentToFts();
    logger.log('✅ entries_fts 回填完成');

    await migrateSyncStatusColumn();
    logger.log('✅ sync_status 列迁移完成');

    await migrateCloudSyncCoreColumns();
    logger.log('✅ cloud sync core 列迁移完成');

    await migrateLocalReadyStateColumn();
    logger.log('✅ local_ready_state 列迁移完成');

    await cleanupIncompleteLocalEntries().catch((cleanupError) => {
      logger.warn('⚠️ 启动时清理未完成本地 entry 失败:', cleanupError);
    });

    await useSyncStore.getState().load();
    await useSettingsStore.getState().loadSettings();

    // 同步通知调度状态
    const { notifications } = useSettingsStore.getState();
    if (notifications) {
      const isScheduled = await NotificationService.isReminderScheduled();
      if (!isScheduled) {
        await NotificationService.scheduleDailyReminder().catch((e: unknown) => {
          logger.warn('⚠️ 通知调度同步失败:', e);
        });
        logger.log('✅ 通知调度已同步');
      }
    }

    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    const session = buildWorkspaceSessionSnapshot(isAuthenticated);

    let shouldSyncCloud = false;

    if (session.canRunCloudSync) {
      try {
        logger.log('✅ 恢复账号 scope，执行本地优先同步初始化');
        const bootstrap = createSyncBootstrapService();
        const inspection = await bootstrap.inspectInitialState();
        const flow = bootstrap.buildInitialFlow(inspection);

        if (flow.type === 'restoring') {
          await bootstrap.runInitialFlow('cloud');
        }
        // backing-up / needs-decision / ready → 正常增量同步即可
        shouldSyncCloud = true;
      } catch (syncError) {
        logger.warn('⚠️ 启动时云同步失败:', syncError);
      }
    } else if (session.isAccountScopeActive) {
      logger.log('✅ 账号作用域已恢复，但云同步保护尚未开启，跳过启动时云同步');
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

    const registeredAccounts = await getRegisteredAccounts();
    const protectedScopes = registeredAccounts.map((a) => buildDataScopeKey(a.serverUrl, a.userId));
    // local scope 始终保护（未登录用户的本地数据）
    if (!protectedScopes.includes('local')) {
      protectedScopes.push('local');
    }
    const currentScope = getCurrentDataScopeKeySync();
    if (currentScope !== 'local' && !protectedScopes.includes(currentScope)) {
      logger.warn('[bootstrap] currentScope 不在注册账号列表中，追加保护:', currentScope);
      protectedScopes.push(currentScope);
    }
    await cleanupOrphanWorkspaces(protectedScopes).catch((e) => {
      logger.warn('孤儿 workspace 清理失败（不影响启动）:', e);
    });
  } catch (error) {
    logger.error('❌ 应用初始化失败:', error);
    deps.onInitializationFailed();
  }
}
