import { Alert, Platform, Share } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { useImageViewerActions } from '../../image-viewer/useImageViewerActions';

jest.mock('expo-media-library', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  saveToLibraryAsync: jest.fn(),
}));

describe('useImageViewerActions', () => {
  const mockOnHideActionSheet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
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
    expect(Alert.alert).toHaveBeenCalledWith('已保存', '图片已保存到相册');
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
    expect(Alert.alert).toHaveBeenCalledWith('权限不足', '请在设置中允许访问相册');
  });

  it('shows a failure alert when saving to the album throws', async () => {
    (MediaLibrary.saveToLibraryAsync as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    const { handleSaveToAlbum } = useImageViewerActions({
      imageUri: 'file:///image.jpg',
      onHideActionSheet: mockOnHideActionSheet,
    });

    await handleSaveToAlbum();

    expect(Alert.alert).toHaveBeenCalledWith('保存失败', '无法保存图片，请重试');
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
    expect(Share.share).toHaveBeenCalledWith({ message: 'file:///image.jpg' });
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
