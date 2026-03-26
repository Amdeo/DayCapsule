import { getApiClient, ApiError } from '@/src/services/apiClient';
import * as DB from '@/src/database/operations';
import type { Entry } from '@/src/types/entry';
import { useMediaRepairStore } from '@/src/store/mediaRepairStore';
import { useSyncStore, type InitialSyncState } from '@/src/store/syncStore';
import { useCloudSyncIndicatorStore } from '@/src/store/cloudSyncIndicatorStore';
import { createCloudMediaSyncService, type MediaValidationRun } from './cloudMediaSyncService';
import { showPhotoRepairPrompt } from './showPhotoRepairPrompt';
import { logger } from '@/src/utils/logger';
import { normalizeCloudMediaItem } from '@/src/utils/mediaUtils';

export interface SyncStatus {
  lastSyncAt: number | null;
  lastSyncError: string | null;
  initialSyncState: InitialSyncState;
  pendingEntries: number;
  pendingUploads: number;
  uploadingEntries: number;
  failedEntries: number;
  conflictCopies: number;
}

export interface SyncServiceApi {
  syncNow: () => Promise<void>;
  getStatus: () => Promise<SyncStatus>;
}

type SyncResult = {
  changeId: string;
  status: 'applied' | 'conflicted' | 'ignored';
  entryId: string;
};

type ServerEntryPayload = {
  id: string;
  type: Entry['type'];
  content?: string;
  tags?: string[] | string | null;
  media?: Entry['media'] | string | null;
  recordingStatus?: Entry['recordingStatus'] | null;
  recordingDuration?: number | null;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: Entry['syncStatus'] | null;
  userId?: string | null;
};

type ServerChangePayload = {
  changeId: number;
  op: 'create' | 'update' | 'delete';
  entry: ServerEntryPayload;
};

type ConflictPayload = {
  changeId: string;
  entryId: string;
  reason: string;
  serverEntry: ServerEntryPayload;
  clientEntry: ServerEntryPayload;
};

type SyncResponsePayload = {
  newCursor: number;
  results: SyncResult[];
  serverChanges: ServerChangePayload[];
  conflicts: ConflictPayload[];
};

let inFlightSync: Promise<void> | null = null;
let pendingSyncRequested = false;
let queuedSyncPromise: Promise<void> | null = null;

function parseTags(tags: ServerEntryPayload['tags']): string[] {
  if (Array.isArray(tags)) return tags;
  if (typeof tags !== 'string' || tags.trim() === '') return [];

  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseMedia(
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

function parseTimestamp(raw?: string): number | undefined {
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildChangeId(entry: Entry): string {
  const op = entry.syncOp === 'delete' || entry.syncStatus === 'pending_delete'
    ? 'delete'
    : (entry.syncOp ?? 'update');
  const version = entry.updatedAt ?? entry.baseUpdatedAt ?? entry.timestamp;
  return `${entry.id}:${op}:${version}`;
}

function mapEntryToServer(entry: Entry) {
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

function isRemoteMediaUri(uri: string | undefined): boolean {
  return !!uri && REMOTE_URI_RE.test(uri);
}

function hasRemoteMedia(entry: Entry): boolean {
  return (entry.media ?? []).some((media) =>
    isRemoteMediaUri(media.remoteUri)
    || isRemoteMediaUri(media.uri)
    || isRemoteMediaUri(media.remoteThumbnail)
    || isRemoteMediaUri(media.thumbnail)
  );
}

function normalizeMediaValidationRun(
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

export function createCloudSyncService(): SyncServiceApi {
  const api = getApiClient();

  const ensureSyncStoreLoaded = async (): Promise<void> => {
    if (!useSyncStore.getState().isLoaded) {
      await useSyncStore.getState().load();
    }
  };

  const collectPendingChanges = async () => {
    const pending = await DB.getEntriesBySyncStatus(['pending', 'failed', 'pending_delete']);
    return pending;
  };

  const mapServerEntryToLocal = async (serverEntry: ServerEntryPayload): Promise<Entry | null> => {
    if (!serverEntry?.id) return null;

    const existing = await DB.getEntryById(serverEntry.id);
    const createdAt = parseTimestamp(serverEntry.createdAt) ?? existing?.timestamp ?? Date.now();
    const updatedAt = parseTimestamp(serverEntry.updatedAt) ?? createdAt;

    return {
      id: serverEntry.id,
      type: serverEntry.type,
      content: serverEntry.content ?? '',
      timestamp: createdAt,
      tags: parseTags(serverEntry.tags),
      media: parseMedia(serverEntry.media, existing?.media).map(normalizeCloudMediaItem),
      recordingStatus: serverEntry.recordingStatus ?? undefined,
      recordingDuration: serverEntry.recordingDuration ?? undefined,
      syncStatus: 'synced',
      syncOp: 'update',
      updatedAt,
      baseUpdatedAt: updatedAt,
      conflictedCopyOf: undefined,
      userId: serverEntry.userId ?? undefined,
      deleted: false,
    };
  };

  const createConflictCopy = async (conflict: ConflictPayload): Promise<Entry | null> => {
    if (!conflict.serverEntry?.id || !conflict.clientEntry?.id) return null;

    const existing = await DB.getEntryById(conflict.serverEntry.id);
    const mainEntry = await mapServerEntryToLocal(conflict.serverEntry);
    if (!mainEntry) return null;

    if (existing) {
      await DB.updateEntry(conflict.serverEntry.id, mainEntry);
    } else {
      await DB.restoreEntries([mainEntry]);
    }

    const conflictCopy: Omit<Entry, 'id' | 'timestamp'> = {
      type: conflict.clientEntry.type,
      content: conflict.clientEntry.content ?? '',
      tags: parseTags(conflict.clientEntry.tags),
      media: parseMedia(conflict.clientEntry.media, existing?.media),
      recordingStatus: conflict.clientEntry.recordingStatus ?? undefined,
      recordingDuration: conflict.clientEntry.recordingDuration ?? undefined,
      syncStatus: 'conflict-local-copy',
      syncOp: 'update',
      updatedAt: parseTimestamp(conflict.clientEntry.updatedAt) ?? Date.now(),
      conflictedCopyOf: conflict.serverEntry.id,
      baseUpdatedAt: parseTimestamp(conflict.serverEntry.updatedAt),
      userId: conflict.clientEntry.userId ?? conflict.serverEntry.userId ?? undefined,
      deleted: false,
    };
    await DB.addEntry(conflictCopy);
    return mainEntry;
  };

  const applyServerChanges = async (changes: ServerChangePayload[]): Promise<{
    appliedEntryIds: Set<string>;
    mediaValidationEntries: Entry[];
  }> => {
    const appliedEntryIds = new Set<string>();
    const mediaValidationEntries: Entry[] = [];

    for (const change of changes) {
      const entry = change.entry;
      if (!entry?.id) continue;

      appliedEntryIds.add(entry.id);
      const existing = await DB.getEntryById(entry.id);

      if (change.op === 'delete') {
        if (existing) {
          await DB.deleteEntry(entry.id);
        }
        continue;
      }

      const mapped = await mapServerEntryToLocal(entry);
      if (!mapped) continue;
      if (hasRemoteMedia(mapped)) {
        mediaValidationEntries.push(mapped);
      }

      if (existing) {
        await DB.updateEntry(entry.id, mapped);
      } else {
        await DB.restoreEntries([mapped]);
      }
    }

    return { appliedEntryIds, mediaValidationEntries };
  };

  const settleResults = async (
    results: SyncResult[],
    pendingByChangeId: Map<string, Entry>,
    pendingByEntryId: Map<string, Entry>,
    serverAppliedEntryIds: Set<string>,
  ): Promise<void> => {
    for (const result of results) {
      const pendingEntry = pendingByChangeId.get(result.changeId) ?? pendingByEntryId.get(result.entryId);
      if (!pendingEntry) continue;

      const isDelete = pendingEntry.syncOp === 'delete' || pendingEntry.syncStatus === 'pending_delete';

      if (result.status === 'ignored' && isDelete) {
        await DB.deleteEntry(result.entryId);
        continue;
      }

      if (result.status === 'applied' && isDelete && !serverAppliedEntryIds.has(result.entryId)) {
        await DB.deleteEntry(result.entryId);
        continue;
      }

      if (result.status === 'applied' && !serverAppliedEntryIds.has(result.entryId)) {
        await DB.updateEntry(result.entryId, {
          syncStatus: 'synced',
          syncOp: 'update',
          baseUpdatedAt: pendingEntry.updatedAt ?? pendingEntry.baseUpdatedAt,
          deleted: false,
        });
      }
    }
  };

  const performSyncNow = async (): Promise<void> => {
    await ensureSyncStoreLoaded();

    const { syncCursor } = useSyncStore.getState();
    const pending = await collectPendingChanges();
    const pendingByChangeId = new Map<string, Entry>();
    const pendingByEntryId = new Map<string, Entry>();

    const clientChanges = pending.map((entry) => {
      const changeId = buildChangeId(entry);
      pendingByChangeId.set(changeId, entry);
      pendingByEntryId.set(entry.id, entry);

      return {
        changeId,
        op: entry.syncOp === 'delete' || entry.syncStatus === 'pending_delete'
          ? 'delete'
          : (entry.syncOp ?? 'update'),
        entry: mapEntryToServer(entry),
        baseUpdatedAt: entry.baseUpdatedAt
          ? new Date(entry.baseUpdatedAt)
          : (entry.updatedAt ? new Date(entry.updatedAt) : undefined),
      };
    });

    const body = {
      cursor: syncCursor,
      deviceId: 'mobile',
      clientChanges,
    };

    const data = await api.post<SyncResponsePayload>('/sync', body);
    const { appliedEntryIds: serverAppliedEntryIds, mediaValidationEntries } = await applyServerChanges(data.serverChanges ?? []);
    const validationEntries = [...mediaValidationEntries];

    if (data.conflicts?.length) {
      for (const conflict of data.conflicts) {
        const conflictEntry = await createConflictCopy(conflict);
        if (conflictEntry && hasRemoteMedia(conflictEntry)) {
          validationEntries.push(conflictEntry);
        }
      }
      logger.warn('[cloudSync] 冲突数:', data.conflicts.length);
    }

    await settleResults(data.results ?? [], pendingByChangeId, pendingByEntryId, serverAppliedEntryIds);
    if (validationEntries.length > 0) {
      await useSyncStore.getState().markMediaValidationRunning(validationEntries.length);
      const mediaValidationRun = normalizeMediaValidationRun(
        await createCloudMediaSyncService().validateEntries(validationEntries),
        validationEntries.length,
      );
      await useSyncStore.getState().setMediaValidationSummary(mediaValidationRun.summary);
      useMediaRepairStore.getState().replaceIssues(mediaValidationRun.issues);
      if (mediaValidationRun.issues.length > 0) {
        showPhotoRepairPrompt();
      }
    }
    await useSyncStore.getState().setCursor(data.newCursor ?? syncCursor);
    await useSyncStore.getState().markSyncSuccess(Date.now());
  };

  const syncNow = async (): Promise<void> => {
    if (inFlightSync) {
      pendingSyncRequested = true;

      if (!queuedSyncPromise) {
        queuedSyncPromise = (async () => {
          await inFlightSync;
          while (pendingSyncRequested) {
            pendingSyncRequested = false;
            await syncNow();
          }
        })().finally(() => {
          queuedSyncPromise = null;
        });
      }

      return queuedSyncPromise;
    }

    inFlightSync = (async () => {
      await ensureSyncStoreLoaded();
      await useSyncStore.getState().markSyncStarted();

      try {
        await performSyncNow();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown sync error';
        await useSyncStore.getState().markSyncFailure(message);

        if (error instanceof ApiError) {
          logger.error('[cloudSync] syncNow ApiError:', error.code, error.message, error.status);
        } else {
          logger.error('[cloudSync] syncNow failed:', error);
        }
        throw error;
      } finally {
        await useSyncStore.getState().markSyncFinished();
        await useCloudSyncIndicatorStore.getState().refresh().catch((refreshError) => {
          logger.warn('[cloudSync] refresh indicator after sync failed:', refreshError);
        });
        inFlightSync = null;
      }
    })();

    return inFlightSync;
  };

  const getStatus = async (): Promise<SyncStatus> => {
    await ensureSyncStoreLoaded();

    const [{ lastSyncAt, lastSyncError, initialSyncState }, summary, allEntries] = await Promise.all([
      Promise.resolve(useSyncStore.getState()),
      DB.getCloudSyncIndicatorSummary(),
      DB.getAllEntries(),
    ]);

    const conflictCopies = allEntries.filter((entry) => entry.syncStatus === 'conflict-local-copy' || !!entry.conflictedCopyOf).length;

    return {
      lastSyncAt,
      lastSyncError,
      initialSyncState,
      pendingEntries: summary.pendingEntries,
      pendingUploads: summary.pendingUploads,
      uploadingEntries: summary.uploadingEntries,
      failedEntries: summary.failedEntries,
      conflictCopies,
    };
  };

  return {
    syncNow,
    getStatus,
  };
}
