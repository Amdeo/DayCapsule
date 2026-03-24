import React from 'react';
import { Alert, Switch } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SettingsPage } from '../SettingsPage';
import * as DB from '@/src/database/operations';
import { NotificationService } from '@/src/services/notificationService';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';

const mockSetCalendarDensity = jest.fn();
const mockLoadSettings = jest.fn();
const mockResetSettings = jest.fn();
const mockSetCloudMode = jest.fn();
const mockLogout = jest.fn();
const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockClearAllEntries = jest.fn(async () => undefined);
const mockRestoreEntries = jest.fn(async () => []);
const mockClearDirectory = jest.fn(async () => undefined);
const mockLoadEntries = jest.fn(async () => undefined);
const mockCloudSyncGetStatus = jest.fn(async () => ({ lastSyncAt: 1700000000000, lastSyncError: null, initialSyncState: 'ready', pendingEntries: 2, failedEntries: 1, conflictCopies: 1 }));
const mockCloudSyncNow = jest.fn(async () => undefined);
const mockInspectInitialState = jest.fn(async () => ({ localCount: 0, cloudCount: 0 }));
const mockBuildInitialFlow = jest.fn(() => ({ type: 'backing-up', localCount: 0, cloudCount: 0 }));
const mockRunInitialFlow = jest.fn(async () => undefined);
const mockSwitchDataSource = jest.fn();
const mockCreateRemoteDataSource = jest.fn(() => ({}));
const mockShowCloudSyncStatusAlert = jest.fn(async () => undefined);
const mockGetCurrentServerUrl = jest.fn(async () => 'https://server-a.example.com');
const mockGetRecentServerUrls = jest.fn(async () => ['https://server-b.example.com']);
const mockTestBackendConnection = jest.fn(async () => ({ success: true }));
const mockSwitchBackendEnvironment = jest.fn(async () => ({
  switched: true,
  currentServerUrl: 'https://server-c.example.com',
}));

let mockCloudMode: boolean | 'switching' = false;
let mockIsAuthenticated = false;
let mockUser: { email: string } | null = null;

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: Object.assign(
    () => ({
      entries: [],
    }),
    {
      getState: () => ({
        loadEntries: mockLoadEntries,
      }),
    }
  ),
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: () => ({
    notifications: false,
    autoBackup: false,
    highQualityPhotos: true,
    cardSpacing: 'default',
    photoHeight: 'default',
    calendarDensity: 'default',
    cloudMode: mockCloudMode,
    isLoaded: true,
    loadSettings: mockLoadSettings,
    setNotifications: jest.fn(),
    setAutoBackup: jest.fn(),
    setHighQualityPhotos: jest.fn(),
    setCardSpacing: jest.fn(),
    setPhotoHeight: jest.fn(),
    setCalendarDensity: mockSetCalendarDensity,
    setCloudMode: mockSetCloudMode,
    resetSettings: mockResetSettings,
  }),
  SPACING_VALUES: { compact: 8, default: 16, loose: 24 },
  PHOTO_HEIGHT_VALUES: { compact: 200, default: 280, large: 400 },
}));

jest.mock('@/src/utils/fileSystem', () => ({
  getStorageStats: jest.fn(async () => ({ totalSize: 1024 })),
  clearDirectory: (...args: unknown[]) => mockClearDirectory(...args),
  getMediaPaths: jest.fn(() => ({
    photoOriginal: 'file:///documents/photos/original/',
    photoDisplay: 'file:///cache/photos/display/',
    photoThumbnail: 'file:///cache/photos/thumbnails/',
    voiceOriginal: 'file:///documents/voice/original/',
    voiceCompressed: 'file:///cache/voice/compressed/',
    temp: 'file:///cache/temp/',
    database: 'file:///documents/db/',
  })),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

jest.mock('@/src/services/cloudSyncService', () => ({
  createCloudSyncService: jest.fn(() => ({
    getStatus: mockCloudSyncGetStatus,
    syncNow: mockCloudSyncNow,
  })),
}));

jest.mock('@/src/services/showCloudSyncStatusAlert', () => ({
  showCloudSyncStatusAlert: () => mockShowCloudSyncStatusAlert(),
}));

jest.mock('@/src/services/voiceService', () => ({
  VoiceService: { clearSoundCache: jest.fn() },
}));

jest.mock('@/src/services/backendEnvironmentService', () => ({
  getCurrentServerUrl: () => mockGetCurrentServerUrl(),
  getRecentServerUrls: () => mockGetRecentServerUrls(),
  normalizeServerUrl: (url: string) => url.trim().replace(/\/+$/, ''),
}));

jest.mock('@/src/services/backendConnectionService', () => ({
  testBackendConnection: (url: string) => mockTestBackendConnection(url),
}));

jest.mock('@/src/services/localEnvironmentDataManager', () => ({
  switchBackendEnvironment: (url: string) => mockSwitchBackendEnvironment(url),
}));

jest.mock('@/src/services/notificationService', () => ({
  NotificationService: {
    isReminderScheduled: jest.fn(async () => false),
    requestPermission: jest.fn(async () => true),
    scheduleDailyReminder: jest.fn(async () => undefined),
    cancelDailyReminder: jest.fn(async () => undefined),
  },
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text> };
});

jest.mock('../DetailPageShell', () => ({
  DetailPageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../TagManagementPage', () => ({
  TagManagementPage: () => null,
}));

jest.mock('@/src/store/authStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
    isAuthenticated: mockIsAuthenticated,
    logout: mockLogout,
  }),
}));

jest.mock('../LoginPage', () => ({
  LoginPage: () => null,
}));

jest.mock('@/src/services/syncBootstrapService', () => ({
  createSyncBootstrapService: jest.fn(() => ({
    inspectInitialState: mockInspectInitialState,
    buildInitialFlow: mockBuildInitialFlow,
    runInitialFlow: mockRunInitialFlow,
  })),
}));

jest.mock('@/src/database/dataSource', () => ({
  switchDataSource: mockSwitchDataSource,
  localDataSource: {},
  createRemoteDataSource: mockCreateRemoteDataSource,
}));

jest.mock('@/src/services/apiClient', () => ({
  getApiClient: jest.fn(() => ({
    get: mockApiGet,
    post: mockApiPost,
  })),
}));

jest.mock('@/src/database/operations', () => ({
  getAllEntries: jest.fn(async () => []),
  getEntriesCount: jest.fn(async () => 0),
  clearAllEntries: jest.fn(async () => undefined),
  restoreEntries: jest.fn(async () => []),
}));

describe('SettingsPage calendar density selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCloudMode = false;
    mockIsAuthenticated = false;
    mockUser = null;
    mockGetCurrentServerUrl.mockResolvedValue('https://server-a.example.com');
    mockGetRecentServerUrls.mockResolvedValue(['https://server-b.example.com']);
    mockTestBackendConnection.mockResolvedValue({ success: true });
    mockSwitchBackendEnvironment.mockResolvedValue({
      switched: true,
      currentServerUrl: 'https://server-c.example.com',
    });
    mockClearDirectory.mockResolvedValue(undefined);
    mockLoadEntries.mockResolvedValue(undefined);
    jest.spyOn(DB, 'getEntriesCount').mockResolvedValue(0);
    jest.spyOn(DB, 'clearAllEntries').mockImplementation(mockClearAllEntries);
    jest.spyOn(DB, 'restoreEntries').mockImplementation(mockRestoreEntries);
  });

  it('renders calendar density setting with default option selected', async () => {
    const screen = render(<SettingsPage visible onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('< 0.1 MB')).toBeTruthy();
    });

    expect(screen.getByTestId('settings-page-root')).toBeTruthy();
    expect(screen.getByTestId('settings-section-account')).toBeTruthy();
    expect(screen.getByTestId('settings-storage-card')).toBeTruthy();
    expect(screen.getByText('日历内容区密度')).toBeTruthy();
    expect(screen.getByText('调整日历视图中卡片和时间轴的疏密程度')).toBeTruthy();
    expect(screen.getByText('标准')).toBeTruthy();
  });

  it('calls setCalendarDensity when user switches option', async () => {
    const screen = render(<SettingsPage visible onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('< 0.1 MB')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('舒展'));

    expect(mockSetCalendarDensity).toHaveBeenCalledWith('comfortable');
  });

  it('shows preset tags management entry in settings', async () => {
    const screen = render(<SettingsPage visible onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('< 0.1 MB')).toBeTruthy();
    });

    expect(screen.getByText('预制标签管理')).toBeTruthy();
    expect(screen.getByText('管理可快速选择的预制标签')).toBeTruthy();
    expect(screen.getByTestId('settings-open-tag-management')).toBeTruthy();
  });

  it('shows sync status alert for authenticated cloud users', async () => {
    mockCloudMode = true;
    mockIsAuthenticated = true;
    mockUser = { email: 'sync@test.com' };

    const screen = render(<SettingsPage visible onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('sync@test.com')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('同步状态'));

    await waitFor(() => {
      expect(mockShowCloudSyncStatusAlert).toHaveBeenCalledTimes(1);
    });
  });

  it('shows branded feedback when enabling cloud mode fails', async () => {
    mockCloudMode = false;
    mockIsAuthenticated = true;
    mockUser = { email: 'broken@test.com' };
    mockInspectInitialState.mockRejectedValueOnce(new Error('network down'));

    const screen = render(<SettingsPage visible onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('broken@test.com')).toBeTruthy();
    });

    const switches = screen.UNSAFE_getAllByType(Switch);
    fireEvent(switches[0], 'valueChange', true);

    await waitFor(() => {
      expect(showErrorFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '切换失败',
          dedupeKey: 'cloud-mode-toggle-failed',
        })
      );
    });
  });

  it('shows go-to-settings feedback when notification permission is denied', async () => {
    (NotificationService.requestPermission as jest.Mock).mockResolvedValueOnce(false);

    const screen = render(<SettingsPage visible onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('< 0.1 MB')).toBeTruthy();
    });

    const switches = screen.UNSAFE_getAllByType(Switch);
    fireEvent(switches[0], 'valueChange', true);

    await waitFor(() => {
      expect(showErrorFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '权限不足',
          dedupeKey: 'notification-permission-denied',
        })
      );
    });
  });

  it('keeps local entries when cloud is empty and user switches back to local mode', async () => {
    mockCloudMode = true;
    mockIsAuthenticated = true;
    mockUser = { email: 'mobile3@test.com' };
    mockApiGet.mockResolvedValueOnce({ entryCount: 0 });
    jest.spyOn(DB, 'getEntriesCount').mockResolvedValueOnce(3);

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = render(<SettingsPage visible onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('mobile3@test.com')).toBeTruthy();
    });

    const switches = screen.UNSAFE_getAllByType(Switch);
    fireEvent(switches[0], 'valueChange', false);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        '切换到离线模式',
        expect.stringContaining('云端当前为空'),
        expect.any(Array),
      );
    });

    const actions = alertSpy.mock.calls[0][2] as Array<{ text?: string; onPress?: () => void }>;
    const keepLocal = actions.find((action) => action.text === '保留本地并切回离线');
    const cloudToLocal = actions.find((action) => action.text === '云端 → 本地');
    expect(keepLocal).toBeTruthy();
    expect(cloudToLocal).toBeUndefined();

    await keepLocal?.onPress?.();

    expect(mockClearAllEntries).not.toHaveBeenCalled();
  });

  it('uses syncBootstrapService when enabling cloud mode instead of switching datasource', async () => {
    mockCloudMode = false;
    mockIsAuthenticated = true;
    mockUser = { email: 'bootstrap@test.com' };
    mockInspectInitialState.mockResolvedValueOnce({ localCount: 0, cloudCount: 3 });
    mockBuildInitialFlow.mockReturnValueOnce({ type: 'restoring', localCount: 0, cloudCount: 3 });

    const screen = render(<SettingsPage visible onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('bootstrap@test.com')).toBeTruthy();
    });

    const switches = screen.UNSAFE_getAllByType(Switch);
    fireEvent(switches[0], 'valueChange', true);

    await waitFor(() => {
      expect(mockInspectInitialState).toHaveBeenCalled();
      expect(mockBuildInitialFlow).toHaveBeenCalledWith({ localCount: 0, cloudCount: 3 });
      expect(mockRunInitialFlow).toHaveBeenCalledWith('cloud');
    });

    expect(mockSwitchDataSource).not.toHaveBeenCalled();
    expect(mockCreateRemoteDataSource).not.toHaveBeenCalled();
  });

  it('shows current backend server and recent history options', async () => {
    const screen = render(<SettingsPage visible onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://server-a.example.com')).toBeTruthy();
    });

    expect(screen.getByText('后端连接')).toBeTruthy();
    expect(screen.getByText('https://server-b.example.com')).toBeTruthy();
  });

  it('tests backend connectivity for the current draft url and enables save after success', async () => {
    const screen = render(<SettingsPage visible onClose={() => {}} />);

    const input = await screen.findByDisplayValue('https://server-a.example.com');
    fireEvent.changeText(input, 'https://server-c.example.com');

    const saveButton = screen.getByTestId('settings-backend-save-button');
    expect(saveButton.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(screen.getByTestId('settings-backend-test-button'));

    await waitFor(() => {
      expect(mockTestBackendConnection).toHaveBeenCalledWith('https://server-c.example.com');
    });

    await waitFor(() => {
      expect(screen.getByText('连接成功')).toBeTruthy();
    });
    expect(screen.getByTestId('settings-backend-save-button').props.accessibilityState.disabled).toBe(false);
  });

  it('invalidates previous success after draft changes or selecting history', async () => {
    const screen = render(<SettingsPage visible onClose={() => {}} />);
    const input = await screen.findByDisplayValue('https://server-a.example.com');

    fireEvent.changeText(input, 'https://server-c.example.com');
    fireEvent.press(screen.getByTestId('settings-backend-test-button'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-backend-save-button').props.accessibilityState.disabled).toBe(false);
    });

    fireEvent.changeText(input, 'https://server-d.example.com');
    expect(screen.getByTestId('settings-backend-save-button').props.accessibilityState.disabled).toBe(true);

    fireEvent.press(screen.getByText('https://server-b.example.com'));
    expect(screen.getByDisplayValue('https://server-b.example.com')).toBeTruthy();
    expect(screen.getByTestId('settings-backend-save-button').props.accessibilityState.disabled).toBe(true);
  });

  it('saves and switches backend only after a successful test', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = render(<SettingsPage visible onClose={() => {}} />);
    const input = await screen.findByDisplayValue('https://server-a.example.com');

    fireEvent.changeText(input, 'https://server-c.example.com');
    fireEvent.press(screen.getByTestId('settings-backend-test-button'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-backend-save-button').props.accessibilityState.disabled).toBe(false);
    });

    fireEvent.press(screen.getByTestId('settings-backend-save-button'));

    await waitFor(() => {
      expect(mockSwitchBackendEnvironment).toHaveBeenCalledWith('https://server-c.example.com');
    });
    expect(alertSpy).toHaveBeenCalledWith('切换成功', '后端已切换，请重新登录');
  });

  it('clears local app data when user confirms clear cache', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = render(<SettingsPage visible onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('< 0.1 MB')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('清除缓存'));

    const confirmActions = alertSpy.mock.calls[0][2] as Array<{ text?: string; onPress?: () => void }>;
    const confirmAction = confirmActions.find((action) => action.text === '清除');
    expect(confirmAction).toBeTruthy();

    await act(async () => {
      await confirmAction?.onPress?.();
    });

    await waitFor(() => {
      expect(mockClearAllEntries).toHaveBeenCalledTimes(1);
    });

    expect(mockClearDirectory).toHaveBeenCalledTimes(6);
    expect(mockLoadEntries).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith('成功', '本地数据已清除');
  });
});
