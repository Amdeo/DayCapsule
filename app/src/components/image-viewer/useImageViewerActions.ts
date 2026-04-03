import { Share } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';

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
          showErrorFeedback({
            title: '权限不足',
            message: '请在设置中允许访问相册',
            actions: [{ label: '知道了', role: 'primary' }],
          });
          return;
        }
      }

      await MediaLibrary.saveToLibraryAsync(imageUri);
      showErrorFeedback({
        title: '已保存',
        message: '图片已保存到相册',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    } catch {
      showErrorFeedback({
        title: '保存失败',
        message: '无法保存图片，请重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    }
  };

  const handleShare = async () => {
    onHideActionSheet();

    try {
      await Share.share(
        process.env.EXPO_OS === 'ios' ? { url: imageUri } : { message: imageUri },
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'cancelled') {
        return;
      }

      showErrorFeedback({
        title: '分享失败',
        message: '暂时无法分享图片，请重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    }
  };

  return {
    handleSaveToAlbum,
    handleShare,
  };
}
