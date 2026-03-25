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
  ApiError: class ApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.code = code;
      this.status = status;
    }
  },
  getApiClient: () => mockApiClient,
}));

jest.mock('@/src/services/mediaCacheService', () => ({
  MediaCacheService: {
    hydrateEntries: jest.fn(async (entries) => entries),
    isRemoteUri: jest.fn((uri?: string) => !!uri && /^https?:\/\//.test(uri)),
    normalizeRemoteUri: jest.fn((uri: string) => uri),
  },
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

import { ApiError } from '@/src/services/apiClient';
import { MediaCacheService } from '@/src/services/mediaCacheService';
import { localDataSource } from '../dataSource';
import * as DB from '@/src/database/operations';

const mockMediaCacheService = MediaCacheService as unknown as {
  hydrateEntries: jest.Mock;
  isRemoteUri: jest.Mock;
  normalizeRemoteUri: jest.Mock;
};

beforeEach(() => jest.clearAllMocks());

describe('LocalDataSource', () => {
  it('getEntriesPage delegates to DB.getEntriesPage and hydrates remote media', async () => {
    const entries = [{
      id: 'cloud-1',
      type: 'photo' as const,
      content: '',
      timestamp: 1000,
      syncStatus: 'synced' as const,
      media: [{ uri: 'http://101.43.120.134:8081/api/media/1', mimeType: 'image/jpeg', size: 100 }],
    }];
    (DB.getEntriesPage as jest.Mock).mockResolvedValueOnce(entries);

    await localDataSource.getEntriesPage({}, 20);

    expect(DB.getEntriesPage).toHaveBeenCalledWith({}, 20, undefined);
    expect(mockMediaCacheService.hydrateEntries).toHaveBeenCalledWith(entries);
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
    Object.values(mockMediaCacheService).forEach((fn) => {
      if (typeof fn === 'function' && 'mockReset' in fn) (fn as jest.Mock).mockReset();
    });
    mockMediaCacheService.hydrateEntries.mockImplementation(async (entries) => entries);
    mockMediaCacheService.isRemoteUri.mockImplementation((uri?: string) => !!uri && /^https?:\/\//.test(uri));
    mockMediaCacheService.normalizeRemoteUri.mockImplementation((uri: string) => uri);
  });

  it('getEntriesPage calls GET /entries with query params', async () => {
    mockApiClient.get.mockResolvedValueOnce([]);
    await remoteDS.getEntriesPage({ type: 'text' }, 20, 1000);
    expect(mockApiClient.get).toHaveBeenCalledWith('/entries', {
      limit: '20',
      cursor: '1000',
      type: 'text',
    });
    expect(mockMediaCacheService.hydrateEntries).toHaveBeenCalledWith([]);
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

    expect(mockApiClient.uploadFile).toHaveBeenCalledWith(
      '/media/upload',
      'file:///local/photo.jpg',
      'file',
      {
        metadata: expect.objectContaining({ size: 100 }),
      }
    );
    expect(result.id).toBe('r2');
    expect(result.media?.[0]).toMatchObject({
      uri: 'file:///local/photo.jpg',
      remoteUri: 'https://cdn/media-1',
    });
  });

  it('addEntry stops before POST /entries when media upload fails', async () => {
    mockApiClient.uploadFile.mockRejectedValueOnce(new ApiError('NETWORK_ERROR', 'upload failed', 0));

    await expect(
      remoteDS.addEntry({
        type: 'voice',
        content: '',
        media: [{ uri: 'file:///local/voice.m4a', mimeType: 'audio/m4a', size: 100 }],
        syncStatus: 'pending',
      })
    ).rejects.toMatchObject({ code: 'MEDIA_UPLOAD_FAILED', message: 'upload failed' });

    expect(mockApiClient.post).not.toHaveBeenCalled();
  });

  it('maps entry creation failure to ENTRY_CREATE_FAILED', async () => {
    mockApiClient.post.mockRejectedValueOnce(new ApiError('NETWORK_ERROR', 'create failed', 0));

    await expect(
      remoteDS.addEntry({
        type: 'text',
        content: 'hello',
        syncStatus: 'pending',
      })
    ).rejects.toMatchObject({ code: 'ENTRY_CREATE_FAILED', message: 'create failed' });
  });

  it('deleteEntry calls DELETE /entries/:id', async () => {
    mockApiClient.delete.mockResolvedValueOnce(undefined);
    await remoteDS.deleteEntry('r1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/entries/r1');
  });

  it('getEntryCount calls GET /entries/count', async () => {
    mockApiClient.get.mockResolvedValueOnce({ entryCount: 42 });
    const count = await remoteDS.getEntryCount();
    expect(count).toBe(42);
  });
});
