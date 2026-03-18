/**
 * SQLite 数据库操作层
 * 提供 CRUD 操作
 */

import { getDatabase } from './sqlite';
import { Entry } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';

/**
 * 将数据库行转换为 Entry 对象
 */
const rowToEntry = (row: any): Entry => {
  let media: import('@/src/types/entry').MediaInfo[] | undefined = undefined;
  if (row.media_json) {
    try {
      media = JSON.parse(row.media_json);
    } catch {
      media = undefined;
    }
  }

  return {
    id: row.id,
    type: row.type,
    content: row.content,
    timestamp: row.timestamp,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    media,
    recordingStatus: row.recording_status,
    recordingDuration: row.recording_duration,
    syncStatus: 'synced',
  };
};

/**
 * 同步 entry 的规范化 tags（双写：JSON 列 + entry_tags 表）
 * 先清除旧关联，再插入新关联
 */
const upsertEntryTags = async (
  db: ReturnType<typeof getDatabase>,
  entryId: string,
  tags: string[]
): Promise<void> => {
  await db.runAsync(`DELETE FROM entry_tags WHERE entry_id = ?`, [entryId]);
  await Promise.all(
    tags.map(async (name) => {
      await db.runAsync(`INSERT OR IGNORE INTO tags (name) VALUES (?)`, [name]);
      await db.runAsync(
        `INSERT OR IGNORE INTO entry_tags (entry_id, tag_id)
         SELECT ?, id FROM tags WHERE name = ?`,
        [entryId, name]
      );
    })
  );
};

/**
 * 获取所有记录
 */
export const getAllEntries = async (limit?: number): Promise<Entry[]> => {
  try {
    const db = getDatabase();
    const query = limit
      ? `SELECT * FROM entries ORDER BY timestamp DESC LIMIT ?`
      : `SELECT * FROM entries ORDER BY timestamp DESC`;

    const result = limit
      ? await db.getAllAsync(query, [limit])
      : await db.getAllAsync(query);
    return result.map(rowToEntry);
  } catch (error) {
    logger.error('Failed to get all entries:', error);
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
    logger.error('Failed to get entry by id:', error);
    return null;
  }
};

/**
 * 检查表是否包含指定列
 */
let cachedColumnNames: Set<string> | null = null;
const getTableColumns = async (db: ReturnType<typeof getDatabase>): Promise<Set<string>> => {
  if (cachedColumnNames) return cachedColumnNames;

  const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(entries)`);
  cachedColumnNames = new Set(tableInfo.map(col => col.name));
  return cachedColumnNames;
};

/** Called by migration after adding media_json column to force cache refresh */
export const invalidateColumnCache = (): void => {
  cachedColumnNames = null;
};

/**
 * 添加新记录
 * 兼容旧表结构：如果 media_thumbnail/media_metadata 列不存在则使用旧语句
 */
export const addEntry = async (entry: Omit<Entry, 'id' | 'timestamp'>): Promise<Entry> => {
  try {
    const db = getDatabase();
    const timestamp = Date.now();
    const id = `${timestamp}_${Math.random().toString(36).slice(2, 8)}`;

    // 获取表列信息
    const columns = await getTableColumns(db);
    const hasMediaJson = columns.has('media_json');
    const hasMediaColumns = columns.has('media_thumbnail') && columns.has('media_metadata');

    if (hasMediaJson) {
      const mediaJson = entry.media ? JSON.stringify(entry.media) : null;
      await db.runAsync(
        `INSERT INTO entries (
          id, type, content, timestamp, tags,
          media_json,
          recording_status, recording_duration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, entry.type, entry.content, timestamp,
          entry.tags ? JSON.stringify(entry.tags) : null,
          mediaJson,
          entry.recordingStatus || null, entry.recordingDuration || null,
        ]
      );
    } else if (hasMediaColumns) {
      // 序列化媒体元数据
      const firstMedia = Array.isArray(entry.media) ? entry.media[0] : entry.media as any;
      const mediaMetadata = firstMedia?.metadata
        ? JSON.stringify(firstMedia.metadata)
        : null;

      await db.runAsync(
        `INSERT INTO entries (
          id, type, content, timestamp, tags,
          media_uri, media_type, media_duration, media_thumbnail, media_metadata,
          recording_status, recording_duration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          entry.type,
          entry.content,
          timestamp,
          entry.tags ? JSON.stringify(entry.tags) : null,
          firstMedia?.uri || null,
          firstMedia?.mimeType || null,
          firstMedia?.duration || null,
          firstMedia?.thumbnail || null,
          mediaMetadata,
          entry.recordingStatus || null,
          entry.recordingDuration || null,
        ]
      );
    } else {
      // 旧表结构：不使用新列
      const firstMedia = Array.isArray(entry.media) ? entry.media[0] : entry.media as any;
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
          firstMedia?.uri || null,
          firstMedia?.mimeType || null,
          firstMedia?.duration || null,
          entry.recordingStatus || null,
          entry.recordingDuration || null,
        ]
      );
    }

    // 同步规范化 tags
    if (entry.tags?.length) {
      await upsertEntryTags(db, id, entry.tags);
    }

    return {
      ...entry,
      id,
      timestamp,
      syncStatus: 'synced',
    } as Entry;
  } catch (error) {
    logger.error('Failed to add entry:', error);
    throw error;
  }
};

/**
 * 更新记录
 * 兼容旧表结构：如果 media_thumbnail/media_metadata 列不存在则不更新这些列
 */
export const updateEntry = async (id: string, updates: Partial<Entry>): Promise<void> => {
  try {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    // 获取表列信息
    const columns = await getTableColumns(db);
    const hasMediaColumns = columns.has('media_thumbnail') && columns.has('media_metadata');

    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }
    if (updates.media !== undefined) {
      if (columns.has('media_json')) {
        fields.push('media_json = ?');
        values.push(JSON.stringify(updates.media));
      } else if (hasMediaColumns) {
        const m = Array.isArray(updates.media) ? updates.media[0] : updates.media as any;
        fields.push('media_uri = ?', 'media_type = ?', 'media_duration = ?', 'media_thumbnail = ?', 'media_metadata = ?');
        values.push(
          m?.uri ?? null,
          m?.mimeType ?? null,
          m?.duration ?? null,
          m?.thumbnail ?? null,
          m?.metadata ? JSON.stringify(m.metadata) : null
        );
      } else {
        const m = Array.isArray(updates.media) ? updates.media[0] : updates.media as any;
        fields.push('media_uri = ?', 'media_type = ?', 'media_duration = ?');
        values.push(m?.uri ?? null, m?.mimeType ?? null, m?.duration ?? null);
      }
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

    // 同步规范化 tags
    if (updates.tags !== undefined) {
      await upsertEntryTags(db, id, updates.tags);
    }
  } catch (error) {
    logger.error('Failed to update entry:', error);
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
    logger.error('Failed to delete entry:', error);
    throw error;
  }
};

/**
 * 搜索记录
 */
export const searchEntries = async (query: string, limit = 100): Promise<Entry[]> => {
  try {
    const db = getDatabase();
    const result = await db.getAllAsync(
      `SELECT * FROM entries
       WHERE content LIKE ? OR tags LIKE ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [`%${query}%`, `%${query}%`, limit]
    );
    return result.map(rowToEntry);
  } catch (error) {
    logger.error('Failed to search entries:', error);
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
    logger.error('Failed to get entries by type:', error);
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
    logger.error('Failed to get entries by date range:', error);
    return [];
  }
};

/**
 * 获取所有标签
 */
export const getAllTags = async (): Promise<string[]> => {
  try {
    const db = getDatabase();
    const result = await db.getAllAsync<{ name: string }>(
      'SELECT name FROM tags ORDER BY name ASC'
    );
    return result.map((r) => r.name);
  } catch (error) {
    logger.error('Failed to get all tags:', error);
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
    logger.error('Failed to get entries count:', error);
    return 0;
  }
};

export interface EntryFilters {
  type?: 'text' | 'photo' | 'voice';
  startTime?: number;
  search?: string;
  tags?: string[];
}

/**
 * 游标分页查询（支持过滤条件）
 * cursor = 上一页最后一条的 timestamp，首页不传
 */
export const getEntriesPage = async (
  filters: EntryFilters = {},
  limit = 20,
  cursor?: number
): Promise<Entry[]> => {
  try {
    const db = getDatabase();
    const conditions: string[] = [];
    const params: any[] = [];

    if (cursor) {
      conditions.push('e.timestamp < ?');
      params.push(cursor);
    }
    if (filters.type) {
      conditions.push('e.type = ?');
      params.push(filters.type);
    }
    if (filters.startTime) {
      conditions.push('e.timestamp >= ?');
      params.push(filters.startTime);
    }
    if (filters.search?.trim()) {
      conditions.push('(e.content LIKE ? OR e.tags LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.tags?.length) {
      // 使用规范化表 JOIN，每个 tag 一个子查询（AND 语义）
      filters.tags.forEach((tag) => {
        conditions.push(
          `e.id IN (SELECT et.entry_id FROM entry_tags et JOIN tags t ON et.tag_id = t.id WHERE t.name = ?)`
        );
        params.push(tag);
      });
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.getAllAsync(
      `SELECT e.* FROM entries e ${where} ORDER BY e.timestamp DESC LIMIT ?`,
      [...params, limit]
    );
    return result.map(rowToEntry);
  } catch (error) {
    logger.error('Failed to get entries page:', error);
    return [];
  }
};

/**
 * 清空所有记录（谨慎使用）
 */
export const clearAllEntries = async (): Promise<void> => {
  try {
    const db = getDatabase();
    await db.runAsync('DELETE FROM entries');
    logger.log('✅ 已清空所有记录');
  } catch (error) {
    logger.error('Failed to clear all entries:', error);
    throw error;
  }
};

/**
 * 批量恢复记录（跳过已存在的 ID，幂等）
 * 返回实际插入的记录 ID 列表
 */
export const restoreEntries = async (entries: Entry[]): Promise<string[]> => {
  const db = getDatabase();
  const insertedIds: string[] = [];
  let failed = 0;

  // 在循环外获取列信息，避免重复查询
  const columns = await getTableColumns(db);
  const hasMediaJson = columns.has('media_json');

  for (const e of entries) {
    try {
      // 使用事务保证单条记录的原子性
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          hasMediaJson
            ? `INSERT OR IGNORE INTO entries
                 (id, type, content, timestamp, tags, media_json,
                  recording_status, recording_duration, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            : `INSERT OR IGNORE INTO entries
                 (id, type, content, timestamp, tags, media_uri, media_type,
                  media_duration, recording_status, recording_duration, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          hasMediaJson
            ? [
                e.id, e.type, e.content, e.timestamp,
                e.tags ? JSON.stringify(e.tags) : null,
                e.media ? JSON.stringify(e.media) : null,
                e.recordingStatus ?? null, e.recordingDuration ?? null,
                e.timestamp, e.editedAt ?? e.timestamp,
              ]
            : [
                e.id, e.type, e.content, e.timestamp,
                e.tags ? JSON.stringify(e.tags) : null,
                e.media?.[0]?.uri ?? null, e.media?.[0]?.mimeType ?? null,
                e.media?.[0]?.duration ?? null,
                e.recordingStatus ?? null, e.recordingDuration ?? null,
                e.timestamp, e.editedAt ?? e.timestamp,
              ]
        );

        // 检查实际插入的行数
        const result = await db.getFirstAsync<{ changes: number }>(
          'SELECT changes() as changes'
        );
        const wasInserted = result?.changes === 1;

        // 只有实际插入成功后才同步标签并记录 ID
        if (wasInserted) {
          await upsertEntryTags(db, e.id, e.tags ?? []);
          insertedIds.push(e.id);
        }
      });
    } catch (error) {
      failed++;
      logger.warn(`[restoreEntries] 恢复记录失败: ${e.id}`, error);
    }
  }

  if (failed > 0) {
    logger.warn(`[restoreEntries] ${failed} 条记录恢复失败`);
  }
  logger.log(`✅ 恢复完成：${insertedIds.length}/${entries.length} 条${failed > 0 ? `，${failed} 条失败` : ''}`);
  return insertedIds;
};
