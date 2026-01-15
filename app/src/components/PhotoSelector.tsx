/**
 * 照片选择组件
 * 提供拍照或选择相册的选项
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { PhotoService } from '@/src/services/photoService';

interface PhotoSelectorProps {
  visible: boolean;
  onSelectPhoto: (uri: string) => void;
  onCancel: () => void;
}

export function PhotoSelector({ visible, onSelectPhoto, onCancel }: PhotoSelectorProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  // 拍照
  const handleTakePhoto = async () => {
    try {
      setIsLoading(true);
      const photo = await PhotoService.takePhoto();
      onSelectPhoto(photo.uri);
      onCancel();
    } catch (error) {
      if (error instanceof Error && error.message === 'User cancelled camera') {
        return;
      }
      console.error('Failed to take photo:', error);
      alert('拍照失败，请检查相机权限');
    } finally {
      setIsLoading(false);
    }
  };

  // 从相册选择
  const handlePickPhoto = async () => {
    try {
      setIsLoading(true);
      const photos = await PhotoService.pickPhotoFromLibrary();
      if (photos.length > 0) {
        onSelectPhoto(photos[0].uri);
        onCancel();
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'User cancelled photo library') {
        return;
      }
      console.error('Failed to pick photo:', error);
      alert('选择照片失败，请检查相册权限');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      {/* 背景遮罩 */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        {/* 菜单容器 */}
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>选择照片来源</Text>

          {/* 拍照选项 */}
          <TouchableOpacity
            style={styles.option}
            onPress={handleTakePhoto}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.optionIcon}>📷</Text>
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>拍照</Text>
                  <Text style={styles.optionDescription}>使用相机拍摄新照片</Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          {/* 相册选项 */}
          <TouchableOpacity
            style={styles.option}
            onPress={handlePickPhoto}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.optionIcon}>🖼️</Text>
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>从相册选择</Text>
                  <Text style={styles.optionDescription}>选择已保存的照片</Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          {/* 取消按钮 */}
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
  },
  optionIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#999',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6200ee',
  },
});
