/**
 * SQLite 数据库初始化和管理
 * 使用 Expo SQLite
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'MemoryCapsule.db';

/**
 * 打开数据库连接
 */
export const openDatabase = () => {
  return SQLite.openDatabaseSync(DB_NAME);
};

/**
 * 初始化数据库表
 */
export const initDatabase = async () => {
  try {
    const db = openDatabase();

    // 创建 entries 表
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        tags TEXT,
        media_uri TEXT,
        media_type TEXT,
        media_duration INTEGER,
        recording_status TEXT,
        recording_duration INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );
    `);

    // 创建索引以提高查询性能
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_entries_timestamp ON entries(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(type);
      CREATE INDEX IF NOT EXISTS idx_entries_recording_status ON entries(recording_status);
    `);

    console.log('✅ SQLite 数据库初始化成功');
    return true;
  } catch (error) {
    console.error('❌ SQLite 数据库初始化失败:', error);
    return false;
  }
};

/**
 * 获取数据库实例
 */
export const getDatabase = () => {
  return openDatabase();
};
