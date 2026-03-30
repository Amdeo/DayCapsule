jest.mock('expo-file-system/legacy', () => ({
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  documentDirectory: 'file:///documents/',
  cacheDirectory: 'file:///cache/',
}));

jest.mock('@/src/services/backendEnvironmentService', () => ({
  getCurrentServerUrlSync: jest.fn(() => 'https://server-a.example.com'),
  getServerKey: jest.fn((url: string) =>
    url === 'https://server-b.example.com'
      ? 'env_https_server_b_example_com'
      : 'env_https_server_a_example_com'
  ),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { error: jest.fn() },
}));

import * as FileSystem from 'expo-file-system/legacy';
import { getCurrentServerUrlSync } from '@/src/services/backendEnvironmentService';
import { deleteFile, getDirectorySize, getFileInfo, getMediaPaths } from '../fileSystem';

describe('deleteFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentServerUrlSync as jest.Mock).mockReturnValue('https://server-a.example.com');
  });

  it('returns the reported file size when file info includes size', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
      size: 123,
    });

    await expect(getFileInfo('file:///tmp/test.jpg')).resolves.toEqual({
      exists: true,
      size: 123,
    });
  });

  it('falls back to zero when file info exists without a size', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
    });

    await expect(getFileInfo('file:///tmp/test.jpg')).resolves.toEqual({
      exists: true,
      size: 0,
    });
  });

  it('sums directory file sizes and falls back to zero for missing sizes', async () => {
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue(['first.jpg', 'second.jpg']);
    (FileSystem.getInfoAsync as jest.Mock)
      .mockResolvedValueOnce({ exists: true, isDirectory: false, size: 10 })
      .mockResolvedValueOnce({ exists: true, isDirectory: false });

    await expect(getDirectorySize('file:///tmp/')).resolves.toBe(10);
  });

  it('deletes idempotently without checking file info first', async () => {
    await deleteFile('file:///tmp/test.jpg');

    expect(FileSystem.getInfoAsync).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///tmp/test.jpg', {
      idempotent: true,
    });
  });

  it('builds media paths under the current backend environment scope', () => {
    expect(getMediaPaths()).toMatchObject({
      photoOriginal: 'file:///documents/environments/env_https_server_a_example_com/media/photos/original/',
      photoDisplay: 'file:///cache/environments/env_https_server_a_example_com/media/photos/display/',
      voiceOriginal: 'file:///documents/environments/env_https_server_a_example_com/media/voice/original/',
      database: 'file:///documents/environments/env_https_server_a_example_com/db/',
    });
  });

  it('updates media paths when backend environment changes', () => {
    (getCurrentServerUrlSync as jest.Mock).mockReturnValue('https://server-b.example.com');

    expect(getMediaPaths().voiceCompressed).toBe(
      'file:///cache/environments/env_https_server_b_example_com/media/voice/compressed/'
    );
  });
});
