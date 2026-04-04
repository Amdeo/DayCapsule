import { initDatabaseForScope, openDatabaseForScope } from '@/src/database/sqlite';
import {
  migrateCloudSyncCoreColumns,
  migrateEntriesContentToFts,
  migrateLocalReadyStateColumn,
  migrateSyncStatusColumn,
  migrateToMediaJson,
} from '@/src/database/migration';
import { invalidateColumnCache } from '@/src/database/operations';
import { buildDataScopeKey } from '@/src/services/workspaceService';
import { logger } from '@/src/utils/logger';

export interface ScopeRuntimeTarget {
  scopeKey?: string;
  serverUrl?: string;
  userId?: string;
}

export interface ScopeRuntimePreparationResult {
  prepared: boolean;
  targetScopeKey: string;
  failureReason?: string;
  logLabel: string;
}

function resolveScopeKey(target: ScopeRuntimeTarget): string {
  if (target.scopeKey) {
    return target.scopeKey;
  }
  if (target.serverUrl && target.userId) {
    return buildDataScopeKey(target.serverUrl, target.userId);
  }
  throw new Error('prepareScopeRuntime requires scopeKey or serverUrl + userId');
}

export async function prepareScopeRuntime(
  target: ScopeRuntimeTarget
): Promise<ScopeRuntimePreparationResult> {
  const targetScopeKey = resolveScopeKey(target);

  try {
    invalidateColumnCache(targetScopeKey);

    const databaseReady = await initDatabaseForScope(targetScopeKey);
    if (!databaseReady) {
      return {
        prepared: false,
        targetScopeKey,
        failureReason: '初始化目标 scope 数据库失败',
        logLabel: 'scope-runtime-init-failed',
      };
    }

    const db = openDatabaseForScope(targetScopeKey);
    await migrateToMediaJson(db);
    await migrateEntriesContentToFts(db);
    await migrateLocalReadyStateColumn(db);
    await migrateSyncStatusColumn(db);
    await migrateCloudSyncCoreColumns(db);
    invalidateColumnCache(targetScopeKey);

    return {
      prepared: true,
      targetScopeKey,
      logLabel: 'scope-runtime-ready',
    };
  } catch (error) {
    logger.error('[scopeRuntimeService] Failed to prepare scope runtime:', error);
    return {
      prepared: false,
      targetScopeKey,
      failureReason: error instanceof Error ? error.message : String(error),
      logLabel: 'scope-runtime-exception',
    };
  }
}
