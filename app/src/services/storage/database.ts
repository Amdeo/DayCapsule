import SQLite from 'react-native-sqlite-storage';
import { LifeLogEntry, MediaAttachment, Tag, SyncQueueItem, EntryType, SyncStatus } from '@types/index';

// 启用Promise支持
SQLite.enablePromise(true);

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly DB_NAME = 'MemoryCapsule.db';
  private readonly DB_VERSION = '1.0';

  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: this.DB_NAME,
        version: this.DB_VERSION,
        location: 'default',
      });

      await this.createTables();
      await this.createIndexes();
      await this.createFTS5Table();
      
      console.log('数据库初始化成功');
    } catch (error) {
      console.error('数据库初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建数据库表
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    // 生活记录表
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS life_log_entries (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        mood TEXT NOT NULL,
        tags TEXT, -- JSON array of tag IDs
        location TEXT, -- JSON
        weather TEXT, -- JSON
        sync_status TEXT DEFAULT 'draft',
        is_deleted INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sync_at DATETIME,
        ai_tags TEXT -- JSON array of AI tags
      )
    `);

    // 媒体附件表
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS media_attachments (
        id TEXT PRIMARY KEY,
        entry_id TEXT NOT NULL,
        type TEXT NOT NULL,
        uri TEXT NOT NULL,
        thumbnail_uri TEXT,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        duration REAL,
        width INTEGER,
        height INTEGER,
        encryption_key TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entry_id) REFERENCES life_log_entries (id) ON DELETE CASCADE
      )
    `);

    // 标签表
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        color TEXT,
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 记录标签关联表
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS entry_tags (
        entry_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (entry_id, tag_id),
        FOREIGN KEY (entry_id) REFERENCES life_log_entries (id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
      )
    `);

    // 同步队列表
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entry_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT, -- JSON
        retry_count INTEGER DEFAULT 0,
        last_attempt_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entry_id) REFERENCES life_log_entries (id) ON DELETE CASCADE
      )
    `);

    console.log('数据库表创建成功');
  }

  /**
   * 创建索引
   */
  private async createIndexes(): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    // 记录表索引
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_entries_created_at ON life_log_entries (created_at)');
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_entries_type ON life_log_entries (type)');
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_entries_sync_status ON life_log_entries (sync_status)');
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_entries_is_deleted ON life_log_entries (is_deleted)');

    // 媒体附件表索引
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_media_entry_id ON media_attachments (entry_id)');
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_media_type ON media_attachments (type)');

    // 标签表索引
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_tags_name ON tags (name)');
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_tags_type ON tags (type)');

    // 关联表索引
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_entry_tags_entry ON entry_tags (entry_id)');
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags (tag_id)');

    // 同步队列索引
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_sync_queue_entry ON sync_queue (entry_id)');
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue (created_at)');

    console.log('数据库索引创建成功');
  }

  /**
   * 创建FTS5全文搜索表
   */
  private async createFTS5Table(): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    try {
      await this.db.executeSql(`
        CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
          entry_id,
          title,
          content,
          tags,
          ai_tags,
          content='life_log_entries',
          content_rowid='rowid'
        )
      `);

      // 创建触发器以保持FTS表同步
      await this.db.executeSql(`
        CREATE TRIGGER IF NOT EXISTS entries_fts_insert AFTER INSERT ON life_log_entries
        BEGIN
          INSERT INTO entries_fts (entry_id, title, content, tags, ai_tags)
          VALUES (new.id, new.title, new.content, new.tags, new.ai_tags);
        END
      `);

      await this.db.executeSql(`
        CREATE TRIGGER IF NOT EXISTS entries_fts_update AFTER UPDATE ON life_log_entries
        BEGIN
          DELETE FROM entries_fts WHERE entry_id = old.id;
          INSERT INTO entries_fts (entry_id, title, content, tags, ai_tags)
          VALUES (new.id, new.title, new.content, new.tags, new.ai_tags);
        END
      `);

      await this.db.executeSql(`
        CREATE TRIGGER IF NOT EXISTS entries_fts_delete AFTER DELETE ON life_log_entries
        BEGIN
          DELETE FROM entries_fts WHERE entry_id = old.id;
        END
      `);

      console.log('FTS5全文搜索表创建成功');
    } catch (error) {
      console.warn('FTS5表创建失败，可能设备不支持:', error);
      // FTS5不可用时，继续使用LIKE搜索作为备选方案
    }
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  /**
   * 获取数据库实例
   */
  getDatabase(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }
    return this.db;
  }

  /**
   * 执行事务
   */
  async executeTransaction(operations: (() => Promise<void>)[]): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    try {
      await this.db.executeSql('BEGIN TRANSACTION');
      
      for (const operation of operations) {
        await operation();
      }
      
      await this.db.executeSql('COMMIT');
    } catch (error) {
      await this.db.executeSql('ROLLBACK');
      throw error;
    }
  }

  /**
   * 检查FTS5是否可用
   */
  isFTS5Supported(): boolean {
    try {
      // 简单的FTS5功能检测
      return true; // 在实际实现中，这里应该有更复杂的检测逻辑
    } catch {
      return false;
    }
  }

  /**
   * 重建FTS5索引
   */
  async rebuildFTS5Index(): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    try {
      await this.db.executeSql('DELETE FROM entries_fts');
      await this.db.executeSql(`
        INSERT INTO entries_fts (entry_id, title, content, tags, ai_tags)
        SELECT id, title, content, tags, ai_tags 
        FROM life_log_entries 
        WHERE is_deleted = 0
      `);
      console.log('FTS5索引重建成功');
    } catch (error) {
      console.error('FTS5索引重建失败:', error);
    }
  }
}

// 单例实例
export const databaseService = new DatabaseService();
export default databaseService;
