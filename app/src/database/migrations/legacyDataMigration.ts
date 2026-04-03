/**
 * 历史数据迁移：AsyncStorage → SQLite
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMMKV } from 'react-native-mmkv';
import * as DB from '../operations';
import { Entry } from '@/src/types/entry';
import { getDatabase } from '../sqlite';
import { logger } from '@/src/utils/logger';

export const migrationStore = createMMKV({ id: 'migration' });

export const checkMigrationStatus = async (): Promise<boolean> => {
  try {
    return migrationStore.getString('sqlite_migration_completed') === 'true';
  } catch (error) {
    logger.error('Failed to check migration status:', error);
    return false;
  }
};

const markMigrationCompleted = async (): Promise<void> => {
  migrationStore.set('sqlite_migration_completed', 'true');
  migrationStore.set('sqlite_migration_date', new Date().toISOString());
};

export const migrateFromAsyncStorage = async (): Promise<{
  success: boolean;
  migratedCount: number;
  error?: string;
}> => {
  try {
    logger.log('🔄 开始数据迁移...');

    const alreadyMigrated = await checkMigrationStatus();
    if (alreadyMigrated) {
      logger.log('✅ 数据已经迁移过，跳过迁移');
      return { success: true, migratedCount: 0 };
    }

    const entriesJson = await AsyncStorage.getItem('entries');
    if (!entriesJson) {
      logger.log('📭 没有需要迁移的数据');
      await markMigrationCompleted();
      return { success: true, migratedCount: 0 };
    }

    const oldEntries: Entry[] = JSON.parse(entriesJson);
    logger.log(`📦 找到 ${oldEntries.length} 条记录需要迁移`);

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
    await AsyncStorage.setItem('entries_backup', entriesJson);
    logger.log('💾 已备份原始数据到 entries_backup');
    await markMigrationCompleted();
    logger.log('🎉 数据迁移完成！');

    return { success: true, migratedCount };
  } catch (error) {
    logger.error('❌ 数据迁移失败:', error);
    return {
      success: false,
      migratedCount: 0,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
};

export const rollbackMigration = async (): Promise<boolean> => {
  try {
    logger.log('🔄 开始回滚迁移...');

    const backup = await AsyncStorage.getItem('entries_backup');
    if (!backup) {
      logger.error('❌ 没有找到备份数据');
      return false;
    }

    await AsyncStorage.setItem('entries', backup);
    migrationStore.remove('sqlite_migration_completed');
    migrationStore.remove('sqlite_migration_date');
    await DB.clearAllEntries();

    logger.log('✅ 迁移已回滚');
    return true;
  } catch (error) {
    logger.error('❌ 回滚失败:', error);
    return false;
  }
};

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
