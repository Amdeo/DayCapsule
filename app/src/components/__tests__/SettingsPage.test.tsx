import React from 'react';
import { Alert, Switch } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SettingsPage } from '../SettingsPage';
import * as DB from '@/src/database/operations';

const mockSetCalendarDensity = jest.fn();
const mockLoadSettings = jest.fn();
const mockResetSettings = jest.fn();
const mockSetCloudMode = jest.fn();
const mockLogout = jest.fn();
const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockClearAllEntries = jest.fn(async () => undefined);
const mockRestoreEntries = jest.fn(async () => []);
const mockCloudSyncGetStatus = jest.fn(async () => ({ lastSyncAt: 1700000000000, lastSyncError: null, initialSyncState: 'ready', pendingEntries: 2, failedEntries: 1, conflictCopies: 1 }));
const mockCloudSyncNow = jest.fn(async () => undefined);
const mockInspectInitialState = jest.fn(async () => ({ localCount: 0, cloudCount: 0 }));
const mockBuildInitialFlow = jest.fn(() => ({ type: 'backing-up', localCount: 0, cloudCount: 0 }));
const mockRunInitialFlow = jest.fn(async () => undefined);
const mockSwitchDataSource = jest.fn();
const mockCreateRemoteDataSource = jest.fn(() => ({}));

let mockCloudMode: boolean | 'switching' = false;
let mockIsAuthenticated = false;
let mockUser: { email: string } | null = null;

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => ({
    entries: [],
  }),
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

jest.mock('@/src/services/cloudSyncService', () => ({
  createCloudSyncService: jest.fn(() => ({
    getStatus: mockCloudSyncGetStatus,
    syncNow: mockCloudSyncNow,
  })),
}));

jest.mock('@/src/services/voiceService', () => ({
  VoiceService: { clearSoundCache: jest.fn() },
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
  });

  it('shows sync status alert for authenticated cloud users', async () => {
    mockCloudMode = true;
    mockIsAuthenticated = true;
    mockUser = { email: 'sync@test.com' };

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = render(<SettingsPage visible onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('sync@test.com')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('同步状态'));

    await waitFor(() => {
      expect(mockCloudSyncGetStatus).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        '云同步状态',
        expect.stringContaining('待同步条数：2'),
        expect.any(Array),
      );
      expect(alertSpy).toHaveBeenCalledWith(
        '云同步状态',
        expect.stringContaining('冲突副本：1'),
        expect.any(Array),
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
});
