/**
 * 数据迁移工具
 * 从 AsyncStorage 迁移到 SQLite
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DB from './operations';
import { Entry } from '@/src/types/entry';
import { getDatabase } from './sqlite';

/**
 * 检查是否已经迁移过
 */
export const checkMigrationStatus = async (): Promise<boolean> => {
  try {
    const status = await AsyncStorage.getItem('sqlite_migration_completed');
    return status === 'true';
  } catch (error) {
    console.error('Failed to check migration status:', error);
    return false;
  }
};

/**
 * 标记迁移完成
 */
const markMigrationCompleted = async (): Promise<void> => {
  await AsyncStorage.setItem('sqlite_migration_completed', 'true');
  await AsyncStorage.setItem('sqlite_migration_date', new Date().toISOString());
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
    console.log('🔄 开始数据迁移...');

    // 1. 检查是否已经迁移过
    const alreadyMigrated = await checkMigrationStatus();
    if (alreadyMigrated) {
      console.log('✅ 数据已经迁移过，跳过迁移');
      return { success: true, migratedCount: 0 };
    }

    // 2. 读取旧数据
    const entriesJson = await AsyncStorage.getItem('entries');
    if (!entriesJson) {
      console.log('📭 没有需要迁移的数据');
      await markMigrationCompleted();
      return { success: true, migratedCount: 0 };
    }

    const oldEntries: Entry[] = JSON.parse(entriesJson);
    console.log(`📦 找到 ${oldEntries.length} 条记录需要迁移`);

    // 3. 批量写入数据库（保留原始 ID 和 timestamp）
    const db = getDatabase();
    let migratedCount = 0;
    for (const oldEntry of oldEntries) {
      try {
        // 直接使用 SQL INSERT 保留原始 ID 和 timestamp
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
        console.error(`Failed to migrate entry ${oldEntry.id}:`, error);
      }
    }

    console.log(`✅ 成功迁移 ${migratedCount}/${oldEntries.length} 条记录`);

    // 4. 备份旧数据
    await AsyncStorage.setItem('entries_backup', entriesJson);
    console.log('💾 已备份原始数据到 entries_backup');

    // 5. 标记迁移完成
    await markMigrationCompleted();

    // 6. 可选：清除旧数据（暂时保留，以防需要回滚）
    // await AsyncStorage.removeItem('entries');

    console.log('🎉 数据迁移完成！');

    return {
      success: true,
      migratedCount,
    };
  } catch (error) {
    console.error('❌ 数据迁移失败:', error);
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
    console.log('🔄 开始回滚迁移...');

    // 1. 读取备份数据
    const backup = await AsyncStorage.getItem('entries_backup');
    if (!backup) {
      console.error('❌ 没有找到备份数据');
      return false;
    }

    // 2. 恢复到 AsyncStorage
    await AsyncStorage.setItem('entries', backup);

    // 3. 清除迁移标记
    await AsyncStorage.removeItem('sqlite_migration_completed');
    await AsyncStorage.removeItem('sqlite_migration_date');

    // 4. 清空数据库
    await DB.clearAllEntries();

    console.log('✅ 迁移已回滚');
    return true;
  } catch (error) {
    console.error('❌ 回滚失败:', error);
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
  const date = await AsyncStorage.getItem('sqlite_migration_date');
  const backup = await AsyncStorage.getItem('entries_backup');

  return {
    completed,
    date: date || undefined,
    backupExists: !!backup,
  };
};
