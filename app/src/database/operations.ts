/**
 * SQLite 数据库操作层
 * 提供 CRUD 操作
 */

import { getDatabase } from './sqlite';
import { Entry } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';

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

    if (hasMediaJson) {
      const mediaJson = entry.media ? JSON.stringify(entry.media) : null;
      await db.runAsync(
        `INSERT INTO entries (
          id, type, content, timestamp, tags,
          media_json,
          recording_status, recording_duration${hasSyncStatus ? ', sync_status' : ''}${hasSyncOp ? ', sync_op' : ''}${hasConflictedCopyOf ? ', conflicted_copy_of' : ''}${hasBaseUpdatedAt ? ', base_updated_at' : ''}${hasUserID ? ', user_id' : ''}${hasDeleted ? ', deleted' : ''}${hasLocalReadyState ? ', local_ready_state' : ''}
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?${hasSyncStatus ? ', ?' : ''}${hasSyncOp ? ', ?' : ''}${hasConflictedCopyOf ? ', ?' : ''}${hasBaseUpdatedAt ? ', ?' : ''}${hasUserID ? ', ?' : ''}${hasDeleted ? ', ?' : ''}${hasLocalReadyState ? ', ?' : ''})`,
        [
          id, entry.type, entry.content, timestamp,
          entry.tags ? JSON.stringify(entry.tags) : null,
          mediaJson,
          (entry.recordingStatus === 'stopping' ? null : entry.recordingStatus) || null, entry.recordingDuration || null,
          ...(hasSyncStatus ? [entry.syncStatus ?? 'synced'] : []),
          ...(hasSyncOp ? [entry.syncOp ?? 'update'] : []),
          ...(hasConflictedCopyOf ? [entry.conflictedCopyOf ?? null] : []),
          ...(hasBaseUpdatedAt ? [entry.baseUpdatedAt ?? null] : []),
          ...(hasUserID ? [entry.userId ?? null] : []),
          ...(hasDeleted ? [entry.deleted ? 1 : 0] : []),
          ...(hasLocalReadyState ? [entry.localReadyState ?? 'ready'] : []),
        ]
      );
    } else if (hasMediaColumns) {
      // 序列化媒体元数据
      const firstMedia = entry.media?.[0];
      const mediaMetadata = firstMedia?.metadata
        ? JSON.stringify(firstMedia.metadata)
        : null;

      await db.runAsync(
        `INSERT INTO entries (
          id, type, content, timestamp, tags,
          media_uri, media_type, media_duration, media_thumbnail, media_metadata,
          recording_status, recording_duration${hasSyncStatus ? ', sync_status' : ''}${hasSyncOp ? ', sync_op' : ''}${hasConflictedCopyOf ? ', conflicted_copy_of' : ''}${hasBaseUpdatedAt ? ', base_updated_at' : ''}${hasUserID ? ', user_id' : ''}${hasDeleted ? ', deleted' : ''}${hasLocalReadyState ? ', local_ready_state' : ''}
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${hasSyncStatus ? ', ?' : ''}${hasSyncOp ? ', ?' : ''}${hasConflictedCopyOf ? ', ?' : ''}${hasBaseUpdatedAt ? ', ?' : ''}${hasUserID ? ', ?' : ''}${hasDeleted ? ', ?' : ''}${hasLocalReadyState ? ', ?' : ''})`,
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
          ...(hasSyncStatus ? [entry.syncStatus ?? 'synced'] : []),
          ...(hasSyncOp ? [entry.syncOp ?? 'update'] : []),
          ...(hasConflictedCopyOf ? [entry.conflictedCopyOf ?? null] : []),
          ...(hasBaseUpdatedAt ? [entry.baseUpdatedAt ?? null] : []),
          ...(hasUserID ? [entry.userId ?? null] : []),
          ...(hasDeleted ? [entry.deleted ? 1 : 0] : []),
          ...(hasLocalReadyState ? [entry.localReadyState ?? 'ready'] : []),
        ]
      );
    } else {
      // 兼容更旧的表结构：未启用 media_json/media_metadata 时退回 legacy 媒体列写入
      const firstMedia = entry.media?.[0];
      await db.runAsync(
        `INSERT INTO entries (
          id, type, content, timestamp, tags,
          media_uri, media_type, media_duration,
          recording_status, recording_duration${hasSyncStatus ? ', sync_status' : ''}${hasSyncOp ? ', sync_op' : ''}${hasConflictedCopyOf ? ', conflicted_copy_of' : ''}${hasBaseUpdatedAt ? ', base_updated_at' : ''}${hasUserID ? ', user_id' : ''}${hasDeleted ? ', deleted' : ''}${hasLocalReadyState ? ', local_ready_state' : ''}
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?${hasSyncStatus ? ', ?' : ''}${hasSyncOp ? ', ?' : ''}${hasConflictedCopyOf ? ', ?' : ''}${hasBaseUpdatedAt ? ', ?' : ''}${hasUserID ? ', ?' : ''}${hasDeleted ? ', ?' : ''}${hasLocalReadyState ? ', ?' : ''})`,
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
          ...(hasSyncStatus ? [entry.syncStatus ?? 'synced'] : []),
          ...(hasSyncOp ? [entry.syncOp ?? 'update'] : []),
          ...(hasConflictedCopyOf ? [entry.conflictedCopyOf ?? null] : []),
          ...(hasBaseUpdatedAt ? [entry.baseUpdatedAt ?? null] : []),
          ...(hasUserID ? [entry.userId ?? null] : []),
          ...(hasDeleted ? [entry.deleted ? 1 : 0] : []),
          ...(hasLocalReadyState ? [entry.localReadyState ?? 'ready'] : []),
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
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
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
    const result = await db.getAllAsync<EntryRow>(
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
  const hasSyncStatus = columns.has('sync_status');
  const hasSyncOp = columns.has('sync_op');
  const hasConflictedCopyOf = columns.has('conflicted_copy_of');
  const hasBaseUpdatedAt = columns.has('base_updated_at');
  const hasUserID = columns.has('user_id');
  const hasDeleted = columns.has('deleted');

  await db.withTransactionAsync(async () => {
    for (const e of entries) {
      try {
        await db.runAsync(
          hasMediaJson
            ? `INSERT OR IGNORE INTO entries
                 (id, type, content, timestamp, tags, media_json,
                  recording_status, recording_duration${hasSyncStatus ? ', sync_status' : ''}${hasSyncOp ? ', sync_op' : ''}${hasConflictedCopyOf ? ', conflicted_copy_of' : ''}${hasBaseUpdatedAt ? ', base_updated_at' : ''}${hasUserID ? ', user_id' : ''}${hasDeleted ? ', deleted' : ''}, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?${hasSyncStatus ? ', ?' : ''}${hasSyncOp ? ', ?' : ''}${hasConflictedCopyOf ? ', ?' : ''}${hasBaseUpdatedAt ? ', ?' : ''}${hasUserID ? ', ?' : ''}${hasDeleted ? ', ?' : ''}, ?, ?)`
            : `INSERT OR IGNORE INTO entries
                 (id, type, content, timestamp, tags, media_uri, media_type,
                  media_duration, recording_status, recording_duration${hasSyncStatus ? ', sync_status' : ''}${hasSyncOp ? ', sync_op' : ''}${hasConflictedCopyOf ? ', conflicted_copy_of' : ''}${hasBaseUpdatedAt ? ', base_updated_at' : ''}${hasUserID ? ', user_id' : ''}${hasDeleted ? ', deleted' : ''}, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?${hasSyncStatus ? ', ?' : ''}${hasSyncOp ? ', ?' : ''}${hasConflictedCopyOf ? ', ?' : ''}${hasBaseUpdatedAt ? ', ?' : ''}${hasUserID ? ', ?' : ''}${hasDeleted ? ', ?' : ''}, ?, ?)`,
          hasMediaJson
            ? [
                e.id, e.type, e.content, e.timestamp,
                e.tags ? JSON.stringify(e.tags) : null,
                e.media ? JSON.stringify(e.media) : null,
                e.recordingStatus ?? null, e.recordingDuration ?? null,
                ...(hasSyncStatus ? [e.syncStatus ?? 'synced'] : []),
                ...(hasSyncOp ? [e.syncOp ?? 'update'] : []),
                ...(hasConflictedCopyOf ? [e.conflictedCopyOf ?? null] : []),
                ...(hasBaseUpdatedAt ? [e.baseUpdatedAt ?? null] : []),
                ...(hasUserID ? [e.userId ?? null] : []),
                ...(hasDeleted ? [e.deleted ? 1 : 0] : []),
                e.timestamp, e.updatedAt ?? e.editedAt ?? e.timestamp,
              ]
            : [
                e.id, e.type, e.content, e.timestamp,
                e.tags ? JSON.stringify(e.tags) : null,
                e.media?.[0]?.uri ?? null, e.media?.[0]?.mimeType ?? null,
                e.media?.[0]?.duration ?? null,
                e.recordingStatus ?? null, e.recordingDuration ?? null,
                ...(hasSyncStatus ? [e.syncStatus ?? 'synced'] : []),
                ...(hasSyncOp ? [e.syncOp ?? 'update'] : []),
                ...(hasConflictedCopyOf ? [e.conflictedCopyOf ?? null] : []),
                ...(hasBaseUpdatedAt ? [e.baseUpdatedAt ?? null] : []),
                ...(hasUserID ? [e.userId ?? null] : []),
                ...(hasDeleted ? [e.deleted ? 1 : 0] : []),
                e.timestamp, e.updatedAt ?? e.editedAt ?? e.timestamp,
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
