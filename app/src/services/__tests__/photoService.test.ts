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
  },
  generateUniqueFilename: jest
    .fn()
    .mockReturnValueOnce('entry_photo.jpg')
    .mockReturnValueOnce('entry_thumb.jpg'),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  getFileInfo: jest.fn(),
  copyFile: jest.fn(),
}));

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import {
  copyFile,
  deleteFile,
  generateUniqueFilename,
  getFileInfo,
} from '@/src/utils/fileSystem';
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
        'file:///documents/media/photos/original/entry_photo.jpg'
      )
      .mockResolvedValueOnce(
        'file:///documents/media/photos/original/entry_thumb.jpg'
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
      'file:///documents/media/photos/original/',
      'entry_photo.jpg'
    );
    expect(copyFile).toHaveBeenNthCalledWith(
      2,
      'file:///thumbnail.jpg',
      'file:///documents/media/photos/original/',
      'entry_thumb.jpg'
    );
    expect(result).toEqual({
      originalUri: 'file:///documents/media/photos/original/entry_photo.jpg',
      thumbnailUri: 'file:///documents/media/photos/original/entry_thumb.jpg',
      aspectRatio: 1200 / 900,
      width: 1200,
      height: 900,
    });
    expect(deleteFile).toHaveBeenCalledWith('file:///compressed.jpg');
    expect(thumbnailSpy).toHaveBeenCalledWith('file:///compressed.jpg');
  });
});
