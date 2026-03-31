/**
 * SQLite 数据库操作层
 * 提供 CRUD 操作
 */

import { getDatabase } from './sqlite';
import { Entry } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';
import type { SQLiteBindValue } from 'expo-sqlite';

type EntryMediaInfo = import('@/src/types/entry').MediaInfo;
type EntryMediaMetadata = NonNullable<EntryMediaInfo['metadata']>;

type EntryRow = {
  id: string;
  type: string;
  content: string;
  timestamp: number;
  tags: string | null;
  media_uri?: string | null;
  media_type?: string | null;
  media_duration?: number | null;
  media_thumbnail?: string | null;
  media_metadata?: string | null;
  media_json?: string | null;
  recording_status?: string | null;
  recording_duration?: number | null;
  sync_status?: string | null;
  sync_op?: string | null;
  conflicted_copy_of?: string | null;
  base_updated_at?: number | null;
  user_id?: string | null;
  deleted?: number | null;
  local_ready_state?: string | null;
  updated_at?: number | null;
};

type EntryInsertSchemaCapabilities = {
  hasMediaJson: boolean;
  hasMediaColumns: boolean;
  hasSyncStatus: boolean;
  hasSyncOp: boolean;
  hasConflictedCopyOf: boolean;
  hasBaseUpdatedAt: boolean;
  hasUserID: boolean;
  hasDeleted: boolean;
  hasLocalReadyState: boolean;
};

type EntryInsertParts = {
  columnsSql: string;
  placeholdersSql: string;
  values: SQLiteBindValue[];
};

const ENTRY_TYPES: Entry['type'][] = ['text', 'photo', 'voice'];
const RECORDING_STATUSES: NonNullable<Entry['recordingStatus']>[] = [
  'recording',
  'paused',
  'completed',
  'uploading',
  'stopping',
];
const SYNC_STATUSES: NonNullable<Entry['syncStatus']>[] = [
  'synced',
  'pending',
  'uploading',
  'pending_upload',
  'failed',
  'conflict-local-copy',
  'pending_delete',
];
const SYNC_OPS: NonNullable<Entry['syncOp']>[] = ['create', 'update', 'delete'];
const LOCAL_READY_STATES: NonNullable<Entry['localReadyState']>[] = ['ready', 'processing'];

const normalizeEntryType = (value: string): Entry['type'] =>
  ENTRY_TYPES.includes(value as Entry['type']) ? (value as Entry['type']) : 'text';

const normalizeRecordingStatus = (value: string | null | undefined): Entry['recordingStatus'] =>
  value && RECORDING_STATUSES.includes(value as NonNullable<Entry['recordingStatus']>)
    ? (value as NonNullable<Entry['recordingStatus']>)
    : undefined;

const normalizeSyncStatus = (value: string | null | undefined): NonNullable<Entry['syncStatus']> =>
  value && SYNC_STATUSES.includes(value as NonNullable<Entry['syncStatus']>)
    ? (value as NonNullable<Entry['syncStatus']>)
    : 'synced';

const normalizeSyncOp = (value: string | null | undefined): NonNullable<Entry['syncOp']> =>
  value && SYNC_OPS.includes(value as NonNullable<Entry['syncOp']>)
    ? (value as NonNullable<Entry['syncOp']>)
    : 'update';

const normalizeLocalReadyState = (
  value: string | null | undefined
): NonNullable<Entry['localReadyState']> =>
  value && LOCAL_READY_STATES.includes(value as NonNullable<Entry['localReadyState']>)
    ? (value as NonNullable<Entry['localReadyState']>)
    : 'ready';

const normalizeEntryMedia = (media: unknown): EntryMediaInfo[] | undefined => {
  if (Array.isArray(media)) {
    return media as EntryMediaInfo[];
  }

  if (!media) {
    return undefined;
  }

  if (typeof media === 'string') {
    try {
      return normalizeEntryMedia(JSON.parse(media));
    } catch {
      return undefined;
    }
  }

  if (typeof media === 'object') {
    return [media as EntryMediaInfo];
  }

  return undefined;
};

const normalizeLegacyMediaMetadata = (metadata: unknown): EntryMediaMetadata | undefined => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }

  const candidate = metadata as Record<string, unknown>;
  if (
    typeof candidate.createdAt !== 'number' ||
    typeof candidate.modifiedAt !== 'number'
  ) {
    return undefined;
  }

  return {
    createdAt: candidate.createdAt,
    modifiedAt: candidate.modifiedAt,
    width: typeof candidate.width === 'number' ? candidate.width : undefined,
    height: typeof candidate.height === 'number' ? candidate.height : undefined,
    aspectRatio: typeof candidate.aspectRatio === 'number' ? candidate.aspectRatio : undefined,
    bitrate: typeof candidate.bitrate === 'number' ? candidate.bitrate : undefined,
    sampleRate: typeof candidate.sampleRate === 'number' ? candidate.sampleRate : undefined,
  };
};

const getLegacyEntryMedia = (row: EntryRow): EntryMediaInfo[] | undefined => {
  if (!row.media_uri) {
    return undefined;
  }

  let metadata: EntryMediaMetadata | undefined;
  if (row.media_metadata) {
    try {
      metadata = normalizeLegacyMediaMetadata(JSON.parse(row.media_metadata));
    } catch {
      metadata = undefined;
    }
  }

  return [
    {
      uri: row.media_uri,
      mimeType: row.media_type ?? (row.type === 'voice' ? 'audio/m4a' : 'image/jpeg'),
      size: 0,
      duration: row.media_duration ?? undefined,
      thumbnail: row.media_thumbnail ?? undefined,
      metadata,
    },
  ];
};

/**
 * 将数据库行转换为 Entry 对象
 */
const rowToEntry = (row: EntryRow): Entry => {
  let media: EntryMediaInfo[] | undefined = undefined;
  if (row.media_json) {
    try {
      media = normalizeEntryMedia(JSON.parse(row.media_json));
    } catch {
      media = undefined;
    }
  }

  if (!media || media.length === 0) {
    media = getLegacyEntryMedia(row);
  }

  return {
    id: row.id,
    type: normalizeEntryType(row.type),
    content: row.content,
    timestamp: row.timestamp,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    media,
    recordingStatus: normalizeRecordingStatus(row.recording_status),
    recordingDuration: row.recording_duration ?? undefined,
    syncStatus: normalizeSyncStatus(row.sync_status),
    syncOp: normalizeSyncOp(row.sync_op),
    conflictedCopyOf: row.conflicted_copy_of ?? undefined,
    baseUpdatedAt: row.base_updated_at ?? undefined,
    userId: row.user_id ?? undefined,
    deleted: row.deleted == null ? undefined : Boolean(row.deleted),
    updatedAt: row.updated_at ?? row.timestamp,
    localReadyState: normalizeLocalReadyState(row.local_ready_state),
  };
};

const summarizePhotoMediaForDebug = (entry: Entry) => ({
  entryId: entry.id,
  mediaCount: entry.media?.length ?? 0,
  media: (entry.media ?? []).map((media) => ({
    uri: media.uri,
    remoteUri: media.remoteUri,
    thumbnail: media.thumbnail,
    remoteThumbnail: media.remoteThumbnail,
  })),
});

const normalizeEntryTags = (tags: string[] | undefined): string[] | undefined => {
  if (tags === undefined) {
    return undefined;
  }

  return [...new Set(tags)];
};

const buildEntryInsertParts = (
  entry: Pick<
    Entry,
    | 'id'
    | 'type'
    | 'content'
    | 'timestamp'
    | 'tags'
    | 'media'
    | 'recordingStatus'
    | 'recordingDuration'
    | 'syncStatus'
    | 'syncOp'
    | 'conflictedCopyOf'
    | 'baseUpdatedAt'
    | 'userId'
    | 'deleted'
    | 'localReadyState'
    | 'updatedAt'
    | 'editedAt'
  >,
  schema: EntryInsertSchemaCapabilities,
  options: { includeCreatedAtUpdatedAt: boolean }
): EntryInsertParts => {
  const columns = ['id', 'type', 'content', 'timestamp', 'tags'];
  const values: SQLiteBindValue[] = [
    entry.id,
    entry.type,
    entry.content,
    entry.timestamp,
    entry.tags ? JSON.stringify(entry.tags) : null,
  ];

  if (schema.hasMediaJson) {
    columns.push('media_json');
    values.push(entry.media ? JSON.stringify(entry.media) : null);
  } else {
    const firstMedia = entry.media?.[0];
    columns.push('media_uri', 'media_type', 'media_duration');
    values.push(firstMedia?.uri || null, firstMedia?.mimeType || null, firstMedia?.duration || null);

    if (schema.hasMediaColumns) {
      columns.push('media_thumbnail', 'media_metadata');
      values.push(
        firstMedia?.thumbnail || null,
        firstMedia?.metadata ? JSON.stringify(firstMedia.metadata) : null
      );
    }
  }

  columns.push('recording_status', 'recording_duration');
  values.push(
    entry.recordingStatus === 'stopping' ? null : entry.recordingStatus || null,
    entry.recordingDuration || null
  );

  if (schema.hasSyncStatus) {
    columns.push('sync_status');
    values.push(entry.syncStatus ?? 'synced');
  }
  if (schema.hasSyncOp) {
    columns.push('sync_op');
    values.push(entry.syncOp ?? 'update');
  }
  if (schema.hasConflictedCopyOf) {
    columns.push('conflicted_copy_of');
    values.push(entry.conflictedCopyOf ?? null);
  }
  if (schema.hasBaseUpdatedAt) {
    columns.push('base_updated_at');
    values.push(entry.baseUpdatedAt ?? null);
  }
  if (schema.hasUserID) {
    columns.push('user_id');
    values.push(entry.userId ?? null);
  }
  if (schema.hasDeleted) {
    columns.push('deleted');
    values.push(entry.deleted ? 1 : 0);
  }
  if (schema.hasLocalReadyState) {
    columns.push('local_ready_state');
    values.push(entry.localReadyState ?? 'ready');
  }

  if (options.includeCreatedAtUpdatedAt) {
    columns.push('created_at', 'updated_at');
    values.push(entry.timestamp, entry.updatedAt ?? entry.editedAt ?? entry.timestamp);
  }

  return {
    columnsSql: columns.join(', '),
    placeholdersSql: columns.map(() => '?').join(', '),
    values,
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

const buildFtsContentMatchQuery = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const terms = trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term.replace(/"/g, '""')}"*`);

  return terms.length > 0 ? terms.join(' AND ') : null;
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
      ? await db.getAllAsync<EntryRow>(query, [limit])
      : await db.getAllAsync<EntryRow>(query);
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
    const result = await db.getFirstAsync<EntryRow>(
      'SELECT * FROM entries WHERE id = ?',
      [id]
    );
    return result ? rowToEntry(result) : null;
  } catch (error) {
    logger.error('Failed to get entry by id:', error);
    return null;
  }
};

export const getEntriesBySyncStatus = async (
  statuses: Array<Entry['syncStatus']>
): Promise<Entry[]> => {
  if (statuses.length === 0) return [];

  try {
    const db = getDatabase();
    const columns = await getTableColumns(db);
    if (!columns.has('sync_status')) return [];

    const placeholders = statuses.map(() => '?').join(', ');
    const result = await db.getAllAsync<EntryRow>(
      `SELECT * FROM entries
       WHERE sync_status IN (${placeholders})
       ORDER BY timestamp DESC`,
      statuses,
    );
    return result.map(rowToEntry);
  } catch (error) {
    logger.error('Failed to get entries by sync status:', error);
    return [];
  }
};

export const getEntriesByLocalReadyState = async (
  states: Array<NonNullable<Entry['localReadyState']>>
): Promise<Entry[]> => {
  if (states.length === 0) return [];

  try {
    const db = getDatabase();
    const columns = await getTableColumns(db);
    if (!columns.has('local_ready_state')) return [];

    const placeholders = states.map(() => '?').join(', ');
    const result = await db.getAllAsync<EntryRow>(
      `SELECT * FROM entries
       WHERE local_ready_state IN (${placeholders})
       ORDER BY timestamp DESC`,
      states,
    );
    return result.map(rowToEntry);
  } catch (error) {
    logger.error('Failed to get entries by local ready state:', error);
    return [];
  }
};

export const getVoiceEntriesBySyncStatus = async (
  statuses: Array<Entry['syncStatus']>
): Promise<Entry[]> => {
  if (statuses.length === 0) return [];

  try {
    const db = getDatabase();
    const columns = await getTableColumns(db);
    if (!columns.has('sync_status')) return [];

    const placeholders = statuses.map(() => '?').join(', ');
    const result = await db.getAllAsync<EntryRow>(
      `SELECT * FROM entries
       WHERE type = 'voice' AND sync_status IN (${placeholders})
       ORDER BY timestamp DESC`,
      statuses,
    );
    return result.map(rowToEntry);
  } catch (error) {
    logger.error('Failed to get voice entries by sync status:', error);
    return [];
  }
};

export const getPhotoEntriesBySyncStatus = async (
  statuses: Array<Entry['syncStatus']>
): Promise<Entry[]> => {
  if (statuses.length === 0) return [];

  try {
    const db = getDatabase();
    const columns = await getTableColumns(db);
    if (!columns.has('sync_status')) return [];

    const placeholders = statuses.map(() => '?').join(', ');
    const result = await db.getAllAsync<EntryRow>(
      `SELECT * FROM entries
       WHERE type = 'photo' AND sync_status IN (${placeholders})
       ORDER BY timestamp DESC`,
      statuses,
    );
    return result.map(rowToEntry);
  } catch (error) {
    logger.error('Failed to get photo entries by sync status:', error);
    return [];
  }
};

export interface CloudSyncIndicatorSummary {
  pendingEntries: number;
  pendingUploads: number;
  uploadingEntries: number;
  failedEntries: number;
}

export interface LocalSyncOverviewCounts {
  entryCount: number;
  photoCount: number;
  voiceCount: number;
}

export const getCloudSyncIndicatorSummary = async (): Promise<CloudSyncIndicatorSummary> => {
  try {
    const db = getDatabase();
    const columns = await getTableColumns(db);
    if (!columns.has('sync_status')) {
      return {
        pendingEntries: 0,
        pendingUploads: 0,
        uploadingEntries: 0,
        failedEntries: 0,
      };
    }

    const result = await db.getFirstAsync<{
      pending_entries?: number | null;
      pending_uploads?: number | null;
      uploading_entries?: number | null;
      failed_entries?: number | null;
    }>(
      `SELECT
         COALESCE(SUM(CASE WHEN sync_status IN ('pending', 'pending_delete') THEN 1 ELSE 0 END), 0) AS pending_entries,
         COALESCE(SUM(CASE WHEN sync_status = 'pending_upload' THEN 1 ELSE 0 END), 0) AS pending_uploads,
         COALESCE(SUM(CASE WHEN sync_status = 'uploading' THEN 1 ELSE 0 END), 0) AS uploading_entries,
         COALESCE(SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END), 0) AS failed_entries
       FROM entries`,
    );

    return {
      pendingEntries: Number(result?.pending_entries ?? 0),
      pendingUploads: Number(result?.pending_uploads ?? 0),
      uploadingEntries: Number(result?.uploading_entries ?? 0),
      failedEntries: Number(result?.failed_entries ?? 0),
    };
  } catch (error) {
    logger.error('Failed to get cloud sync indicator summary:', error);
    return {
      pendingEntries: 0,
      pendingUploads: 0,
      uploadingEntries: 0,
      failedEntries: 0,
    };
  }
};

export const getLocalSyncOverviewCounts = async (): Promise<LocalSyncOverviewCounts> => {
  try {
    const db = getDatabase();
    const columns = await getTableColumns(db);
    const whereClause = columns.has('deleted') ? 'WHERE deleted = 0' : '';

    const result = await db.getFirstAsync<{
      entry_count?: number | null;
      photo_count?: number | null;
      voice_count?: number | null;
    }>(
      `SELECT
         COUNT(*) AS entry_count,
         COALESCE(SUM(CASE WHEN type = 'photo' THEN 1 ELSE 0 END), 0) AS photo_count,
         COALESCE(SUM(CASE WHEN type = 'voice' THEN 1 ELSE 0 END), 0) AS voice_count
       FROM entries
       ${whereClause}`,
    );

    return {
      entryCount: Number(result?.entry_count ?? 0),
      photoCount: Number(result?.photo_count ?? 0),
      voiceCount: Number(result?.voice_count ?? 0),
    };
  } catch (error) {
    logger.error('Failed to get local sync overview counts:', error);
    return {
      entryCount: 0,
      photoCount: 0,
      voiceCount: 0,
    };
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
    const normalizedTags = normalizeEntryTags(entry.tags);

    // 获取表列信息
    const columns = await getTableColumns(db);
    const hasMediaJson = columns.has('media_json');
    const hasMediaColumns = columns.has('media_thumbnail') && columns.has('media_metadata');
    const hasConflictedCopyOf = columns.has('conflicted_copy_of');
    const hasSyncStatus = columns.has('sync_status');
    const hasSyncOp = columns.has('sync_op');
    const hasBaseUpdatedAt = columns.has('base_updated_at');
    const hasUserID = columns.has('user_id');
    const hasDeleted = columns.has('deleted');
    const hasLocalReadyState = columns.has('local_ready_state');
    const schemaCapabilities: EntryInsertSchemaCapabilities = {
      hasMediaJson,
      hasMediaColumns,
      hasSyncStatus,
      hasSyncOp,
      hasConflictedCopyOf,
      hasBaseUpdatedAt,
      hasUserID,
      hasDeleted,
      hasLocalReadyState,
    };

    if (hasMediaJson) {
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
    } else if (hasMediaColumns) {
      const parts = buildEntryInsertParts(
        {
          ...entry,
          id,
          timestamp,
          tags: normalizedTags,
        },
        schemaCapabilities,
        { includeCreatedAtUpdatedAt: false }
      );

      await db.runAsync(
        `INSERT INTO entries (${parts.columnsSql}) VALUES (${parts.placeholdersSql})`,
        parts.values
      );
    } else {
      const parts = buildEntryInsertParts(
        {
          ...entry,
          id,
          timestamp,
          tags: normalizedTags,
        },
        schemaCapabilities,
        { includeCreatedAtUpdatedAt: false }
      );
      await db.runAsync(
        `INSERT INTO entries (${parts.columnsSql}) VALUES (${parts.placeholdersSql})`,
        parts.values
      );
    }

    await upsertEntryContentFts(db, id, entry.content);

    // 同步规范化 tags
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

/**
 * 更新记录
 * 兼容旧表结构：如果 media_thumbnail/media_metadata 列不存在则不更新这些列
 */
export const updateEntry = async (id: string, updates: Partial<Entry>): Promise<void> => {
  try {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    const normalizedTags = normalizeEntryTags(updates.tags);

    // 获取表列信息
    const columns = await getTableColumns(db);
    const hasMediaColumns = columns.has('media_thumbnail') && columns.has('media_metadata');
    const hasConflictedCopyOf = columns.has('conflicted_copy_of');
    const hasBaseUpdatedAt = columns.has('base_updated_at');
    const hasUserID = columns.has('user_id');
    const hasDeleted = columns.has('deleted');
    const hasLocalReadyState = columns.has('local_ready_state');

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
        const m = updates.media?.[0];
        fields.push('media_uri = ?', 'media_type = ?', 'media_duration = ?', 'media_thumbnail = ?', 'media_metadata = ?');
        values.push(
          m?.uri ?? null,
          m?.mimeType ?? null,
          m?.duration ?? null,
          m?.thumbnail ?? null,
          m?.metadata ? JSON.stringify(m.metadata) : null
        );
      } else {
        const m = updates.media?.[0];
        fields.push('media_uri = ?', 'media_type = ?', 'media_duration = ?');
        values.push(m?.uri ?? null, m?.mimeType ?? null, m?.duration ?? null);
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
    if (updates.syncStatus !== undefined && columns.has('sync_status')) {
      fields.push('sync_status = ?');
      values.push(updates.syncStatus);
    }
    if (updates.syncOp !== undefined && columns.has('sync_op')) {
      fields.push('sync_op = ?');
      values.push(updates.syncOp);
    }
    if (updates.conflictedCopyOf !== undefined && hasConflictedCopyOf) {
      fields.push('conflicted_copy_of = ?');
      values.push(updates.conflictedCopyOf);
    }
    if (updates.baseUpdatedAt !== undefined && hasBaseUpdatedAt) {
      fields.push('base_updated_at = ?');
      values.push(updates.baseUpdatedAt);
    }
    if (updates.userId !== undefined && hasUserID) {
      fields.push('user_id = ?');
      values.push(updates.userId);
    }
    if (updates.deleted !== undefined && hasDeleted) {
      fields.push('deleted = ?');
      values.push(updates.deleted ? 1 : 0);
    }
    if (updates.localReadyState !== undefined && hasLocalReadyState) {
      fields.push('local_ready_state = ?');
      values.push(updates.localReadyState);
    }

    fields.push('updated_at = ?');
    values.push(Date.now());

    values.push(id);

    await db.runAsync(
      `UPDATE entries SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (updates.content !== undefined) {
      await upsertEntryContentFts(db, id, updates.content);
    }

    // 同步规范化 tags
    if (normalizedTags !== undefined) {
      await upsertEntryTags(db, id, normalizedTags);
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
    await deleteEntryContentFts(db, id);
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
    const normalizedQuery = buildFtsContentMatchQuery(query);
    if (!normalizedQuery) {
      return [];
    }

    const result = await db.getAllAsync<EntryRow>(
      `SELECT e.* FROM entries e
       JOIN entries_fts f ON f.entry_id = e.id
       WHERE f.content MATCH ?
       ORDER BY e.timestamp DESC
       LIMIT ?`,
      [normalizedQuery, limit]
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
    const result = await db.getAllAsync<EntryRow>(
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
    const result = await db.getAllAsync<EntryRow>(query, params);
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

// Re-export for backward compatibility
export type { EntryFilters } from '@/src/types/entry';
import type { EntryFilters } from '@/src/types/entry';

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
    const columns = await getTableColumns(db);
    const conditions: string[] = [];
    const params: any[] = [];

    if (columns.has('deleted')) {
      conditions.push('e.deleted = 0');
    }

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
    const normalizedSearch = filters.search ? buildFtsContentMatchQuery(filters.search) : null;
    if (normalizedSearch) {
      conditions.push('e.id IN (SELECT f.entry_id FROM entries_fts f WHERE f.content MATCH ?)');
      params.push(normalizedSearch);
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
    const result = await db.getAllAsync<EntryRow>(
      `SELECT e.* FROM entries e ${where} ORDER BY e.timestamp DESC LIMIT ?`,
      [...params, limit]
    );
    const entries = result.map(rowToEntry);
    entries
      .filter((entry) => entry.type === 'photo' && (entry.media?.length ?? 0) > 0)
      .forEach((entry) => {
        logger.log('[db:getEntriesPage] photo media snapshot', summarizePhotoMediaForDebug(entry));
      });
    return entries;
  } catch (error) {
    logger.error('Failed to get entries page:', error);
    return [];
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
    const values: any[] = ['pending_delete'];

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
  const hasMediaColumns = columns.has('media_thumbnail') && columns.has('media_metadata');
  const hasSyncStatus = columns.has('sync_status');
  const hasSyncOp = columns.has('sync_op');
  const hasConflictedCopyOf = columns.has('conflicted_copy_of');
  const hasBaseUpdatedAt = columns.has('base_updated_at');
  const hasUserID = columns.has('user_id');
  const hasDeleted = columns.has('deleted');
  const schemaCapabilities: EntryInsertSchemaCapabilities = {
    hasMediaJson,
    hasMediaColumns,
    hasSyncStatus,
    hasSyncOp,
    hasConflictedCopyOf,
    hasBaseUpdatedAt,
    hasUserID,
    hasDeleted,
    hasLocalReadyState: false,
  };

  await db.withTransactionAsync(async () => {
    for (const e of entries) {
      try {
        const normalizedTags = normalizeEntryTags(e.tags);
        const parts = buildEntryInsertParts(
          {
            ...e,
            tags: normalizedTags,
          },
          schemaCapabilities,
          { includeCreatedAtUpdatedAt: true }
        );
        await db.runAsync(
          `INSERT OR IGNORE INTO entries (${parts.columnsSql}) VALUES (${parts.placeholdersSql})`,
          parts.values
        );

        // 检查实际插入的行数
        const result = await db.getFirstAsync<{ changes: number }>(
          'SELECT changes() as changes'
        );
        const wasInserted = result?.changes === 1;

        // 只有实际插入成功后才同步标签并记录 ID
        if (wasInserted) {
          await upsertEntryContentFts(db, e.id, e.content);
          await upsertEntryTags(db, e.id, normalizedTags ?? []);
          insertedIds.push(e.id);
        }
      } catch (error) {
        failed++;
        logger.warn(`[restoreEntries] 恢复记录失败: ${e.id}`, error);
      }
    }
  });

  if (failed > 0) {
    logger.warn(`[restoreEntries] ${failed} 条记录恢复失败`);
  }
  logger.log(`✅ 恢复完成：${insertedIds.length}/${entries.length} 条${failed > 0 ? `，${failed} 条失败` : ''}`);
  return insertedIds;
};
