/**
 * Schema 列迁移：为 entries 表逐步增加新列
 * 所有函数均幂等，已存在则跳过
 */

import { getDatabase, getDatabaseScopeKey } from '../sqlite';
import { logger } from '@/src/utils/logger';
import { invalidateColumnCache } from '../operations';
import { migrationStore } from './legacyDataMigration';

export const migrateTagsToNormalized = async (): Promise<void> => {
  if (migrationStore.getString('tags_normalized') === 'true') return;

  const db = getDatabase();
  try {
    const rows = await db.getAllAsync<{ id: string; tags: string }>(
      `SELECT id, tags FROM entries WHERE tags IS NOT NULL AND tags != '[]'`
    );

    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        let tagNames: string[] = [];
        try { tagNames = JSON.parse(row.tags); } catch { continue; }

        for (const name of tagNames) {
          await db.runAsync(`INSERT OR IGNORE INTO tags (name) VALUES (?)`, [name]);
          await db.runAsync(
            `INSERT OR IGNORE INTO entry_tags (entry_id, tag_id)
             SELECT ?, id FROM tags WHERE name = ?`,
            [row.id, name]
          );
        }
      }
    });

    migrationStore.set('tags_normalized', 'true');
    logger.log('✅ Tags 规范化迁移完成，共处理', rows.length, '条记录');
  } catch (error) {
    logger.error('❌ Tags 规范化迁移失败:', error);
  }
};

export const migrateEntriesContentToFts = async (providedDb = getDatabase()): Promise<void> => {
  const db = providedDb;
  try {
    await db.runAsync(`
      CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
        entry_id UNINDEXED,
        content
      )
    `);
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM entries_fts`);
      await db.runAsync(`INSERT INTO entries_fts (entry_id, content) SELECT id, content FROM entries`);
    });
    logger.log('✅ entries_fts 回填完成');
  } catch (error) {
    logger.error('❌ entries_fts 迁移失败:', error);
  }
};

export const migrateMediaMetadataColumns = async (): Promise<void> => {
  if (migrationStore.getString('media_metadata_columns_added') === 'true') return;

  const db = getDatabase();
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(entries)`);
    const columnNames = tableInfo.map(col => col.name);

    if (!columnNames.includes('media_thumbnail')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN media_thumbnail TEXT`);
      logger.log('✅ 添加 media_thumbnail 列');
    }
    if (!columnNames.includes('media_metadata')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN media_metadata TEXT`);
      logger.log('✅ 添加 media_metadata 列');
    }

    migrationStore.set('media_metadata_columns_added', 'true');
    logger.log('✅ 媒体元数据列迁移完成');
  } catch (error) {
    logger.error('❌ 媒体元数据列迁移失败:', error);
  }
};

export const migrateToMediaJson = async (providedDb = getDatabase()): Promise<void> => {
  const db = providedDb;
  const scopeKey = getDatabaseScopeKey(db) ?? undefined;
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(entries)`);
    const hasMediaJson = tableInfo.some((col) => col.name === 'media_json');

    if (!hasMediaJson) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN media_json TEXT`);
      logger.log('✅ 添加 media_json 列');
    }

    const rows = await db.getAllAsync<{
      id: string;
      media_uri: string | null;
      media_type: string | null;
      media_duration: number | null;
      media_thumbnail: string | null;
      media_metadata: string | null;
    }>(`SELECT id, media_uri, media_type, media_duration, media_thumbnail, media_metadata
        FROM entries WHERE media_uri IS NOT NULL AND media_json IS NULL`);

    for (const row of rows) {
      let metadata = undefined;
      if (row.media_metadata) {
        try { metadata = JSON.parse(row.media_metadata); } catch { /* ignore */ }
      }
      const mediaItem = {
        uri: row.media_uri!,
        mimeType: row.media_type ?? 'image/jpeg',
        size: 0,
        duration: row.media_duration ?? undefined,
        thumbnail: row.media_thumbnail ?? undefined,
        metadata,
      };
      await db.runAsync(
        `UPDATE entries SET media_json = ? WHERE id = ?`,
        [JSON.stringify([mediaItem]), row.id]
      );
    }

    invalidateColumnCache(scopeKey);
    migrationStore.set('media_json_migrated', 'true');
    logger.log('✅ media_json 迁移完成，共处理', rows.length, '条记录');
  } catch (error) {
    logger.error('❌ media_json 迁移失败:', error);
  }
};

export const migrateSyncStatusColumn = async (providedDb = getDatabase()): Promise<void> => {
  const db = providedDb;
  const scopeKey = getDatabaseScopeKey(db) ?? undefined;
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(entries)`);
    const columnNames = new Set(tableInfo.map(col => col.name));
    const alreadyMarked = scopeKey ? false : migrationStore.getString('sync_status_column_added') === 'true';
    const hasAllRequiredColumns =
      columnNames.has('sync_status') &&
      columnNames.has('sync_op') &&
      columnNames.has('conflicted_copy_of');

    if (alreadyMarked && hasAllRequiredColumns) return;

    if (!columnNames.has('sync_status')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN sync_status TEXT DEFAULT 'synced'`);
      logger.log('✅ 添加 sync_status 列');
    }
    if (!columnNames.has('sync_op')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN sync_op TEXT DEFAULT 'update'`);
      logger.log('✅ 添加 sync_op 列');
    }
    if (!columnNames.has('conflicted_copy_of')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN conflicted_copy_of TEXT`);
      logger.log('✅ 添加 conflicted_copy_of 列');
    }

    await db.runAsync(`UPDATE entries SET sync_status = 'synced' WHERE sync_status IS NULL`);
    await db.runAsync(`UPDATE entries SET sync_op = 'update' WHERE sync_op IS NULL`);
    await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_entries_sync_status ON entries(sync_status)`);
    invalidateColumnCache(scopeKey);
    migrationStore.set('sync_status_column_added', 'true');
    logger.log('✅ sync_status / sync_op / conflicted_copy_of 列迁移完成');
  } catch (error) {
    logger.error('❌ sync_status 列迁移失败:', error);
  }
};

export const migrateCloudSyncCoreColumns = async (providedDb = getDatabase()): Promise<void> => {
  const db = providedDb;
  const scopeKey = getDatabaseScopeKey(db) ?? undefined;
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(entries)`);
    const columnNames = new Set(tableInfo.map(col => col.name));
    const alreadyMarked = scopeKey ? false : migrationStore.getString('cloud_sync_core_columns_added') === 'true';
    const hasAllRequiredColumns =
      columnNames.has('base_updated_at') &&
      columnNames.has('user_id') &&
      columnNames.has('deleted');

    if (alreadyMarked && hasAllRequiredColumns) return;

    if (!columnNames.has('base_updated_at')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN base_updated_at INTEGER`);
      logger.log('✅ 添加 base_updated_at 列');
    }
    if (!columnNames.has('user_id')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN user_id TEXT`);
      logger.log('✅ 添加 user_id 列');
    }
    if (!columnNames.has('deleted')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN deleted INTEGER DEFAULT 0`);
      logger.log('✅ 添加 deleted 列');
    }

    await db.runAsync(`UPDATE entries SET deleted = 0 WHERE deleted IS NULL`);
    invalidateColumnCache(scopeKey);
    migrationStore.set('cloud_sync_core_columns_added', 'true');
    logger.log('✅ cloud sync core 列迁移完成');
  } catch (error) {
    logger.error('❌ cloud sync core 列迁移失败:', error);
  }
};

export const migrateLocalReadyStateColumn = async (providedDb = getDatabase()): Promise<void> => {
  const db = providedDb;
  const scopeKey = getDatabaseScopeKey(db) ?? undefined;
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(entries)`);
    const columnNames = new Set(tableInfo.map(col => col.name));

    if (!columnNames.has('local_ready_state')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN local_ready_state TEXT DEFAULT 'ready'`);
      logger.log('✅ 添加 local_ready_state 列');
    }

    await db.runAsync(`UPDATE entries SET local_ready_state = 'ready' WHERE local_ready_state IS NULL`);
    invalidateColumnCache(scopeKey);
    migrationStore.set('local_ready_state_column_added', 'true');
    logger.log('✅ local_ready_state 列迁移完成');
  } catch (error) {
    logger.error('❌ local_ready_state 列迁移失败:', error);
  }
};
