import * as FileSystem from 'expo-file-system/legacy';

import { MediaCacheService } from './mediaCacheService';
import { fingerprintPhotoFile } from './photoIntegrityService';
import type { MediaSyncValidationSummary } from '@/src/store/syncStore';
import type { Entry, MediaInfo } from '@/src/types/entry';

export type MediaRepairIssue = {
  entryId: string;
  mediaIndex: number;
  localMediaId?: string;
  localUri: string;
  remoteUri?: string;
  persistedHash?: string;
  remoteHash?: string;
  downloadedHash?: string;
  integrityStatus: 'repair_prompt_required' | 'repair_failed';
  integrityReason: string;
};

export type MediaValidationRun = {
  summary: MediaSyncValidationSummary;
  issues: MediaRepairIssue[];
};

interface ValidationTarget {
  entryIndex: number;
  mediaIndex: number;
  field: 'uri' | 'thumbnail';
}

const ABSOLUTE_PATH_RE = /^(?:\/|[A-Za-z]:[\\/])/;
const REPAIR_PROMPT_REASON = 'cloud hash mismatch while local original is still healthy';

function buildSummary(
  summary: Omit<MediaSyncValidationSummary, 'suspect' | 'repairable'> & {
    suspect?: number;
    repairable?: number;
  }
): MediaSyncValidationSummary {
  return {
    ...summary,
    suspect: summary.suspect ?? 0,
    repairable: summary.repairable ?? 0,
  };
}

function isLocalTarget(uri: string | undefined): uri is string {
  return !!uri && (uri.startsWith('file://') || ABSOLUTE_PATH_RE.test(uri));
}

function isRemoteTarget(uri: string | undefined): boolean {
  return MediaCacheService.isRemoteUri(uri);
}

function collectValidationTargets(entries: Entry[]): ValidationTarget[] {
  const targets: ValidationTarget[] = [];

  entries.forEach((entry, entryIndex) => {
    if (entry.deleted) {
      return;
    }

    entry.media?.forEach((media, mediaIndex) => {
      if (isRemoteTarget(media.remoteUri) || isRemoteTarget(media.uri)) {
        targets.push({ entryIndex, mediaIndex, field: 'uri' });
      }
      if (isRemoteTarget(media.remoteThumbnail) || isRemoteTarget(media.thumbnail)) {
        targets.push({ entryIndex, mediaIndex, field: 'thumbnail' });
      }
    });
  });

  return targets;
}

function getHydratedMediaTarget(
  hydratedEntries: Entry[],
  target: ValidationTarget,
): string | undefined {
  return hydratedEntries[target.entryIndex]?.media?.[target.mediaIndex]?.[target.field];
}

function getOriginalMedia(
  entries: Entry[],
  target: ValidationTarget,
): MediaInfo | undefined {
  return entries[target.entryIndex]?.media?.[target.mediaIndex];
}

function getLocalSourceUri(media: MediaInfo | undefined): string | undefined {
  if (!media) {
    return undefined;
  }

  if (!isLocalTarget(media.uri) || isRemoteTarget(media.uri)) {
    return undefined;
  }

  return media.uri;
}

async function validateLocalTarget(uri: string): Promise<'downloaded' | 'missing' | 'failed'> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists ? 'downloaded' : 'missing';
  } catch {
    return 'failed';
  }
}

async function hasHealthyLocalSource(
  media: MediaInfo | undefined,
  localSourceUri: string | undefined
): Promise<boolean> {
  if (!media?.metadata?.persistedHash || !localSourceUri) {
    return false;
  }

  try {
    const fingerprint = await fingerprintPhotoFile(localSourceUri);
    return fingerprint.sha256 === media.metadata.persistedHash;
  } catch {
    return false;
  }
}

function shouldMarkCloudContentSuspect(
  media: MediaInfo | undefined,
  downloadedHash: string
): boolean {
  if (!media) {
    return false;
  }

  const persistedHash = media.metadata?.persistedHash;
  const remoteHash = media.metadata?.remoteHash;

  if (remoteHash && downloadedHash !== remoteHash) {
    return true;
  }

  if (persistedHash && downloadedHash !== persistedHash) {
    return true;
  }

  return false;
}

function buildRepairIssue(
  entry: Entry,
  media: MediaInfo,
  mediaIndex: number,
  localUri: string,
  downloadedHash: string
): MediaRepairIssue {
  return {
    entryId: entry.id,
    mediaIndex,
    localMediaId: media.metadata?.localMediaId,
    localUri,
    remoteUri: media.remoteUri,
    persistedHash: media.metadata?.persistedHash,
    remoteHash: media.metadata?.remoteHash,
    downloadedHash,
    integrityStatus: 'repair_prompt_required',
    integrityReason: REPAIR_PROMPT_REASON,
  };
}

export function createCloudMediaSyncService() {
  const validateEntries = async (entries: Entry[]): Promise<MediaValidationRun> => {
    const activeEntries = entries.filter((entry) => !entry.deleted);
    const targets = collectValidationTargets(activeEntries);

    if (targets.length === 0) {
      return {
        summary: buildSummary({
          status: 'success',
          total: 0,
          downloaded: 0,
          missing: 0,
          failed: 0,
          lastError: null,
          lastValidatedAt: Date.now(),
        }),
        issues: [],
      };
    }

    try {
      const hydratedEntries = await MediaCacheService.hydrateEntries(activeEntries);
      let downloaded = 0;
      let missing = 0;
      let failed = 0;
      let suspect = 0;
      let repairable = 0;
      let lastError: string | null = null;
      const issues: MediaRepairIssue[] = [];

      for (const target of targets) {
        const hydratedTarget = getHydratedMediaTarget(hydratedEntries, target);
        if (!isLocalTarget(hydratedTarget)) {
          missing += 1;
          continue;
        }

        const existsResult = await validateLocalTarget(hydratedTarget);
        if (existsResult === 'missing') {
          missing += 1;
          continue;
        }
        if (existsResult === 'failed') {
          failed += 1;
          lastError = lastError ?? 'One or more local media checks failed';
          continue;
        }

        if (target.field === 'thumbnail') {
          downloaded += 1;
          continue;
        }

        const originalEntry = activeEntries[target.entryIndex];
        const originalMedia = getOriginalMedia(activeEntries, target);

        try {
          const downloadedFingerprint = await fingerprintPhotoFile(hydratedTarget);
          downloaded += 1;

          if (!shouldMarkCloudContentSuspect(originalMedia, downloadedFingerprint.sha256)) {
            continue;
          }

          suspect += 1;
          const localSourceUri = getLocalSourceUri(originalMedia);
          if (await hasHealthyLocalSource(originalMedia, localSourceUri)) {
            repairable += 1;
            issues.push(buildRepairIssue(
              originalEntry,
              originalMedia as MediaInfo,
              target.mediaIndex,
              localSourceUri as string,
              downloadedFingerprint.sha256,
            ));
          }
        } catch (error) {
          failed += 1;
          lastError = lastError
            ?? (error instanceof Error ? error.message : 'One or more local media checks failed');
        }
      }

      const status = failed > 0 && downloaded === 0 && missing === 0 && suspect === 0
        ? 'failed'
        : (missing > 0 || failed > 0 || suspect > 0 ? 'partial' : 'success');

      return {
        summary: buildSummary({
          status,
          total: targets.length,
          downloaded,
          missing,
          failed,
          suspect,
          repairable,
          lastError,
          lastValidatedAt: Date.now(),
        }),
        issues,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to validate cloud media';
      return {
        summary: buildSummary({
          status: 'failed',
          total: targets.length,
          downloaded: 0,
          missing: 0,
          failed: targets.length,
          suspect: 0,
          repairable: 0,
          lastError: message,
          lastValidatedAt: Date.now(),
        }),
        issues: [],
      };
    }
  };

  return {
    validateEntries,
  };
}
