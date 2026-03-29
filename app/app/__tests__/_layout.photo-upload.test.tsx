import React from 'react';
import { render, act } from '@testing-library/react-native';

let appStateListener: ((state: 'active' | 'background' | 'inactive') => void | Promise<void>) | null = null;
let networkListener: ((state: { isConnected: boolean; isInternetReachable: boolean | null }) => void) | null = null;
let lastAppStateRemove: jest.Mock | null = null;
let lastNetworkRemove: jest.Mock | null = null;
const mockRefreshCloudSyncIndicator = jest.fn(async () => undefined);
const mockFeedbackHost = jest.fn(() => null);
const mockShowErrorFeedback = jest.fn();
const mockSyncNow = jest.fn(async () => undefined);
let mockIsAuthenticated = false;
let mockCloudMode = false;

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
  addNetworkStateListener: jest.fn((listener) => {
    networkListener = listener;
    const removeMock = jest.fn();
    lastNetworkRemove = removeMock;
    return { remove: removeMock };
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
  return {
    GestureHandlerRootView: 'GestureHandlerRootView',
  };
});

jest.mock('react-native-safe-area-context', () => {
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
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
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
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
      isAuthenticated: mockIsAuthenticated,
      loadAuth: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      cloudMode: mockCloudMode,
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
    syncNow: mockSyncNow,
  })),
}));

jest.mock('@/src/services/syncBootstrapService', () => ({
  createSyncBootstrapService: jest.fn(() => ({
    inspectInitialState: jest.fn().mockResolvedValue({}),
    buildInitialFlow: jest.fn().mockReturnValue({ type: 'idle' }),
    runInitialFlow: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: (...args: unknown[]) => mockShowErrorFeedback(...args),
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn((_: string, listener: typeof appStateListener) => {
      appStateListener = listener;
      const removeMock = jest.fn();
      lastAppStateRemove = removeMock;
      return { remove: removeMock };
    }),
  },
  LogBox: { ignoreLogs: jest.fn() },
  StyleSheet: { flatten: (style: unknown) => style },
}));

import RootLayout from '../_layout';
import { initDatabase } from '@/src/database/sqlite';
import { flushPendingPhotoUploads } from '@/src/services/photoUploadQueue';
import { flushPendingVoiceUploads } from '@/src/services/voiceUploadQueue';

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
    lastAppStateRemove = null;
    lastNetworkRemove = null;
    mockIsAuthenticated = false;
    mockCloudMode = false;
  });

  it('flushes pending photo uploads on app bootstrap', async () => {
    const screen = render(<RootLayout />);

    await flushPromises();

    expect(mockFeedbackHost).toHaveBeenCalled();
    expect(screen.getByTestId('root-layout-shell')).toBeTruthy();
    expect(flushPendingPhotoUploads).toHaveBeenCalledTimes(1);
    expect(mockRefreshCloudSyncIndicator).toHaveBeenCalled();
  });

  it('shows branded feedback when app initialization fails', async () => {
    (initDatabase as jest.Mock).mockResolvedValueOnce(false);

    render(<RootLayout />);

    await flushPromises();

    expect(mockShowErrorFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '初始化失败',
        dedupeKey: 'app-initialization-failed',
      })
    );
  });

  it('flushes pending photo uploads when app becomes active', async () => {
    mockIsAuthenticated = true;
    mockCloudMode = true;
    render(<RootLayout />);
    await flushPromises();
    (flushPendingPhotoUploads as jest.Mock).mockClear();
    (flushPendingVoiceUploads as jest.Mock).mockClear();
    mockSyncNow.mockClear();

    await act(async () => {
      await appStateListener?.('background');
      await appStateListener?.('active');
    });

    expect(flushPendingPhotoUploads).toHaveBeenCalledTimes(1);
    expect(flushPendingVoiceUploads).toHaveBeenCalledTimes(1);
    expect(mockSyncNow).toHaveBeenCalledTimes(1);
    expect(mockRefreshCloudSyncIndicator).toHaveBeenCalled();
  });

  it('flushes pending photo uploads when network becomes reachable again', async () => {
    mockIsAuthenticated = true;
    mockCloudMode = true;
    render(<RootLayout />);
    await flushPromises();
    (flushPendingPhotoUploads as jest.Mock).mockClear();
    (flushPendingVoiceUploads as jest.Mock).mockClear();
    mockSyncNow.mockClear();

    act(() => {
      networkListener?.({
        isConnected: true,
        isInternetReachable: true,
      });
    });

    await flushPromises();

    expect(flushPendingPhotoUploads).toHaveBeenCalledTimes(1);
    expect(flushPendingVoiceUploads).toHaveBeenCalledTimes(1);
    expect(mockSyncNow).toHaveBeenCalledTimes(1);
    expect(mockRefreshCloudSyncIndicator).toHaveBeenCalled();
  });

  it('does not run duplicate recovery work while a previous recovery is still in flight', async () => {
    mockIsAuthenticated = true;
    mockCloudMode = true;
    let resolveSync!: () => void;
    mockSyncNow.mockImplementationOnce(async () => new Promise<void>((resolve) => {
      resolveSync = resolve;
    }));

    render(<RootLayout />);
    await flushPromises();
    (flushPendingPhotoUploads as jest.Mock).mockClear();
    (flushPendingVoiceUploads as jest.Mock).mockClear();
    mockSyncNow.mockClear();

    await act(async () => {
      const activePromise = appStateListener?.('background');
      await activePromise;
      const resumePromise = appStateListener?.('active');
      act(() => {
        networkListener?.({
          isConnected: true,
          isInternetReachable: true,
        });
      });
      await Promise.resolve();
      resolveSync();
      await resumePromise;
    });

    await flushPromises();

    expect(flushPendingPhotoUploads).toHaveBeenCalledTimes(1);
    expect(flushPendingVoiceUploads).toHaveBeenCalledTimes(1);
    expect(mockSyncNow).toHaveBeenCalledTimes(1);
  });

  it('removes the AppState subscription when RootLayout unmounts', async () => {
    const screen = render(<RootLayout />);

    await act(async () => Promise.resolve());
    const appStateRemove = lastAppStateRemove;
    screen.unmount();

    expect(appStateRemove).toBeDefined();
    expect(appStateRemove).toHaveBeenCalledTimes(1);
  });

  it('removes the network subscription when RootLayout unmounts', async () => {
    const screen = render(<RootLayout />);

    await act(async () => Promise.resolve());
    const networkRemove = lastNetworkRemove;
    screen.unmount();

    expect(networkRemove).toBeDefined();
    expect(networkRemove).toHaveBeenCalledTimes(1);
  });
});
