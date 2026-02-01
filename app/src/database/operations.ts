/**
 * SQLite 数据库操作层
 * 提供 CRUD 操作
 */

import { getDatabase } from './sqlite';
import { Entry } from '@/src/types/entry';

/**
 * 将数据库行转换为 Entry 对象
 */
const rowToEntry = (row: any): Entry => {
  return {
    id: row.id,
    type: row.type,
    content: row.content,
    timestamp: row.timestamp,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    media: row.media_uri ? {
      uri: row.media_uri,
      mimeType: row.media_type || 'audio/m4a',
      size: 0,
      duration: row.media_duration,
    } : undefined,
    recordingStatus: row.recording_status,
    recordingDuration: row.recording_duration,
    syncStatus: 'synced',
  };
};

/**
 * 获取所有记录
 */
export const getAllEntries = async (limit?: number): Promise<Entry[]> => {
  try {
    const db = getDatabase();
    const query = limit
      ? `SELECT * FROM entries ORDER BY timestamp DESC LIMIT ${limit}`
      : `SELECT * FROM entries ORDER BY timestamp DESC`;

    const result = await db.getAllAsync(query);
    return result.map(rowToEntry);
  } catch (error) {
    console.error('Failed to get all entries:', error);
    return [];
  }
};

/**
 * 根据 ID 获取记录
 */
export const getEntryById = async (id: string): Promise<Entry | null> => {
  try {
    const db = getDatabase();
    const result = await db.getFirstAsync(
      'SELECT * FROM entries WHERE id = ?',
      [id]
    );
    return result ? rowToEntry(result) : null;
  } catch (error) {
    console.error('Failed to get entry by id:', error);
    return null;
  }
};

/**
 * 添加新记录
 */
export const addEntry = async (entry: Omit<Entry, 'id' | 'timestamp'>): Promise<Entry> => {
  try {
    const db = getDatabase();
    const id = Date.now().toString();
    const timestamp = Date.now();

    await db.runAsync(
      `INSERT INTO entries (
        id, type, content, timestamp, tags,
        media_uri, media_type, media_duration,
        recording_status, recording_duration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        entry.type,
        entry.content,
        timestamp,
        entry.tags ? JSON.stringify(entry.tags) : null,
        entry.media?.uri || null,
        entry.media?.mimeType || null,
        entry.media?.duration || null,
        entry.recordingStatus || null,
        entry.recordingDuration || null,
      ]
    );

    return {
      ...entry,
      id,
      timestamp,
      syncStatus: 'synced',
    } as Entry;
  } catch (error) {
    console.error('Failed to add entry:', error);
    throw error;
  }
};

/**
 * 更新记录
 */
export const updateEntry = async (id: string, updates: Partial<Entry>): Promise<void> => {
  try {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }
    if (updates.media !== undefined) {
      fields.push('media_uri = ?', 'media_type = ?', 'media_duration = ?');
      values.push(
        updates.media.uri,
        updates.media.mimeType,
        updates.media.duration
      );
    }
    if (updates.recordingStatus !== undefined) {
      fields.push('recording_status = ?');
      values.push(updates.recordingStatus);
    }
    if (updates.recordingDuration !== undefined) {
      fields.push('recording_duration = ?');
      values.push(updates.recordingDuration);
    }

    fields.push('updated_at = ?');
    values.push(Date.now());

    values.push(id);

    await db.runAsync(
      `UPDATE entries SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  } catch (error) {
    console.error('Failed to update entry:', error);
    throw error;
  }
};

/**
 * 删除记录
 */
export const deleteEntry = async (id: string): Promise<void> => {
  try {
    const db = getDatabase();
    await db.runAsync('DELETE FROM entries WHERE id = ?', [id]);
  } catch (error) {
    console.error('Failed to delete entry:', error);
    throw error;
  }
};

/**
 * 搜索记录
 */
export const searchEntries = async (query: string): Promise<Entry[]> => {
  try {
    const db = getDatabase();
    const result = await db.getAllAsync(
      `SELECT * FROM entries
       WHERE content LIKE ? OR tags LIKE ?
       ORDER BY timestamp DESC`,
      [`%${query}%`, `%${query}%`]
    );
    return result.map(rowToEntry);
  } catch (error) {
    console.error('Failed to search entries:', error);
    return [];
  }
};

/**
 * 按类型获取记录
 */
export const getEntriesByType = async (type: string): Promise<Entry[]> => {
  try {
    const db = getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM entries WHERE type = ? ORDER BY timestamp DESC',
      [type]
    );
    return result.map(rowToEntry);
  } catch (error) {
    console.error('Failed to get entries by type:', error);
    return [];
  }
};

/**
 * 按日期范围获取记录
 */
export const getEntriesByDateRange = async (startTime: number, endTime?: number): Promise<Entry[]> => {
  try {
    const db = getDatabase();
    const query = endTime
      ? 'SELECT * FROM entries WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC'
      : 'SELECT * FROM entries WHERE timestamp >= ? ORDER BY timestamp DESC';

    const params = endTime ? [startTime, endTime] : [startTime];
    const result = await db.getAllAsync(query, params);
    return result.map(rowToEntry);
  } catch (error) {
    console.error('Failed to get entries by date range:', error);
    return [];
  }
};

/**
 * 获取所有标签
 */
export const getAllTags = async (): Promise<string[]> => {
  try {
    const db = getDatabase();
    const result = await db.getAllAsync(
      'SELECT DISTINCT tags FROM entries WHERE tags IS NOT NULL'
    );

    const tagsSet = new Set<string>();
    result.forEach((row: any) => {
      if (row.tags) {
        const tags = JSON.parse(row.tags);
        tags.forEach((tag: string) => tagsSet.add(tag));
      }
    });

    return Array.from(tagsSet).sort();
  } catch (error) {
    console.error('Failed to get all tags:', error);
    return [];
  }
};

/**
 * 获取记录数量
 */
export const getEntriesCount = async (): Promise<number> => {
  try {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM entries'
    );
    return result?.count || 0;
  } catch (error) {
    console.error('Failed to get entries count:', error);
    return 0;
  }
};

/**
 * 清空所有记录（谨慎使用）
 */
export const clearAllEntries = async (): Promise<void> => {
  try {
    const db = getDatabase();
    await db.runAsync('DELETE FROM entries');
    console.log('✅ 已清空所有记录');
  } catch (error) {
    console.error('Failed to clear all entries:', error);
    throw error;
  }
};
