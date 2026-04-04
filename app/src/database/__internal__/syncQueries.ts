import { getDatabase } from '../sqlite';
import type { Entry } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';
import { rowToEntry, type EntryRow } from './entryMapper';
import { getTableColumns } from './schemaCapabilities';

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

const EMPTY_CLOUD_SYNC_SUMMARY: CloudSyncIndicatorSummary = {
  pendingEntries: 0,
  pendingUploads: 0,
  uploadingEntries: 0,
  failedEntries: 0,
};

const isEntriesTableMissingError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('no such table: entries');
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

export const getCloudSyncIndicatorSummary = async (): Promise<CloudSyncIndicatorSummary> => {
  try {
    const db = getDatabase();
    const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(entries)`);
    if (tableInfo.length === 0) {
      logger.warn('[syncQueries] cloud sync indicator degraded: entries table is not ready');
      return EMPTY_CLOUD_SYNC_SUMMARY;
    }

    const columns = new Set(tableInfo.map((column) => column.name));
    if (!columns.has('sync_status')) {
      return EMPTY_CLOUD_SYNC_SUMMARY;
    }

    let result;
    try {
      result = await db.getFirstAsync<{
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
    } catch (error) {
      if (isEntriesTableMissingError(error)) {
        logger.warn('[syncQueries] cloud sync indicator degraded: no such table: entries');
        return EMPTY_CLOUD_SYNC_SUMMARY;
      }
      throw error;
    }

    return {
      pendingEntries: Number(result?.pending_entries ?? 0),
      pendingUploads: Number(result?.pending_uploads ?? 0),
      uploadingEntries: Number(result?.uploading_entries ?? 0),
      failedEntries: Number(result?.failed_entries ?? 0),
    };
  } catch (error) {
    logger.error('Failed to get cloud sync indicator summary:', error);
    return EMPTY_CLOUD_SYNC_SUMMARY;
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
