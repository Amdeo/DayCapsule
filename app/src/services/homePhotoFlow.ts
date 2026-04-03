/**
 * 首页照片选择流程
 * 包含照片选择→本地存储→入队的完整流程，以及相关 DI 接口
 */

import type { Entry } from '@/src/types/entry';
import type { PhotoResult } from '@/src/services/photoService';
import type { PreparedPhotoEntryMedia, PhotoEntryPreparationError } from '@/src/services/photoEntryPreparationService';
import { buildPhotoLogPayload } from '@/src/services/photoIntegrityService';
import { logger } from '@/src/utils/logger';

export interface PhotoSelectDeps {
  addLocalEntry: (
    entry: Omit<Entry, 'id' | 'timestamp'>
  ) => Promise<Entry>;
  updateLocalEntry: (entryId: string, updates: Partial<Entry>) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  preparePhotoEntryMedia: (
    results: PhotoResult[]
  ) => Promise<PreparedPhotoEntryMedia>;
  deleteLocalFile?: (uri: string) => Promise<void>;
  enqueueUpload?: (entryId: string) => void;
  initialSyncStatus?: Entry['syncStatus'];
}

export async function handlePhotoSelectForTest(
  results: PhotoResult[],
  deps: PhotoSelectDeps
): Promise<void> {
  const previewMedia = results.map((result) => ({
    uri: result.uri,
    mimeType: 'image/jpeg' as const,
    size: 0,
    metadata: {
      width: result.width,
      height: result.height,
      aspectRatio: result.aspectRatio,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    },
  }));

  const createdEntry = await deps.addLocalEntry({
    type: 'photo',
    content: '',
    syncStatus: deps.initialSyncStatus ?? 'pending_upload',
    localReadyState: 'processing',
    media: previewMedia,
  });

  let preparedCreatedFiles: string[] = [];
  try {
    const prepared = await deps.preparePhotoEntryMedia(results);
    preparedCreatedFiles = prepared.createdFiles;
    await deps.updateLocalEntry(createdEntry.id, {
      media: prepared.media,
      localReadyState: 'ready',
    });
    prepared.media.forEach((media) => {
      logger.log('photo.db.entry_saved', buildPhotoLogPayload({
        entryId: createdEntry.id,
        localMediaId: media.metadata?.localMediaId,
        localUri: media.uri,
        mimeType: media.mimeType,
        size: media.size,
        width: media.metadata?.width,
        height: media.metadata?.height,
        sourceHash: media.metadata?.sourceHash,
        persistedHash: media.metadata?.persistedHash,
        integrityStatus: media.metadata?.integrityStatus,
        integrityReason: media.metadata?.integrityReason ?? null,
      }));
    });

    try {
      deps.enqueueUpload?.(createdEntry.id);
    } catch (error) {
      logger.warn('[HomeScreen] Failed to enqueue photo upload:', error);
    }
  } catch (error) {
    const createdFiles = preparedCreatedFiles.length > 0
      ? preparedCreatedFiles
      : (error as PhotoEntryPreparationError).createdFiles ?? [];
    if (deps.deleteLocalFile) {
      const deleteLocalFile = deps.deleteLocalFile;
      await Promise.all(
        createdFiles.map((uri) => deleteLocalFile(uri).catch(() => undefined))
      );
    }
    await deps.deleteEntry(createdEntry.id).catch((deleteError) => {
      logger.error('[HomeScreen] Failed to clean up failed photo entry:', deleteError);
    });
    throw error;
  }
}
