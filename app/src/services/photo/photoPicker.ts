import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { ERROR_MESSAGES } from '@/src/utils/constants';
import { type MediaError } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';
import type { PhotoResult, PickPhotoOptions } from './photoTypes';

const createMediaError = (
  code: MediaError['code'],
  userMessage: string
): MediaError => {
  const error = new Error(userMessage) as MediaError;
  error.code = code;
  error.userMessage = userMessage;
  return error;
};

const mapAssetToPhotoResult = (asset: ImagePicker.ImagePickerAsset): PhotoResult => {
  const width = asset.width || 0;
  const height = asset.height || 0;

  return {
    uri: asset.uri,
    width,
    height,
    aspectRatio: height > 0 ? width / height : 1,
    exif: asset.exif,
  };
};

export async function requestCameraPermission(): Promise<boolean> {
  try {
    const { granted } = await Camera.requestCameraPermissionsAsync();
    return granted;
  } catch (error) {
    logger.error('Failed to request camera permission:', error);
    throw createMediaError('PERMISSION_DENIED', ERROR_MESSAGES.CAMERA_ERROR);
  }
}

export async function takePhoto(): Promise<PhotoResult> {
  try {
    const granted = await requestCameraPermission();
    if (!granted) {
      throw createMediaError('PERMISSION_DENIED', ERROR_MESSAGES.CAMERA_ERROR);
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.95,
    });

    if (result.canceled) {
      throw new Error('User cancelled camera');
    }

    return mapAssetToPhotoResult(result.assets[0]);
  } catch (error) {
    if (error instanceof Error && error.message === 'User cancelled camera') {
      throw error;
    }

    logger.error('Failed to take photo:', error);
    throw createMediaError('CAMERA_ERROR', ERROR_MESSAGES.CAMERA_ERROR);
  }
}

export async function selectPhotos(
  options?: PickPhotoOptions
): Promise<PhotoResult[]> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 9,
      allowsEditing: false,
      quality: options?.quality ?? 0.95,
    });

    if (result.canceled) {
      throw new Error('User cancelled photo library');
    }

    return result.assets.map(mapAssetToPhotoResult);
  } catch (error) {
    if (error instanceof Error && error.message === 'User cancelled photo library') {
      throw error;
    }

    logger.error('Failed to pick photo:', error);
    throw createMediaError('INVALID_FILE', ERROR_MESSAGES.INVALID_FILE);
  }
}

export const pickPhotoFromLibrary = selectPhotos;
