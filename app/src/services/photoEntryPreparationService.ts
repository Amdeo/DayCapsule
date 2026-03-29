import type { MediaInfo } from '@/src/types/entry';
import type { PhotoResult, SavedPhotoResult } from '@/src/services/photoService';
import { PhotoService } from '@/src/services/photoService';
import { buildPhotoLogPayload, fingerprintPhotoFile } from '@/src/services/photoIntegrityService';
import { deleteFile } from '@/src/utils/fileSystem';
import { logger } from '@/src/utils/logger';

export interface PreparedPhotoEntryMedia {
  media: MediaInfo[];
  createdFiles: string[];
}

export interface PhotoEntryPreparationError extends Error {
  createdFiles?: string[];
}

export interface PreparePhotoEntryMediaDeps {
  savePhoto: (
    sourceUri: string,
    fileId: string,
    quality: 'low' | 'medium' | 'high',
    aspectRatio?: number
  ) => Promise<SavedPhotoResult>;
  fingerprintPhotoFile: typeof fingerprintPhotoFile;
  deleteLocalFile: (uri: string) => Promise<void>;
  now?: () => number;
}

const defaultDeps: PreparePhotoEntryMediaDeps = {
  savePhoto: PhotoService.savePhotoToStorage.bind(PhotoService),
  fingerprintPhotoFile,
  deleteLocalFile: deleteFile,
  now: () => Date.now(),
};

const buildPhotoFileId = (now: number): string =>
  `${now}_${Math.random().toString(36).slice(2, 8)}`;

const cleanupCreatedFiles = async (
  createdFiles: string[],
  deleteLocalFile: (uri: string) => Promise<void>
): Promise<void> => {
  await Promise.all(
    createdFiles.map((uri) => deleteLocalFile(uri).catch(() => undefined))
  );
};

export async function preparePhotoEntryMedia(
  results: PhotoResult[],
  deps: PreparePhotoEntryMediaDeps = defaultDeps
): Promise<PreparedPhotoEntryMedia> {
  const media: MediaInfo[] = [];
  const createdFiles: string[] = [];

  try {
    for (const result of results) {
      const now = deps.now?.() ?? Date.now();
      const fileId = buildPhotoFileId(now);
      const sourceFingerprint = await deps.fingerprintPhotoFile(result.uri);

      logger.log('photo.capture.received', buildPhotoLogPayload({
        entryId: fileId,
        localMediaId: fileId,
        sourceUri: result.uri,
        sourceHash: sourceFingerprint.sha256,
        mimeType: sourceFingerprint.mimeType,
        size: sourceFingerprint.size,
        width: sourceFingerprint.width,
        height: sourceFingerprint.height,
      }));

      const savedPhoto = await deps.savePhoto(
        result.uri,
        fileId,
        'medium',
        result.aspectRatio
      );

      createdFiles.push(savedPhoto.originalUri, savedPhoto.thumbnailUri);

      const persistedFingerprint = await deps.fingerprintPhotoFile(savedPhoto.originalUri);
      const hasIntegrityAnomaly = persistedFingerprint.sha256.length === 0;

      media.push({
        uri: savedPhoto.originalUri,
        mimeType: 'image/jpeg',
        size: persistedFingerprint.size,
        thumbnail: savedPhoto.thumbnailUri,
        metadata: {
          width: savedPhoto.width,
          height: savedPhoto.height,
          aspectRatio: savedPhoto.aspectRatio,
          localMediaId: fileId,
          sourceHash: sourceFingerprint.sha256,
          persistedHash: persistedFingerprint.sha256,
          integrityStatus: hasIntegrityAnomaly ? 'upload_mismatch' : 'healthy',
          integrityReason: hasIntegrityAnomaly ? 'persisted-hash-missing' : null,
          repairable: false,
          createdAt: now,
          modifiedAt: now,
        },
      });
    }

    return { media, createdFiles };
  } catch (error) {
    await cleanupCreatedFiles(createdFiles, deps.deleteLocalFile);
    const errorWithCreatedFiles = error as PhotoEntryPreparationError;
    errorWithCreatedFiles.createdFiles = [...createdFiles];
    throw errorWithCreatedFiles;
  }
}
