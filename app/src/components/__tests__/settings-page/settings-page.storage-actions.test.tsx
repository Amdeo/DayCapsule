import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockGetStorageStats = jest.fn(async () => ({ totalSize: 1024 }));
const mockClearLocalAppData = jest.fn(async () => undefined);
const mockLoadEntries = jest.fn(async () => undefined);
const mockShowConfirmDialog = jest.fn();
const mockShowErrorFeedback = jest.fn();

jest.mock('@/src/utils/fileSystem', () => ({
  getStorageStats: (...args: unknown[]) => mockGetStorageStats(...args),
}));

jest.mock('@/src/services/localAppDataService', () => ({
  clearLocalAppData: (...args: unknown[]) => mockClearLocalAppData(...args),
}));

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: {
    getState: () => ({
      loadEntries: mockLoadEntries,
    }),
  },
}));

jest.mock('@/src/services/showConfirmDialog', () => ({
  showConfirmDialog: (...args: unknown[]) => mockShowConfirmDialog(...args),
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: (...args: unknown[]) => mockShowErrorFeedback(...args),
}));

describe('useSettingsPageStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStorageStats.mockReset();
    mockClearLocalAppData.mockReset();
    mockLoadEntries.mockReset();
    mockShowConfirmDialog.mockReset();
    mockShowErrorFeedback.mockReset();
    mockGetStorageStats.mockResolvedValue({ totalSize: 1024 });
    mockClearLocalAppData.mockResolvedValue(undefined);
    mockLoadEntries.mockResolvedValue(undefined);
  });

  it('refreshes storage stats after clear cache succeeds', async () => {
    mockGetStorageStats.mockResolvedValueOnce({ totalSize: 1024 }).mockResolvedValueOnce({ totalSize: 2 * 1024 * 1024 });

    const { useSettingsPageStorage } = require('../../settings-page/useSettingsPageStorage');
    const { result } = renderHook(() => useSettingsPageStorage());

    await act(async () => {
      await result.current.refreshStorageStats();
    });

    expect(result.current.usedSpace).toBe('< 0.1 MB');

    act(() => {
      result.current.handleClearCache();
    });

    expect(mockShowConfirmDialog).toHaveBeenCalledWith({
      title: '清除缓存',
      message: '确定要清除当前设备上的本地记录、媒体和缓存数据吗？后端数据不会受影响。',
      actions: [
        expect.objectContaining({ label: '取消', role: 'secondary' }),
        expect.objectContaining({ label: '清除', role: 'danger' }),
      ],
    });

    const confirmRequest = mockShowConfirmDialog.mock.calls[0][0] as {
      actions: Array<{ label: string; onPress?: () => void | Promise<void> }>;
    };
    const clearAction = confirmRequest.actions.find((action) => action.label === '清除');

    await act(async () => {
      await clearAction?.onPress?.();
    });

    await waitFor(() => {
      expect(result.current.usedSpace).toBe('2.0 MB');
    });

    expect(mockClearLocalAppData).toHaveBeenCalledTimes(1);
    expect(mockLoadEntries).toHaveBeenCalledTimes(1);
    expect(mockShowErrorFeedback).toHaveBeenCalledWith({
      title: '成功',
      message: '本地数据已清除',
      tone: 'accent',
      actions: [
        expect.objectContaining({ label: '知道了', role: 'primary' }),
      ],
    });
  });

  it('refreshes storage stats after clear cache fails', async () => {
    mockClearLocalAppData.mockRejectedValueOnce(new Error('boom'));
    mockGetStorageStats.mockResolvedValueOnce({ totalSize: 1024 }).mockResolvedValueOnce({ totalSize: 2 * 1024 * 1024 });

    const { useSettingsPageStorage } = require('../../settings-page/useSettingsPageStorage');
    const { result } = renderHook(() => useSettingsPageStorage());

    await act(async () => {
      await result.current.refreshStorageStats();
    });

    expect(result.current.usedSpace).toBe('< 0.1 MB');

    act(() => {
      result.current.handleClearCache();
    });

    expect(mockShowConfirmDialog).toHaveBeenCalledWith({
      title: '清除缓存',
      message: '确定要清除当前设备上的本地记录、媒体和缓存数据吗？后端数据不会受影响。',
      actions: [
        expect.objectContaining({ label: '取消', role: 'secondary' }),
        expect.objectContaining({ label: '清除', role: 'danger' }),
      ],
    });

    const confirmRequest = mockShowConfirmDialog.mock.calls[0][0] as {
      actions: Array<{ label: string; onPress?: () => void | Promise<void> }>;
    };
    const clearAction = confirmRequest.actions.find((action) => action.label === '清除');

    await act(async () => {
      await clearAction?.onPress?.();
    });

    await waitFor(() => {
      expect(result.current.usedSpace).toBe('2.0 MB');
    });

    expect(mockClearLocalAppData).toHaveBeenCalledTimes(1);
    expect(mockLoadEntries).not.toHaveBeenCalled();
    expect(mockShowErrorFeedback).toHaveBeenCalledWith({
      title: '清除失败',
      message: '清理本地数据时发生错误',
      tone: 'error',
      actions: [
        expect.objectContaining({ label: '知道了', role: 'primary' }),
      ],
    });
  });

  it('shows branded feedback when clearing cache succeeds but reloading entries fails', async () => {
    mockLoadEntries.mockRejectedValueOnce(new Error('reload failed'));
    mockGetStorageStats.mockResolvedValueOnce({ totalSize: 1024 }).mockResolvedValueOnce({ totalSize: 2 * 1024 * 1024 });

    const { useSettingsPageStorage } = require('../../settings-page/useSettingsPageStorage');
    const { result } = renderHook(() => useSettingsPageStorage());

    await act(async () => {
      await result.current.refreshStorageStats();
    });

    act(() => {
      result.current.handleClearCache();
    });

    const confirmRequest = mockShowConfirmDialog.mock.calls[0][0] as {
      actions: Array<{ label: string; onPress?: () => void | Promise<void> }>;
    };
    const clearAction = confirmRequest.actions.find((action) => action.label === '清除');

    await act(async () => {
      await clearAction?.onPress?.();
    });

    await waitFor(() => {
      expect(mockShowErrorFeedback).toHaveBeenCalledWith({
        title: '同步未完成',
        message: '本地数据已清除，但列表刷新失败，请稍后重试。',
        tone: 'error',
        actions: [
          expect.objectContaining({ label: '知道了', role: 'primary' }),
        ],
      });
    });
  });

  it('keeps success feedback when clearing cache succeeds but refreshing stats falls back to unknown', async () => {
    mockGetStorageStats
      .mockResolvedValueOnce({ totalSize: 1024 })
      .mockRejectedValueOnce(new Error('refresh failed'));

    const { useSettingsPageStorage } = require('../../settings-page/useSettingsPageStorage');
    const { result } = renderHook(() => useSettingsPageStorage());

    await act(async () => {
      await result.current.refreshStorageStats();
    });

    act(() => {
      result.current.handleClearCache();
    });

    const confirmRequest = mockShowConfirmDialog.mock.calls[0][0] as {
      actions: Array<{ label: string; onPress?: () => void | Promise<void> }>;
    };
    const clearAction = confirmRequest.actions.find((action) => action.label === '清除');

    await act(async () => {
      await clearAction?.onPress?.();
    });

    await waitFor(() => {
      expect(result.current.usedSpace).toBe('未知');
      expect(mockShowErrorFeedback).toHaveBeenCalledWith({
        title: '成功',
        message: '本地数据已清除',
        tone: 'accent',
        actions: [
          expect.objectContaining({ label: '知道了', role: 'primary' }),
        ],
      });
    });

    expect(mockShowErrorFeedback).not.toHaveBeenCalledWith({
      title: '清除失败',
      message: '清理本地数据时发生错误',
      tone: 'error',
      actions: [
        expect.objectContaining({ label: '知道了', role: 'primary' }),
      ],
    });
  });
});
