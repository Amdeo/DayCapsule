import { Platform, Share } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { showAppDialog } from '@/src/services/showAppDialog';

interface UseImageViewerActionsOptions {
  imageUri: string;
  onHideActionSheet: () => void;
}

export function useImageViewerActions({
  imageUri,
  onHideActionSheet,
}: UseImageViewerActionsOptions) {
  const showBlockingNotice = (
    title: string,
    message: string,
    tone: 'neutral' | 'accent' | 'success' | 'error',
  ) => {
    showAppDialog({
      title,
      message,
      tone,
      blocking: true,
      actions: [{ label: '知道了', role: 'primary' }],
    });
  };

  const handleSaveToAlbum = async () => {
    onHideActionSheet();

    try {
      const { granted } = await MediaLibrary.getPermissionsAsync();
      if (!granted) {
        const { granted: asked } = await MediaLibrary.requestPermissionsAsync();
        if (!asked) {
          showBlockingNotice('权限不足', '请在设置中允许访问相册', 'error');
          return;
        }
      }

      await MediaLibrary.saveToLibraryAsync(imageUri);
      showBlockingNotice('已保存', '图片已保存到相册', 'success');
    } catch {
      showBlockingNotice('保存失败', '无法保存图片，请重试', 'error');
    }
  };

  const handleShare = async () => {
    onHideActionSheet();

    try {
      await Share.share(
        Platform.OS === 'ios' ? { url: imageUri } : { message: imageUri },
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
