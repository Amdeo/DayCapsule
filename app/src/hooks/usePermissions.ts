/**
 * 权限管理 Hook
 * 统一处理相机、麦克风、相册等权限请求
 */

import { useCallback, useEffect, useState } from 'react';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { Linking } from 'react-native';
import { PermissionStatus, PermissionType } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';

/**
 * 权限管理 Hook
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    camera: 'undetermined',
    mediaLibrary: 'undetermined',
    microphone: 'undetermined',
    photoLibrary: 'undetermined',
  });

  /**
   * 检查单个权限状态
   */
  const checkPermission = useCallback(async (type: PermissionType): Promise<boolean> => {
    try {
      switch (type) {
        case 'camera':
          const cameraStatus = await Camera.requestCameraPermissionsAsync();
          setPermissions((prev) => ({
            ...prev,
            camera: cameraStatus.granted ? 'granted' : 'denied',
          }));
          return cameraStatus.granted;

        case 'microphone':
          const currentMicStatus = await getRecordingPermissionsAsync();
          const micStatus = currentMicStatus.granted
            ? currentMicStatus
            : await requestRecordingPermissionsAsync();
          setPermissions((prev) => ({
            ...prev,
            microphone: micStatus.granted ? 'granted' : 'denied',
          }));
          return micStatus.granted;

        case 'mediaLibrary':
          if (process.env.EXPO_OS === 'android') {
            // Android 使用不同的 API
            const mediaStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
            setPermissions((prev) => ({
              ...prev,
              mediaLibrary: mediaStatus.granted ? 'granted' : 'denied',
            }));
            return mediaStatus.granted;
          } else {
            // iOS
            const mediaStatus = await MediaLibrary.requestPermissionsAsync();
            setPermissions((prev) => ({
              ...prev,
              mediaLibrary:
                mediaStatus.status === 'granted'
                  ? 'granted'
                  : mediaStatus.status === 'denied'
                    ? 'denied'
                    : 'undetermined',
            }));
            return mediaStatus.status === 'granted';
          }

        case 'photoLibrary':
          if (process.env.EXPO_OS === 'ios') {
            const photoStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
            setPermissions((prev) => ({
              ...prev,
              photoLibrary: photoStatus.granted ? 'granted' : 'denied',
            }));
            return photoStatus.granted;
          }
          return true; // Android 通常不需要单独的权限

        default:
          return false;
      }
    } catch (error) {
      logger.error(`Failed to check ${type} permission:`, error);
      return false;
    }
  }, []);

  /**
   * 检查多个权限
   */
  const checkMultiplePermissions = useCallback(
    async (...types: PermissionType[]): Promise<PermissionStatus> => {
      const pairs = await Promise.all(
        types.map((type) => checkPermission(type).then((granted) => ({ type, granted })))
      );
      const results: PermissionStatus = {
        camera: 'undetermined',
        mediaLibrary: 'undetermined',
        microphone: 'undetermined',
        photoLibrary: 'undetermined',
      };
      pairs.forEach(({ type, granted }) => {
        results[type] = granted ? 'granted' : 'denied';
      });
      return results;
    },
    [checkPermission]
  );

  /**
   * 检查权限是否被授予
   */
  const hasPermission = useCallback(
    (type: PermissionType): boolean => {
      return permissions[type] === 'granted';
    },
    [permissions]
  );

  /**
   * 打开应用设置
   */
  const openAppSettings = useCallback(async (): Promise<void> => {
    try {
      if (process.env.EXPO_OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      logger.error('Failed to open app settings:', error);
    }
  }, []);

  /**
   * 初始化权限检查
   */
  useEffect(() => {
    checkMultiplePermissions('camera', 'microphone', 'mediaLibrary', 'photoLibrary');
  }, []);

  return {
    permissions,
    checkPermission,
    requestPermission: checkPermission,
    checkMultiplePermissions,
    requestMultiplePermissions: checkMultiplePermissions,
    hasPermission,
    openAppSettings,
  };
}

/**
 * 权限请求对话框辅助
 */
export function getPermissionMessage(
  type: PermissionType
): { title: string; message: string; action: string } {
  const messages: Record<PermissionType, { title: string; message: string; action: string }> = {
    camera: {
      title: '需要相机权限',
      message: '请允许访问您的相机来拍照',
      action: '打开设置',
    },
    microphone: {
      title: '需要麦克风权限',
      message: '请允许访问您的麦克风来录音',
      action: '打开设置',
    },
    mediaLibrary: {
      title: '需要相库权限',
      message: '请允许访问您的相库来选择照片',
      action: '打开设置',
    },
    photoLibrary: {
      title: '需要照片库权限',
      message: '请允许访问您的照片库',
      action: '打开设置',
    },
  };

  return messages[type] || messages.camera;
}

/**
 * 语音权限检查（特殊处理）
 * Expo Speech 不需要显式权限，但我们仍然检查音频权限
 */
export async function checkSpeechPermissions(): Promise<boolean> {
  try {
    const currentStatus = await getRecordingPermissionsAsync();
    if (currentStatus.granted) {
      return true;
    }
    const { granted } = await requestRecordingPermissionsAsync();
    return granted;
  } catch (error) {
    logger.error('Failed to check speech permissions:', error);
    return false;
  }
}
