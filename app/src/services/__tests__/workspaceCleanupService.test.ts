jest.mock('expo-file-system/legacy', () => ({
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  readDirectoryAsync: jest.fn(),
  documentDirectory: 'file:///documents/',
  cacheDirectory: 'file:///cache/',
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import * as FileSystem from 'expo-file-system/legacy';
import { cleanupOrphanWorkspaces } from '../workspaceCleanupService';

describe('cleanupOrphanWorkspaces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes non-protected environment directories', async () => {
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue(['env_a', 'env_b', 'env_c']);

    await cleanupOrphanWorkspaces(['env_a']);

    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(4); // 2 dirs × 2 base dirs
  });

  it('skips protected scopes', async () => {
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue(['protected', 'orphan']);

    await cleanupOrphanWorkspaces(['protected']);

    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(2); // 1 orphan × 2 base dirs
  });

  it('handles missing environments directory', async () => {
    (FileSystem.readDirectoryAsync as jest.Mock).mockRejectedValue(new Error('not found'));

    await expect(cleanupOrphanWorkspaces(['scope'])).resolves.not.toThrow();
  });

  it('does not throw when delete fails for a single orphan', async () => {
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue(['orphan']);
    (FileSystem.deleteAsync as jest.Mock).mockRejectedValue(new Error('permission denied'));

    await expect(cleanupOrphanWorkspaces(['protected'])).resolves.not.toThrow();
  });
});
