jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('@/src/services/backendEnvironmentService', () => ({
  getCurrentServerUrlSync: jest.fn(() => 'http://101.43.120.134:8081'),
  getServerKey: jest.fn(() => 'env_http_101_43_120_134_8081'),
}));

jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getStringSync: jest.fn(() => 'token-123'),
  },
  withScope: jest.fn((scope: string, key: string) => `${scope}:${key}`),
}));

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  downloadAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/utils/fileSystem', () => ({
  MEDIA_PATHS: {
    photoDisplay: 'file:///cache/media/photos/display/',
    photoThumbnail: 'file:///cache/media/photos/thumbnails/',
    voiceCompressed: 'file:///cache/media/voice/compressed/',
  },
  getMediaPaths: jest.fn(() => ({
    photoDisplay: 'file:///cache/environments/env_https_server_a_example_com/media/photos/display/',
    photoThumbnail: 'file:///cache/environments/env_https_server_a_example_com/media/photos/thumbnails/',
    voiceCompressed: 'file:///cache/environments/env_https_server_a_example_com/media/voice/compressed/',
  })),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn(), diagnostic: jest.fn() },
}));

import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '@/src/utils/logger';
import { MediaCacheService } from '../mediaCacheService';

describe('MediaCacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
  });

  it('normalizes localhost media URLs to the configured backend on Android', () => {
    expect(MediaCacheService.normalizeRemoteUri('http://localhost:3000/api/media/1'))
      .toBe('http://101.43.120.134:8081/api/media/1');
  });

  it('normalizes emulator-only media URLs to the configured backend on Android', () => {
    expect(MediaCacheService.normalizeRemoteUri('http://10.0.2.2:3000/api/media/1'))
      .toBe('http://101.43.120.134:8081/api/media/1');
  });

  it('resolves relative media URLs against the configured backend', () => {
    expect(MediaCacheService.normalizeRemoteUri('/api/media/1'))
      .toBe('http://101.43.120.134:8081/api/media/1');
  });

  it('hydrates remote voice media into cache path', async () => {
    const [entry] = await MediaCacheService.hydrateEntries([{
      id: 'e1',
      type: 'voice',
      content: '',
      timestamp: 1,
      syncStatus: 'synced',
      media: [{ uri: 'http://localhost:3000/api/media/1', mimeType: 'audio/m4a', size: 12 }],
    }]);

    expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
      'http://101.43.120.134:8081/api/media/1',
      expect.stringContaining('file:///cache/environments/env_https_server_a_example_com/media/voice/compressed/'),
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer token-123',
        },
      }),
    );
    expect(entry.media?.[0].uri).toContain('file:///cache/environments/env_https_server_a_example_com/media/voice/compressed/');
    expect(entry.media?.[0].remoteUri).toBe('http://101.43.120.134:8081/api/media/1');
    expect(logger.log).toHaveBeenCalledWith(
      '[mediaCache] downloading media',
      expect.objectContaining({
        remoteUri: 'http://localhost:3000/api/media/1',
        normalizedUri: 'http://101.43.120.134:8081/api/media/1',
        kind: 'voice',
        variant: 'main',
        hasAuth: true,
      }),
    );
    expect(logger.log).toHaveBeenCalledWith(
      '[mediaCache] media download complete',
      expect.objectContaining({
        normalizedUri: 'http://101.43.120.134:8081/api/media/1',
      }),
    );
  });

  it('reuses existing cache file without downloading again', async () => {
    (FileSystem.getInfoAsync as jest.Mock)
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ exists: true });

    await MediaCacheService.hydrateEntries([{
      id: 'e2',
      type: 'photo',
      content: '',
      timestamp: 1,
      syncStatus: 'synced',
      media: [{ uri: 'http://localhost:3000/api/media/2', mimeType: 'image/jpeg', size: 12 }],
    }]);

    await MediaCacheService.hydrateEntries([{
      id: 'e2',
      type: 'photo',
      content: '',
      timestamp: 1,
      syncStatus: 'synced',
      media: [{ uri: 'http://localhost:3000/api/media/2', mimeType: 'image/jpeg', size: 12 }],
    }]);

    expect((FileSystem.downloadAsync as jest.Mock).mock.calls.length).toBe(1);
  });

  it('logs normalized download metadata when remote media caching fails', async () => {
    const downloadError = new Error('download failed');
    (FileSystem.downloadAsync as jest.Mock).mockRejectedValueOnce(downloadError);

    const [entry] = await MediaCacheService.hydrateEntries([{
      id: 'e3',
      type: 'photo',
      content: '',
      timestamp: 1,
      syncStatus: 'synced',
      media: [{ uri: 'http://10.0.2.2:3000/api/media/3', mimeType: 'image/jpeg', size: 12 }],
    }]);

    expect(entry.media?.[0].uri).toBe('http://101.43.120.134:8081/api/media/3');
    expect(logger.warn).toHaveBeenCalledWith(
      '[mediaCache] failed to cache main media, fallback to remote uri:',
      expect.objectContaining({
        remoteUri: 'http://10.0.2.2:3000/api/media/3',
        normalizedUri: 'http://101.43.120.134:8081/api/media/3',
        kind: 'photo',
        variant: 'main',
      }),
      downloadError,
    );
  });

});
