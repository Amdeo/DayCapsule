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
              oldEntry.media?.uri || null,
              oldEntry.media?.mimeType || null,
              oldEntry.media?.duration || null,
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
