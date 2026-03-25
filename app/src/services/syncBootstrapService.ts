import * as DB from '@/src/database/operations';
import { getApiClient } from '@/src/services/apiClient';
import { useSyncStore } from '@/src/store/syncStore';
import type { Entry, MediaInfo } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';
import { normalizeCloudMediaItem } from '@/src/utils/mediaUtils';

export interface InitialSyncInspection {
  localCount: number;
  cloudCount: number;
}

export interface InitialSyncFlow extends InitialSyncInspection {
  type: 'restoring' | 'backing-up' | 'needs-decision' | 'ready';
}

export interface SyncBootstrapServiceApi {
  inspectInitialState: () => Promise<InitialSyncInspection>;
  buildInitialFlow: (inspection: InitialSyncInspection) => InitialSyncFlow;
  runInitialFlow: (source: 'cloud' | 'local') => Promise<void>;
}

const REMOTE_MEDIA_URI_RE = /^https?:\/\//i;
const RELATIVE_MEDIA_API_RE = /^\/api\/media(?:\/|$)/i;

function isRemoteMediaUri(uri: string | undefined): boolean {
  return !!uri && (REMOTE_MEDIA_URI_RE.test(uri) || RELATIVE_MEDIA_API_RE.test(uri));
}

function normalizeImportedTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags.filter((tag): tag is string => typeof tag === 'string');
  }

  if (typeof tags !== 'string' || tags.trim() === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === 'string')
      : [];
  } catch {
    return [];
  }
}

function normalizeImportedMedia(media: unknown): MediaInfo[] {
  if (Array.isArray(media)) {
    return media.filter(
      (item): item is MediaInfo => Boolean(item) && typeof item === 'object'
    ).map(normalizeCloudMediaItem);
  }

  if (!media) {
    return [];
  }

  if (typeof media === 'string') {
    try {
      const parsed = JSON.parse(media);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is MediaInfo => Boolean(item) && typeof item === 'object'
        ).map(normalizeCloudMediaItem);
      }
      if (parsed && typeof parsed === 'object') {
        return [normalizeCloudMediaItem(parsed as MediaInfo)];
      }
      return [];
    } catch {
      return [];
    }
  }

  if (typeof media === 'object') {
    return [normalizeCloudMediaItem(media as MediaInfo)];
  }

  return [];
}

function normalizeImportedEntry(entry: Partial<Entry>): Entry {
  const timestamp = entry.timestamp ?? entry.updatedAt ?? Date.now();

  return {
    id: entry.id ?? `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: entry.type ?? 'text',
    content: entry.content ?? '',
    timestamp,
    tags: normalizeImportedTags(entry.tags),
    media: normalizeImportedMedia(entry.media),
    recordingStatus: entry.recordingStatus,
    recordingDuration: entry.recordingDuration,
    syncStatus: 'synced',
    syncOp: 'update',
    updatedAt: entry.updatedAt ?? timestamp,
    baseUpdatedAt: entry.updatedAt ?? timestamp,
    conflictedCopyOf: entry.conflictedCopyOf,
    userId: entry.userId,
    deleted: entry.deleted ?? false,
  };
}

function shouldSkipBootstrapMediaUpload(entry: Entry): boolean {
  return entry.syncStatus === 'pending_delete' || entry.syncOp === 'delete' || entry.deleted === true;
}

async function prepareEntryMediaForCloudBackup(
  entry: Entry,
  uploadMedia: (localUri: string) => Promise<{ id: string; url: string }>
): Promise<MediaInfo[] | null> {
  if (!entry.media?.length || shouldSkipBootstrapMediaUpload(entry)) {
    return null;
  }

  let changed = false;
  const preparedMedia: MediaInfo[] = [];

  for (const item of entry.media) {
    if (item.remoteUri) {
      preparedMedia.push(item);
      continue;
    }

    if (isRemoteMediaUri(item.uri)) {
      changed = true;
      preparedMedia.push({
        ...item,
        remoteUri: item.uri,
      });
      continue;
    }

    const upload = await uploadMedia(item.uri);
    changed = true;
    preparedMedia.push({
      ...item,
      remoteUri: upload.url,
    });
  }

  return changed ? preparedMedia : null;
}

export function createSyncBootstrapService(): SyncBootstrapServiceApi {
  const client = getApiClient();

  const inspectInitialState = async (): Promise<InitialSyncInspection> => {
    const [localCount, cloud] = await Promise.all([
      DB.getEntriesCount(),
      client.get<{ entryCount: number }>('/entries/count'),
    ]);

    return {
      localCount,
      cloudCount: cloud.entryCount ?? 0,
    };
  };

  const buildInitialFlow = (inspection: InitialSyncInspection): InitialSyncFlow => {
    if (inspection.localCount === 0 && inspection.cloudCount > 0) {
      return { ...inspection, type: 'restoring' };
    }
    if (inspection.localCount > 0 && inspection.cloudCount === 0) {
      return { ...inspection, type: 'backing-up' };
    }
    if (inspection.localCount > 0 && inspection.cloudCount > 0) {
      return { ...inspection, type: 'needs-decision' };
    }
    return { ...inspection, type: 'ready' };
  };

  const runInitialFlow = async (source: 'cloud' | 'local'): Promise<void> => {
    if (source === 'cloud') {
      await useSyncStore.getState().setInitialSyncState('restoring');
      const exported = await client.get<Partial<Entry>[]>('/entries/export');
      await DB.clearAllEntries();
      await DB.restoreEntries((exported ?? []).map(normalizeImportedEntry));
      await useSyncStore.getState().setInitialSyncState('ready');
      return;
    }

    await useSyncStore.getState().setInitialSyncState('backing-up');
    const entries = await DB.getAllEntries();
    for (const entry of entries) {
      if (entry.syncStatus === 'pending_upload' || entry.syncStatus === 'uploading') {
        continue;
      }

      const preparedMedia = await prepareEntryMediaForCloudBackup(
        entry,
        (localUri) => client.uploadFile('/media/upload', localUri, 'file')
      );
      if (preparedMedia) {
        await DB.updateEntry(entry.id, { media: preparedMedia });
      }

      await DB.updateEntry(entry.id, {
        syncStatus: entry.syncStatus === 'pending_delete' ? 'pending_delete' : 'pending',
        syncOp: entry.syncStatus === 'pending_delete' || entry.syncOp === 'delete' ? 'delete' : 'create',
        baseUpdatedAt: entry.baseUpdatedAt ?? entry.updatedAt,
        deleted: entry.deleted ?? false,
      });
    }
    await useSyncStore.getState().setInitialSyncState('ready');
    logger.log('[syncBootstrap] local entries marked for cloud backup');
  };

  return {
    inspectInitialState,
    buildInitialFlow,
    runInitialFlow,
  };
}
