import * as FileSystem from 'expo-file-system/legacy';

import { MediaCacheService } from './mediaCacheService';
import type { Entry } from '@/src/types/entry';

export interface MediaSyncValidationSummary {
  status: 'idle' | 'running' | 'success' | 'partial' | 'failed';
  total: number;
  downloaded: number;
  missing: number;
  failed: number;
  lastError: string | null;
  lastValidatedAt: number | null;
}

interface ValidationTarget {
  entryIndex: number;
  mediaIndex: number;
  field: 'uri' | 'thumbnail';
}

const ABSOLUTE_PATH_RE = /^(?:\/|[A-Za-z]:[\\/])/;

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

async function validateLocalTarget(uri: string): Promise<'downloaded' | 'missing' | 'failed'> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists ? 'downloaded' : 'missing';
  } catch {
    return 'failed';
  }
}

export function createCloudMediaSyncService() {
  const validateEntries = async (entries: Entry[]): Promise<MediaSyncValidationSummary> => {
    const activeEntries = entries.filter((entry) => !entry.deleted);
    const targets = collectValidationTargets(activeEntries);

    if (targets.length === 0) {
      return {
        status: 'success',
        total: 0,
        downloaded: 0,
        missing: 0,
        failed: 0,
        lastError: null,
        lastValidatedAt: Date.now(),
      };
    }

    try {
      const hydratedEntries = await MediaCacheService.hydrateEntries(activeEntries);
      let downloaded = 0;
      let missing = 0;
      let failed = 0;

      for (const target of targets) {
        const hydratedTarget = getHydratedMediaTarget(hydratedEntries, target);
        if (!isLocalTarget(hydratedTarget)) {
          missing += 1;
          continue;
        }

        const result = await validateLocalTarget(hydratedTarget);
        if (result === 'downloaded') {
          downloaded += 1;
        } else if (result === 'missing') {
          missing += 1;
        } else {
          failed += 1;
        }
      }

      const status = failed > 0 && downloaded === 0 && missing === 0
        ? 'failed'
        : (missing > 0 || failed > 0 ? 'partial' : 'success');

      return {
        status,
        total: targets.length,
        downloaded,
        missing,
        failed,
        lastError: failed > 0 ? 'One or more local media checks failed' : null,
        lastValidatedAt: Date.now(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to validate cloud media';
      return {
        status: 'failed',
        total: targets.length,
        downloaded: 0,
        missing: 0,
        failed: targets.length,
        lastError: message,
        lastValidatedAt: Date.now(),
      };
    }
  };

  return {
    validateEntries,
  };
}
