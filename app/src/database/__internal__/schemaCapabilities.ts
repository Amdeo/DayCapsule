import type { SQLiteBindValue } from 'expo-sqlite';
import { getDatabase } from '../sqlite';
import type { Entry } from '@/src/types/entry';

export type EntryInsertSchemaCapabilities = {
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

export type EntryInsertParts = {
  columnsSql: string;
  placeholdersSql: string;
  values: SQLiteBindValue[];
};

let cachedColumnNames: Set<string> | null = null;

export const getTableColumns = async (
  db: ReturnType<typeof getDatabase>
): Promise<Set<string>> => {
  if (cachedColumnNames) return cachedColumnNames;

  const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(entries)`);
  cachedColumnNames = new Set(tableInfo.map((col) => col.name));
  return cachedColumnNames;
};

export const invalidateColumnCache = (): void => {
  cachedColumnNames = null;
};

export const buildEntryInsertParts = (
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
