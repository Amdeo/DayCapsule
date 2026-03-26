import React from 'react';
import { act, render } from '@testing-library/react-native';

type SettingsPageProps = {
  visible: boolean;
  onClose: () => void;
};

type LoginPageProps = {
  visible: boolean;
  onClose?: () => void;
  onSuccess?: () => void | Promise<void>;
};

const mockDefaultPersistedSettings = {
  notifications: false,
  autoBackup: false,
  highQualityPhotos: true,
  cardSpacing: 'default',
  photoHeight: 'default',
  calendarDensity: 'default',
  cloudMode: false as boolean | 'switching',
};

const mockDefaultCloudSyncSnapshot = {
  lastSyncAt: 1700000000000,
  lastSyncError: null as string | null,
  initialSyncState: 'ready',
  pendingEntries: 2,
  pendingUploads: 0,
  uploadingEntries: 0,
  failedEntries: 1,
  conflictCopies: 1,
  local: {
    entryCount: 2,
    photoCount: 1,
    voiceCount: 0,
    mediaBytes: 1024,
  },
  cloud: {
    entryCount: 2,
    photoCount: 1,
    voiceCount: 0,
    mediaBytes: 1024,
  },
  cloudError: null as string | null,
  lastMediaValidationSummary: {
    status: 'idle',
    total: 0,
    downloaded: 0,
    missing: 0,
    failed: 0,
    suspect: 0,
    repairable: 0,
    lastError: null,
    lastValidatedAt: null,
  },
};

let mockPersistedSettings = { ...mockDefaultPersistedSettings };
let mockShowE2ESyncLab = false;
let previousE2ESyncLabEnv = process.env.EXPO_PUBLIC_E2E_SYNC_LAB;
let latestLoginPageProps: LoginPageProps | null = null;

const mockSettingsState = {
  ...mockDefaultPersistedSettings,
  isLoaded: true,
  loadSettings: jest.fn(async () => undefined),
  setNotifications: jest.fn(async (value: boolean) => {
    mockPersistedSettings.notifications = value;
    mockSettingsState.notifications = value;
  }),
  setAutoBackup: jest.fn(async (value: boolean) => {
    mockPersistedSettings.autoBackup = value;
    mockSettingsState.autoBackup = value;
  }),
  setHighQualityPhotos: jest.fn(async (value: boolean) => {
    mockPersistedSettings.highQualityPhotos = value;
    mockSettingsState.highQualityPhotos = value;
  }),
  setCardSpacing: jest.fn(async (value: 'compact' | 'default' | 'loose') => {
    mockPersistedSettings.cardSpacing = value;
    mockSettingsState.cardSpacing = value;
  }),
  setPhotoHeight: jest.fn(async (value: 'compact' | 'default' | 'large') => {
    mockPersistedSettings.photoHeight = value;
    mockSettingsState.photoHeight = value;
  }),
  setCalendarDensity: jest.fn(async (value: 'comfortable' | 'default' | 'compact') => {
    mockPersistedSettings.calendarDensity = value;
    mockSettingsState.calendarDensity = value;
  }),
  setCloudMode: jest.fn(async (value: boolean | 'switching') => {
    mockPersistedSettings.cloudMode = value;
    mockSettingsState.cloudMode = value;
  }),
  resetSettings: jest.fn(async () => {
    mockPersistedSettings = { ...mockDefaultPersistedSettings };
    Object.assign(mockSettingsState, mockDefaultPersistedSettings);
  }),
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

const mockCloudSyncSnapshot = { ...mockDefaultCloudSyncSnapshot };
const mockCloudSyncService = {
  getStatus: jest.fn(async () => ({ ...mockCloudSyncSnapshot })),
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
  recentServerUrls: ['https://server-b.example.com'],
  testResult: { success: true as boolean, message: undefined as string | undefined },
  switchResult: {
    switched: true,
    currentServerUrl: 'https://server-c.example.com',
  },
};

export const mockShowErrorFeedback = jest.fn();
export const mockShowCloudSyncStatusAlert = jest.fn(async (_snapshot?: unknown) => undefined);
export const mockShowSyncRepairPrompt = jest.fn();
export const mockSwitchBackendEnvironment = jest.fn(async () => mockBackendState.switchResult);
export const mockClearLocalAppData = jest.fn(async () => undefined);
export const mockInjectSuspectRepairable = jest.fn(async () => undefined);
export const mockInjectRepairPending = jest.fn(async () => undefined);
export const mockInjectTextDetailFixture = jest.fn(async () => undefined);
export const mockClearSyncFixtures = jest.fn(async () => undefined);

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

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

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
    dedupeKey: 'cloud-mode-toggle-failed',
  })),
  buildNotificationPermissionFeedback: jest.fn(() => ({
    title: '权限不足',
    message: '请授权通知权限',
    dedupeKey: 'notification-permission-denied',
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
  showErrorFeedback: (...args: unknown[]) => mockShowErrorFeedback(...args),
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
  switchBackendEnvironment: (...args: unknown[]) => mockSwitchBackendEnvironment(...args),
}));

jest.mock('@/src/services/localAppDataService', () => ({
  clearLocalAppData: (...args: unknown[]) => mockClearLocalAppData(...args),
}));

jest.mock('@/src/services/e2eSyncLabService', () => ({
  createE2ESyncLabService: jest.fn(() => ({
    injectSuspectRepairable: (...args: unknown[]) => mockInjectSuspectRepairable(...args),
    injectRepairPending: (...args: unknown[]) => mockInjectRepairPending(...args),
    injectTextDetailFixture: (...args: unknown[]) => mockInjectTextDetailFixture(...args),
    clearFixtures: (...args: unknown[]) => mockClearSyncFixtures(...args),
  })),
}));

jest.mock('@/src/services/showCloudSyncStatusAlert', () => ({
  showCloudSyncStatusAlert: jest.fn(async () => {
    const snapshot = await mockCloudSyncService.getStatus();
    return mockShowCloudSyncStatusAlert(snapshot);
  }),
}));

jest.mock('@/src/services/showPhotoRepairPrompt', () => ({
  showPhotoRepairPrompt: (...args: unknown[]) => mockShowSyncRepairPrompt(...args),
}));

jest.mock('../../DetailPageShell', () => ({
  DetailPageShell: ({
    children,
    title,
    visible,
    onClose,
  }: {
    children: React.ReactNode;
    title: string;
    visible: boolean;
    onClose: () => void;
  }) => {
    const React = require('react');
    const { Pressable, Text, View } = require('react-native');
    return visible ? (
      <View testID="detail-page-shell">
        <Pressable testID="detail-page-backdrop" onPress={onClose}>
          <Text>backdrop</Text>
        </Pressable>
        <Text testID={`detail-page-title-${title}`}>{title}</Text>
        <Text>{title}</Text>
        {children}
      </View>
    ) : null;
  },
}));

jest.mock('../../TagManagementPage', () => ({
  TagManagementPage: ({ visible }: { visible: boolean }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return visible ? <Text testID="settings-tag-management-dialog">tag-management</Text> : null;
  },
}));

jest.mock('../../LoginPage', () => ({
  LoginPage: (props: LoginPageProps) => {
    const React = require('react');
    const { Text } = require('react-native');
    latestLoginPageProps = props;
    return props.visible ? <Text testID="settings-login-dialog">login</Text> : null;
  },
}));

export interface RenderSettingsPageOptions {
  visible?: boolean;
  authenticated?: boolean;
  cloudMode?: boolean | 'switching';
  entries?: Array<{ id: string; type: string; media?: Array<{ uri?: string }> }>;
  userEmail?: string | null;
  e2eSyncLab?: boolean;
  props?: Partial<SettingsPageProps>;
}

export function resetRenderSettingsPageMocks() {
  jest.clearAllMocks();
  mockPersistedSettings = { ...mockDefaultPersistedSettings };
  mockShowE2ESyncLab = false;
  latestLoginPageProps = null;
  if (previousE2ESyncLabEnv == null) {
    delete process.env.EXPO_PUBLIC_E2E_SYNC_LAB;
  } else {
    process.env.EXPO_PUBLIC_E2E_SYNC_LAB = previousE2ESyncLabEnv;
  }

  Object.assign(mockSettingsState, {
    ...mockDefaultPersistedSettings,
    isLoaded: true,
  });
  Object.assign(mockAuthState, {
    user: null,
    isAuthenticated: false,
    logout: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
  });
  Object.assign(mockEntryStoreState, {
    entries: [],
    loadEntries: jest.fn(async () => undefined),
  });
  Object.assign(mockCloudSyncSnapshot, mockDefaultCloudSyncSnapshot);
  mockSyncBootstrapService.inspectInitialState.mockResolvedValue({ localCount: 0, cloudCount: 0 });
  mockSyncBootstrapService.buildInitialFlow.mockImplementation(
    () => ({ type: 'backing-up', localCount: 0, cloudCount: 0 })
  );
  mockSyncBootstrapService.runInitialFlow.mockResolvedValue(undefined);
  mockApiClient.get.mockResolvedValue({ entryCount: 0 });
  mockApiClient.post.mockResolvedValue(undefined);
  mockApiClient.uploadFile.mockResolvedValue({ id: 'upload-1' });
  mockNotificationService.isReminderScheduled.mockResolvedValue(false);
  mockNotificationService.requestPermission.mockResolvedValue(true);
  mockNotificationService.scheduleDailyReminder.mockResolvedValue(undefined);
  mockNotificationService.cancelDailyReminder.mockResolvedValue(undefined);
  Object.assign(mockBackendState, {
    currentServerUrl: 'https://server-a.example.com',
    recentServerUrls: ['https://server-b.example.com'],
    testResult: { success: true, message: undefined },
    switchResult: {
      switched: true,
      currentServerUrl: 'https://server-c.example.com',
    },
  });
  mockSwitchBackendEnvironment.mockResolvedValue(mockBackendState.switchResult);
  mockClearLocalAppData.mockResolvedValue(undefined);
  mockInjectSuspectRepairable.mockResolvedValue(undefined);
  mockInjectRepairPending.mockResolvedValue(undefined);
  mockInjectTextDetailFixture.mockResolvedValue(undefined);
  mockClearSyncFixtures.mockResolvedValue(undefined);
}

export function triggerLatestLoginSuccess() {
  return latestLoginPageProps?.onSuccess?.();
}

export function getLatestLoginPageProps() {
  return latestLoginPageProps;
}

async function flushSettingsPageEffects(cycles = 3) {
  for (let index = 0; index < cycles; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

export async function renderSettingsPage(options: RenderSettingsPageOptions = {}) {
  const {
    visible = true,
    authenticated = false,
    cloudMode,
    entries = [],
    userEmail = authenticated ? 'tester@example.com' : null,
    e2eSyncLab = false,
    props = {},
  } = options;

  mockShowE2ESyncLab = e2eSyncLab;
  previousE2ESyncLabEnv = process.env.EXPO_PUBLIC_E2E_SYNC_LAB;
  if (mockShowE2ESyncLab) {
    process.env.EXPO_PUBLIC_E2E_SYNC_LAB = '1';
  } else {
    delete process.env.EXPO_PUBLIC_E2E_SYNC_LAB;
  }

  Object.assign(mockAuthState, {
    user: userEmail ? { email: userEmail } : null,
    isAuthenticated: authenticated,
    logout: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
  });

  Object.assign(mockSettingsState, {
    ...mockPersistedSettings,
    cloudMode: cloudMode ?? mockPersistedSettings.cloudMode,
    isLoaded: true,
  });
  mockPersistedSettings.cloudMode = mockSettingsState.cloudMode;

  Object.assign(mockEntryStoreState, {
    entries,
    loadEntries: jest.fn(async () => undefined),
  });

  const finalProps: SettingsPageProps = {
    visible,
    onClose: jest.fn(),
    ...props,
  };

  const { SettingsPage } = require('../../SettingsPage');
  const rendered = render(<SettingsPage {...finalProps} />);
  await flushSettingsPageEffects();

  return {
    ...rendered,
    screen: rendered,
    props: finalProps,
    mocks: {
      settings: mockSettingsState,
      auth: mockAuthState,
      entries: mockEntryStoreState,
      syncBootstrap: mockSyncBootstrapService,
      cloudSync: mockCloudSyncService,
      apiClient: mockApiClient,
      backend: mockBackendState,
      showErrorFeedback: mockShowErrorFeedback,
      showCloudSyncStatusAlert: mockShowCloudSyncStatusAlert,
      showSyncRepairPrompt: mockShowSyncRepairPrompt,
      switchBackendEnvironment: mockSwitchBackendEnvironment,
      clearLocalAppData: mockClearLocalAppData,
      injectSuspectRepairable: mockInjectSuspectRepairable,
      injectRepairPending: mockInjectRepairPending,
      injectTextDetailFixture: mockInjectTextDetailFixture,
      clearSyncFixtures: mockClearSyncFixtures,
    },
  };
}
