import React, { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { SettingsPage } from '../../SettingsPage';

type SettingsPageProps = ComponentProps<typeof SettingsPage>;

const mockSettingsState = {
  notifications: false,
  autoBackup: false,
  highQualityPhotos: true,
  cardSpacing: 'default',
  photoHeight: 'default',
  calendarDensity: 'default',
  cloudMode: false as boolean | 'switching',
  isLoaded: true,
  loadSettings: jest.fn(async () => undefined),
  setNotifications: jest.fn(async () => undefined),
  setAutoBackup: jest.fn(async () => undefined),
  setHighQualityPhotos: jest.fn(async () => undefined),
  setCardSpacing: jest.fn(async () => undefined),
  setPhotoHeight: jest.fn(async () => undefined),
  setCalendarDensity: jest.fn(async () => undefined),
  setCloudMode: jest.fn(async () => undefined),
  resetSettings: jest.fn(async () => undefined),
};

const mockAuthState = {
  user: null as { email: string } | null,
  isAuthenticated: false,
  logout: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
};

const mockEntryStoreState = {
  entries: [] as Array<{ id: string; type: string; media?: Array<{ uri?: string }> }>,
  loadEntries: jest.fn(async () => undefined),
};

const mockCloudSyncService = {
  getStatus: jest.fn(async () => ({
    lastSyncAt: 1700000000000,
    lastSyncError: null,
    initialSyncState: 'ready',
    pendingEntries: 0,
    failedEntries: 0,
    conflictCopies: 0,
  })),
  syncNow: jest.fn(async () => undefined),
};

const mockSyncBootstrapService = {
  inspectInitialState: jest.fn(async () => ({ localCount: 0, cloudCount: 0 })),
  buildInitialFlow: jest.fn(() => ({ type: 'backing-up', localCount: 0, cloudCount: 0 })),
  runInitialFlow: jest.fn(async () => undefined),
};

const mockApiClient = {
  get: jest.fn(async () => ({ entryCount: 0 })),
  post: jest.fn(async () => undefined),
  uploadFile: jest.fn(async () => ({ id: 'upload-1' })),
};

const mockNotificationService = {
  isReminderScheduled: jest.fn(async () => false),
  requestPermission: jest.fn(async () => true),
  scheduleDailyReminder: jest.fn(async () => undefined),
  cancelDailyReminder: jest.fn(async () => undefined),
};

const mockBackendState = {
  currentServerUrl: 'https://server-a.example.com',
  recentServerUrls: [] as string[],
  testResult: { success: true as boolean, message: undefined as string | undefined },
  switchResult: {
    switched: false,
    currentServerUrl: 'https://server-a.example.com',
  },
};

const mockUseEntryStore = Object.assign(
  () => ({
    entries: mockEntryStoreState.entries,
  }),
  {
    getState: () => ({
      entries: mockEntryStoreState.entries,
      loadEntries: mockEntryStoreState.loadEntries,
    }),
  }
);

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: mockUseEntryStore,
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: () => mockSettingsState,
  SPACING_VALUES: { compact: 8, default: 16, loose: 24 },
  PHOTO_HEIGHT_VALUES: { compact: 200, default: 280, large: 400 },
}));

jest.mock('@/src/store/authStore', () => ({
  useAuthStore: () => mockAuthState,
}));

jest.mock('@/src/services/cloudSyncService', () => ({
  createCloudSyncService: jest.fn(() => mockCloudSyncService),
}));

jest.mock('@/src/services/errorFeedbackPresets', () => ({
  buildCloudModeToggleFailedFeedback: jest.fn((error: Error, title: string) => ({
    title,
    message: error.message,
  })),
  buildNotificationPermissionFeedback: jest.fn(() => ({
    title: '通知权限未开启',
    message: '请授权通知权限',
  })),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/src/services/syncBootstrapService', () => ({
  createSyncBootstrapService: jest.fn(() => mockSyncBootstrapService),
}));

jest.mock('@/src/services/photoIntegrityService', () => ({
  buildPhotoUploadMetadata: jest.fn(() => ({})),
}));

jest.mock('@/src/services/apiClient', () => ({
  getApiClient: jest.fn(() => mockApiClient),
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

jest.mock('@/src/database/operations', () => ({
  getEntriesCount: jest.fn(async () => 0),
  getAllEntries: jest.fn(async () => []),
  clearAllEntries: jest.fn(async () => undefined),
  restoreEntries: jest.fn(async () => undefined),
}));

jest.mock('@/src/utils/fileSystem', () => ({
  getStorageStats: jest.fn(async () => ({ totalSize: 1024 })),
}));

jest.mock('@/src/services/notificationService', () => ({
  NotificationService: mockNotificationService,
}));

jest.mock('@/src/services/backendEnvironmentService', () => ({
  getCurrentServerUrl: jest.fn(async () => mockBackendState.currentServerUrl),
  getRecentServerUrls: jest.fn(async () => mockBackendState.recentServerUrls),
  normalizeServerUrl: (url: string) => url.trim().replace(/\/+$/, ''),
}));

jest.mock('@/src/services/backendConnectionService', () => ({
  testBackendConnection: jest.fn(async () => mockBackendState.testResult),
}));

jest.mock('@/src/services/localEnvironmentDataManager', () => ({
  switchBackendEnvironment: jest.fn(async () => mockBackendState.switchResult),
}));

jest.mock('@/src/services/localAppDataService', () => ({
  clearLocalAppData: jest.fn(async () => undefined),
}));

jest.mock('@/src/services/e2eSyncLabService', () => ({
  createE2ESyncLabService: jest.fn(() => ({
    injectSuspectRepairable: jest.fn(async () => undefined),
    injectRepairPending: jest.fn(async () => undefined),
    clearFixtures: jest.fn(async () => undefined),
  })),
}));

jest.mock('@/src/services/showCloudSyncStatusAlert', () => ({
  showCloudSyncStatusAlert: jest.fn(async () => undefined),
}));

jest.mock('@/src/services/showPhotoRepairPrompt', () => ({
  showPhotoRepairPrompt: jest.fn(),
}));

jest.mock('../../DetailPageShell', () => ({
  DetailPageShell: ({
    children,
    title,
    visible,
  }: {
    children: React.ReactNode;
    title: string;
    visible: boolean;
  }) =>
    visible ? (
      <View testID="settings-page-shell">
        <Text>{title}</Text>
        {children}
      </View>
    ) : null,
}));

jest.mock('../../TagManagementPage', () => ({
  TagManagementPage: ({ visible }: { visible: boolean }) =>
    visible ? <Text testID="settings-tag-management-dialog">tag-management</Text> : null,
}));

jest.mock('../../LoginPage', () => ({
  LoginPage: ({ visible }: { visible: boolean }) =>
    visible ? <Text testID="settings-login-dialog">login</Text> : null,
}));

export interface RenderSettingsPageOptions {
  visible?: boolean;
  authenticated?: boolean;
  cloudMode?: boolean | 'switching';
  entries?: Array<{ id: string; type: string; media?: Array<{ uri?: string }> }>;
  userEmail?: string | null;
  props?: Partial<SettingsPageProps>;
}

export function renderSettingsPage(options: RenderSettingsPageOptions = {}) {
  const {
    visible = true,
    authenticated = false,
    cloudMode = false,
    entries = [],
    userEmail = authenticated ? 'tester@example.com' : null,
    props = {},
  } = options;

  Object.assign(mockAuthState, {
    user: userEmail ? { email: userEmail } : null,
    isAuthenticated: authenticated,
    logout: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
  });
  Object.assign(mockSettingsState, {
    notifications: false,
    autoBackup: false,
    highQualityPhotos: true,
    cardSpacing: 'default',
    photoHeight: 'default',
    calendarDensity: 'default',
    cloudMode,
    isLoaded: true,
    loadSettings: jest.fn(async () => undefined),
    setNotifications: jest.fn(async () => undefined),
    setAutoBackup: jest.fn(async () => undefined),
    setHighQualityPhotos: jest.fn(async () => undefined),
    setCardSpacing: jest.fn(async () => undefined),
    setPhotoHeight: jest.fn(async () => undefined),
    setCalendarDensity: jest.fn(async () => undefined),
    setCloudMode: jest.fn(async () => undefined),
    resetSettings: jest.fn(async () => undefined),
  });
  Object.assign(mockEntryStoreState, {
    entries,
    loadEntries: jest.fn(async () => undefined),
  });
  mockBackendState.currentServerUrl = 'https://server-a.example.com';
  mockBackendState.recentServerUrls = [];
  mockBackendState.testResult = { success: true, message: undefined };
  mockBackendState.switchResult = {
    switched: false,
    currentServerUrl: 'https://server-a.example.com',
  };

  const finalProps: SettingsPageProps = {
    visible,
    onClose: jest.fn(),
    ...props,
  };

  return {
    screen: render(<SettingsPage {...finalProps} />),
    props: finalProps,
    spies: {
      setCloudMode: mockSettingsState.setCloudMode,
      loadEntries: mockEntryStoreState.loadEntries,
      logout: mockAuthState.logout,
    },
  };
}
