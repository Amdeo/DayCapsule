import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockGetStorageStats = jest.fn(async () => ({ totalSize: 1024 }));
const mockResetAppToInitialState = jest.fn(async () => undefined);
const mockShowConfirmDialog = jest.fn();
const mockShowErrorFeedback = jest.fn();

jest.mock('@/src/utils/fileSystem', () => ({
  getStorageStats: (...args: unknown[]) => mockGetStorageStats(...args),
}));

jest.mock('@/src/services/appResetService', () => ({
  resetAppToInitialState: (...args: unknown[]) => mockResetAppToInitialState(...args),
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
    mockResetAppToInitialState.mockReset();
    mockShowConfirmDialog.mockReset();
    mockShowErrorFeedback.mockReset();
    mockGetStorageStats.mockResolvedValue({ totalSize: 1024 });
    mockResetAppToInitialState.mockResolvedValue(undefined);
  });

  it('refreshes storage stats after app reset succeeds', async () => {
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
      message: '确定要清除当前设备上的本地数据并恢复到首次打开 APP 时的状态吗？这会清空记录、媒体、设置、登录状态，并将当前服务器地址恢复到默认值。最近使用过的服务器地址会保留。',
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

    expect(mockResetAppToInitialState).toHaveBeenCalledTimes(1);
    expect(mockShowErrorFeedback).toHaveBeenCalledWith({
      title: '成功',
      message: 'APP 已恢复到初始状态',
      tone: 'accent',
      actions: [
        expect.objectContaining({ label: '知道了', role: 'primary' }),
      ],
    });
  });

  it('refreshes storage stats after app reset fails', async () => {
    mockResetAppToInitialState.mockRejectedValueOnce(new Error('boom'));
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
      message: '确定要清除当前设备上的本地数据并恢复到首次打开 APP 时的状态吗？这会清空记录、媒体、设置、登录状态，并将当前服务器地址恢复到默认值。最近使用过的服务器地址会保留。',
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

    expect(mockResetAppToInitialState).toHaveBeenCalledTimes(1);
    expect(mockShowErrorFeedback).toHaveBeenCalledWith({
      title: '恢复失败',
      message: 'boom',
      tone: 'error',
      actions: [
        expect.objectContaining({ label: '知道了', role: 'primary' }),
      ],
    });
  });

  it('keeps success feedback when stats refresh falls back to unknown after app reset succeeds', async () => {
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
        message: 'APP 已恢复到初始状态',
        tone: 'accent',
        actions: [
          expect.objectContaining({ label: '知道了', role: 'primary' }),
        ],
      });
    });

    expect(mockShowErrorFeedback).not.toHaveBeenCalledWith({
      title: '恢复失败',
      message: '恢复初始状态时发生错误',
      tone: 'error',
      actions: [
        expect.objectContaining({ label: '知道了', role: 'primary' }),
      ],
    });
  });
});
