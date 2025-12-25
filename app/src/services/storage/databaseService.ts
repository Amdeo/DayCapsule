import databaseService from './database';
import { 
  LifeLogEntry, 
  MediaAttachment, 
  Tag, 
  SyncQueueItem, 
  EntryType, 
  SyncStatus, 
  MoodType,
  TimelineView,
  TimelineFilter,
  SearchResult 
} from '@types/index';
import { v4 as uuidv4 } from 'uuid';

class DatabaseOperations {
  /**
   * 创建生活记录
   */
  async createEntry(entryData: Partial<LifeLogEntry>): Promise<LifeLogEntry> {
    const db = databaseService.getDatabase();
    const entry: LifeLogEntry = {
      id: entryData.id || uuidv4(),
      type: entryData.type || EntryType.TEXT,
      title: entryData.title,
      content: entryData.content || '',
      mood: entryData.mood || MoodType.NEUTRAL,
      tags: entryData.tags || [],
      location: entryData.location,
      weather: entryData.weather,
      mediaAttachments: entryData.mediaAttachments || [],
      syncStatus: entryData.syncStatus || SyncStatus.DRAFT,
      isDeleted: false,
      createdAt: entryData.createdAt || new Date(),
      updatedAt: new Date(),
      aiTags: entryData.aiTags,
    };

    await db.executeSql(`
      INSERT INTO life_log_entries (
        id, type, title, content, mood, tags, location, weather,
        sync_status, is_deleted, created_at, updated_at, ai_tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      entry.id,
      entry.type,
      entry.title,
      entry.content,
      entry.mood,
      JSON.stringify(entry.tags),
      entry.location ? JSON.stringify(entry.location) : null,
      entry.weather ? JSON.stringify(entry.weather) : null,
      entry.syncStatus,
      entry.isDeleted ? 1 : 0,
      entry.createdAt.toISOString(),
      entry.updatedAt.toISOString(),
      entry.aiTags ? JSON.stringify(entry.aiTags) : null,
    ]);

    return entry;
  }

  /**
   * 获取单个记录
   */
  async getEntry(id: string): Promise<LifeLogEntry | null> {
    const db = databaseService.getDatabase();
    
    const [results] = await db.executeSql(`
      SELECT * FROM life_log_entries WHERE id = ? AND is_deleted = 0
    `, [id]);

    if (results.rows.length === 0) {
      return null;
    }

    const row = results.rows.item(0);
    return this.mapEntryFromRow(row);
  }

  /**
   * 获取所有记录（分页）
   */
  async getEntries(page: number = 0, limit: number = 20): Promise<LifeLogEntry[]> {
    const db = databaseService.getDatabase();
    const offset = page * limit;

    const [results] = await db.executeSql(`
      SELECT * FROM life_log_entries 
      WHERE is_deleted = 0
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const entries: LifeLogEntry[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      entries.push(await this.mapEntryFromRow(row));
    }

    return entries;
  }

  /**
   * 根据日期范围获取记录
   */
  async getEntriesByDateRange(
    startDate: Date, 
    endDate: Date, 
    view: TimelineView = TimelineView.DAY
  ): Promise<LifeLogEntry[]> {
    const db = databaseService.getDatabase();
    
    let dateFormat = '';
    switch (view) {
      case TimelineView.DAY:
        dateFormat = "%Y-%m-%d %H:00:00";
        break;
      case TimelineView.WEEK:
        dateFormat = "%Y-%m-%d";
        break;
      case TimelineView.MONTH:
        dateFormat = "%Y-%m-01";
        break;
      case TimelineView.YEAR:
        dateFormat = "%Y-01-01";
        break;
    }

    const [results] = await db.executeSql(`
      SELECT * FROM life_log_entries 
      WHERE is_deleted = 0 
        AND datetime(created_at) >= datetime(?)
        AND datetime(created_at) <= datetime(?)
      ORDER BY created_at DESC
    `, [
      startDate.toISOString(),
      endDate.toISOString()
    ]);

    const entries: LifeLogEntry[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      entries.push(await this.mapEntryFromRow(row));
    }

    return entries;
  }

  /**
   * 更新记录
   */
  async updateEntry(id: string, updates: Partial<LifeLogEntry>): Promise<LifeLogEntry> {
    const db = databaseService.getDatabase();
    const existingEntry = await this.getEntry(id);
    
    if (!existingEntry) {
      throw new Error('记录不存在');
    }

    const updatedEntry: LifeLogEntry = {
      ...existingEntry,
      ...updates,
      updatedAt: new Date(),
    };

    await db.executeSql(`
      UPDATE life_log_entries SET
        type = ?, title = ?, content = ?, mood = ?, tags = ?,
        location = ?, weather = ?, sync_status = ?, updated_at = ?, ai_tags = ?
      WHERE id = ?
    `, [
      updatedEntry.type,
      updatedEntry.title,
      updatedEntry.content,
      updatedEntry.mood,
      JSON.stringify(updatedEntry.tags),
      updatedEntry.location ? JSON.stringify(updatedEntry.location) : null,
      updatedEntry.weather ? JSON.stringify(updatedEntry.weather) : null,
      updatedEntry.syncStatus,
      updatedEntry.updatedAt.toISOString(),
      updatedEntry.aiTags ? JSON.stringify(updatedEntry.aiTags) : null,
      id,
    ]);

    return updatedEntry;
  }

  /**
   * 软删除记录
   */
  async deleteEntry(id: string): Promise<void> {
    const db = databaseService.getDatabase();
    
    await db.executeSql(`
      UPDATE life_log_entries SET is_deleted = 1, updated_at = ?
      WHERE id = ?
    `, [new Date().toISOString(), id]);
  }

  /**
   * 彻底删除记录
   */
  async permanentlyDeleteEntry(id: string): Promise<void> {
    const db = databaseService.getDatabase();
    
    await db.executeSql('DELETE FROM life_log_entries WHERE id = ?', [id]);
  }

  /**
   * 添加媒体附件
   */
  async addMediaAttachment(attachment: Partial<MediaAttachment>): Promise<MediaAttachment> {
    const db = databaseService.getDatabase();
    const mediaAttachment: MediaAttachment = {
      id: attachment.id || uuidv4(),
      entryId: attachment.entryId!,
      type: attachment.type!,
      uri: attachment.uri!,
      thumbnailUri: attachment.thumbnailUri,
      fileName: attachment.fileName!,
      fileSize: attachment.fileSize!,
      mimeType: attachment.mimeType!,
      duration: attachment.duration,
      width: attachment.width,
      height: attachment.height,
      encryptionKey: attachment.encryptionKey,
      createdAt: attachment.createdAt || new Date(),
    };

    await db.executeSql(`
      INSERT INTO media_attachments (
        id, entry_id, type, uri, thumbnail_uri, file_name, file_size,
        mime_type, duration, width, height, encryption_key, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      mediaAttachment.id,
      mediaAttachment.entryId,
      mediaAttachment.type,
      mediaAttachment.uri,
      mediaAttachment.thumbnailUri,
      mediaAttachment.fileName,
      mediaAttachment.fileSize,
      mediaAttachment.mimeType,
      mediaAttachment.duration,
      mediaAttachment.width,
      mediaAttachment.height,
      mediaAttachment.encryptionKey,
      mediaAttachment.createdAt.toISOString(),
    ]);

    return mediaAttachment;
  }

  /**
   * 获取记录的媒体附件
   */
  async getMediaAttachments(entryId: string): Promise<MediaAttachment[]> {
    const db = databaseService.getDatabase();
    
    const [results] = await db.executeSql(`
      SELECT * FROM media_attachments WHERE entry_id = ?
    `, [entryId]);

    const attachments: MediaAttachment[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      attachments.push(this.mapMediaAttachmentFromRow(row));
    }

    return attachments;
  }

  /**
   * 创建或获取标签
   */
  async createOrGetTag(name: string, type: 'manual' | 'ai' = 'manual'): Promise<Tag> {
    const db = databaseService.getDatabase();
    
    // 首先尝试获取现有标签
    const [existingResults] = await db.executeSql(
      'SELECT * FROM tags WHERE name = ?', 
      [name]
    );

    if (existingResults.rows.length > 0) {
      const row = existingResults.rows.item(0);
      const tag = this.mapTagFromRow(row);
      
      // 更新使用次数
      await db.executeSql(
        'UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?',
        [tag.id]
      );
      
      return tag;
    }

    // 创建新标签
    const tag: Tag = {
      id: uuidv4(),
      name,
      type,
      color: this.generateTagColor(name),
      usageCount: 1,
      createdAt: new Date(),
    };

    await db.executeSql(`
      INSERT INTO tags (id, name, type, color, usage_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      tag.id,
      tag.name,
      tag.type,
      tag.color,
      tag.usageCount,
      tag.createdAt.toISOString(),
    ]);

    return tag;
  }

  /**
   * 获取所有标签
   */
  async getTags(): Promise<Tag[]> {
    const db = databaseService.getDatabase();
    
    const [results] = await db.executeSql(`
      SELECT * FROM tags ORDER BY usage_count DESC, name ASC
    `);

    const tags: Tag[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      tags.push(this.mapTagFromRow(row));
    }

    return tags;
  }

  /**
   * 全文搜索
   */
  async searchEntries(query: string, limit: number = 50): Promise<SearchResult[]> {
    const db = databaseService.getDatabase();

    try {
      // 尝试使用FTS5
      if (databaseService.isFTS5Supported()) {
        const [results] = await db.executeSql(`
          SELECT e.*, bm25(entries_fts) as score
          FROM entries_fts
          JOIN life_log_entries e ON e.id = entries_fts.entry_id
          WHERE entries_fts MATCH ?
            AND e.is_deleted = 0
          ORDER BY score
          LIMIT ?
        `, [query, limit]);

        return this.mapSearchResults(results);
      }
    } catch (error) {
      console.warn('FTS5搜索失败，使用备选方案:', error);
    }

    // 备选方案：使用LIKE搜索
    const [results] = await db.executeSql(`
      SELECT e.*, 
        CASE 
          WHEN e.title LIKE ? THEN 1.0
          WHEN e.content LIKE ? THEN 0.8
          WHEN e.tags LIKE ? THEN 0.6
          ELSE 0.4
        END as score
      FROM life_log_entries e
      WHERE (e.title LIKE ? OR e.content LIKE ? OR e.tags LIKE ?)
        AND e.is_deleted = 0
      ORDER BY score DESC, e.created_at DESC
      LIMIT ?
    `, [
      `%${query}%`, `%${query}%`, `%${query}%`,
      `%${query}%`, `%${query}%`, `%${query}%`,
      limit
    ]);

    return this.mapSearchResults(results);
  }

  /**
   * 筛选记录
   */
  async filterEntries(filters: TimelineFilter): Promise<LifeLogEntry[]> {
    const db = databaseService.getDatabase();
    let query = 'SELECT * FROM life_log_entries WHERE is_deleted = 0';
    const params: any[] = [];

    if (filters.dateRange) {
      query += ' AND datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?)';
      params.push(filters.dateRange.start.toISOString(), filters.dateRange.end.toISOString());
    }

    if (filters.tags && filters.tags.length > 0) {
      for (const tagId of filters.tags) {
        query += ' AND tags LIKE ?';
        params.push(`%${tagId}%`);
      }
    }

    if (filters.mood && filters.mood.length > 0) {
      query += ` AND mood IN (${filters.mood.map(() => '?').join(',')})`;
      params.push(...filters.mood);
    }

    if (filters.entryType && filters.entryType.length > 0) {
      query += ` AND type IN (${filters.entryType.map(() => '?').join(',')})`;
      params.push(...filters.entryType);
    }

    query += ' ORDER BY created_at DESC';

    const [results] = await db.executeSql(query, params);
    const entries: LifeLogEntry[] = [];

    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      entries.push(await this.mapEntryFromRow(row));
    }

    return entries;
  }

  /**
   * 获取统计信息
   */
  async getStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    const db = databaseService.getDatabase();
    let dateFilter = 'WHERE is_deleted = 0';
    const params: any[] = [];

    if (startDate && endDate) {
      dateFilter += ' AND datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?)';
      params.push(startDate.toISOString(), endDate.toISOString());
    }

    // 总记录数
    const [countResults] = await db.executeSql(
      `SELECT COUNT(*) as count FROM life_log_entries ${dateFilter}`,
      params
    );

    // 按类型统计
    const [typeResults] = await db.executeSql(
      `SELECT type, COUNT(*) as count FROM life_log_entries ${dateFilter} GROUP BY type`,
      params
    );

    // 按心情统计
    const [moodResults] = await db.executeSql(
      `SELECT mood, COUNT(*) as count FROM life_log_entries ${dateFilter} GROUP BY mood`,
      params
    );

    const stats = {
      totalEntries: countResults.rows.item(0).count,
      byType: {},
      byMood: {},
      dateRange: {
        start: startDate?.toISOString(),
        end: endDate?.toISOString(),
      },
    };

    for (let i = 0; i < typeResults.rows.length; i++) {
      const row = typeResults.rows.item(i);
      stats.byType[row.type] = row.count;
    }

    for (let i = 0; i < moodResults.rows.length; i++) {
      const row = moodResults.rows.item(i);
      stats.byMood[row.mood] = row.count;
    }

    return stats;
  }

  // 辅助方法：从数据库行映射到对象
  private async mapEntryFromRow(row: any): Promise<LifeLogEntry> {
    const mediaAttachments = await this.getMediaAttachments(row.id);
    
    return {
      id: row.id,
      type: row.type as EntryType,
      title: row.title,
      content: row.content,
      mood: row.mood as MoodType,
      tags: row.tags ? JSON.parse(row.tags) : [],
      location: row.location ? JSON.parse(row.location) : undefined,
      weather: row.weather ? JSON.parse(row.weather) : undefined,
      mediaAttachments,
      syncStatus: row.sync_status as SyncStatus,
      isDeleted: Boolean(row.is_deleted),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      syncAt: row.sync_at ? new Date(row.sync_at) : undefined,
      aiTags: row.ai_tags ? JSON.parse(row.ai_tags) : undefined,
    };
  }

  private mapMediaAttachmentFromRow(row: any): MediaAttachment {
    return {
      id: row.id,
      entryId: row.entry_id,
      type: row.type,
      uri: row.uri,
      thumbnailUri: row.thumbnail_uri,
      fileName: row.file_name,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      duration: row.duration,
      width: row.width,
      height: row.height,
      encryptionKey: row.encryption_key,
      createdAt: new Date(row.created_at),
    };
  }

  private mapTagFromRow(row: any): Tag {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      color: row.color,
      usageCount: row.usage_count,
      createdAt: new Date(row.created_at),
    };
  }

  private mapSearchResults(results: any): SearchResult[] {
    const searchResults: SearchResult[] = [];
    
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      searchResults.push({
        entry: this.mapEntryFromRow(row),
        score: row.score || 1.0,
        matchedFields: ['content'], // 简化处理
        highlights: [{
          field: 'content',
          value: row.content?.substring(0, 100) + '...' || '',
        }],
      });
    }
    
    return searchResults;
  }

  private generateTagColor(name: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }
}

export const databaseOperations = new DatabaseOperations();
export default databaseOperations;
