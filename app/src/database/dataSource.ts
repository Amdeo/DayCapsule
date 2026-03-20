/**
 * DataSource 抽象层
 * entryStore 通过此接口访问数据，不直接依赖 DB 或 API
 */

import type { Entry, EntryFilters } from '@/src/types/entry';
import * as DB from './operations';

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
