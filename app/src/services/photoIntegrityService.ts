import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

import type { MediaInfo, MediaIntegrityStatus, PhotoRepairSource } from '@/src/types/entry';

export type PhotoFileFingerprint = {
  uri: string;
  sha256: string;
  size: number;
  width: number;
  height: number;
  mimeType: 'image/jpeg';
};

export type PhotoFingerprintOptions = {
  width?: number;
  height?: number;
};

export type IntegrityDecisionInput = {
  persistedHash?: string;
  remoteHash?: string;
  downloadedHash?: string;
  localSourceExists?: boolean;
};

export type IntegrityDecision = {
  integrityStatus: MediaIntegrityStatus;
  integrityReason?: string;
  repairable: boolean;
  repairSource?: PhotoRepairSource;
};

export type BuildPhotoLogPayloadInput = {
  traceId?: string;
  entryId?: string;
  localMediaId?: string;
  mediaId?: string;
  sourceUri?: string;
  localUri?: string;
  remoteUri?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  sourceHash?: string;
  persistedHash?: string;
  remoteHash?: string;
  downloadedHash?: string;
  integrityStatus?: MediaIntegrityStatus;
  integrityReason?: string | null | undefined;
};

export type PhotoUploadMetadata = {
  traceId?: string;
  localMediaId?: string;
  persistedHash?: string;
  sourceHash?: string;
  size?: number;
  width?: number;
  height?: number;
};

export type PhotoUploadResult = {
  id: string;
  url: string;
  remoteHash?: string;
  validationStatus?: string;
  validationError?: string | null;
};

export async function fingerprintPhotoFile(
  uri: string,
  options?: PhotoFingerprintOptions
): Promise<PhotoFileFingerprint> {
  const fileInfo = await FileSystem.getInfoAsync(uri);
  const size = fileInfo.exists && typeof fileInfo.size === 'number' ? fileInfo.size : 0;

  if (!fileInfo.exists || size <= 0) {
    throw new Error(`Photo file is missing or empty: ${uri}`);
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const sha256 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    base64,
  );
  const width = typeof options?.width === 'number'
    ? options.width
    : undefined;
  const height = typeof options?.height === 'number'
    ? options.height
    : undefined;

  let resolvedWidth = width ?? 0;
  let resolvedHeight = height ?? 0;

  if (resolvedWidth <= 0 || resolvedHeight <= 0) {
    const manipulated = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    resolvedWidth = manipulated.width ?? 0;
    resolvedHeight = manipulated.height ?? 0;
  }

  return {
    uri,
    sha256,
    size,
    width: resolvedWidth,
    height: resolvedHeight,
    mimeType: 'image/jpeg',
  };
}

export function buildIntegrityDecision(input: IntegrityDecisionInput): IntegrityDecision {
  const {
    persistedHash,
    remoteHash,
    downloadedHash,
    localSourceExists = false,
  } = input;

  if (persistedHash && remoteHash && persistedHash !== remoteHash) {
    if (localSourceExists) {
      return {
        integrityStatus: 'cloud_content_suspect',
        integrityReason: 'persisted_remote_hash_mismatch',
        repairable: true,
        repairSource: 'local-original',
      };
    }

    return {
      integrityStatus: 'download_mismatch',
      integrityReason: 'persisted_remote_hash_mismatch',
      repairable: false,
    };
  }

  if (remoteHash && downloadedHash && remoteHash !== downloadedHash) {
    return {
      integrityStatus: 'download_mismatch',
      integrityReason: 'downloaded_remote_hash_mismatch',
      repairable: false,
    };
  }

  return {
    integrityStatus: 'healthy',
    repairable: false,
  };
}

export function buildPhotoLogPayload(input: BuildPhotoLogPayloadInput): Record<string, unknown> {
  return {
    traceId: input.traceId,
    entryId: input.entryId,
    localMediaId: input.localMediaId,
    mediaId: input.mediaId,
    sourceUri: input.sourceUri,
    localUri: input.localUri,
    remoteUri: input.remoteUri,
    mimeType: input.mimeType,
    size: input.size,
    width: input.width,
    height: input.height,
    sourceHash: input.sourceHash,
    persistedHash: input.persistedHash,
    remoteHash: input.remoteHash,
    downloadedHash: input.downloadedHash,
    integrityStatus: input.integrityStatus,
    integrityReason: input.integrityReason,
  };
}

export function buildPhotoUploadMetadata(
  media: Pick<MediaInfo, 'size' | 'metadata'>
): PhotoUploadMetadata | undefined {
  const metadata: PhotoUploadMetadata = {
    traceId: media.metadata?.localMediaId,
    localMediaId: media.metadata?.localMediaId,
    persistedHash: media.metadata?.persistedHash,
    sourceHash: media.metadata?.sourceHash,
    size: media.size > 0 ? media.size : undefined,
    width: media.metadata?.width,
    height: media.metadata?.height,
  };

  return Object.values(metadata).some((value) => value !== undefined && value !== null)
    ? metadata
    : undefined;
}

export function mergePhotoUploadResult(
  media: MediaInfo,
  upload: PhotoUploadResult
): MediaInfo {
  return {
    ...media,
    remoteUri: upload.url,
    metadata: media.metadata
      ? {
          ...media.metadata,
          remoteHash: upload.remoteHash,
          integrityStatus: upload.validationStatus === 'upload_mismatch' ? 'upload_mismatch' : 'healthy',
          integrityReason: upload.validationError ?? undefined,
        }
      : undefined,
  };
}
