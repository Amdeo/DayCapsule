/**
 * SQLite 数据库初始化和管理
 * 使用 Expo SQLite
 */

import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { logger } from '@/src/utils/logger';
import { getCurrentServerUrlSync, getServerKey } from '@/src/services/backendEnvironmentService';

const DB_NAME_PREFIX = 'MemoryCapsule';
const DEFAULT_SERVER_SCOPE = 'env_default';

// 单例连接，避免每次调用重复打开
let _db: SQLiteDatabase | null = null;
let _dbName: string | null = null;

const getCurrentServerScope = (): string => {
  const serverUrl = getCurrentServerUrlSync();
  return serverUrl ? getServerKey(serverUrl) : DEFAULT_SERVER_SCOPE;
};

export const getDatabaseName = (): string => `${DB_NAME_PREFIX}-${getCurrentServerScope()}.db`;

export const resetDatabase = (): void => {
  const maybeClosable = _db as SQLiteDatabase & { closeSync?: () => void };
  maybeClosable?.closeSync?.();
  _db = null;
  _dbName = null;
};

/**
 * 打开数据库连接（单例）
 */
export const openDatabase = (): SQLiteDatabase => {
  const nextDbName = getDatabaseName();

  if (!_db || _dbName !== nextDbName) {
    const maybeClosable = _db as SQLiteDatabase & { closeSync?: () => void };
    maybeClosable?.closeSync?.();
    _db = openDatabaseSync(nextDbName);
    _dbName = nextDbName;
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
        media_json TEXT,
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
export const getDatabase = (): SQLiteDatabase => openDatabase();
