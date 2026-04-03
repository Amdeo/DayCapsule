import { getDatabase } from '../sqlite';
import type { Entry } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';
import { normalizeEntryTags } from './entryMapper';
import {
  buildEntryInsertParts,
  getTableColumns,
  type EntryInsertSchemaCapabilities,
} from './schemaCapabilities';

const upsertEntryTags = async (
  db: ReturnType<typeof getDatabase>,
  entryId: string,
  tags: string[]
): Promise<void> => {
  const normalizedTags = normalizeEntryTags(tags) ?? [];

  await db.runAsync(`DELETE FROM entry_tags WHERE entry_id = ?`, [entryId]);

  if (normalizedTags.length === 0) {
    return;
  }

  const valuesPlaceholders = normalizedTags.map(() => '(?)').join(', ');
  await db.runAsync(
    `INSERT OR IGNORE INTO tags (name) VALUES ${valuesPlaceholders}`,
    normalizedTags
  );

  const inPlaceholders = normalizedTags.map(() => '?').join(', ');
  await db.runAsync(
    `INSERT OR IGNORE INTO entry_tags (entry_id, tag_id)
     SELECT ?, id FROM tags WHERE name IN (${inPlaceholders})`,
    [entryId, ...normalizedTags]
  );
};

const upsertEntryContentFts = async (
  db: ReturnType<typeof getDatabase>,
  entryId: string,
  content: string
): Promise<void> => {
  await db.runAsync('DELETE FROM entries_fts WHERE entry_id = ?', [entryId]);
  await db.runAsync('INSERT INTO entries_fts (entry_id, content) VALUES (?, ?)', [entryId, content]);
};

const deleteEntryContentFts = async (
  db: ReturnType<typeof getDatabase>,
  entryId: string
): Promise<void> => {
  await db.runAsync('DELETE FROM entries_fts WHERE entry_id = ?', [entryId]);
};

export const addEntry = async (entry: Omit<Entry, 'id' | 'timestamp'>): Promise<Entry> => {
  try {
    const db = getDatabase();
    const timestamp = Date.now();
    const id = `${timestamp}_${Math.random().toString(36).slice(2, 8)}`;
    const normalizedTags = normalizeEntryTags(entry.tags);

    const columns = await getTableColumns(db);
    const schemaCapabilities: EntryInsertSchemaCapabilities = {
      hasMediaJson: columns.has('media_json'),
      hasMediaColumns: columns.has('media_thumbnail') && columns.has('media_metadata'),
      hasSyncStatus: columns.has('sync_status'),
      hasSyncOp: columns.has('sync_op'),
      hasConflictedCopyOf: columns.has('conflicted_copy_of'),
      hasBaseUpdatedAt: columns.has('base_updated_at'),
      hasUserID: columns.has('user_id'),
      hasDeleted: columns.has('deleted'),
      hasLocalReadyState: columns.has('local_ready_state'),
    };

    const parts = buildEntryInsertParts(
      {
        ...entry,
        id,
        timestamp,
        tags: normalizedTags,
        recordingStatus: entry.recordingStatus === 'stopping' ? undefined : entry.recordingStatus,
      },
      schemaCapabilities,
      { includeCreatedAtUpdatedAt: false }
    );

    await db.runAsync(
      `INSERT INTO entries (${parts.columnsSql}) VALUES (${parts.placeholdersSql})`,
      parts.values
    );

    await upsertEntryContentFts(db, id, entry.content);

    if (normalizedTags !== undefined) {
      await upsertEntryTags(db, id, normalizedTags);
    }

    return {
      ...entry,
      tags: normalizedTags,
      id,
      timestamp,
      syncStatus: entry.syncStatus ?? 'synced',
      syncOp: entry.syncOp ?? 'update',
      conflictedCopyOf: entry.conflictedCopyOf,
      baseUpdatedAt: entry.baseUpdatedAt,
      userId: entry.userId,
      deleted: entry.deleted ?? false,
      localReadyState: entry.localReadyState ?? 'ready',
    } as Entry;
  } catch (error) {
    logger.error('Failed to add entry:', error);
    throw error;
  }
};

// 需要检测列是否存在才能写入的字段映射（声明式，易于扩展）
const GUARDED_COLUMN_MAPPINGS: Array<{
  field: keyof Entry;
  column: string;
  transform?: (val: unknown) => string | number | null;
}> = [
  { field: 'syncStatus', column: 'sync_status' },
  { field: 'syncOp', column: 'sync_op' },
  { field: 'conflictedCopyOf', column: 'conflicted_copy_of' },
  { field: 'baseUpdatedAt', column: 'base_updated_at' },
  { field: 'userId', column: 'user_id' },
  { field: 'deleted', column: 'deleted', transform: (v) => (v ? 1 : 0) },
  { field: 'localReadyState', column: 'local_ready_state' },
];

export const updateEntry = async (id: string, updates: Partial<Entry>): Promise<void> => {
  try {
    const db = getDatabase();
    const fields: string[] = [];
    const values: Array<string | number | null | undefined> = [];
    const normalizedTags = normalizeEntryTags(updates.tags);

    const columns = await getTableColumns(db);
    const hasMediaColumns = columns.has('media_thumbnail') && columns.has('media_metadata');

    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (normalizedTags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(normalizedTags));
    }
    if (updates.media !== undefined) {
      if (columns.has('media_json')) {
        fields.push('media_json = ?');
        values.push(JSON.stringify(updates.media));
      } else if (hasMediaColumns) {
        const media = updates.media?.[0];
        fields.push('media_uri = ?', 'media_type = ?', 'media_duration = ?', 'media_thumbnail = ?', 'media_metadata = ?');
        values.push(media?.uri ?? null, media?.mimeType ?? null, media?.duration ?? null, media?.thumbnail ?? null, media?.metadata ? JSON.stringify(media.metadata) : null);
      } else {
        const media = updates.media?.[0];
        fields.push('media_uri = ?', 'media_type = ?', 'media_duration = ?');
        values.push(media?.uri ?? null, media?.mimeType ?? null, media?.duration ?? null);
      }
    }
    if (updates.recordingStatus !== undefined && updates.recordingStatus !== 'stopping') {
      fields.push('recording_status = ?');
      values.push(updates.recordingStatus);
    }
    if (updates.recordingDuration !== undefined) {
      fields.push('recording_duration = ?');
      values.push(updates.recordingDuration);
    }

    for (const { field, column, transform } of GUARDED_COLUMN_MAPPINGS) {
      const val = updates[field];
      if (val !== undefined && columns.has(column)) {
        fields.push(`${column} = ?`);
        values.push(transform ? transform(val) : val as string | number | null);
      }
    }

    fields.push('updated_at = ?');
    values.push(Date.now(), id);

    await db.runAsync(
      `UPDATE entries SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (updates.content !== undefined) {
      await upsertEntryContentFts(db, id, updates.content);
    }
    if (normalizedTags !== undefined) {
      await upsertEntryTags(db, id, normalizedTags);
    }
  } catch (error) {
    logger.error('Failed to update entry:', error);
    throw error;
  }
};

export const deleteEntry = async (id: string): Promise<void> => {
  try {
    const db = getDatabase();
    await db.runAsync('DELETE FROM entries WHERE id = ?', [id]);
    await deleteEntryContentFts(db, id);
  } catch (error) {
    logger.error('Failed to delete entry:', error);
    throw error;
  }
};

export const markEntryPendingDelete = async (id: string): Promise<void> => {
  try {
    const db = getDatabase();
    const columns = await getTableColumns(db);
    if (!columns.has('sync_status')) {
      await db.runAsync('DELETE FROM entries WHERE id = ?', [id]);
      return;
    }

    const fields = ['sync_status = ?'];
    const values: Array<string | number> = ['pending_delete'];

    if (columns.has('sync_op')) {
      fields.push('sync_op = ?');
      values.push('delete');
    }

    if (columns.has('deleted')) {
      fields.push('deleted = ?');
      values.push(1);
    }

    fields.push('updated_at = ?');
    values.push(Date.now(), id);

    await db.runAsync(
      `UPDATE entries SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
  } catch (error) {
    logger.error('Failed to mark entry pending delete:', error);
    throw error;
  }
};

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

export const restoreEntries = async (entries: Entry[]): Promise<string[]> => {
  const db = getDatabase();
  const insertedIds: string[] = [];
  let failed = 0;

  const columns = await getTableColumns(db);
  const schemaCapabilities: EntryInsertSchemaCapabilities = {
    hasMediaJson: columns.has('media_json'),
    hasMediaColumns: columns.has('media_thumbnail') && columns.has('media_metadata'),
    hasSyncStatus: columns.has('sync_status'),
    hasSyncOp: columns.has('sync_op'),
    hasConflictedCopyOf: columns.has('conflicted_copy_of'),
    hasBaseUpdatedAt: columns.has('base_updated_at'),
    hasUserID: columns.has('user_id'),
    hasDeleted: columns.has('deleted'),
    hasLocalReadyState: false,
  };

  await db.withTransactionAsync(async () => {
    for (const entry of entries) {
      try {
        const normalizedTags = normalizeEntryTags(entry.tags);
        const parts = buildEntryInsertParts(
          {
            ...entry,
            tags: normalizedTags,
          },
          schemaCapabilities,
          { includeCreatedAtUpdatedAt: true }
        );
        await db.runAsync(
          `INSERT OR IGNORE INTO entries (${parts.columnsSql}) VALUES (${parts.placeholdersSql})`,
          parts.values
        );

        const result = await db.getFirstAsync<{ changes: number }>(
          'SELECT changes() as changes'
        );
        const wasInserted = result?.changes === 1;

        if (wasInserted) {
          await upsertEntryContentFts(db, entry.id, entry.content);
          await upsertEntryTags(db, entry.id, normalizedTags ?? []);
          insertedIds.push(entry.id);
        }
      } catch (error) {
        failed += 1;
        logger.warn(`[restoreEntries] 恢复记录失败: ${entry.id}`, error);
      }
    }
  });

  if (failed > 0) {
    logger.warn(`[restoreEntries] ${failed} 条记录恢复失败`);
  }
  logger.log(
    `✅ 恢复完成：${insertedIds.length}/${entries.length} 条${failed > 0 ? `，${failed} 条失败` : ''}`
  );
  return insertedIds;
};
