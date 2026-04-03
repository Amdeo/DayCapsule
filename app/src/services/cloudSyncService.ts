/**
 * 云同步服务
 * 负责本地与服务端之间的条目同步、冲突解决和媒体校验
 */

import { getApiClient, ApiError } from '@/src/services/apiClient';
import * as DB from '@/src/database/operations';
import type { Entry } from '@/src/types/entry';
import { useMediaRepairStore } from '@/src/store/mediaRepairStore';
import { useSyncStore } from '@/src/store/syncStore';
import { useCloudSyncIndicatorStore } from '@/src/store/cloudSyncIndicatorStore';
import { useCloudSyncMonitorStore } from '@/src/store/cloudSyncMonitorStore';
import { createCloudMediaSyncService } from './cloudMediaSyncService';
import { showPhotoRepairPrompt } from './showPhotoRepairPrompt';
import { logger } from '@/src/utils/logger';
import { normalizeCloudMediaItem } from '@/src/utils/mediaUtils';
import type { SyncStatus, SyncServiceApi, ServerEntryPayload, ServerChangePayload, ConflictPayload, SyncResponsePayload, SyncResult } from './sync/syncTypes';
import {
  parseTags,
  parseMedia,
  parseTimestamp,
  buildChangeId,
  mapEntryToServer,
  hasRemoteMedia,
  normalizeMediaValidationRun,
} from './sync/syncSerializer';

export type { SyncStatus, SyncServiceApi };

const SYNC_BATCH_SIZE = 5;

let inFlightSync: Promise<void> | null = null;
let pendingSyncRequested = false;
let queuedSyncPromise: Promise<void> | null = null;

export function createCloudSyncService(): SyncServiceApi {
  const api = getApiClient();

  const ensureSyncStoreLoaded = async (): Promise<void> => {
    if (!useSyncStore.getState().isLoaded) {
      await useSyncStore.getState().load();
    }
  };

  const collectPendingChanges = async () => {
    return DB.getEntriesBySyncStatus(['pending', 'failed', 'pending_delete']);
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

  const applyConflictWinner = async (conflict: ConflictPayload): Promise<Entry | null> => {
    if (!conflict.serverEntry?.id || !conflict.clientEntry?.id) return null;

    const existing = await DB.getEntryById(conflict.serverEntry.id);
    const mainEntry = await mapServerEntryToLocal(conflict.serverEntry);
    if (!mainEntry) return null;

    if (existing) {
      await DB.updateEntry(conflict.serverEntry.id, mainEntry);
    } else {
      await DB.restoreEntries([mainEntry]);
    }
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
        if (existing) await DB.deleteEntry(entry.id);
        continue;
      }

      const mapped = await mapServerEntryToLocal(entry);
      if (!mapped) continue;
      if (hasRemoteMedia(mapped)) mediaValidationEntries.push(mapped);

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
    const monitor = useCloudSyncMonitorStore.getState();
    const pending = await collectPendingChanges();
    let currentCursor = syncCursor;
    const validationEntries: Entry[] = [];
    const batchStarts = pending.length > 0
      ? Array.from({ length: Math.ceil(pending.length / SYNC_BATCH_SIZE) }, (_, i) => i * SYNC_BATCH_SIZE)
      : [0];

    monitor.setPhase('sync-entries', 2);

    for (const i of batchStarts) {
      const batchPending = pending.slice(i, i + SYNC_BATCH_SIZE);
      const batchPendingByChangeId = new Map<string, Entry>();
      const batchPendingByEntryId = new Map<string, Entry>();

      const clientChanges = batchPending.map((entry) => {
        const changeId = buildChangeId(entry);
        batchPendingByChangeId.set(changeId, entry);
        batchPendingByEntryId.set(entry.id, entry);
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

      const data = await api.post<SyncResponsePayload>('/sync', {
        cursor: currentCursor,
        deviceId: 'mobile',
        clientChanges,
      });

      const { appliedEntryIds: serverAppliedEntryIds, mediaValidationEntries } =
        await applyServerChanges(data.serverChanges ?? []);
      validationEntries.push(...mediaValidationEntries);

      if (data.conflicts?.length) {
        for (const conflict of data.conflicts) {
          const conflictEntry = await applyConflictWinner(conflict);
          if (conflictEntry && hasRemoteMedia(conflictEntry)) {
            validationEntries.push(conflictEntry);
          }
        }
        logger.warn('[cloudSync] 冲突数:', data.conflicts.length);
      }

      await settleResults(data.results ?? [], batchPendingByChangeId, batchPendingByEntryId, serverAppliedEntryIds);
      currentCursor = data.newCursor ?? currentCursor;
      await useSyncStore.getState().setCursor(currentCursor);
      monitor.updateEntryProgress(Math.min(i + batchPending.length, pending.length), pending.length, null);
    }

    monitor.setPhase('validate-media', 4);

    if (validationEntries.length > 0) {
      await useSyncStore.getState().markMediaValidationRunning(validationEntries.length);
      monitor.updateMediaProgress(0, validationEntries.length, null);
      const mediaValidationRun = normalizeMediaValidationRun(
        await createCloudMediaSyncService().validateEntries(validationEntries),
        validationEntries.length,
      );
      monitor.updateMediaProgress(validationEntries.length, validationEntries.length, null);
      await useSyncStore.getState().setMediaValidationSummary(mediaValidationRun.summary);
      useMediaRepairStore.getState().replaceIssues(mediaValidationRun.issues);
      if (mediaValidationRun.issues.length > 0) showPhotoRepairPrompt();
    } else {
      const prevStatus = useSyncStore.getState().lastMediaValidationSummary?.status;
      if (prevStatus === 'partial' || prevStatus === 'failed') {
        await useSyncStore.getState().setMediaValidationSummary({
          status: 'success',
          total: 0,
          downloaded: 0,
          missing: 0,
          failed: 0,
          suspect: 0,
          repairable: 0,
          lastError: null,
          lastValidatedAt: Date.now(),
        });
      }
    }

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
      const monitor = useCloudSyncMonitorStore.getState();
      monitor.startRun(`sync-${Date.now()}`);
      monitor.setPhase('sync-entries', 2);

      try {
        await performSyncNow();
        monitor.finishRun({ status: 'success', failedPhase: null, failedItems: [] });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown sync error';
        await useSyncStore.getState().markSyncFailure(message);
        monitor.finishRun({ status: 'failed', failedPhase: 'sync-entries', failedItems: [] });

        if (error instanceof ApiError) {
          logger.error('[cloudSync] syncNow ApiError:', error.code, error.message, error.status);
        } else {
          logger.error('[cloudSync] syncNow failed:', error);
        }
        throw error;
      } finally {
        await useSyncStore.getState().markSyncFinished();
        await useCloudSyncIndicatorStore.getState().refresh().catch((err) => {
          logger.warn('[cloudSync] refresh indicator after sync failed:', err);
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

    const conflictCopies = allEntries.filter(
      (entry) => entry.syncStatus === 'conflict-local-copy' || !!entry.conflictedCopyOf
    ).length;

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

  return { syncNow, getStatus };
}
