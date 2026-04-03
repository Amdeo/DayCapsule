import {
  STORAGE_QUOTA,
  ERROR_MESSAGES,
} from '@/src/utils/constants';
import {
  getMediaPaths,
  generateUniqueFilename,
  deleteFile,
  getFileInfo,
  copyFile,
} from '@/src/utils/fileSystem';
import { MediaCacheService } from '../mediaCacheService';
import {
  buildPhotoLogPayload,
  fingerprintPhotoFile,
  type PhotoFileFingerprint,
} from '../photoIntegrityService';
import type { MediaError, MediaInfo } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';
import {
  compressPhoto as defaultCompressPhoto,
  generateThumbnail as defaultGenerateThumbnail,
} from './photoProcessor';
import type { CompressedPhoto, SavedPhotoResult } from '../photoService';

interface PhotoProcessorDependencies {
  compressPhoto: (
    uri: string,
    quality?: 'low' | 'medium' | 'high'
  ) => Promise<CompressedPhoto>;
  generateThumbnail: (uri: string, maxWidth?: number) => Promise<string>;
}

const defaultProcessorDependencies: PhotoProcessorDependencies = {
  compressPhoto: defaultCompressPhoto,
  generateThumbnail: defaultGenerateThumbnail,
};

const createMediaError = (
  code: MediaError['code'],
  userMessage: string
): MediaError => {
  const error = new Error(userMessage) as MediaError;
  error.code = code;
  error.userMessage = userMessage;
  return error;
};

const isMediaError = (error: unknown): error is MediaError =>
  !!error
  && typeof error === 'object'
  && 'code' in error
  && 'userMessage' in error;

function isCurrentManagedPhotoUri(uri: string | undefined): boolean {
  if (!uri || MediaCacheService.isRemoteUri(uri)) {
    return false;
  }

  const { photoOriginal, photoDisplay, photoThumbnail } = getMediaPaths();
  return uri.startsWith(photoOriginal)
    || uri.startsWith(photoDisplay)
    || uri.startsWith(photoThumbnail);
}

function buildPhotoUriCandidates(
  media: Pick<MediaInfo, 'uri' | 'remoteUri' | 'thumbnail' | 'remoteThumbnail'>,
  kind: 'thumbnail' | 'full'
): string[] {
  const localThumbnail = media.thumbnail && !MediaCacheService.isRemoteUri(media.thumbnail)
    ? media.thumbnail
    : undefined;
  const remoteThumbnail = media.remoteThumbnail
    ?? (media.thumbnail && MediaCacheService.isRemoteUri(media.thumbnail) ? media.thumbnail : undefined);
  const remoteMain = media.remoteUri
    ?? (media.uri && MediaCacheService.isRemoteUri(media.uri) ? media.uri : undefined);
  const localMain = media.uri && isCurrentManagedPhotoUri(media.uri)
    ? media.uri
    : undefined;
  const fallbackLocalMain = media.uri && !MediaCacheService.isRemoteUri(media.uri) && !isCurrentManagedPhotoUri(media.uri)
    ? media.uri
    : undefined;

  const rawCandidates = kind === 'thumbnail'
    ? [localThumbnail, localMain, remoteThumbnail, remoteMain, fallbackLocalMain]
    : [localMain, remoteMain, fallbackLocalMain];

  return rawCandidates
    .filter((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0)
    .map((candidate) => resolvePhotoUri(candidate))
    .filter((candidate, index, allCandidates) => allCandidates.indexOf(candidate) === index);
}

async function savePhoto(
  sourceUri: string,
  entryId: string,
  photoDir: string,
  thumbnailDir: string,
  quality: 'low' | 'medium' | 'high' = 'medium',
  aspectRatio?: number,
  processorDependencies: PhotoProcessorDependencies = defaultProcessorDependencies
): Promise<SavedPhotoResult> {
  try {
    const { size } = await getFileInfo(sourceUri);
    if (size > STORAGE_QUOTA.MAX_PHOTO_SIZE) {
      throw createMediaError('DEVICE_STORAGE_FULL', ERROR_MESSAGES.FILE_TOO_LARGE);
    }

    const compressed = await processorDependencies.compressPhoto(sourceUri, quality);
    const width = compressed.compressed.width;
    const height = compressed.compressed.height;
    const finalAspectRatio = aspectRatio || (height > 0 ? width / height : 1);

    const thumbnailUri = await processorDependencies.generateThumbnail(compressed.compressed.uri);

    const filename = generateUniqueFilename(entryId, 'photo', 'jpg');
    const targetUri = await copyFile(
      compressed.compressed.uri,
      photoDir,
      filename
    );

    const thumbnailFilename = generateUniqueFilename(entryId, 'thumb', 'jpg');
    const targetThumbnailUri = await copyFile(
      thumbnailUri,
      thumbnailDir,
      thumbnailFilename
    );

    const persistedFingerprint: PhotoFileFingerprint = await fingerprintPhotoFile(targetUri);
    logger.log('photo.persist.saved', buildPhotoLogPayload({
      entryId,
      localMediaId: entryId,
      localUri: targetUri,
      mimeType: persistedFingerprint.mimeType,
      size: persistedFingerprint.size,
      width: persistedFingerprint.width,
      height: persistedFingerprint.height,
      persistedHash: persistedFingerprint.sha256,
      integrityStatus: 'healthy',
      integrityReason: null,
    }));

    await deleteFile(compressed.compressed.uri);
    if (thumbnailUri !== compressed.compressed.uri) {
      await deleteFile(thumbnailUri).catch(() => {});
    }

    return {
      originalUri: targetUri,
      thumbnailUri: targetThumbnailUri,
      aspectRatio: finalAspectRatio,
      width,
      height,
      persistedFingerprint,
    };
  } catch (error) {
    if (isMediaError(error)) {
      throw error;
    }

    logger.error('Failed to save photo:', error);
    throw createMediaError('DEVICE_STORAGE_FULL', ERROR_MESSAGES.STORAGE_FULL);
  }
}

export function resolvePhotoUri(uri: string): string {
  if (MediaCacheService.isRemoteUri(uri)) {
    return MediaCacheService.normalizeRemoteUri(uri);
  }

  const photoOriginalRelative = 'media/photos/original/';
  if (uri.includes(photoOriginalRelative)) {
    const filename = uri.split(photoOriginalRelative).pop();
    if (filename) {
      return `${getMediaPaths().photoOriginal}${filename}`;
    }
  }

  return uri;
}

export function getPreferredPhotoUri(
  media: Pick<MediaInfo, 'uri' | 'remoteUri' | 'thumbnail' | 'remoteThumbnail'>,
  kind: 'thumbnail' | 'full'
): string {
  const candidates = buildPhotoUriCandidates(media, kind);
  const selectedUri = candidates[0] ?? '';
  logger.log('[photoService] preferred photo uri', {
    kind,
    candidates,
    selectedUri,
  });
  return selectedUri;
}

export function getFallbackPhotoUri(
  media: Pick<MediaInfo, 'uri' | 'remoteUri' | 'thumbnail' | 'remoteThumbnail'>,
  failedUri: string,
  kind: 'thumbnail' | 'full'
): string | null {
  const candidates = buildPhotoUriCandidates(media, kind);
  const normalizedFailedUri = failedUri.trim().length > 0
    ? resolvePhotoUri(failedUri)
    : '';
  const failedIndex = candidates.findIndex((candidate) => candidate === normalizedFailedUri);

  if (failedIndex >= 0) {
    const selectedUri = candidates[failedIndex + 1] ?? null;
    logger.log('[photoService] fallback photo uri', {
      kind,
      failedUri: normalizedFailedUri,
      candidates,
      selectedUri,
    });
    return selectedUri;
  }

  const selectedUri = candidates[0] ?? null;
  logger.log('[photoService] fallback photo uri', {
    kind,
    failedUri: normalizedFailedUri,
    candidates,
    selectedUri,
  });
  return selectedUri;
}

export async function savePhotoToStorage(
  sourceUri: string,
  entryId: string,
  quality: 'low' | 'medium' | 'high' = 'medium',
  aspectRatio?: number,
  processorDependencies?: PhotoProcessorDependencies
): Promise<SavedPhotoResult> {
  const mediaPaths = getMediaPaths();
  return savePhoto(
    sourceUri,
    entryId,
    mediaPaths.photoOriginal,
    mediaPaths.photoOriginal,
    quality,
    aspectRatio,
    processorDependencies
  );
}

export async function savePhotoToCache(
  sourceUri: string,
  entryId: string,
  quality: 'low' | 'medium' | 'high' = 'medium',
  aspectRatio?: number,
  processorDependencies?: PhotoProcessorDependencies
): Promise<SavedPhotoResult> {
  const mediaPaths = getMediaPaths();
  return savePhoto(
    sourceUri,
    entryId,
    mediaPaths.photoDisplay,
    mediaPaths.photoThumbnail,
    quality,
    aspectRatio,
    processorDependencies
  );
}

export function resolveThumbnailUri(originalUri: string): string | null {
  if (originalUri.includes('_thumb.')) {
    return originalUri;
  }

  const photoOriginalRelative = 'media/photos/original/';
  if (originalUri.includes(photoOriginalRelative)) {
    const filename = originalUri.split(photoOriginalRelative).pop();
    if (filename) {
      const thumbFilename = filename.replace('_photo_', '_thumb_');
      return `${getMediaPaths().photoOriginal}${thumbFilename}`;
    }
  }

  return null;
}

export async function deletePhoto(uri: string): Promise<void> {
  try {
    await deleteFile(uri);
  } catch (error) {
    logger.error('Failed to delete photo:', error);
  }
}
