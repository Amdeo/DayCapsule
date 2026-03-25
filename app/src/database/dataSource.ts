/**
 * DataSource 抽象层
 * entryStore 通过此接口访问数据，不直接依赖 DB 或 API
 */

import type { Entry, EntryFilters } from '@/src/types/entry';
import * as DB from './operations';
import { ApiError, getApiClient } from '@/src/services/apiClient';
import { MediaCacheService } from '@/src/services/mediaCacheService';
import {
  buildPhotoUploadMetadata,
  mergePhotoUploadResult,
} from '@/src/services/photoIntegrityService';
import { logger } from '@/src/utils/logger';

export interface DataSource {
  getEntriesPage(filters: EntryFilters, pageSize: number, cursor?: number): Promise<Entry[]>;
  getEntryCount(): Promise<number>;
  addEntry(entry: Omit<Entry, 'id' | 'timestamp'>): Promise<Entry>;
  updateEntry(id: string, updates: Partial<Entry>): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  getAllTags(): Promise<string[]>;
  restoreEntries(entries: Entry[]): Promise<string[]>;
}

/** LocalDataSource — wraps existing SQLite operations */
export const localDataSource: DataSource = {
  getEntriesPage: async (filters, pageSize, cursor) => {
    const entries = await DB.getEntriesPage(filters, pageSize, cursor);
    return MediaCacheService.hydrateEntries(entries);
  },

  getEntryCount: () => DB.getEntriesCount(),

  addEntry: (entry) => DB.addEntry(entry),

  updateEntry: (id, updates) => DB.updateEntry(id, updates),

  deleteEntry: (id) => DB.deleteEntry(id),

  getAllTags: () => DB.getAllTags(),

  restoreEntries: (entries) => DB.restoreEntries(entries),
};

/** Active data source — switched by cloud mode toggle */
let _activeDataSource: DataSource = localDataSource;

export function getActiveDataSource(): DataSource {
  return _activeDataSource;
}

export function switchDataSource(ds: DataSource): void {
  _activeDataSource = ds;
}

/** RemoteDataSource — all operations go through backend API */
export function createRemoteDataSource(): DataSource {
  const client = getApiClient();

  return {
    getEntriesPage: async (filters, pageSize, cursor) => {
      const params: Record<string, string> = { limit: String(pageSize) };
      if (cursor) params.cursor = String(cursor);
      if (filters.type) params.type = filters.type;
      if (filters.startTime) params.startTime = String(filters.startTime);
      if (filters.search) params.search = filters.search;
      if (filters.tags?.length) params.tags = filters.tags.join(',');
      const entries = await client.get<Entry[]>('/entries', params);
      return MediaCacheService.hydrateEntries(entries);
    },

    getEntryCount: async () => {
      const result = await client.get<{ entryCount: number }>('/entries/count');
      return result.entryCount ?? 0;
    },

    addEntry: async (entry) => {
      let mediaIds: string[] | undefined;
      let uploadedMedia = entry.media;
      if (entry.media?.length) {
        try {
          const uploads = await Promise.all(
            entry.media.map((m) => client.uploadFile('/media/upload', m.uri, 'file', {
              metadata: buildPhotoUploadMetadata(m),
            }))
          );
          mediaIds = uploads.map((u) => u.id);
          uploadedMedia = entry.media.map((media, index) => mergePhotoUploadResult(media, uploads[index]));
        } catch (error) {
          logger.error('[RemoteDataSource] media-upload-failed:', error);
          if (error instanceof ApiError) {
            throw new ApiError('MEDIA_UPLOAD_FAILED', error.message, error.status);
          }
          throw error;
        }
      }

      try {
        const created = await client.post<Entry>('/entries', {
          type: entry.type,
          content: entry.content,
          tags: entry.tags,
          mediaIds,
          recordingStatus: entry.recordingStatus,
          recordingDuration: entry.recordingDuration,
        });
        if (created.media?.length && uploadedMedia?.length) {
          created.media = created.media.map((media, index) => ({
            ...media,
            uri: uploadedMedia?.[index]?.uri ?? media.uri,
            thumbnail: uploadedMedia?.[index]?.thumbnail ?? media.thumbnail,
            remoteUri: MediaCacheService.isRemoteUri(media.uri)
              ? MediaCacheService.normalizeRemoteUri(media.uri)
              : (uploadedMedia?.[index]?.remoteUri ?? media.remoteUri),
            remoteThumbnail: MediaCacheService.isRemoteUri(media.thumbnail)
              ? MediaCacheService.normalizeRemoteUri(media.thumbnail!)
              : (uploadedMedia?.[index]?.remoteThumbnail ?? media.remoteThumbnail),
            metadata: uploadedMedia?.[index]?.metadata,
          }));
        }
        return created;
      } catch (error) {
        logger.error('[RemoteDataSource] entry-create-failed:', error);
        if (error instanceof ApiError) {
          throw new ApiError('ENTRY_CREATE_FAILED', error.message, error.status);
        }
        throw error;
      }
    },

    updateEntry: async (id, updates) => {
      await client.put(`/entries/${id}`, updates);
    },

    deleteEntry: async (id) => {
      await client.delete(`/entries/${id}`);
    },

    getAllTags: () => client.get<string[]>('/tags'),

    restoreEntries: async (entries) => {
      // 先清空云端
      await client.post('/entries/import', { entries: [] });
      // 逐条上传，含媒体文件
      for (const e of entries) {
        let mediaIds: string[] | undefined;
        if (e.media?.length) {
          const uploads = await Promise.all(
            e.media.map((m) => client.uploadFile('/media/upload', m.uri, 'file', {
              metadata: buildPhotoUploadMetadata(m),
            }))
          );
          mediaIds = uploads.map((u) => u.id);
        }
        await client.post('/entries', {
          type: e.type,
          content: e.content,
          tags: e.tags,
          mediaIds,
          recordingStatus: e.recordingStatus,
          recordingDuration: e.recordingDuration,
        });
      }
      return entries.map((e) => e.id);
    },
  };
}
