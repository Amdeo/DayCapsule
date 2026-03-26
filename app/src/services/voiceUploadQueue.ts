import type { Entry, MediaInfo } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';

export interface VoiceUploadQueueDeps {
  getPendingEntries: () => Promise<Entry[]>;
  getEntryById: (id: string) => Promise<Entry | null>;
  markUploading: (id: string) => Promise<void>;
  markPending: (id: string) => Promise<void>;
  removeLocalEntry: (id: string) => Promise<void>;
  uploadMedia: (localUri: string) => Promise<{ id: string; url: string }>;
  createRemoteEntry: (entry: Entry, upload: { id: string; url: string }) => Promise<Entry>;
  onEntryUploading?: (id: string) => void;
  onEntryPending?: (id: string) => void;
  onEntrySynced?: (localId: string, entry: Entry) => void;
}

export interface VoiceUploadQueue {
  deps: VoiceUploadQueueDeps;
  enqueue: (entryId: string) => void;
  cancel: (entryId: string) => void;
  flushPending: () => Promise<void>;
  waitForIdle: () => Promise<void>;
}

function buildSyncedEntry(localEntry: Entry, remoteEntry: Entry, upload: { id: string; url: string }): Entry {
  const localMedia = localEntry.media?.[0];
  const remoteMedia = remoteEntry.media?.[0];
  const mergedMedia: MediaInfo[] | undefined = localMedia ? [{
    ...localMedia,
    ...remoteMedia,
    uri: localMedia.uri,
    remoteUri: remoteMedia?.remoteUri ?? remoteMedia?.uri ?? upload.url,
  }] : remoteEntry.media;

  return {
    ...remoteEntry,
    content: remoteEntry.content ?? localEntry.content,
    recordingStatus: 'completed',
    syncStatus: 'synced',
    media: mergedMedia,
  };
}

export function createVoiceUploadQueue(deps: VoiceUploadQueueDeps): VoiceUploadQueue {
  const queued = new Set<string>();
  const canceled = new Set<string>();
  let processing: Promise<void> | null = null;

  const processQueue = async (): Promise<void> => {
    for (const entryId of Array.from(queued)) {
      queued.delete(entryId);

      if (canceled.has(entryId)) {
        canceled.delete(entryId);
        continue;
      }

      const entry = await deps.getEntryById(entryId);
      if (!entry || entry.type !== 'voice' || !entry.media?.[0]?.uri) {
        continue;
      }

      if (canceled.has(entryId)) {
        canceled.delete(entryId);
        continue;
      }

      try {
        await deps.markUploading(entryId);
        deps.onEntryUploading?.(entryId);

        if (canceled.has(entryId)) {
          canceled.delete(entryId);
          continue;
        }

        const upload = await deps.uploadMedia(entry.media[0].uri);
        if (canceled.has(entryId)) {
          canceled.delete(entryId);
          continue;
        }

        const remoteEntry = await deps.createRemoteEntry(entry, upload);
        if (canceled.has(entryId)) {
          canceled.delete(entryId);
          continue;
        }

        await deps.removeLocalEntry(entryId);
        deps.onEntrySynced?.(entryId, buildSyncedEntry(entry, remoteEntry, upload));
      } catch (error) {
        logger.warn('[voiceUploadQueue] upload failed, will retry later:', entryId, error);
        await deps.markPending(entryId);
        deps.onEntryPending?.(entryId);
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

  return {
    deps,
    enqueue(entryId: string) {
      if (!entryId) return;
      canceled.delete(entryId);
      queued.add(entryId);
      void ensureProcessing();
    },
    cancel(entryId: string) {
      canceled.add(entryId);
      queued.delete(entryId);
    },
    async flushPending() {
      const pendingEntries = await deps.getPendingEntries();
      pendingEntries.forEach((entry) => {
        canceled.delete(entry.id);
        queued.add(entry.id);
      });
      await ensureProcessing();
    },
    async waitForIdle() {
      await ensureProcessing();
      if (processing) {
        await processing;
      }
    },
  };
}

let queueCallbacks: Pick<VoiceUploadQueueDeps, 'onEntryUploading' | 'onEntryPending' | 'onEntrySynced'> = {};
let defaultQueue: VoiceUploadQueue | null = null;

function getDefaultQueue(): VoiceUploadQueue {
  if (defaultQueue) {
    return defaultQueue;
  }

  const DB = require('@/src/database/operations') as typeof import('@/src/database/operations');
  const { getApiClient } = require('@/src/services/apiClient') as typeof import('@/src/services/apiClient');

  defaultQueue = createVoiceUploadQueue({
    getPendingEntries: () => DB.getVoiceEntriesBySyncStatus(['pending_upload', 'uploading']),
    getEntryById: (id) => DB.getEntryById(id),
    markUploading: (id) => DB.updateEntry(id, { syncStatus: 'uploading' }),
    markPending: (id) => DB.updateEntry(id, { syncStatus: 'pending_upload' }),
    removeLocalEntry: (id) => DB.deleteEntry(id),
    uploadMedia: (localUri) => getApiClient().uploadFile('/media/upload', localUri, 'file'),
    createRemoteEntry: async (entry, upload) => {
      return getApiClient().post<Entry>('/entries', {
        type: entry.type,
        content: entry.content,
        tags: entry.tags,
        recordingStatus: 'completed',
        recordingDuration: entry.recordingDuration,
        mediaIds: [upload.id],
      });
    },
    onEntryUploading: (id) => queueCallbacks.onEntryUploading?.(id),
    onEntryPending: (id) => queueCallbacks.onEntryPending?.(id),
    onEntrySynced: (localId, entry) => queueCallbacks.onEntrySynced?.(localId, entry),
  });

  return defaultQueue;
}

export function configureVoiceUploadQueueCallbacks(
  callbacks: Pick<VoiceUploadQueueDeps, 'onEntryUploading' | 'onEntryPending' | 'onEntrySynced'>
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
