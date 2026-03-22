import type { Entry, MediaInfo } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';

export interface PhotoUploadQueueDeps {
  getPendingEntries: () => Promise<Entry[]>;
  getEntryById: (id: string) => Promise<Entry | null>;
  markUploading: (id: string) => Promise<void>;
  markPendingUpload: (id: string) => Promise<void>;
  markPendingSync: (id: string, media: MediaInfo[]) => Promise<void>;
  uploadMedia: (localUri: string) => Promise<{ id: string; url: string }>;
  triggerSync: () => Promise<void>;
  onEntryUploading?: (id: string) => void;
  onEntryPendingUpload?: (id: string) => void;
  onEntryPendingSync?: (id: string, media: MediaInfo[]) => void;
}

export interface PhotoUploadQueue {
  deps: PhotoUploadQueueDeps;
  enqueue: (entryId: string) => void;
  cancel: (entryId: string) => void;
  flushPending: () => Promise<void>;
  waitForIdle: () => Promise<void>;
}

function isUploadablePhotoEntry(entry: Entry | null): entry is Entry & { media: MediaInfo[] } {
  return !!entry && entry.type === 'photo' && Array.isArray(entry.media) && entry.media.length > 0;
}

async function uploadPhotoMedia(
  entryId: string,
  media: MediaInfo[],
  deps: PhotoUploadQueueDeps,
  canceled: Set<string>
): Promise<MediaInfo[] | null> {
  const uploaded: MediaInfo[] = [];

  for (const item of media) {
    if (canceled.has(entryId)) {
      canceled.delete(entryId);
      return null;
    }

    const upload = await deps.uploadMedia(item.uri);

    if (canceled.has(entryId)) {
      canceled.delete(entryId);
      return null;
    }

    uploaded.push({
      ...item,
      remoteUri: upload.url,
    });
  }

  return uploaded;
}

export function createPhotoUploadQueue(deps: PhotoUploadQueueDeps): PhotoUploadQueue {
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
      if (!isUploadablePhotoEntry(entry)) {
        continue;
      }

      if (canceled.has(entryId)) {
        canceled.delete(entryId);
        continue;
      }

      try {
        await deps.markUploading(entryId);
        deps.onEntryUploading?.(entryId);

        const uploadedMedia = await uploadPhotoMedia(entryId, entry.media, deps, canceled);
        if (!uploadedMedia) {
          continue;
        }

        await deps.markPendingSync(entryId, uploadedMedia);
        deps.onEntryPendingSync?.(entryId, uploadedMedia);

        try {
          await deps.triggerSync();
        } catch (error) {
          logger.warn('[photoUploadQueue] trigger sync failed:', entryId, error);
        }
      } catch (error) {
        logger.warn('[photoUploadQueue] upload failed, will retry later:', entryId, error);
        await deps.markPendingUpload(entryId);
        deps.onEntryPendingUpload?.(entryId);
      }
    }
  };

  const ensureProcessing = (): Promise<void> => {
    if (!processing) {
      processing = processQueue().finally(() => {
        processing = null;
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

let defaultQueue: PhotoUploadQueue | null = null;
let queueCallbacks: Pick<PhotoUploadQueueDeps, 'onEntryUploading' | 'onEntryPendingUpload' | 'onEntryPendingSync'> = {};

function getDefaultQueue(): PhotoUploadQueue {
  if (defaultQueue) {
    return defaultQueue;
  }

  const DB = require('@/src/database/operations') as typeof import('@/src/database/operations');
  const { getApiClient } = require('@/src/services/apiClient') as typeof import('@/src/services/apiClient');
  const { createCloudSyncService } = require('@/src/services/cloudSyncService') as typeof import('@/src/services/cloudSyncService');

  defaultQueue = createPhotoUploadQueue({
    getPendingEntries: () => DB.getPhotoEntriesBySyncStatus(['pending_upload', 'uploading']),
    getEntryById: (id) => DB.getEntryById(id),
    markUploading: (id) => DB.updateEntry(id, { syncStatus: 'uploading' }),
    markPendingUpload: (id) => DB.updateEntry(id, { syncStatus: 'pending_upload' }),
    markPendingSync: (id, media) => DB.updateEntry(id, {
      media,
      syncStatus: 'pending',
      updatedAt: Date.now(),
    }),
    uploadMedia: (localUri) => getApiClient().uploadFile('/media/upload', localUri, 'file'),
    triggerSync: () => createCloudSyncService().syncNow(),
    onEntryUploading: (id) => queueCallbacks.onEntryUploading?.(id),
    onEntryPendingUpload: (id) => queueCallbacks.onEntryPendingUpload?.(id),
    onEntryPendingSync: (id, media) => queueCallbacks.onEntryPendingSync?.(id, media),
  });

  return defaultQueue;
}

export function configurePhotoUploadQueueCallbacks(
  callbacks: Pick<PhotoUploadQueueDeps, 'onEntryUploading' | 'onEntryPendingUpload' | 'onEntryPendingSync'>
): void {
  queueCallbacks = callbacks;
}

export function enqueuePhotoUpload(entryId: string): void {
  getDefaultQueue().enqueue(entryId);
}

export async function flushPendingPhotoUploads(): Promise<void> {
  await getDefaultQueue().flushPending();
}

export function cancelPhotoUpload(entryId: string): void {
  getDefaultQueue().cancel(entryId);
}

export async function waitForPhotoUploadQueueIdle(): Promise<void> {
  await getDefaultQueue().waitForIdle();
}
