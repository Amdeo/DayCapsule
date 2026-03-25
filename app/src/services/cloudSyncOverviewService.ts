import * as FileSystem from 'expo-file-system/legacy';
import * as DB from '@/src/database/operations';
import { getApiClient } from '@/src/services/apiClient';
import { createCloudSyncService } from '@/src/services/cloudSyncService';
import type { Entry } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';

export interface SyncOverviewSnapshot {
  lastSyncAt: number | null;
  lastSyncError: string | null;
  pendingEntries: number;
  pendingUploads: number;
  uploadingEntries: number;
  failedEntries: number;
  conflictCopies: number;
  local: {
    entryCount: number;
    photoCount: number;
    voiceCount: number;
    mediaBytes: number;
  };
  cloud: {
    entryCount: number;
    photoCount: number;
    voiceCount: number;
    mediaCount: number;
    mediaBytes: number;
  } | null;
  cloudError: string | null;
}

interface SyncOverviewServiceApi {
  getSnapshot: () => Promise<SyncOverviewSnapshot>;
}

interface CloudOverviewPayload {
  entryCount: number;
  photoCount: number;
  voiceCount: number;
  mediaCount: number;
  mediaBytes: number;
}

const isRemoteUrl = (uri: string): boolean => /^https?:\/\//i.test(uri.trim());

const collectLocalMediaPaths = (entries: Entry[]): string[] => {
  const paths = new Set<string>();

  for (const entry of entries) {
    if (entry.deleted || !entry.media?.length) continue;

    for (const media of entry.media) {
      if (media.uri && !isRemoteUrl(media.uri)) {
        paths.add(media.uri);
      }
      if (media.thumbnail && !isRemoteUrl(media.thumbnail)) {
        paths.add(media.thumbnail);
      }
    }
  }

  return [...paths];
};

const getLocalMediaBytes = async (): Promise<number> => {
  const entries = await DB.getAllEntries();
  const mediaPaths = collectLocalMediaPaths(entries);

  const sizes = await Promise.all(
    mediaPaths.map(async (uri) => {
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists || typeof info.size !== 'number' || info.size <= 0) {
          return 0;
        }
        return info.size;
      } catch (error) {
        logger.warn('[cloudSyncOverview] get local media size failed:', uri, error);
        return 0;
      }
    }),
  );

  return sizes.reduce((total, size) => total + size, 0);
};

export function createCloudSyncOverviewService(): SyncOverviewServiceApi {
  const cloudSyncService = createCloudSyncService();
  const api = getApiClient();

  const getSnapshot = async (): Promise<SyncOverviewSnapshot> => {
    const cloudOverviewPromise = api
      .get<CloudOverviewPayload>('/sync/overview')
      .then((cloud) => ({ cloud, cloudError: null as string | null }))
      .catch((error: unknown) => ({
        cloud: null,
        cloudError: error instanceof Error ? error.message : 'failed to fetch cloud overview',
      }));

    const [status, localCounts, localMediaBytes, cloudOverview] = await Promise.all([
      cloudSyncService.getStatus(),
      DB.getLocalSyncOverviewCounts(),
      getLocalMediaBytes(),
      cloudOverviewPromise,
    ]);

    return {
      lastSyncAt: status.lastSyncAt,
      lastSyncError: status.lastSyncError,
      pendingEntries: status.pendingEntries,
      pendingUploads: status.pendingUploads,
      uploadingEntries: status.uploadingEntries,
      failedEntries: status.failedEntries,
      conflictCopies: status.conflictCopies,
      local: {
        entryCount: localCounts.entryCount,
        photoCount: localCounts.photoCount,
        voiceCount: localCounts.voiceCount,
        mediaBytes: localMediaBytes,
      },
      cloud: cloudOverview.cloud,
      cloudError: cloudOverview.cloudError,
    };
  };

  return {
    getSnapshot,
  };
}
