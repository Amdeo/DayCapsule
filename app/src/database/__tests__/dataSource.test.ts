/**
 * DataSource unit tests
 */

// Must be at very top of file
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  uploadFile: jest.fn(),
};

jest.mock('@/src/services/apiClient', () => ({
  getApiClient: () => mockApiClient,
}));

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

import { createRemoteDataSource } from '../dataSource';

describe('RemoteDataSource', () => {
  const remoteDS = createRemoteDataSource();

  beforeEach(() => {
    Object.values(mockApiClient).forEach((fn) => (fn as jest.Mock).mockReset());
  });

  it('getEntriesPage calls GET /entries with query params', async () => {
    mockApiClient.get.mockResolvedValueOnce([]);
    await remoteDS.getEntriesPage({ type: 'text' }, 20, 1000);
    expect(mockApiClient.get).toHaveBeenCalledWith('/entries', {
      limit: '20',
      cursor: '1000',
      type: 'text',
    });
  });

  it('addEntry without media calls POST /entries', async () => {
    mockApiClient.post.mockResolvedValueOnce({ id: 'r1', timestamp: 2000 });
    const result = await remoteDS.addEntry({
      type: 'text',
      content: 'hello',
      syncStatus: 'synced',
    });
    expect(result.id).toBe('r1');
    expect(mockApiClient.uploadFile).not.toHaveBeenCalled();
  });

  it('addEntry with media uploads file first', async () => {
    mockApiClient.uploadFile.mockResolvedValueOnce({ id: 'media-1', url: 'https://cdn/media-1' });
    mockApiClient.post.mockResolvedValueOnce({
      id: 'r2', timestamp: 3000, type: 'photo', content: '',
      media: [{ uri: 'https://cdn/media-1', mimeType: 'image/jpeg', size: 100 }],
      syncStatus: 'synced',
    });

    const result = await remoteDS.addEntry({
      type: 'photo',
      content: '',
      media: [{ uri: 'file:///local/photo.jpg', mimeType: 'image/jpeg', size: 100 }],
      syncStatus: 'synced',
    });

    expect(mockApiClient.uploadFile).toHaveBeenCalledWith('/media/upload', 'file:///local/photo.jpg', 'file');
    expect(result.id).toBe('r2');
  });

  it('deleteEntry calls DELETE /entries/:id', async () => {
    mockApiClient.delete.mockResolvedValueOnce(undefined);
    await remoteDS.deleteEntry('r1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/entries/r1');
  });

  it('getEntryCount calls GET /sync/status', async () => {
    mockApiClient.get.mockResolvedValueOnce({ hasBackup: true, entryCount: 42 });
    const count = await remoteDS.getEntryCount();
    expect(count).toBe(42);
  });
});
