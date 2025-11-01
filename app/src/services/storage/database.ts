import SQLite, {SQLiteDatabase} from 'react-native-sqlite-storage';
import {DatabaseMigrations} from './migrations';

// 启用调试模式（开发环境）
if (__DEV__) {
  SQLite.DEBUG(true);
}
SQLite.enablePromise(true);

export interface LifelogEntry {
  id: string;
  type: 'photo' | 'text' | 'voice';
  content: string;
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  tags: string[];
  mediaPath?: string;
  thumbnailPath?: string;
  voiceDuration?: number;
  transcription?: string; // 语音转录文本（仅用于语音记录）
  transcriptionLanguage?: string; // 转录使用的语言
  transcriptionConfidence?: number; // 转录置信度 (0-1)
  weather?: {
    temperature: number;
    condition: string;
  };
  createdAt: number;
  updatedAt: number;
}

class DatabaseService {
  private db: SQLiteDatabase | null = null;
  private readonly DB_NAME = 'memorycapsule.db';
  private readonly DB_VERSION = '1.0';
  private readonly DB_DISPLAY_NAME = 'MemoryCapsule Database';
  private readonly DB_SIZE = 200000;

  async init(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: this.DB_NAME,
        location: 'default',
      });

      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // 创建 lifelog_entries 表
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS lifelog_entries (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        location_latitude REAL,
        location_longitude REAL,
        location_address TEXT,
        tags TEXT,
        media_path TEXT,
        thumbnail_path TEXT,
        voice_duration INTEGER,
        transcription TEXT,
        transcription_language TEXT,
        transcription_confidence REAL,
        weather_temperature REAL,
        weather_condition TEXT,
        mood TEXT,
        sync_status TEXT DEFAULT 'draft',
        sync_retry_count INTEGER DEFAULT 0,
        reminder_enabled INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 创建索引以提高查询性能
    await this.db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_timestamp ON lifelog_entries(timestamp DESC)
    `);

    await this.db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_type ON lifelog_entries(type)
    `);

    // 创建 FTS5 全文搜索表
    await this.db.executeSql(`
      CREATE VIRTUAL TABLE IF NOT EXISTS lifelog_fts USING fts5(
        id UNINDEXED,
        content,
        transcription,
        tags,
        location_address
      )
    `);

    // 运行迁移以创建其他表
    await DatabaseMigrations.runMigrations(this.db);

    console.log('Database tables created successfully');
  }

  async insertEntry(entry: Omit<LifelogEntry, 'id'>): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const id = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    await this.db.executeSql(
      `INSERT INTO lifelog_entries (
        id, type, content, timestamp,
        location_latitude, location_longitude, location_address,
        tags, media_path, thumbnail_path,
        voice_duration, transcription, transcription_language, transcription_confidence,
        weather_temperature, weather_condition,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        entry.type,
        entry.content,
        entry.timestamp,
        entry.location?.latitude || null,
        entry.location?.longitude || null,
        entry.location?.address || null,
        JSON.stringify(entry.tags),
        entry.mediaPath || null,
        entry.thumbnailPath || null,
        entry.voiceDuration || null,
        entry.transcription || null,
        entry.transcriptionLanguage || null,
        entry.transcriptionConfidence || null,
        entry.weather?.temperature || null,
        entry.weather?.condition || null,
        now,
        now,
      ],
    );

    // 插入到 FTS 表
    await this.db.executeSql(
      `INSERT INTO lifelog_fts (id, content, transcription, tags, location_address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        entry.content,
        entry.transcription || '',
        JSON.stringify(entry.tags),
        entry.location?.address || '',
      ],
    );

    return id;
  }

  async getEntries(limit: number = 50, offset: number = 0): Promise<LifelogEntry[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const [results] = await this.db.executeSql(
      'SELECT * FROM lifelog_entries ORDER BY timestamp DESC LIMIT ? OFFSET ?',
      [limit, offset],
    );

    return this.parseEntries(results.rows);
  }

  async getEntriesByDateRange(startDate: number, endDate: number): Promise<LifelogEntry[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const [results] = await this.db.executeSql(
      `SELECT * FROM lifelog_entries 
       WHERE timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp DESC`,
      [startDate, endDate],
    );

    return this.parseEntries(results.rows);
  }

  async searchEntries(query: string): Promise<LifelogEntry[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // 使用 FTS5 全文搜索
    const [results] = await this.db.executeSql(
      `SELECT e.* FROM lifelog_entries e
       INNER JOIN lifelog_fts f ON e.id = f.id
       WHERE lifelog_fts MATCH ?
       ORDER BY e.timestamp DESC`,
      [query],
    );

    return this.parseEntries(results.rows);
  }

  async deleteEntry(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.db.executeSql('DELETE FROM lifelog_entries WHERE id = ?', [id]);
    await this.db.executeSql('DELETE FROM lifelog_fts WHERE id = ?', [id]);
  }

  async updateEntry(entry: LifelogEntry): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.db.executeSql(
      `UPDATE lifelog_entries SET
        type = ?, content = ?, timestamp = ?,
        location_latitude = ?, location_longitude = ?, location_address = ?,
        tags = ?, media_path = ?, thumbnail_path = ?,
        voice_duration = ?, transcription = ?, transcription_language = ?, transcription_confidence = ?,
        weather_temperature = ?, weather_condition = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        entry.type,
        entry.content,
        entry.timestamp,
        entry.location?.latitude,
        entry.location?.longitude,
        entry.location?.address,
        JSON.stringify(entry.tags),
        entry.mediaPath,
        entry.thumbnailPath,
        entry.voiceDuration,
        entry.transcription,
        entry.transcriptionLanguage,
        entry.transcriptionConfidence,
        entry.weather?.temperature,
        entry.weather?.condition,
        entry.updatedAt,
        entry.id,
      ],
    );

    // 更新 FTS 表
    await this.db.executeSql(
      `UPDATE lifelog_fts SET
        content = ?, transcription = ?, tags = ?, location_address = ?
      WHERE id = ?`,
      [
        entry.content,
        entry.transcription || '',
        JSON.stringify(entry.tags),
        entry.location?.address || '',
        entry.id,
      ],
    );
  }

  private parseEntries(rows: any): LifelogEntry[] {
    const entries: LifelogEntry[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows.item(i);
      entries.push({
        id: row.id,
        type: row.type,
        content: row.content,
        timestamp: row.timestamp,
        location:
          row.location_latitude && row.location_longitude
            ? {
                latitude: row.location_latitude,
                longitude: row.location_longitude,
                address: row.location_address,
              }
            : undefined,
        tags: JSON.parse(row.tags || '[]'),
        mediaPath: row.media_path,
        thumbnailPath: row.thumbnail_path,
        voiceDuration: row.voice_duration,
        transcription: row.transcription,
        transcriptionLanguage: row.transcription_language,
        transcriptionConfidence: row.transcription_confidence,
        weather:
          row.weather_temperature && row.weather_condition
            ? {
                temperature: row.weather_temperature,
                condition: row.weather_condition,
              }
            : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }
    return entries;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      console.log('Database closed');
    }
  }
}

export const databaseService = new DatabaseService();
