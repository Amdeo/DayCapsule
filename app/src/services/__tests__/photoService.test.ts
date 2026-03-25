jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-camera', () => ({
  Camera: { requestCameraPermissionsAsync: jest.fn() },
}));

jest.mock('expo-file-system/legacy', () => ({
  copyAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() },
}));

jest.mock('@/src/utils/fileSystem', () => ({
  MEDIA_PATHS: {
    photoOriginal: 'file:///documents/media/photos/original/',
    photoDisplay: 'file:///cache/media/photos/display/',
    photoThumbnail: 'file:///cache/media/photos/thumbnails/',
  },
  getMediaPaths: jest.fn(() => ({
    photoOriginal: 'file:///documents/environments/env_https_server_a_example_com/media/photos/original/',
    photoDisplay: 'file:///cache/environments/env_https_server_a_example_com/media/photos/display/',
    photoThumbnail: 'file:///cache/environments/env_https_server_a_example_com/media/photos/thumbnails/',
  })),
  generateUniqueFilename: jest
    .fn()
    .mockReturnValueOnce('entry_photo.jpg')
    .mockReturnValueOnce('entry_thumb.jpg'),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  getFileInfo: jest.fn(),
  copyFile: jest.fn(),
}));

jest.mock('../mediaCacheService', () => ({
  MediaCacheService: {
    isRemoteUri: (uri?: string) => !!uri && /^https?:\/\//.test(uri ?? ''),
    normalizeRemoteUri: (uri: string) => uri,
  },
}));

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import {
  copyFile,
  deleteFile,
  generateUniqueFilename,
  getFileInfo,
} from '@/src/utils/fileSystem';
import { logger } from '@/src/utils/logger';
import { PhotoService } from '../photoService';

describe('PhotoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
    (FileSystem.copyAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);

    (generateUniqueFilename as jest.Mock)
      .mockReset()
      .mockReturnValueOnce('entry_photo.jpg')
      .mockReturnValueOnce('entry_thumb.jpg');

    (getFileInfo as jest.Mock).mockImplementation(async (uri: string) => {
      if (uri === 'file:///source.jpg') {
        return { exists: true, size: 4_000_000 };
      }

      if (uri === 'file:///compressed.jpg') {
        return { exists: true, size: 2_000_000 };
      }

      return { exists: true, size: 1000 };
    });

    (copyFile as jest.Mock)
      .mockResolvedValueOnce(
        'file:///documents/environments/env_https_server_a_example_com/media/photos/original/entry_photo.jpg'
      )
      .mockResolvedValueOnce(
        'file:///documents/environments/env_https_server_a_example_com/media/photos/original/entry_thumb.jpg'
      );
  });

  it('compressPhoto 返回压缩结果尺寸信息', async () => {
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'file:///compressed.jpg',
      width: 1200,
      height: 900,
    });

    const result = await PhotoService.compressPhoto('file:///source.jpg', 'medium');

    expect(result.compressed).toEqual({
      uri: 'file:///compressed.jpg',
      size: 2_000_000,
      width: 1200,
      height: 900,
    });
  });

  it('savePhotoToStorage 复用压缩结果尺寸且通过 copyFile 复制文件', async () => {
    const metadataSpy = jest.spyOn(PhotoService, 'getPhotoMetadata');
    const thumbnailSpy = jest
      .spyOn(PhotoService, 'generateThumbnail')
      .mockResolvedValue('file:///thumbnail.jpg');

    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'file:///compressed.jpg',
      width: 1200,
      height: 900,
    });

    const result = await PhotoService.savePhotoToStorage(
      'file:///source.jpg',
      'entry',
      'medium'
    );

    expect(metadataSpy).not.toHaveBeenCalled();
    expect(copyFile).toHaveBeenNthCalledWith(
      1,
      'file:///compressed.jpg',
      'file:///documents/environments/env_https_server_a_example_com/media/photos/original/',
      'entry_photo.jpg'
    );
    expect(copyFile).toHaveBeenNthCalledWith(
      2,
      'file:///thumbnail.jpg',
      'file:///documents/environments/env_https_server_a_example_com/media/photos/original/',
      'entry_thumb.jpg'
    );
    expect(result).toEqual({
      originalUri: 'file:///documents/environments/env_https_server_a_example_com/media/photos/original/entry_photo.jpg',
      thumbnailUri: 'file:///documents/environments/env_https_server_a_example_com/media/photos/original/entry_thumb.jpg',
      aspectRatio: 1200 / 900,
      width: 1200,
      height: 900,
    });
    expect(deleteFile).toHaveBeenCalledWith('file:///compressed.jpg');
    expect(thumbnailSpy).toHaveBeenCalledWith('file:///compressed.jpg');
  });

  it('savePhotoToCache 将原图和缩略图写入 cache 目录', async () => {
    const thumbnailSpy = jest
      .spyOn(PhotoService, 'generateThumbnail')
      .mockResolvedValue('file:///thumbnail.jpg');

    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'file:///compressed.jpg',
      width: 1200,
      height: 900,
    });

    (copyFile as jest.Mock)
      .mockReset()
      .mockResolvedValueOnce('file:///cache/environments/env_https_server_a_example_com/media/photos/display/entry_photo.jpg')
      .mockResolvedValueOnce('file:///cache/environments/env_https_server_a_example_com/media/photos/thumbnails/entry_thumb.jpg');

    const result = await PhotoService.savePhotoToCache(
      'file:///source.jpg',
      'entry',
      'medium'
    );

    expect(copyFile).toHaveBeenNthCalledWith(
      1,
      'file:///compressed.jpg',
      'file:///cache/environments/env_https_server_a_example_com/media/photos/display/',
      'entry_photo.jpg'
    );
    expect(copyFile).toHaveBeenNthCalledWith(
      2,
      'file:///thumbnail.jpg',
      'file:///cache/environments/env_https_server_a_example_com/media/photos/thumbnails/',
      'entry_thumb.jpg'
    );
    expect(result).toEqual({
      originalUri: 'file:///cache/environments/env_https_server_a_example_com/media/photos/display/entry_photo.jpg',
      thumbnailUri: 'file:///cache/environments/env_https_server_a_example_com/media/photos/thumbnails/entry_thumb.jpg',
      aspectRatio: 1200 / 900,
      width: 1200,
      height: 900,
    });
    expect(deleteFile).toHaveBeenCalledWith('file:///compressed.jpg');
    expect(thumbnailSpy).toHaveBeenCalledWith('file:///compressed.jpg');
  });

  it('full 图在存在 remoteUri 时优先使用远端大图地址', () => {
    expect(
      PhotoService.getPreferredPhotoUri(
        {
          uri: 'file:///cache/photo.jpg',
          remoteUri: 'http://101.43.120.134:8081/api/media/photo-1',
          mimeType: 'image/jpeg',
          size: 1,
        },
        'full'
      )
    ).toBe('http://101.43.120.134:8081/api/media/photo-1');
    expect(logger.log).toHaveBeenCalledWith(
      '[photoService] preferred photo uri',
      expect.objectContaining({
        kind: 'full',
        selectedUri: 'http://101.43.120.134:8081/api/media/photo-1',
      }),
    );
  });

  it('full 图在没有 remoteUri 时回退使用本地 uri', () => {
    expect(
      PhotoService.getPreferredPhotoUri(
        {
          uri: 'file:///cache/photo.jpg',
          mimeType: 'image/jpeg',
          size: 1,
        },
        'full'
      )
    ).toBe('file:///cache/photo.jpg');
  });

  it('thumbnail 失败后回退到远端 thumbnail 地址', () => {
    expect(
      PhotoService.getFallbackPhotoUri(
        {
          uri: 'file:///stale/photo.jpg',
          remoteUri: 'http://101.43.120.134:8081/api/media/photo-1',
          thumbnail: 'file:///stale/thumb.jpg',
          remoteThumbnail: 'http://101.43.120.134:8081/api/media/photo-1-thumb',
          mimeType: 'image/jpeg',
          size: 1,
        },
        'file:///stale/thumb.jpg',
        'thumbnail'
      )
    ).toBe('http://101.43.120.134:8081/api/media/photo-1-thumb');
    expect(logger.log).toHaveBeenCalledWith(
      '[photoService] fallback photo uri',
      expect.objectContaining({
        kind: 'thumbnail',
        failedUri: 'file:///stale/thumb.jpg',
        selectedUri: 'http://101.43.120.134:8081/api/media/photo-1-thumb',
      }),
    );
  });
});
