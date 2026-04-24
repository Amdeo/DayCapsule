jest.mock('expo-file-system/legacy', () => ({
  copyAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getFreeDiskStorageAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  readDirectoryAsync: jest.fn(),
  documentDirectory: 'file:///documents/',
  cacheDirectory: 'file:///cache/',
}));

jest.mock('@/src/services/workspaceService', () => ({
  getCurrentDataScopeKeySync: jest.fn(() => 'env_https_server_a_example_com'),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() },
}));

import * as FileSystem from 'expo-file-system/legacy';
import { getCurrentDataScopeKeySync } from '@/src/services/workspaceService';
import {
  copyFile,
  deleteDirectory,
  deleteFile,
  ensureDirectories,
  fileExists,
  formatFileSize,
  generateUniqueFilename,
  getDirectorySize,
  getFileInfo,
  getMediaPaths,
  getMimeType,
  getStorageStats,
  initializeFileSystem,
} from '../fileSystem';

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
      .mockResolvedValueOnce({ exists: true, isDirectory: true })
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

describe('ensureDirectories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentDataScopeKeySync as jest.Mock).mockReturnValue('env_https_server_a_example_com');
  });

  it('creates directories that do not exist', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

    await ensureDirectories();

    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalled();
  });

  it('skips directories that already exist', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });

    await ensureDirectories();

    expect(FileSystem.makeDirectoryAsync).not.toHaveBeenCalled();
  });
});

describe('copyFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentDataScopeKeySync as jest.Mock).mockReturnValue('env_https_server_a_example_com');
  });

  it('copies file and returns target URI', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

    const result = await copyFile('file:///source.jpg', 'file:///target/', 'dest.jpg');

    expect(FileSystem.copyAsync).toHaveBeenCalledWith({
      from: 'file:///source.jpg',
      to: 'file:///target/dest.jpg',
    });
    expect(result).toBe('file:///target/dest.jpg');
  });
});

describe('deleteDirectory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentDataScopeKeySync as jest.Mock).mockReturnValue('env_https_server_a_example_com');
  });

  it('deletes directory when it exists', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, isDirectory: true });

    await deleteDirectory('file:///dir/');

    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///dir/', { idempotent: true });
  });

  it('does nothing when directory does not exist', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

    await deleteDirectory('file:///nonexistent/');

    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });
});

describe('generateUniqueFilename', () => {
  it('generates filename with entry ID and extension', () => {
    const result = generateUniqueFilename('entry123', 'photo', 'jpg');

    expect(result).toMatch(/^entry123_\d+\.jpg$/);
  });
});

describe('getMimeType', () => {
  it('returns correct MIME for known extensions', () => {
    expect(getMimeType('photo.jpg')).toBe('image/jpeg');
    expect(getMimeType('photo.jpeg')).toBe('image/jpeg');
    expect(getMimeType('photo.png')).toBe('image/png');
    expect(getMimeType('photo.webp')).toBe('image/webp');
    expect(getMimeType('audio.m4a')).toBe('audio/mp4');
    expect(getMimeType('audio.mp3')).toBe('audio/mpeg');
    expect(getMimeType('audio.wav')).toBe('audio/wav');
  });

  it('returns application/octet-stream for unknown extensions', () => {
    expect(getMimeType('file.xyz')).toBe('application/octet-stream');
  });

  it('returns default for filenames without extension', () => {
    expect(getMimeType('noextension')).toBe('application/octet-stream');
  });
});

describe('formatFileSize', () => {
  it('returns "0 B" for zero bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500.00 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.00 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.00 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.50 GB');
  });
});

describe('fileExists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when file exists', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });

    await expect(fileExists('file:///test.jpg')).resolves.toBe(true);
  });

  it('returns false when file does not exist', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

    await expect(fileExists('file:///test.jpg')).resolves.toBe(false);
  });

  it('returns false on error', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(new Error('permission denied'));

    await expect(fileExists('file:///test.jpg')).resolves.toBe(false);
  });
});

describe('initializeFileSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentDataScopeKeySync as jest.Mock).mockReturnValue('env_https_server_a_example_com');
  });

  it('creates all media directories', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

    await initializeFileSystem();

    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalled();
  });
});

describe('error paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentDataScopeKeySync as jest.Mock).mockReturnValue('env_https_server_a_example_com');
  });

  it('getFileInfo returns exists:false on error', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(new Error('io error'));

    await expect(getFileInfo('file:///test.jpg')).resolves.toEqual({ exists: false, size: 0 });
  });

  it('copyFile re-throws on error', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
    (FileSystem.copyAsync as jest.Mock).mockRejectedValue(new Error('copy failed'));

    await expect(copyFile('file:///src.jpg', 'file:///tgt/', 'dest.jpg')).rejects.toThrow('copy failed');
  });

  it('deleteDirectory catches errors silently', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(new Error('access denied'));

    await expect(deleteDirectory('file:///broken/')).resolves.not.toThrow();
  });

  it('getDirectorySize catches non-Error values', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue('string error');

    await expect(getDirectorySize('file:///bad/')).resolves.toBe(0);
  });

  it('getDirectorySize handles read error and returns 0', async () => {
    (FileSystem.readDirectoryAsync as jest.Mock).mockRejectedValue(new Error('disk unmounted'));

    await expect(getDirectorySize('file:///bad/')).resolves.toBe(0);
  });
});
