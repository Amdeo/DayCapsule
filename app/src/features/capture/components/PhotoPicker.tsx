import React, {useCallback} from 'react';
import {View, StyleSheet, TouchableOpacity, Text, Image, ScrollView, ActivityIndicator} from 'react-native';
import {logger} from '@services/telemetry/logger';

export interface PhotoPickerProps {
  photos: string[];
  maxPhotos?: number;
  onAddPhoto: () => Promise<void>;
  onRemovePhoto: (index: number) => void;
  onPhotoSelect?: (index: number) => void;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * 照片选择器组件
 * 支持最多 9 张照片的选择和管理
 */
export const PhotoPicker: React.FC<PhotoPickerProps> = ({
  photos,
  maxPhotos = 9,
  onAddPhoto,
  onRemovePhoto,
  onPhotoSelect,
  isLoading = false,
  error = null,
}) => {
  const handleAddPhoto = useCallback(async () => {
    try {
      await onAddPhoto();
    } catch (err) {
      logger.error(`Failed to add photo: ${err}`);
    }
  }, [onAddPhoto]);

  const handleRemovePhoto = useCallback(
    (index: number) => {
      onRemovePhoto(index);
    },
    [onRemovePhoto],
  );

  const handlePhotoPress = useCallback(
    (index: number) => {
      if (onPhotoSelect) {
        onPhotoSelect(index);
      }
    },
    [onPhotoSelect],
  );

  const canAddMore = photos.length < maxPhotos;
  const remainingSlots = maxPhotos - photos.length;

  return (
    <View style={styles.container} testID="photo-picker">
      {/* 错误提示 */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* 照片网格 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.photoScroll}
        testID="photo-scroll">
        <View style={styles.photoGrid}>
          {/* 已选择的照片 */}
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoItemContainer}>
              <TouchableOpacity
                style={styles.photoItem}
                onPress={() => handlePhotoPress(index)}
                testID={`photo-item-${index}`}>
                <Image
                  source={{uri: photo}}
                  style={styles.photoImage}
                  resizeMode="cover"
                  onError={() => logger.warn(`Failed to load photo at index ${index}`)}
                />
                <View style={styles.photoOverlay}>
                  <Text style={styles.photoIndex}>{index + 1}</Text>
                </View>
              </TouchableOpacity>

              {/* 移除按钮 */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemovePhoto(index)}
                testID={`remove-photo-${index}`}>
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* 添加照片按钮 */}
          {canAddMore && (
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={handleAddPhoto}
              disabled={isLoading}
              testID="add-photo-button">
              {isLoading ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <>
                  <Text style={styles.addPhotoIcon}>+</Text>
                  <Text style={styles.addPhotoText}>添加</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* 计数器 */}
      <View style={styles.counterContainer}>
        <Text style={styles.counterText}>
          {photos.length}/{maxPhotos}
        </Text>
        {canAddMore && (
          <Text style={styles.remainingText}>
            还可添加 {remainingSlots} 张
          </Text>
        )}
      </View>

      {/* 提示信息 */}
      {photos.length === 0 && (
        <View style={styles.tipContainer}>
          <Text style={styles.tipText}>点击"添加"按钮选择照片</Text>
        </View>
      )}

      {/* 照片信息 */}
      {photos.length > 0 && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            已选择 {photos.length} 张照片
            {photos.length === maxPhotos && ' (已达上限)'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  photoScroll: {
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  photoItemContainer: {
    position: 'relative',
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIndex: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  addPhotoIcon: {
    fontSize: 32,
    color: '#007AFF',
    marginBottom: 4,
  },
  addPhotoText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  counterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  counterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  remainingText: {
    fontSize: 12,
    color: '#666',
  },
  tipContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#1976d2',
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

