import type { Entry, EntryFilters } from '@/src/types/entry';
import { getDatabase } from '../sqlite';
import { logger } from '@/src/utils/logger';
import { getTableColumns } from './schemaCapabilities';
import { buildFtsContentMatchQuery } from './ftsQuery';
import { rowToEntry, summarizePhotoMediaForDebug, type EntryRow } from './entryMapper';
import { safeQuery } from './queryHelper';

export type { EntryFilters } from '@/src/types/entry';

export const getAllEntries = async (limit?: number): Promise<Entry[]> =>
  safeQuery('get all entries', async (db) => {
    const query = limit
      ? `SELECT * FROM entries ORDER BY timestamp DESC LIMIT ?`
      : `SELECT * FROM entries ORDER BY timestamp DESC`;
    const result = limit
      ? await db.getAllAsync<EntryRow>(query, [limit])
      : await db.getAllAsync<EntryRow>(query);
    return result.map(rowToEntry);
  }, []);

export const getEntryById = async (id: string): Promise<Entry | null> =>
  safeQuery('get entry by id', async (db) => {
    const result = await db.getFirstAsync<EntryRow>('SELECT * FROM entries WHERE id = ?', [id]);
    return result ? rowToEntry(result) : null;
  }, null);

export const searchEntries = async (query: string, limit = 100): Promise<Entry[]> =>
  safeQuery('search entries', async (db) => {
    const normalizedQuery = buildFtsContentMatchQuery(query);
    if (!normalizedQuery) return [];
    const result = await db.getAllAsync<EntryRow>(
      `SELECT e.* FROM entries e
       JOIN entries_fts f ON f.entry_id = e.id
       WHERE f.content MATCH ?
       ORDER BY e.timestamp DESC
       LIMIT ?`,
      [normalizedQuery, limit]
    );
    return result.map(rowToEntry);
  }, []);

export const getEntriesByType = async (type: string): Promise<Entry[]> =>
  safeQuery('get entries by type', async (db) => {
    const result = await db.getAllAsync<EntryRow>(
      'SELECT * FROM entries WHERE type = ? ORDER BY timestamp DESC',
      [type]
    );
    return result.map(rowToEntry);
  }, []);

export const getEntriesByDateRange = async (startTime: number, endTime?: number): Promise<Entry[]> =>
  safeQuery('get entries by date range', async (db) => {
    const query = endTime
      ? 'SELECT * FROM entries WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC'
      : 'SELECT * FROM entries WHERE timestamp >= ? ORDER BY timestamp DESC';
    const params = endTime ? [startTime, endTime] : [startTime];
    const result = await db.getAllAsync<EntryRow>(query, params);
    return result.map(rowToEntry);
  }, []);

export const getAllTags = async (): Promise<string[]> =>
  safeQuery('get all tags', async (db) => {
    const result = await db.getAllAsync<{ name: string }>('SELECT name FROM tags ORDER BY name ASC');
    return result.map((r) => r.name);
  }, []);

export const getEntriesCount = async (): Promise<number> =>
  safeQuery('get entries count', async (db) => {
    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM entries');
    return result?.count || 0;
  }, 0);

export const getEntriesPage = async (
  filters: EntryFilters = {},
  limit = 20,
  cursor?: number
): Promise<Entry[]> => {
  try {
    const db = getDatabase();
    const columns = await getTableColumns(db);
    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (columns.has('deleted')) conditions.push('e.deleted = 0');
    if (cursor) { conditions.push('e.timestamp < ?'); params.push(cursor); }
    if (filters.type) { conditions.push('e.type = ?'); params.push(filters.type); }
    if (filters.startTime) { conditions.push('e.timestamp >= ?'); params.push(filters.startTime); }

    const normalizedSearch = filters.search ? buildFtsContentMatchQuery(filters.search) : null;
    if (normalizedSearch) {
      conditions.push('e.id IN (SELECT f.entry_id FROM entries_fts f WHERE f.content MATCH ?)');
      params.push(normalizedSearch);
    }
    if (filters.tags?.length) {
      filters.tags.forEach((tag) => {
        conditions.push(
          `e.id IN (SELECT et.entry_id FROM entry_tags et JOIN tags t ON et.tag_id = t.id WHERE t.name = ?)`
        );
        params.push(tag);
      });
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.getAllAsync<EntryRow>(
      `SELECT e.* FROM entries e ${where} ORDER BY e.timestamp DESC LIMIT ?`,
      [...params, limit]
    );
    const entries = result.map(rowToEntry);
    return entries;
  } catch (error) {
    logger.error('Failed to get entries page:', error);
    return [];
  }
};
