import { act, renderHook } from '@testing-library/react-native';
import * as MediaLibrary from 'expo-media-library';
import { showAppDialog } from '@/src/services/showAppDialog';
import { useImageViewerActions } from '../image-viewer/useImageViewerActions';

const mockOnHideActionSheet = jest.fn();

jest.mock('expo-media-library', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  saveToLibraryAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/services/showAppDialog', () => ({
  showAppDialog: jest.fn(),
}));

describe('useImageViewerActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows blocking dialog when album permission is denied', async () => {
    (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });

    const { result } = renderHook(() => useImageViewerActions({
      imageUri: 'file:///photo.jpg',
      onHideActionSheet: mockOnHideActionSheet,
    }));

    await act(async () => {
      await result.current.handleSaveToAlbum();
    });

    expect(showAppDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '权限不足',
        message: '请在设置中允许访问相册',
        tone: 'error',
        blocking: true,
      })
    );
  });

  it('shows success dialog after saving image to the album', async () => {
    const { result } = renderHook(() => useImageViewerActions({
      imageUri: 'file:///photo.jpg',
      onHideActionSheet: mockOnHideActionSheet,
    }));

    await act(async () => {
      await result.current.handleSaveToAlbum();
    });

    expect(MediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith('file:///photo.jpg');
    expect(showAppDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '已保存',
        message: '图片已保存到相册',
        tone: 'success',
        blocking: true,
      })
    );
  });

  it('shows blocking dialog when saving image to the album fails', async () => {
    (MediaLibrary.saveToLibraryAsync as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    const { result } = renderHook(() => useImageViewerActions({
      imageUri: 'file:///photo.jpg',
      onHideActionSheet: mockOnHideActionSheet,
    }));

    await act(async () => {
      await result.current.handleSaveToAlbum();
    });

    expect(showAppDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '保存失败',
        message: '无法保存图片，请重试',
        tone: 'error',
        blocking: true,
      })
    );
  });
});
