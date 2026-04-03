import * as ImageManipulator from 'expo-image-manipulator';
import { COMPRESSION_PRESETS, ERROR_MESSAGES } from '@/src/utils/constants';
import { deleteFile, getFileInfo } from '@/src/utils/fileSystem';
import { type MediaError } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';
import type { CompressedPhoto, PhotoMetadata } from '../photoService';

const createMediaError = (
  code: MediaError['code'],
  userMessage: string
): MediaError => {
  const error = new Error(userMessage) as MediaError;
  error.code = code;
  error.userMessage = userMessage;
  return error;
};

export async function resizeImage(
  uri: string,
  resize: { width?: number; height?: number },
  options: { compress?: number } = {}
): Promise<ImageManipulator.ImageResult> {
  return ImageManipulator.manipulateAsync(
    uri,
    [{ resize }],
    {
      compress: options.compress ?? 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
}

export async function compressPhoto(
  uri: string,
  quality: 'low' | 'medium' | 'high' = 'medium'
): Promise<CompressedPhoto> {
  try {
    const { size: originalSize } = await getFileInfo(uri);
    const preset = COMPRESSION_PRESETS[quality.toUpperCase() as keyof typeof COMPRESSION_PRESETS];

    const result = await ImageManipulator.manipulateAsync(uri, [], {
      compress: preset.quality,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    const { size: compressedSize } = await getFileInfo(result.uri);
    const ratio = compressedSize / originalSize;

    return {
      original: {
        uri,
        size: originalSize,
      },
      compressed: {
        uri: result.uri,
        size: compressedSize,
        width: result.width,
        height: result.height,
      },
      ratio,
      quality,
    };
  } catch (error) {
    logger.error('Failed to compress photo:', error);
    throw createMediaError('CODEC_ERROR', ERROR_MESSAGES.CODEC_ERROR);
  }
}

export async function generateThumbnail(
  uri: string,
  maxWidth: number = 1200
): Promise<string> {
  try {
    const result = await resizeImage(
      uri,
      { width: maxWidth },
      { compress: 0.8 }
    );

    return result.uri;
  } catch (error) {
    logger.error('Failed to generate thumbnail:', error);
    return uri;
  }
}

export async function getPhotoMetadata(uri: string): Promise<PhotoMetadata> {
  try {
    const { size } = await getFileInfo(uri);
    const result = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    if (result.uri !== uri) {
      await deleteFile(result.uri).catch(() => {});
    }

    return {
      width: result.width || 0,
      height: result.height || 0,
      size,
    };
  } catch (error) {
    logger.error('Failed to get photo metadata:', error);
    return {
      width: 0,
      height: 0,
      size: 0,
    };
  }
}
