/**
 * DataSource unit tests
 */

jest.mock('@/src/database/operations', () => ({
  getEntriesPage: jest.fn().mockResolvedValue([]),
  getEntriesCount: jest.fn().mockResolvedValue(0),
  addEntry: jest.fn().mockImplementation((entry) =>
    Promise.resolve({ ...entry, id: 'new-1', timestamp: 1000, syncStatus: 'synced' })
  ),
  updateEntry: jest.fn().mockResolvedValue(undefined),
  deleteEntry: jest.fn().mockResolvedValue(undefined),
  getAllTags: jest.fn().mockResolvedValue(['tag1', 'tag2']),
  restoreEntries: jest.fn().mockResolvedValue(['id1']),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { localDataSource } from '../dataSource';
import * as DB from '@/src/database/operations';

beforeEach(() => jest.clearAllMocks());

describe('LocalDataSource', () => {
  it('getEntriesPage delegates to DB.getEntriesPage', async () => {
    await localDataSource.getEntriesPage({}, 20);
    expect(DB.getEntriesPage).toHaveBeenCalledWith({}, 20, undefined);
  });

  it('getEntryCount delegates to DB.getEntriesCount', async () => {
    await localDataSource.getEntryCount();
    expect(DB.getEntriesCount).toHaveBeenCalled();
  });

  it('addEntry delegates to DB.addEntry', async () => {
    const entry = { type: 'text' as const, content: 'hi', syncStatus: 'synced' as const };
    const result = await localDataSource.addEntry(entry);
    expect(result.id).toBe('new-1');
    expect(DB.addEntry).toHaveBeenCalledWith(entry);
  });

  it('deleteEntry delegates to DB.deleteEntry', async () => {
    await localDataSource.deleteEntry('x');
    expect(DB.deleteEntry).toHaveBeenCalledWith('x');
  });

  it('getAllTags delegates to DB.getAllTags', async () => {
    const tags = await localDataSource.getAllTags();
    expect(tags).toEqual(['tag1', 'tag2']);
  });
});
