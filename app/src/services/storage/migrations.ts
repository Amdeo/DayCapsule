import {SQLiteDatabase} from 'react-native-sqlite-storage';

/**
 * 数据库迁移管理
 * 处理表结构升级和索引创建
 */
export class DatabaseMigrations {
  /**
   * 执行所有必需的迁移
   */
  static async runMigrations(db: SQLiteDatabase): Promise<void> {
    try {
      await this.createMediaAttachmentTable(db);
      await this.createTagTable(db);
      await this.createEntryTagsTable(db);
      await this.createReminderLogTable(db);
      await this.createSyncQueueTable(db);
      await this.createIndexes(db);
      console.log('All migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * 创建 MediaAttachment 表
   */
  private static async createMediaAttachmentTable(db: SQLiteDatabase): Promise<void> {
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS media_attachments (
        id TEXT PRIMARY KEY,
        entry_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('photo', 'audio')),
        uri_local TEXT NOT NULL,
        thumbnail_uri TEXT,
        filesize_bytes INTEGER,
        duration_sec INTEGER,
        created_at INTEGER NOT NULL,
        checksum TEXT,
        FOREIGN KEY (entry_id) REFERENCES lifelog_entries(id) ON DELETE CASCADE
      )
    `);
  }

  /**
   * 创建 Tag 表
   */
  private static async createTagTable(db: SQLiteDatabase): Promise<void> {
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        origin TEXT NOT NULL CHECK(origin IN ('manual', 'ai')),
        created_at INTEGER NOT NULL,
        usage_count INTEGER DEFAULT 0
      )
    `);
  }

  /**
   * 创建 entry_tags 关联表
   */
  private static async createEntryTagsTable(db: SQLiteDatabase): Promise<void> {
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS entry_tags (
        entry_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        source TEXT NOT NULL CHECK(source IN ('manual', 'ai')),
        PRIMARY KEY (entry_id, tag_id, source),
        FOREIGN KEY (entry_id) REFERENCES lifelog_entries(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);
  }

  /**
   * 创建 ReminderLog 表
   */
  private static async createReminderLogTable(db: SQLiteDatabase): Promise<void> {
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS reminder_logs (
        id TEXT PRIMARY KEY,
        entry_id TEXT NOT NULL,
        reminder_type TEXT NOT NULL CHECK(reminder_type IN ('on_this_day', 'custom')),
        scheduled_for TEXT NOT NULL,
        delivered_at INTEGER,
        status TEXT NOT NULL CHECK(status IN ('scheduled', 'sent', 'skipped')),
        FOREIGN KEY (entry_id) REFERENCES lifelog_entries(id) ON DELETE CASCADE
      )
    `);
  }

  /**
   * 创建 SyncQueueItem 表
   */
  private static async createSyncQueueTable(db: SQLiteDatabase): Promise<void> {
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS sync_queue_items (
        id TEXT PRIMARY KEY,
        entry_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
        payload_path TEXT,
        created_at INTEGER NOT NULL,
        attempts INTEGER DEFAULT 0,
        last_error TEXT,
        FOREIGN KEY (entry_id) REFERENCES lifelog_entries(id) ON DELETE CASCADE
      )
    `);
  }

  /**
   * 创建所有必需的索引
   */
  private static async createIndexes(db: SQLiteDatabase): Promise<void> {
    // MediaAttachment 索引
    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_media_entry ON media_attachments(entry_id)
    `);
    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_media_checksum ON media_attachments(checksum)
    `);

    // Tag 索引
    await db.executeSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tag_name ON tags(name COLLATE NOCASE)
    `);

    // entry_tags 索引
    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_entry_tags_entry ON entry_tags(entry_id)
    `);
    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags(tag_id)
    `);

    // ReminderLog 索引
    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_reminder_schedule ON reminder_logs(scheduled_for)
    `);

    // SyncQueueItem 索引
    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_sync_queue_entry ON sync_queue_items(entry_id)
    `);
    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue_items(operation)
    `);

    // LifeLogEntry 额外索引
    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_entries_mood ON lifelog_entries(mood)
    `);
    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_entries_location ON lifelog_entries(location_latitude, location_longitude)
    `);
    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_entries_sync_status ON lifelog_entries(sync_status)
    `);
  }

  /**
   * 创建 FTS5 虚拟表用于全文搜索
   */
  static async createFTS5Table(db: SQLiteDatabase): Promise<void> {
    try {
      await db.executeSql(`
        CREATE VIRTUAL TABLE IF NOT EXISTS lifelog_fts USING fts5(
          id UNINDEXED,
          content,
          transcription,
          tags,
          location_address,
          content=lifelog_entries,
          content_rowid=id
        )
      `);
      console.log('FTS5 table created successfully');
    } catch (error) {
      console.error('Failed to create FTS5 table:', error);
      throw error;
    }
  }
}

