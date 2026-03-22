jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
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
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn() },
}));

import * as FileSystem from 'expo-file-system/legacy';
import { MediaCacheService } from '../mediaCacheService';

describe('MediaCacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
  });

  it('normalizes localhost to 10.0.2.2 on Android', () => {
    expect(MediaCacheService.normalizeRemoteUri('http://localhost:3000/api/media/1'))
      .toBe('http://10.0.2.2:3000/api/media/1');
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

    expect(FileSystem.downloadAsync).toHaveBeenCalled();
    expect(entry.media?.[0].uri).toContain('file:///cache/media/voice/compressed/');
    expect(entry.media?.[0].remoteUri).toBe('http://10.0.2.2:3000/api/media/1');
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
});
