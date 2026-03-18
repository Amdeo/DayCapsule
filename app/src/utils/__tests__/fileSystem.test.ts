jest.mock('expo-file-system/legacy', () => ({
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn(),
  documentDirectory: 'file:///documents/',
  cacheDirectory: 'file:///cache/',
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { error: jest.fn() },
}));

import * as FileSystem from 'expo-file-system/legacy';
import { deleteFile } from '../fileSystem';

describe('deleteFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes idempotently without checking file info first', async () => {
    await deleteFile('file:///tmp/test.jpg');

    expect(FileSystem.getInfoAsync).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///tmp/test.jpg', {
      idempotent: true,
    });
  });
});
