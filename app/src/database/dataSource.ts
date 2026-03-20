/**
 * DataSource 抽象层
 * entryStore 通过此接口访问数据，不直接依赖 DB 或 API
 */

import type { Entry, EntryFilters } from '@/src/types/entry';
import * as DB from './operations';
import { getApiClient } from '@/src/services/apiClient';
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
  getEntriesPage: (filters, pageSize, cursor) =>
    DB.getEntriesPage(filters, pageSize, cursor),

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
      return client.get<Entry[]>('/entries', params);
    },

    getEntryCount: async () => {
      const status = await client.get<{ hasBackup: boolean; entryCount: number }>('/sync/status');
      return status.entryCount ?? 0;
    },

    addEntry: async (entry) => {
      let mediaIds: string[] | undefined;
      if (entry.media?.length) {
        const uploads = await Promise.all(
          entry.media.map((m) => client.uploadFile('/media/upload', m.uri, 'file'))
        );
        mediaIds = uploads.map((u) => u.id);
      }

      return client.post<Entry>('/entries', {
        type: entry.type,
        content: entry.content,
        tags: entry.tags,
        mediaIds,
        recordingStatus: entry.recordingStatus,
        recordingDuration: entry.recordingDuration,
      });
    },

    updateEntry: async (id, updates) => {
      await client.put(`/entries/${id}`, updates);
    },

    deleteEntry: async (id) => {
      await client.delete(`/entries/${id}`);
    },

    getAllTags: () => client.get<string[]>('/tags'),

    restoreEntries: async (entries) => {
      const hash = String(Date.now());
      await client.post('/sync/upload', {
        data: { entries, tags: [], version: 1 },
        hash,
        entryCount: entries.length,
        deviceName: 'DayCapsule App',
        encrypted: false,
        encryptionVersion: 0,
      });
      return entries.map((e) => e.id);
    },
  };
}
