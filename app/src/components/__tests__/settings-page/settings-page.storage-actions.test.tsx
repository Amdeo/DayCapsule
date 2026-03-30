import { Alert } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockGetStorageStats = jest.fn(async () => ({ totalSize: 1024 }));
const mockClearLocalAppData = jest.fn(async () => undefined);
const mockLoadEntries = jest.fn(async () => undefined);

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

function autoConfirmClearCache(alertSpy: jest.SpyInstance) {
  alertSpy.mockImplementation((title, _message, actions) => {
    if (title !== '清除缓存') {
      return;
    }

    const confirmAction = actions?.find((action) => action.text === '清除');
    void confirmAction?.onPress?.();
  });
}

describe('useSettingsPageStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStorageStats.mockResolvedValue({ totalSize: 1024 });
    mockClearLocalAppData.mockResolvedValue(undefined);
    mockLoadEntries.mockResolvedValue(undefined);
  });

  it('refreshes storage stats after clear cache succeeds', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    autoConfirmClearCache(alertSpy);
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

    await waitFor(() => {
      expect(result.current.usedSpace).toBe('2.0 MB');
    });

    expect(mockClearLocalAppData).toHaveBeenCalledTimes(1);
    expect(mockLoadEntries).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith('成功', '本地数据已清除');
  });

  it('refreshes storage stats after clear cache fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    autoConfirmClearCache(alertSpy);
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

    await waitFor(() => {
      expect(result.current.usedSpace).toBe('2.0 MB');
    });

    expect(mockClearLocalAppData).toHaveBeenCalledTimes(1);
    expect(mockLoadEntries).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('清除失败', '清理本地数据时发生错误');
  });
});
