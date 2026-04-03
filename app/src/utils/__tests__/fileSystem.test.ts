jest.mock('expo-file-system/legacy', () => ({
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getFreeDiskStorageAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  documentDirectory: 'file:///documents/',
  cacheDirectory: 'file:///cache/',
}));

jest.mock('@/src/services/workspaceService', () => ({
  getCurrentDataScopeKeySync: jest.fn(() => 'env_https_server_a_example_com'),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { error: jest.fn() },
}));

import * as FileSystem from 'expo-file-system/legacy';
import { getCurrentDataScopeKeySync } from '@/src/services/workspaceService';
import { deleteFile, getDirectorySize, getFileInfo, getMediaPaths, getStorageStats } from '../fileSystem';

describe('deleteFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentDataScopeKeySync as jest.Mock).mockReturnValue('env_https_server_a_example_com');
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
    (getCurrentDataScopeKeySync as jest.Mock).mockReturnValue('env_https_server_b_example_com');

    expect(getMediaPaths().voiceCompressed).toBe(
      'file:///cache/environments/env_https_server_b_example_com/media/voice/compressed/'
    );
  });
});

describe('getStorageStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentDataScopeKeySync as jest.Mock).mockReturnValue('env_https_server_a_example_com');
  });

  it('returns available disk bytes when Expo reports free storage', async () => {
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([]);
    (FileSystem.getFreeDiskStorageAsync as jest.Mock).mockResolvedValue(4096);

    await expect(getStorageStats()).resolves.toMatchObject({
      available: 4096,
    });
  });

  it('falls back to -1 when Expo cannot report free storage', async () => {
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([]);
    (FileSystem.getFreeDiskStorageAsync as jest.Mock).mockRejectedValue(new Error('unsupported'));

    await expect(getStorageStats()).resolves.toMatchObject({
      available: -1,
    });
  });

  it('falls back to -1 when Expo does not expose the free-storage API', async () => {
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([]);
    delete (FileSystem as typeof FileSystem & { getFreeDiskStorageAsync?: unknown }).getFreeDiskStorageAsync;

    await expect(getStorageStats()).resolves.toMatchObject({
      available: -1,
    });
  });
});
