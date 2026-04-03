/**
 * 云同步序列化工具
 * 本地 Entry ↔ 服务端 Payload 的纯变换函数，无副作用
 */

import type { Entry } from '@/src/types/entry';
import type { MediaValidationRun } from '@/src/services/cloudMediaSyncService';
import type { ServerEntryPayload } from './syncTypes';

export function parseTags(tags: ServerEntryPayload['tags']): string[] {
  if (Array.isArray(tags)) return tags;
  if (typeof tags !== 'string' || tags.trim() === '') return [];

  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseMedia(
  media: ServerEntryPayload['media'],
  fallback?: Entry['media']
): NonNullable<Entry['media']> {
  if (Array.isArray(media)) return media;
  if (typeof media !== 'string' || media.trim() === '') return fallback ?? [];

  try {
    const parsed = JSON.parse(media);
    return Array.isArray(parsed) ? parsed : (fallback ?? []);
  } catch {
    return fallback ?? [];
  }
}

export function parseTimestamp(raw?: string): number | undefined {
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildChangeId(entry: Entry): string {
  const op = entry.syncOp === 'delete' || entry.syncStatus === 'pending_delete'
    ? 'delete'
    : (entry.syncOp ?? 'update');
  const version = entry.updatedAt ?? entry.baseUpdatedAt ?? entry.timestamp;
  return `${entry.id}:${op}:${version}`;
}

export function mapEntryToServer(entry: Entry) {
  return {
    id: entry.id,
    type: entry.type,
    content: entry.content,
    tags: JSON.stringify(entry.tags ?? []),
    media: JSON.stringify(
      (entry.media ?? []).map((item) => ({
        ...item,
        uri: item.remoteUri ?? item.uri,
        thumbnail: item.remoteThumbnail ?? item.thumbnail,
      }))
    ),
    recordingStatus: entry.recordingStatus ?? null,
    recordingDuration: entry.recordingDuration ?? null,
    createdAt: entry.timestamp ? new Date(entry.timestamp).toISOString() : undefined,
    updatedAt: entry.updatedAt ? new Date(entry.updatedAt).toISOString() : undefined,
    syncStatus: entry.syncStatus,
  };
}

const REMOTE_URI_RE = /^(?:https?:\/\/|\/api\/media(?:\/|$))/i;

export function isRemoteMediaUri(uri: string | undefined): boolean {
  return !!uri && REMOTE_URI_RE.test(uri);
}

export function hasRemoteMedia(entry: Entry): boolean {
  return (entry.media ?? []).some((media) =>
    isRemoteMediaUri(media.remoteUri)
    || isRemoteMediaUri(media.uri)
    || isRemoteMediaUri(media.remoteThumbnail)
    || isRemoteMediaUri(media.thumbnail)
  );
}

export function normalizeMediaValidationRun(
  run: MediaValidationRun | undefined,
  total: number
): MediaValidationRun {
  if (run?.summary) {
    return run;
  }

  return {
    summary: {
      status: 'failed',
      total,
      downloaded: 0,
      missing: 0,
      failed: total,
      suspect: 0,
      repairable: 0,
      lastError: 'Media validation returned no result',
      lastValidatedAt: Date.now(),
    },
    issues: [],
  };
}
