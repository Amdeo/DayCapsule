const mockClearAllEntries = jest.fn(async () => undefined);
const mockClearDirectory = jest.fn(async () => undefined);

jest.mock('@/src/database/operations', () => ({
  clearAllEntries: (...args: unknown[]) => mockClearAllEntries(...args),
}));

jest.mock('@/src/utils/fileSystem', () => ({
  clearDirectory: (...args: unknown[]) => mockClearDirectory(...args),
  getMediaPaths: jest.fn(() => ({
    photoOriginal: 'file:///documents/photos/original/',
    photoDisplay: 'file:///cache/photos/display/',
    photoThumbnail: 'file:///cache/photos/thumbnails/',
    voiceOriginal: 'file:///documents/voice/original/',
    voiceCompressed: 'file:///cache/voice/compressed/',
    temp: 'file:///cache/temp/',
    database: 'file:///documents/db/',
  })),
}));

import { clearLocalAppData } from '../localAppDataService';

describe('localAppDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears local media directories and database entries', async () => {
    await clearLocalAppData();

    expect(mockClearDirectory).toHaveBeenCalledTimes(6);
    expect(mockClearDirectory).toHaveBeenNthCalledWith(1, 'file:///documents/photos/original/');
    expect(mockClearDirectory).toHaveBeenNthCalledWith(2, 'file:///cache/photos/display/');
    expect(mockClearDirectory).toHaveBeenNthCalledWith(3, 'file:///cache/photos/thumbnails/');
    expect(mockClearDirectory).toHaveBeenNthCalledWith(4, 'file:///documents/voice/original/');
    expect(mockClearDirectory).toHaveBeenNthCalledWith(5, 'file:///cache/voice/compressed/');
    expect(mockClearDirectory).toHaveBeenNthCalledWith(6, 'file:///cache/temp/');
    expect(mockClearAllEntries).toHaveBeenCalledTimes(1);
  });
});
