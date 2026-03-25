import React, { ComponentProps } from 'react';
import { render } from '@testing-library/react-native';
import { SettingsPage } from '../../SettingsPage';

type SettingsPageProps = ComponentProps<typeof SettingsPage>;

const mockSettingsLoadSettings = jest.fn();
const mockSettingsSetNotifications = jest.fn();
const mockSettingsSetAutoBackup = jest.fn();
const mockSettingsSetHighQualityPhotos = jest.fn();
const mockSettingsSetCardSpacing = jest.fn();
const mockSettingsSetPhotoHeight = jest.fn();
const mockSettingsSetCalendarDensity = jest.fn();
const mockSettingsSetCloudMode = jest.fn();
const mockSettingsResetSettings = jest.fn();
const mockAuthLogout = jest.fn();
const mockCloudSyncGetStatus = jest.fn(async () => ({
  lastSyncAt: 1700000000000,
  lastSyncError: null,
  initialSyncState: 'ready',
  pendingEntries: 0,
  failedEntries: 0,
  conflictCopies: 0,
}));
const mockCloudSyncNow = jest.fn(async () => undefined);
const mockShowCloudSyncStatusAlert = jest.fn(async () => undefined);
const mockInspectInitialState = jest.fn(async () => ({
  localCount: 0,
  cloudCount: 0,
}));
const mockBuildInitialFlow = jest.fn(() => ({
  type: 'backing-up',
  localCount: 0,
  cloudCount: 0,
}));
const mockRunInitialFlow = jest.fn(async () => undefined);
const mockGetCurrentServerUrl = jest.fn(async () => 'https://server-a.example.com');
const mockGetRecentServerUrls = jest.fn(async () => []);
const mockTestBackendConnection = jest.fn(async () => ({ success: true }));
const mockSwitchBackendEnvironment = jest.fn(async () => ({
  switched: false,
  currentServerUrl: 'https://server-a.example.com',
}));
const mockEntryLoadEntries = jest.fn(async () => undefined);

const mockSettingsState = {
  notifications: false,
  autoBackup: false,
  highQualityPhotos: true,
  cardSpacing: 'default',
  photoHeight: 'default',
  calendarDensity: 'default',
  cloudMode: false as boolean | 'switching',
  isLoaded: true,
  loadSettings: mockSettingsLoadSettings,
  setNotifications: mockSettingsSetNotifications,
  setAutoBackup: mockSettingsSetAutoBackup,
  setHighQualityPhotos: mockSettingsSetHighQualityPhotos,
  setCardSpacing: mockSettingsSetCardSpacing,
  setPhotoHeight: mockSettingsSetPhotoHeight,
  setCalendarDensity: mockSettingsSetCalendarDensity,
  setCloudMode: mockSettingsSetCloudMode,
  resetSettings: mockSettingsResetSettings,
};

const mockAuthState = {
  user: null as { email: string } | null,
  isAuthenticated: false,
  logout: mockAuthLogout,
};

const mockEntryStoreState = {
  entries: [] as unknown[],
};

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: Object.assign(
    () => mockEntryStoreState,
    {
      getState: () => ({
        loadEntries: mockEntryLoadEntries,
      }),
    }
  ),
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: () => mockSettingsState,
  SPACING_VALUES: { compact: 8, default: 16, loose: 24 },
  PHOTO_HEIGHT_VALUES: { compact: 200, default: 280, large: 400 },
}));

jest.mock('@/src/store/authStore', () => ({
  useAuthStore: () => mockAuthState,
}));

jest.mock('@/src/store/commonTagsStore', () => ({
  useCommonTagsStore: {
    getState: () => ({
      loadCommonTags: jest.fn(),
    }),
  },
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

jest.mock('@/src/services/syncBootstrapService', () => ({
  createSyncBootstrapService: jest.fn(() => ({
    inspectInitialState: mockInspectInitialState,
    buildInitialFlow: mockBuildInitialFlow,
    runInitialFlow: mockRunInitialFlow,
  })),
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

jest.mock('@/src/services/e2eSyncLabService', () => ({
  createE2ESyncLabService: jest.fn(() => ({
    injectSuspectRepairable: jest.fn(async () => undefined),
    injectRepairPending: jest.fn(async () => undefined),
    clearFixtures: jest.fn(async () => undefined),
  })),
}));

jest.mock('@/src/services/showPhotoRepairPrompt', () => ({
  showPhotoRepairPrompt: jest.fn(),
}));

jest.mock('@/src/services/voiceService', () => ({
  VoiceService: { clearSoundCache: jest.fn() },
}));

jest.mock('@/src/services/apiClient', () => ({
  getApiClient: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
  })),
}));

jest.mock('@/src/database/dataSource', () => ({
  switchDataSource: jest.fn(),
  localDataSource: {},
  createRemoteDataSource: jest.fn(() => ({})),
}));

jest.mock('@/src/database/operations', () => ({
  getAllEntries: jest.fn(async () => []),
  getEntriesCount: jest.fn(async () => 0),
  clearAllEntries: jest.fn(async () => undefined),
  restoreEntries: jest.fn(async () => []),
}));

jest.mock('@/src/utils/fileSystem', () => ({
  getStorageStats: jest.fn(async () => ({ totalSize: 1024 })),
  clearDirectory: jest.fn(async () => undefined),
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

jest.mock('@/src/services/notificationService', () => ({
  NotificationService: {
    isReminderScheduled: jest.fn(async () => false),
    requestPermission: jest.fn(async () => true),
    scheduleDailyReminder: jest.fn(async () => undefined),
    cancelDailyReminder: jest.fn(async () => undefined),
  },
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
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

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

jest.mock('../../DetailPageShell', () => ({
  DetailPageShell: ({ children }: { children: React.ReactNode }) => {
    const React = require('react');
    return React.createElement(React.Fragment, null, children);
  },
}));

jest.mock('../../TagManagementPage', () => ({
  TagManagementPage: () => null,
}));

jest.mock('../../LoginPage', () => ({
  LoginPage: () => null,
}));

export interface RenderSettingsPageOptions {
  props?: Partial<SettingsPageProps>;
  auth?: Partial<typeof mockAuthState>;
  settings?: Partial<typeof mockSettingsState>;
  entryStore?: Partial<typeof mockEntryStoreState>;
}

export function renderSettingsPage(overrides: RenderSettingsPageOptions = {}) {
  Object.assign(mockAuthState, {
    user: null,
    isAuthenticated: false,
    logout: mockAuthLogout,
    ...overrides.auth,
  });
  Object.assign(mockSettingsState, {
    notifications: false,
    autoBackup: false,
    highQualityPhotos: true,
    cardSpacing: 'default',
    photoHeight: 'default',
    calendarDensity: 'default',
    cloudMode: false,
    isLoaded: true,
    loadSettings: mockSettingsLoadSettings,
    setNotifications: mockSettingsSetNotifications,
    setAutoBackup: mockSettingsSetAutoBackup,
    setHighQualityPhotos: mockSettingsSetHighQualityPhotos,
    setCardSpacing: mockSettingsSetCardSpacing,
    setPhotoHeight: mockSettingsSetPhotoHeight,
    setCalendarDensity: mockSettingsSetCalendarDensity,
    setCloudMode: mockSettingsSetCloudMode,
    resetSettings: mockSettingsResetSettings,
    ...overrides.settings,
  });
  Object.assign(mockEntryStoreState, {
    entries: [],
    ...overrides.entryStore,
  });

  const props: SettingsPageProps = {
    visible: true,
    onClose: jest.fn(),
    ...overrides.props,
  };

  return {
    props,
    mocks: {
      auth: mockAuthState,
      settings: mockSettingsState,
      entryStore: mockEntryStoreState,
      cloud: {
        getStatus: mockCloudSyncGetStatus,
        syncNow: mockCloudSyncNow,
        showStatusAlert: mockShowCloudSyncStatusAlert,
      },
    },
    screen: render(<SettingsPage {...props} />),
  };
}
