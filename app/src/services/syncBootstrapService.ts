import * as DB from '@/src/database/operations';
import { getApiClient } from '@/src/services/apiClient';
import { useSyncStore } from '@/src/store/syncStore';
import type { Entry } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';

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

function normalizeImportedEntry(entry: Partial<Entry>): Entry {
  const timestamp = entry.timestamp ?? entry.updatedAt ?? Date.now();

  return {
    id: entry.id ?? `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: entry.type ?? 'text',
    content: entry.content ?? '',
    timestamp,
    tags: entry.tags ?? [],
    media: entry.media ?? [],
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
