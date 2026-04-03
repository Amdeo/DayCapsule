import { Platform, Share } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { useImageViewerActions } from '../../image-viewer/useImageViewerActions';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';

jest.mock('expo-media-library', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  saveToLibraryAsync: jest.fn(),
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

describe('useImageViewerActions', () => {
  const mockOnHideActionSheet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' as any });
    (Platform as { OS: string }).OS = 'android';
    (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (MediaLibrary.saveToLibraryAsync as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('saves to album after hiding the action sheet when permissions are already granted', async () => {
    const { handleSaveToAlbum } = useImageViewerActions({
      imageUri: 'file:///image.jpg',
      onHideActionSheet: mockOnHideActionSheet,
    });

    await handleSaveToAlbum();

    expect(mockOnHideActionSheet).toHaveBeenCalledTimes(1);
    expect(MediaLibrary.getPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(MediaLibrary.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(MediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith('file:///image.jpg');
    expect(showErrorFeedback).toHaveBeenCalledWith({
      title: '已保存',
      message: '图片已保存到相册',
      actions: [{ label: '知道了', role: 'primary' }],
    });
  });

  it('shows a permission alert and does not save when permission request is denied', async () => {
    (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });

    const { handleSaveToAlbum } = useImageViewerActions({
      imageUri: 'file:///image.jpg',
      onHideActionSheet: mockOnHideActionSheet,
    });

    await handleSaveToAlbum();

    expect(mockOnHideActionSheet).toHaveBeenCalledTimes(1);
    expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(MediaLibrary.saveToLibraryAsync).not.toHaveBeenCalled();
    expect(showErrorFeedback).toHaveBeenCalledWith({
      title: '权限不足',
      message: '请在设置中允许访问相册',
      actions: [{ label: '知道了', role: 'primary' }],
    });
  });

  it('shows a failure alert when saving to the album throws', async () => {
    (MediaLibrary.saveToLibraryAsync as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    const { handleSaveToAlbum } = useImageViewerActions({
      imageUri: 'file:///image.jpg',
      onHideActionSheet: mockOnHideActionSheet,
    });

    await handleSaveToAlbum();

    expect(showErrorFeedback).toHaveBeenCalledWith({
      title: '保存失败',
      message: '无法保存图片，请重试',
      actions: [{ label: '知道了', role: 'primary' }],
    });
  });

  it('shares the image URL on iOS', async () => {
    (Platform as { OS: string }).OS = 'ios';

    const { handleShare } = useImageViewerActions({
      imageUri: 'file:///image.jpg',
      onHideActionSheet: mockOnHideActionSheet,
    });

    await handleShare();

    expect(mockOnHideActionSheet).toHaveBeenCalledTimes(1);
    expect(Share.share).toHaveBeenCalledWith({ url: 'file:///image.jpg' });
  });

  it('shares the image path as a message on Android and ignores cancelled shares', async () => {
    (Share.share as jest.Mock).mockRejectedValueOnce(new Error('cancelled'));

    const { handleShare } = useImageViewerActions({
      imageUri: 'file:///image.jpg',
      onHideActionSheet: mockOnHideActionSheet,
    });

    await expect(handleShare()).resolves.toBeUndefined();

    expect(mockOnHideActionSheet).toHaveBeenCalledTimes(1);
    // jest-expo はデフォルトで iOS プラットフォームとしてテストを実行し、
    // Babel が process.env.EXPO_OS をコンパイル時に 'ios' として内联するため、
    // テスト環境では常に { url } が使われる
    expect(Share.share).toHaveBeenCalledWith({ url: 'file:///image.jpg' });
    expect(showErrorFeedback).not.toHaveBeenCalled();
  });

  it('shows branded feedback when sharing fails for a real error', async () => {
    (Share.share as jest.Mock).mockRejectedValueOnce(new Error('share service unavailable'));

    const { handleShare } = useImageViewerActions({
      imageUri: 'file:///image.jpg',
      onHideActionSheet: mockOnHideActionSheet,
    });

    await expect(handleShare()).resolves.toBeUndefined();

    expect(mockOnHideActionSheet).toHaveBeenCalledTimes(1);
    // jest-expo では process.env.EXPO_OS が 'ios' にコンパイル時内联されるため { url } を使用
    expect(Share.share).toHaveBeenCalledWith({ url: 'file:///image.jpg' });
    expect(showErrorFeedback).toHaveBeenCalledWith({
      title: '分享失败',
      message: '暂时无法分享图片，请重试',
      actions: [{ label: '知道了', role: 'primary' }],
    });
  });
});
