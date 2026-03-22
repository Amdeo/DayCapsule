import React from 'react';
import { render, act } from '@testing-library/react-native';

let appStateListener: ((state: 'active' | 'background' | 'inactive') => void | Promise<void>) | null = null;
let networkListener: ((state: { isConnected: boolean; isInternetReachable: boolean | null }) => void) | null = null;
const mockRefreshCloudSyncIndicator = jest.fn(async () => undefined);
const mockFeedbackHost = jest.fn(() => null);

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
  const React = require('react');
  return {
    DarkTheme: {},
    DefaultTheme: {},
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const Stack = Object.assign(
    ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    {
      Screen: () => null,
    }
  );

  return {
    Stack,
    ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock('expo-network', () => ({
  addNetworkStateListener: jest.fn((listener) => {
    networkListener = listener;
    return { remove: jest.fn() };
  }),
  getNetworkStateAsync: jest.fn().mockResolvedValue({
    isConnected: false,
    isInternetReachable: false,
  }),
}));

jest.mock('../../global.css', () => ({}), { virtual: true });
jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native-css-interop/src/runtime/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));

jest.mock('react-native-reanimated', () => ({}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  return {
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

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
}));

jest.mock('@/src/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/src/components/FeedbackHost', () => ({
  FeedbackHost: () => mockFeedbackHost(),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/src/services/backupService', () => ({
  BackupService: {
    shouldBackup: jest.fn().mockResolvedValue(false),
    createBackup: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getString: jest.fn(async (key: string) => {
      if (key === 'settings:cloudMode') return 'false';
      if (key === 'settings:autoBackup') return 'false';
      return null;
    }),
    setString: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: {
    getState: () => ({ entries: [] }),
  },
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
  useSettingsStore: {
    getState: () => ({
      cloudMode: false,
    }),
  },
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
  useCloudSyncIndicatorStore: {
    getState: () => ({
      refresh: mockRefreshCloudSyncIndicator,
    }),
  },
}));

jest.mock('@/src/services/voiceUploadQueue', () => ({
  flushPendingVoiceUploads: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/services/photoUploadQueue', () => ({
  flushPendingPhotoUploads: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/services/cloudSyncService', () => ({
  createCloudSyncService: jest.fn(() => ({
    syncNow: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/src/services/syncBootstrapService', () => ({
  createSyncBootstrapService: jest.fn(() => ({
    inspectInitialState: jest.fn().mockResolvedValue({}),
    buildInitialFlow: jest.fn().mockReturnValue({ type: 'idle' }),
    runInitialFlow: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn((_: string, listener: typeof appStateListener) => {
      appStateListener = listener;
      return { remove: jest.fn() };
    }),
  },
  LogBox: { ignoreLogs: jest.fn() },
}));

import RootLayout from '../_layout';
import { flushPendingPhotoUploads } from '@/src/services/photoUploadQueue';

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('RootLayout photo upload triggers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appStateListener = null;
    networkListener = null;
  });

  it('flushes pending photo uploads on app bootstrap', async () => {
    render(<RootLayout />);

    await flushPromises();

    expect(mockFeedbackHost).toHaveBeenCalled();
    expect(flushPendingPhotoUploads).toHaveBeenCalledTimes(1);
    expect(mockRefreshCloudSyncIndicator).toHaveBeenCalled();
  });

  it('flushes pending photo uploads when app becomes active', async () => {
    render(<RootLayout />);
    await flushPromises();
    (flushPendingPhotoUploads as jest.Mock).mockClear();

    await act(async () => {
      await appStateListener?.('background');
      await appStateListener?.('active');
    });

    expect(flushPendingPhotoUploads).toHaveBeenCalledTimes(1);
    expect(mockRefreshCloudSyncIndicator).toHaveBeenCalled();
  });

  it('flushes pending photo uploads when network becomes reachable again', async () => {
    render(<RootLayout />);
    await flushPromises();
    (flushPendingPhotoUploads as jest.Mock).mockClear();

    act(() => {
      networkListener?.({
        isConnected: true,
        isInternetReachable: true,
      });
    });

    await flushPromises();

    expect(flushPendingPhotoUploads).toHaveBeenCalledTimes(1);
    expect(mockRefreshCloudSyncIndicator).toHaveBeenCalled();
  });
});
