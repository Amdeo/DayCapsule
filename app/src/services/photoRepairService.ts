import * as DB from '@/src/database/operations';
import type { UploadFileOptions, UploadFileResponse } from '@/src/services/apiClient';
import { getApiClient } from '@/src/services/apiClient';
import { createCloudSyncService } from '@/src/services/cloudSyncService';
import type { MediaRepairIssue } from '@/src/services/cloudMediaSyncService';
import {
  buildPhotoLogPayload,
  fingerprintPhotoFile,
  type PhotoFileFingerprint,
} from '@/src/services/photoIntegrityService';
import type { Entry, MediaInfo, MediaIntegrityStatus } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';

const REPAIR_PENDING_REASON = 'waiting for sync confirmation after user-approved repair';
const LOCAL_SOURCE_UNAVAILABLE_ERROR = 'Healthy local source is no longer available';

type UploadFile = (
  path: string,
  fileUri: string,
  fieldName: string,
  options?: UploadFileOptions
) => Promise<UploadFileResponse>;

export interface PhotoRepairServiceDeps {
  getEntryById: (id: string) => Promise<Entry | null>;
  updateEntry: (id: string, updates: Partial<Entry>) => Promise<void>;
  uploadFile: UploadFile;
  syncNow: () => Promise<void>;
  fingerprintPhotoFile: (uri: string) => Promise<PhotoFileFingerprint>;
  now: () => number;
}

export interface PhotoRepairService {
  repair: (issue: MediaRepairIssue) => Promise<void>;
}

function buildRepairUploadMetadata(
  repairLocalMediaId: string | undefined,
  fingerprint: PhotoFileFingerprint
): NonNullable<UploadFileOptions['metadata']> {
  return {
    traceId: repairLocalMediaId,
    localMediaId: repairLocalMediaId,
    persistedHash: fingerprint.sha256,
    sourceHash: fingerprint.sha256,
    size: fingerprint.size,
    width: fingerprint.width,
    height: fingerprint.height,
  };
}

function ensureRepairTarget(
  entry: Entry | null,
  issue: MediaRepairIssue
): Entry & { media: MediaInfo[] } {
  if (!entry || !Array.isArray(entry.media) || !entry.media[issue.mediaIndex]) {
    throw new Error('Repair target entry is missing');
  }

  return entry as Entry & { media: MediaInfo[] };
}

function buildRepairedMedia(
  entry: Entry & { media: MediaInfo[] },
  issue: MediaRepairIssue,
  fingerprint: PhotoFileFingerprint,
  upload: UploadFileResponse,
  now: number
): MediaInfo[] {
  return entry.media.map((item, index) => {
    if (index !== issue.mediaIndex) {
      return item;
    }

    const metadata = item.metadata;
    return {
      ...item,
      uri: issue.localUri,
      remoteUri: upload.url,
      mimeType: fingerprint.mimeType,
      size: fingerprint.size,
      metadata: {
        ...metadata,
        localMediaId: issue.localMediaId ?? metadata?.localMediaId,
        sourceHash: metadata?.sourceHash ?? fingerprint.sha256,
        persistedHash: fingerprint.sha256,
        remoteHash: upload.remoteHash,
        downloadedHash: undefined,
        integrityStatus: 'repair_pending',
        integrityReason: REPAIR_PENDING_REASON,
        lastVerifiedAt: now,
        repairable: false,
        width: fingerprint.width,
        height: fingerprint.height,
        createdAt: metadata?.createdAt ?? now,
        modifiedAt: now,
      },
    };
  });
}

function buildRepairLogPayload(
  issue: MediaRepairIssue,
  repairLocalMediaId?: string,
  fingerprint?: PhotoFileFingerprint,
  remoteUri?: string,
  remoteHash?: string,
  integrityStatus?: MediaIntegrityStatus,
  integrityReason?: string | null
) {
  return buildPhotoLogPayload({
    entryId: issue.entryId,
    localMediaId: repairLocalMediaId ?? issue.localMediaId,
    localUri: issue.localUri,
    remoteUri: remoteUri ?? issue.remoteUri,
    size: fingerprint?.size,
    width: fingerprint?.width,
    height: fingerprint?.height,
    persistedHash: issue.persistedHash,
    downloadedHash: issue.downloadedHash,
    remoteHash: remoteHash ?? issue.remoteHash,
    integrityStatus,
    integrityReason: integrityReason ?? issue.integrityReason,
  });
}

export function createPhotoRepairService(
  deps?: Partial<PhotoRepairServiceDeps>
): PhotoRepairService {
  const resolvedDeps: PhotoRepairServiceDeps = {
    getEntryById: deps?.getEntryById ?? ((id) => DB.getEntryById(id)),
    updateEntry: deps?.updateEntry ?? ((id, updates) => DB.updateEntry(id, updates)),
    uploadFile: deps?.uploadFile ?? ((path, fileUri, fieldName, options) =>
      getApiClient().uploadFile(path, fileUri, fieldName, options)),
    syncNow: deps?.syncNow ?? (() => createCloudSyncService().syncNow()),
    fingerprintPhotoFile: deps?.fingerprintPhotoFile ?? fingerprintPhotoFile,
    now: deps?.now ?? (() => Date.now()),
  };

  const repair = async (issue: MediaRepairIssue): Promise<void> => {
    logger.log('photo.repair.confirmed', buildRepairLogPayload(issue));

    let fingerprint: PhotoFileFingerprint | undefined;
    let upload: UploadFileResponse | undefined;
    let repairLocalMediaId = issue.localMediaId;

    try {
      fingerprint = await resolvedDeps.fingerprintPhotoFile(issue.localUri);
      if (issue.persistedHash && fingerprint.sha256 !== issue.persistedHash) {
        throw new Error(LOCAL_SOURCE_UNAVAILABLE_ERROR);
      }

      const entry = ensureRepairTarget(
        await resolvedDeps.getEntryById(issue.entryId),
        issue,
      );
      repairLocalMediaId = issue.localMediaId ?? entry.media[issue.mediaIndex]?.metadata?.localMediaId;
      upload = await resolvedDeps.uploadFile(
        '/media/upload',
        issue.localUri,
        'file',
        {
          metadata: buildRepairUploadMetadata(repairLocalMediaId, fingerprint),
        },
      );

      const now = resolvedDeps.now();
      const media = buildRepairedMedia(entry, issue, fingerprint, upload, now);
      await resolvedDeps.updateEntry(issue.entryId, {
        media,
        syncStatus: 'pending',
        syncOp: 'update',
        updatedAt: now,
        deleted: false,
      });
      await resolvedDeps.syncNow();

      logger.log('photo.repair.completed', buildRepairLogPayload(
        issue,
        repairLocalMediaId,
        fingerprint,
        upload.url,
        upload.remoteHash,
        'repair_pending',
        REPAIR_PENDING_REASON,
      ));
    } catch (error) {
      logger.log('photo.repair.failed', buildRepairLogPayload(
        issue,
        repairLocalMediaId,
        fingerprint,
        upload?.url,
        upload?.remoteHash,
        'repair_failed',
        error instanceof Error ? error.message : 'Photo repair failed',
      ));
      throw error;
    }
  };

  return {
    repair,
  };
}

export { LOCAL_SOURCE_UNAVAILABLE_ERROR, REPAIR_PENDING_REASON };
