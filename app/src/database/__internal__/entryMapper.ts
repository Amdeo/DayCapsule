import type { Entry } from '@/src/types/entry';

export type EntryMediaInfo = import('@/src/types/entry').MediaInfo;
export type EntryMediaMetadata = NonNullable<EntryMediaInfo['metadata']>;

export type EntryRow = {
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

export const normalizeEntryType = (value: string): Entry['type'] =>
  ENTRY_TYPES.includes(value as Entry['type']) ? (value as Entry['type']) : 'text';

export const normalizeRecordingStatus = (
  value: string | null | undefined
): Entry['recordingStatus'] =>
  value && RECORDING_STATUSES.includes(value as NonNullable<Entry['recordingStatus']>)
    ? (value as NonNullable<Entry['recordingStatus']>)
    : undefined;

export const normalizeSyncStatus = (
  value: string | null | undefined
): NonNullable<Entry['syncStatus']> =>
  value && SYNC_STATUSES.includes(value as NonNullable<Entry['syncStatus']>)
    ? (value as NonNullable<Entry['syncStatus']>)
    : 'synced';

export const normalizeSyncOp = (
  value: string | null | undefined
): NonNullable<Entry['syncOp']> =>
  value && SYNC_OPS.includes(value as NonNullable<Entry['syncOp']>)
    ? (value as NonNullable<Entry['syncOp']>)
    : 'update';

export const normalizeLocalReadyState = (
  value: string | null | undefined
): NonNullable<Entry['localReadyState']> =>
  value && LOCAL_READY_STATES.includes(value as NonNullable<Entry['localReadyState']>)
    ? (value as NonNullable<Entry['localReadyState']>)
    : 'ready';

export const normalizeEntryMedia = (media: unknown): EntryMediaInfo[] | undefined => {
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

export const normalizeLegacyMediaMetadata = (
  metadata: unknown
): EntryMediaMetadata | undefined => {
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

export const rowToEntry = (row: EntryRow): Entry => {
  let media: EntryMediaInfo[] | undefined;
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

export const summarizePhotoMediaForDebug = (entry: Entry) => ({
  entryId: entry.id,
  mediaCount: entry.media?.length ?? 0,
  media: (entry.media ?? []).map((media) => ({
    uri: media.uri,
    remoteUri: media.remoteUri,
    thumbnail: media.thumbnail,
    remoteThumbnail: media.remoteThumbnail,
  })),
});

export const normalizeEntryTags = (tags: string[] | undefined): string[] | undefined => {
  if (tags === undefined) {
    return undefined;
  }

  return [...new Set(tags)];
};
