import React from 'react';
import { render, act } from '@testing-library/react-native';

const mockRefreshCloudSyncIndicator = jest.fn(async () => undefined);

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@expo/vector-icons/FontAwesome', () => ({
  __esModule: true,
  default: { font: {} },
}));

jest.mock('@react-navigation/native', () => {
  return {
    DarkTheme: {},
    DefaultTheme: {},
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
}));

jest.mock('expo-router', () => {
  const Stack = Object.assign(
    ({ children }: { children?: React.ReactNode }) => children,
    {
      Screen: () => null,
    }
  );

  return {
    Stack,
    ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock('expo-network', () => ({
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
  getNetworkStateAsync: jest.fn().mockResolvedValue({
    isConnected: false,
    isInternetReachable: false,
  }),
}));

jest.mock('../../global.css', () => ({}), { virtual: true });
jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native-css-interop/src/runtime/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native-reanimated', () => ({}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'GestureHandlerRootView',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@/src/utils/fileSystem', () => ({
  initializeFileSystem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/services/voiceService', () => ({
  VoiceService: {
    initializeAudio: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/src/database/sqlite', () => ({
  initDatabase: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/src/database/migration', () => ({
  migrateFromAsyncStorage: jest.fn().mockResolvedValue({ success: true, migratedCount: 0 }),
  migrateTagsToNormalized: jest.fn().mockResolvedValue(undefined),
  migrateMediaMetadataColumns: jest.fn().mockResolvedValue(undefined),
  migrateToMediaJson: jest.fn().mockResolvedValue(undefined),
  migrateSyncStatusColumn: jest.fn().mockResolvedValue(undefined),
  migrateCloudSyncCoreColumns: jest.fn().mockResolvedValue(undefined),
  migrateLocalReadyStateColumn: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/src/components/FeedbackHost', () => ({
  FeedbackHost: () => null,
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/src/services/backupService', () => ({
  BackupService: {
    shouldBackup: jest.fn().mockResolvedValue(false),
    createBackup: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getString: jest.fn().mockResolvedValue('false'),
    setString: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: { getState: () => ({ entries: [] }) },
}));

jest.mock('@/src/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      isAuthenticated: false,
      loadAuth: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: { getState: () => ({ cloudMode: false }) },
}));

jest.mock('@/src/store/syncStore', () => ({
  useSyncStore: {
    getState: () => ({
      load: jest.fn().mockResolvedValue(undefined),
      setInitialSyncState: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock('@/src/store/cloudSyncIndicatorStore', () => ({
  useCloudSyncIndicatorStore: { getState: () => ({ refresh: mockRefreshCloudSyncIndicator }) },
}));

jest.mock('@/src/services/localEntryRecoveryService', () => ({
  cleanupIncompleteLocalEntries: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/services/voiceUploadQueue', () => ({
  flushPendingVoiceUploads: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/services/photoUploadQueue', () => ({
  flushPendingPhotoUploads: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/services/cloudSyncService', () => ({
  createCloudSyncService: jest.fn(() => ({ syncNow: jest.fn().mockResolvedValue(undefined) })),
}));

jest.mock('@/src/services/syncBootstrapService', () => ({
  createSyncBootstrapService: jest.fn(() => ({
    inspectInitialState: jest.fn().mockResolvedValue({}),
    buildInitialFlow: jest.fn().mockReturnValue({ type: 'idle' }),
    runInitialFlow: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  LogBox: { ignoreLogs: jest.fn() },
  StyleSheet: { flatten: (style: unknown) => style },
}));

import RootLayout from '../_layout';
import { cleanupIncompleteLocalEntries } from '@/src/services/localEntryRecoveryService';
import { flushPendingVoiceUploads } from '@/src/services/voiceUploadQueue';
import { flushPendingPhotoUploads } from '@/src/services/photoUploadQueue';

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('RootLayout local-ready cleanup order', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs processing entry cleanup before flushing pending uploads', async () => {
    render(<RootLayout />);

    await flushPromises();

    expect(cleanupIncompleteLocalEntries).toHaveBeenCalledTimes(1);
    expect(flushPendingVoiceUploads).toHaveBeenCalledTimes(1);
    expect(flushPendingPhotoUploads).toHaveBeenCalledTimes(1);
    expect((cleanupIncompleteLocalEntries as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (flushPendingVoiceUploads as jest.Mock).mock.invocationCallOrder[0]
    );
    expect((cleanupIncompleteLocalEntries as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (flushPendingPhotoUploads as jest.Mock).mock.invocationCallOrder[0]
    );
  });
});
