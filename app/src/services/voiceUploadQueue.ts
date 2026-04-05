import type { Entry, MediaInfo } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';

export interface VoiceUploadQueueDeps {
  getPendingEntries: () => Promise<Entry[]>;
  getEntryById: (id: string) => Promise<Entry | null>;
  markUploading: (id: string) => Promise<void>;
  markPending: (id: string) => Promise<void>;
  uploadMedia: (localUri: string) => Promise<{ id: string; url: string }>;
  markPendingSync: (id: string, entry: Entry) => Promise<void>;
  triggerSync: () => Promise<void>;
  onEntryUploading?: (id: string) => void;
  onEntryPending?: (id: string) => void;
  onEntryPendingSync?: (id: string, entry: Entry) => void;
}

export interface VoiceUploadQueue {
  deps: VoiceUploadQueueDeps;
  enqueue: (entryId: string) => void;
  cancel: (entryId: string) => void;
  flushPending: () => Promise<void>;
  waitForIdle: () => Promise<void>;
}

const RETRY_BACKOFF_MS = [15_000, 30_000, 60_000, 120_000] as const;

function consumeCanceledEntry(canceled: Set<string>, entryId: string): boolean {
  if (!canceled.has(entryId)) {
    return false;
  }

  canceled.delete(entryId);
  return true;
}

function buildPendingSyncEntry(localEntry: Entry, upload: { id: string; url: string }): Entry {
  const localMedia = localEntry.media?.[0];
  const mergedMedia: MediaInfo[] | undefined = localMedia ? [{
    ...localMedia,
    uri: localMedia.uri,
    remoteUri: upload.url,
  }] : localEntry.media;

  return {
    ...localEntry,
    recordingStatus: 'completed',
    syncStatus: 'pending',
    media: mergedMedia,
  };
}

export function createVoiceUploadQueue(deps: VoiceUploadQueueDeps): VoiceUploadQueue {
  const queued = new Set<string>();
  const canceled = new Set<string>();
  let processing: Promise<void> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryFailureCount = 0;

  const clearRetryTimer = (): void => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const resetRetryBackoff = (): void => {
    clearRetryTimer();
    retryFailureCount = 0;
  };

  const scheduleRetry = (): void => {
    if (retryTimer) {
      return;
    }

    const delay = RETRY_BACKOFF_MS[Math.min(retryFailureCount, RETRY_BACKOFF_MS.length - 1)];
    retryFailureCount += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void flushPendingInternal();
    }, delay);
  };

  const processQueue = async (): Promise<void> => {
    for (const entryId of Array.from(queued)) {
      queued.delete(entryId);

      if (consumeCanceledEntry(canceled, entryId)) {
        continue;
      }

      const entry = await deps.getEntryById(entryId);
      if (!entry || entry.type !== 'voice' || entry.localReadyState === 'processing' || !entry.media?.[0]?.uri) {
        continue;
      }

      if (consumeCanceledEntry(canceled, entryId)) {
        continue;
      }

      try {
        await deps.markUploading(entryId);
        deps.onEntryUploading?.(entryId);

        if (consumeCanceledEntry(canceled, entryId)) {
          continue;
        }

        const upload = await deps.uploadMedia(entry.media[0].uri);
        if (consumeCanceledEntry(canceled, entryId)) {
          continue;
        }

        const pendingSyncEntry = buildPendingSyncEntry(entry, upload);
        if (consumeCanceledEntry(canceled, entryId)) {
          continue;
        }

        await deps.markPendingSync(entryId, pendingSyncEntry);
        deps.onEntryPendingSync?.(entryId, pendingSyncEntry);
        resetRetryBackoff();

        try {
          await deps.triggerSync();
        } catch (error) {
          logger.warn('[voiceUploadQueue] trigger sync failed:', entryId, error);
        }
      } catch (error) {
        logger.warn('[voiceUploadQueue] upload failed, will retry later:', entryId, error);
        await deps.markPending(entryId);
        deps.onEntryPending?.(entryId);
        scheduleRetry();
      }
    }
  };

  const ensureProcessing = (): Promise<void> => {
    if (!processing) {
      processing = processQueue().finally(() => {
        processing = null;
        if (queued.size > 0) {
          void ensureProcessing();
        }
      });
    }
    return processing;
  };

  const flushPendingInternal = async (): Promise<void> => {
    clearRetryTimer();
    const pendingEntries = await deps.getPendingEntries();
    pendingEntries.forEach((entry) => {
      canceled.delete(entry.id);
      queued.add(entry.id);
    });
    await ensureProcessing();
  };

  return {
    deps,
    enqueue(entryId: string) {
      if (!entryId) return;
      clearRetryTimer();
      canceled.delete(entryId);
      queued.add(entryId);
      void ensureProcessing();
    },
    cancel(entryId: string) {
      canceled.add(entryId);
      queued.delete(entryId);
    },
    async flushPending() {
      await flushPendingInternal();
    },
    async waitForIdle() {
      await ensureProcessing();
      if (processing) {
        await processing;
      }
    },
  };
}

let queueCallbacks: Pick<VoiceUploadQueueDeps, 'onEntryUploading' | 'onEntryPending' | 'onEntryPendingSync'> = {};
let defaultQueue: VoiceUploadQueue | null = null;

function getDefaultQueue(): VoiceUploadQueue {
  if (defaultQueue) {
    return defaultQueue;
  }

  const DB = require('@/src/database/operations') as typeof import('@/src/database/operations');
  const { getApiClient } = require('@/src/services/apiClient') as typeof import('@/src/services/apiClient');
  const { createCloudSyncService } = require('@/src/services/cloudSyncService') as typeof import('@/src/services/cloudSyncService');

  defaultQueue = createVoiceUploadQueue({
    getPendingEntries: () => DB.getVoiceEntriesBySyncStatus(['pending_upload', 'uploading']),
    getEntryById: (id) => DB.getEntryById(id),
    markUploading: (id) => DB.updateEntry(id, { syncStatus: 'uploading' }),
    markPending: (id) => DB.updateEntry(id, { syncStatus: 'pending_upload' }),
    uploadMedia: (localUri) => getApiClient().uploadFile('/media/upload', localUri, 'file'),
    markPendingSync: (id, entry) => DB.updateEntry(id, {
      media: entry.media,
      syncStatus: 'pending',
      updatedAt: Date.now(),
    }),
    triggerSync: () => createCloudSyncService().syncNow(),
    onEntryUploading: (id) => queueCallbacks.onEntryUploading?.(id),
    onEntryPending: (id) => queueCallbacks.onEntryPending?.(id),
    onEntryPendingSync: (id, entry) => queueCallbacks.onEntryPendingSync?.(id, entry),
  });

  return defaultQueue;
}

export function configureVoiceUploadQueueCallbacks(
  callbacks: Pick<VoiceUploadQueueDeps, 'onEntryUploading' | 'onEntryPending' | 'onEntryPendingSync'>
): void {
  queueCallbacks = callbacks;
}

export function enqueueVoiceUpload(entryId: string): void {
  getDefaultQueue().enqueue(entryId);
}

export async function flushPendingVoiceUploads(): Promise<void> {
  await getDefaultQueue().flushPending();
}

export function cancelVoiceUpload(entryId: string): void {
  getDefaultQueue().cancel(entryId);
}

export async function waitForVoiceUploadQueueIdle(): Promise<void> {
  await getDefaultQueue().waitForIdle();
}
