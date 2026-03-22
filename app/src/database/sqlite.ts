/**
 * SQLite 数据库初始化和管理
 * 使用 Expo SQLite
 */

import * as SQLite from 'expo-sqlite';
import { logger } from '@/src/utils/logger';

const DB_NAME = 'MemoryCapsule.db';

// 单例连接，避免每次调用重复打开
let _db: SQLite.SQLiteDatabase | null = null;

/**
 * 打开数据库连接（单例）
 */
export const openDatabase = (): SQLite.SQLiteDatabase => {
  if (!_db) {
    _db = SQLite.openDatabaseSync(DB_NAME);
  }
  return _db;
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
        media_thumbnail TEXT,
        media_metadata TEXT,
        recording_status TEXT,
        recording_duration INTEGER,
        sync_status TEXT DEFAULT 'synced',
        sync_op TEXT DEFAULT 'update',
        conflicted_copy_of TEXT,
        base_updated_at INTEGER,
        user_id TEXT,
        deleted INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );
    `);

    // 规范化 tags 表
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tags (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS entry_tags (
        entry_id TEXT    NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        tag_id   INTEGER NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
        PRIMARY KEY (entry_id, tag_id)
      );
    `);

    // 创建索引以提高查询性能
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_entries_timestamp ON entries(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(type);
      CREATE INDEX IF NOT EXISTS idx_entries_recording_status ON entries(recording_status);
      CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_entry_tags_entry ON entry_tags(entry_id);
    `);

    logger.log('✅ SQLite 数据库初始化成功');
    return true;
  } catch (error) {
    logger.error('❌ SQLite 数据库初始化失败:', error);
    return false;
  }
};

/**
 * 获取数据库实例（单例）
 */
export const getDatabase = (): SQLite.SQLiteDatabase => openDatabase();
