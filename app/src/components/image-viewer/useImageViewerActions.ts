import { Alert, Share } from 'react-native';
import * as MediaLibrary from 'expo-media-library';

interface UseImageViewerActionsOptions {
  imageUri: string;
  onHideActionSheet: () => void;
}

export function useImageViewerActions({
  imageUri,
  onHideActionSheet,
}: UseImageViewerActionsOptions) {
  const handleSaveToAlbum = async () => {
    onHideActionSheet();

    try {
      const { granted } = await MediaLibrary.getPermissionsAsync();
      if (!granted) {
        const { granted: asked } = await MediaLibrary.requestPermissionsAsync();
        if (!asked) {
          Alert.alert('权限不足', '请在设置中允许访问相册');
          return;
        }
      }

      await MediaLibrary.saveToLibraryAsync(imageUri);
      Alert.alert('已保存', '图片已保存到相册');
    } catch {
      Alert.alert('保存失败', '无法保存图片，请重试');
    }
  };

  const handleShare = async () => {
    onHideActionSheet();

    try {
      await Share.share(
        process.env.EXPO_OS === 'ios' ? { url: imageUri } : { message: imageUri },
      );
    } catch {
      // User cancelled — no error needed
    }
  };

  return {
    handleSaveToAlbum,
    handleShare,
  };
}
