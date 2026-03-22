/**
 * 数据迁移工具
 * 从 AsyncStorage 迁移到 SQLite
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMMKV } from 'react-native-mmkv';
import * as DB from './operations';
import { Entry } from '@/src/types/entry';
import { getDatabase } from './sqlite';
import { logger } from '@/src/utils/logger';
import { invalidateColumnCache } from './operations';

const migrationStore = createMMKV({ id: 'migration' });

/**
 * 检查是否已经迁移过
 */
export const checkMigrationStatus = async (): Promise<boolean> => {
  try {
    return migrationStore.getString('sqlite_migration_completed') === 'true';
  } catch (error) {
    logger.error('Failed to check migration status:', error);
    return false;
  }
};

/**
 * 标记迁移完成
 */
const markMigrationCompleted = async (): Promise<void> => {
  migrationStore.set('sqlite_migration_completed', 'true');
  migrationStore.set('sqlite_migration_date', new Date().toISOString());
};

/**
 * 从 AsyncStorage 迁移数据到 SQLite
 */
export const migrateFromAsyncStorage = async (): Promise<{
  success: boolean;
  migratedCount: number;
  error?: string;
}> => {
  try {
    logger.log('🔄 开始数据迁移...');

    // 1. 检查是否已经迁移过
    const alreadyMigrated = await checkMigrationStatus();
    if (alreadyMigrated) {
      logger.log('✅ 数据已经迁移过，跳过迁移');
      return { success: true, migratedCount: 0 };
    }

    // 2. 读取旧数据
    const entriesJson = await AsyncStorage.getItem('entries');
    if (!entriesJson) {
      logger.log('📭 没有需要迁移的数据');
      await markMigrationCompleted();
      return { success: true, migratedCount: 0 };
    }

    const oldEntries: Entry[] = JSON.parse(entriesJson);
    logger.log(`📦 找到 ${oldEntries.length} 条记录需要迁移`);

    // 3. 批量写入数据库（事务保证原子性，保留原始 ID 和 timestamp）
    const db = getDatabase();
    let migratedCount = 0;
    await db.withTransactionAsync(async () => {
      for (const oldEntry of oldEntries) {
        try {
          await db.runAsync(
            `INSERT INTO entries (
              id, type, content, timestamp, tags,
              media_uri, media_type, media_duration,
              recording_status, recording_duration
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              oldEntry.id,
              oldEntry.type,
              oldEntry.content,
              oldEntry.timestamp,
              oldEntry.tags ? JSON.stringify(oldEntry.tags) : null,
              oldEntry.media?.[0]?.uri || null,
              oldEntry.media?.[0]?.mimeType || null,
              oldEntry.media?.[0]?.duration || null,
              oldEntry.recordingStatus || null,
              oldEntry.recordingDuration || null,
            ]
          );
          migratedCount++;
        } catch (error) {
          logger.error(`Failed to migrate entry ${oldEntry.id}:`, error);
        }
      }
    });

    logger.log(`✅ 成功迁移 ${migratedCount}/${oldEntries.length} 条记录`);

    // 4. 备份旧数据
    await AsyncStorage.setItem('entries_backup', entriesJson);
    logger.log('💾 已备份原始数据到 entries_backup');

    // 5. 标记迁移完成
    await markMigrationCompleted();

    // 6. 可选：清除旧数据（暂时保留，以防需要回滚）
    // await AsyncStorage.removeItem('entries');

    logger.log('🎉 数据迁移完成！');

    return {
      success: true,
      migratedCount,
    };
  } catch (error) {
    logger.error('❌ 数据迁移失败:', error);
    return {
      success: false,
      migratedCount: 0,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
};

/**
 * 回滚迁移（从备份恢复到 AsyncStorage）
 */
export const rollbackMigration = async (): Promise<boolean> => {
  try {
    logger.log('🔄 开始回滚迁移...');

    // 1. 读取备份数据
    const backup = await AsyncStorage.getItem('entries_backup');
    if (!backup) {
      logger.error('❌ 没有找到备份数据');
      return false;
    }

    // 2. 恢复到 AsyncStorage
    await AsyncStorage.setItem('entries', backup);

    // 3. 清除迁移标记（MMKV）
    migrationStore.remove('sqlite_migration_completed');
    migrationStore.remove('sqlite_migration_date');

    // 4. 清空数据库
    await DB.clearAllEntries();

    logger.log('✅ 迁移已回滚');
    return true;
  } catch (error) {
    logger.error('❌ 回滚失败:', error);
    return false;
  }
};

/**
 * 获取迁移信息
 */
export const getMigrationInfo = async (): Promise<{
  completed: boolean;
  date?: string;
  backupExists: boolean;
}> => {
  const completed = await checkMigrationStatus();
  const date = migrationStore.getString('sqlite_migration_date');
  const backup = await AsyncStorage.getItem('entries_backup');

  return {
    completed,
    date: date || undefined,
    backupExists: !!backup,
  };
};

/**
 * 将 entries.tags JSON 列迁移到规范化的 tags / entry_tags 表
 * 幂等：已迁移则跳过
 */
export const migrateTagsToNormalized = async (): Promise<void> => {
  if (migrationStore.getString('tags_normalized') === 'true') return;

  const db = getDatabase();
  try {
    const rows = await db.getAllAsync<{ id: string; tags: string }>(
      `SELECT id, tags FROM entries WHERE tags IS NOT NULL AND tags != '[]'`
    );

    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        let tagNames: string[] = [];
        try { tagNames = JSON.parse(row.tags); } catch { continue; }

        for (const name of tagNames) {
          // 插入 tag（已存在则忽略）
          await db.runAsync(
            `INSERT OR IGNORE INTO tags (name) VALUES (?)`,
            [name]
          );
          // 建立关联
          await db.runAsync(
            `INSERT OR IGNORE INTO entry_tags (entry_id, tag_id)
             SELECT ?, id FROM tags WHERE name = ?`,
            [row.id, name]
          );
        }
      }
    });

    migrationStore.set('tags_normalized', 'true');
    logger.log('✅ Tags 规范化迁移完成，共处理', rows.length, '条记录');
  } catch (error) {
    logger.error('❌ Tags 规范化迁移失败:', error);
  }
};

/**
 * 迁移数据库表结构，添加新的媒体元数据列
 * 幂等：已存在则跳过
 */
export const migrateMediaMetadataColumns = async (): Promise<void> => {
  if (migrationStore.getString('media_metadata_columns_added') === 'true') return;

  const db = getDatabase();
  try {
    // 检查 media_thumbnail 列是否存在
    const tableInfo = await db.getAllAsync<{ name: string }>(
      `PRAGMA table_info(entries)`
    );
    const columnNames = tableInfo.map(col => col.name);

    // 添加 media_thumbnail 列（如果不存在）
    if (!columnNames.includes('media_thumbnail')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN media_thumbnail TEXT`);
      logger.log('✅ 添加 media_thumbnail 列');
    }

    // 添加 media_metadata 列（如果不存在）
    if (!columnNames.includes('media_metadata')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN media_metadata TEXT`);
      logger.log('✅ 添加 media_metadata 列');
    }

    migrationStore.set('media_metadata_columns_added', 'true');
    logger.log('✅ 媒体元数据列迁移完成');
  } catch (error) {
    logger.error('❌ 媒体元数据列迁移失败:', error);
  }
};

/**
 * Add media_json column and migrate existing media_uri rows to JSON array
 * Idempotent: skips if already migrated
 */
export const migrateToMediaJson = async (): Promise<void> => {
  if (migrationStore.getString('media_json_migrated') === 'true') return;

  const db = getDatabase();
  try {
    // Add column if not exists
    const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(entries)`);
    if (!tableInfo.some(col => col.name === 'media_json')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN media_json TEXT`);
      logger.log('✅ 添加 media_json 列');
    }

    // Migrate existing media_uri rows to JSON array
    const rows = await db.getAllAsync<{
      id: string;
      media_uri: string | null;
      media_type: string | null;
      media_duration: number | null;
      media_thumbnail: string | null;
      media_metadata: string | null;
    }>(`SELECT id, media_uri, media_type, media_duration, media_thumbnail, media_metadata
        FROM entries WHERE media_uri IS NOT NULL AND media_json IS NULL`);

    for (const row of rows) {
      let metadata = undefined;
      if (row.media_metadata) {
        try { metadata = JSON.parse(row.media_metadata); } catch { /* ignore */ }
      }
      const mediaItem = {
        uri: row.media_uri!,
        mimeType: row.media_type ?? 'image/jpeg',
        size: 0,
        duration: row.media_duration ?? undefined,
        thumbnail: row.media_thumbnail ?? undefined,
        metadata,
      };
      await db.runAsync(
        `UPDATE entries SET media_json = ? WHERE id = ?`,
        [JSON.stringify([mediaItem]), row.id]
      );
    }

    // Invalidate column cache so operations.ts picks up the new column
    invalidateColumnCache();

    migrationStore.set('media_json_migrated', 'true');
    logger.log('✅ media_json 迁移完成，共处理', rows.length, '条记录');
  } catch (error) {
    logger.error('❌ media_json 迁移失败:', error);
  }
};

/**
 * 为 entries 增加 sync_status 列
 * 幂等：已存在则跳过
 */
export const migrateSyncStatusColumn = async (): Promise<void> => {
  const db = getDatabase();
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(entries)`);
    const columnNames = new Set(tableInfo.map(col => col.name));
    const alreadyMarked = migrationStore.getString('sync_status_column_added') === 'true';
    const hasAllRequiredColumns =
      columnNames.has('sync_status') &&
      columnNames.has('sync_op') &&
      columnNames.has('conflicted_copy_of');

    if (alreadyMarked && hasAllRequiredColumns) return;

    if (!columnNames.has('sync_status')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN sync_status TEXT DEFAULT 'synced'`);
      logger.log('✅ 添加 sync_status 列');
    }
    if (!columnNames.has('sync_op')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN sync_op TEXT DEFAULT 'update'`);
      logger.log('✅ 添加 sync_op 列');
    }
    if (!columnNames.has('conflicted_copy_of')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN conflicted_copy_of TEXT`);
      logger.log('✅ 添加 conflicted_copy_of 列');
    }

    await db.runAsync(`UPDATE entries SET sync_status = 'synced' WHERE sync_status IS NULL`);
    await db.runAsync(`UPDATE entries SET sync_op = 'update' WHERE sync_op IS NULL`);
    invalidateColumnCache();
    migrationStore.set('sync_status_column_added', 'true');
    logger.log('✅ sync_status / sync_op / conflicted_copy_of 列迁移完成');
  } catch (error) {
    logger.error('❌ sync_status 列迁移失败:', error);
  }
};

/**
 * 为前端本地优先同步内核补齐基础列
 * 幂等：已存在则跳过
 */
export const migrateCloudSyncCoreColumns = async (): Promise<void> => {
  const db = getDatabase();
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(entries)`);
    const columnNames = new Set(tableInfo.map(col => col.name));
    const alreadyMarked = migrationStore.getString('cloud_sync_core_columns_added') === 'true';
    const hasAllRequiredColumns =
      columnNames.has('base_updated_at') &&
      columnNames.has('user_id') &&
      columnNames.has('deleted');

    if (alreadyMarked && hasAllRequiredColumns) return;

    if (!columnNames.has('base_updated_at')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN base_updated_at INTEGER`);
      logger.log('✅ 添加 base_updated_at 列');
    }
    if (!columnNames.has('user_id')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN user_id TEXT`);
      logger.log('✅ 添加 user_id 列');
    }
    if (!columnNames.has('deleted')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN deleted INTEGER DEFAULT 0`);
      logger.log('✅ 添加 deleted 列');
    }

    await db.runAsync(`UPDATE entries SET deleted = 0 WHERE deleted IS NULL`);
    invalidateColumnCache();
    migrationStore.set('cloud_sync_core_columns_added', 'true');
    logger.log('✅ cloud sync core 列迁移完成');
  } catch (error) {
    logger.error('❌ cloud sync core 列迁移失败:', error);
  }
};
