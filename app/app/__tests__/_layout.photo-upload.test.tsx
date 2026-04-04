import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';

let appStateListener: ((state: 'active' | 'background' | 'inactive') => void | Promise<void>) | null = null;
let networkListener: ((state: { isConnected: boolean; isInternetReachable: boolean | null }) => void) | null = null;
let lastAppStateRemove: jest.Mock | null = null;
let lastNetworkRemove: jest.Mock | null = null;

const mockFeedbackHost = jest.fn(() => null);
const mockCloudSyncMonitorHost = jest.fn(() => null);
const mockShowErrorFeedback = jest.fn();
const mockRunAppBootstrap = jest.fn(async () => undefined);
const mockRunPendingCloudRecovery = jest.fn(async () => undefined);
const mockHandleAppStateChange = jest.fn(async () => undefined);
const mockCreateCloudRecoveryRunner = jest.fn(
  ({ wasNetworkReachableRef }: { wasNetworkReachableRef?: { current: boolean | null } }) => {
    void wasNetworkReachableRef;
    return mockRunPendingCloudRecovery;
  }
);

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

jest.mock('@react-navigation/native', () => ({
  DarkTheme: {},
  DefaultTheme: {},
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

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

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'GestureHandlerRootView',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@/src/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/src/components/FeedbackHost', () => ({
  FeedbackHost: () => mockFeedbackHost(),
}));

jest.mock('@/src/components/cloud-sync-monitor/CloudSyncMonitorHost', () => ({
  CloudSyncMonitorHost: () => mockCloudSyncMonitorHost(),
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

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: {
    getState: () => ({ entries: [] }),
  },
}));

jest.mock('@/src/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      isAuthenticated: false,
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
    getState: jest.fn(() => ({ load: jest.fn(), isLoaded: true })),
    setState: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock('@/src/store/appLifecycleStore', () => ({
  useAppLifecycleStore: Object.assign(
    jest.fn((selector?: Function) => {
      const state = { needsRestart: false, triggerRestart: jest.fn(), clearRestart: jest.fn() };
      return selector ? selector(state) : state;
    }),
    {
      getState: jest.fn(() => ({ needsRestart: false, triggerRestart: jest.fn(), clearRestart: jest.fn() })),
      setState: jest.fn(),
    }
  ),
}));

jest.mock('@/src/store/cloudSyncIndicatorStore', () => ({
  useCloudSyncIndicatorStore: {
    getState: () => ({
      init: jest.fn(),
      refresh: jest.fn(async () => undefined),
      setNetworkReachable: jest.fn(),
    }),
  },
}));

jest.mock('@/src/services/voiceUploadQueue', () => ({
  flushPendingVoiceUploads: jest.fn(async () => undefined),
}));

jest.mock('@/src/services/photoUploadQueue', () => ({
  flushPendingPhotoUploads: jest.fn(async () => undefined),
}));

jest.mock('@/src/services/cloudSyncService', () => ({
  createCloudSyncService: jest.fn(() => ({
    syncNow: jest.fn(async () => undefined),
  })),
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: (...args: unknown[]) => mockShowErrorFeedback(...args),
}));

jest.mock('@/src/services/appBootstrapService', () => ({
  runAppBootstrap: (...args: unknown[]) => mockRunAppBootstrap(...args),
}));

jest.mock('@/src/services/appLifecycleService', () => ({
  createCloudRecoveryRunner: (...args: unknown[]) => mockCreateCloudRecoveryRunner(...args),
  handleAppStateChange: (...args: unknown[]) => mockHandleAppStateChange(...args),
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
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => style,
    hairlineWidth: 0.5,
    absoluteFill: {},
    absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  },
}));

import RootLayout from '../_layout';

describe('RootLayout bootstrap delegation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appStateListener = null;
    networkListener = null;
    lastAppStateRemove = null;
    lastNetworkRemove = null;
    mockRunPendingCloudRecovery.mockResolvedValue(undefined);
    mockHandleAppStateChange.mockResolvedValue(undefined);
  });

  it('delegates app bootstrap to the bootstrap service', async () => {
    const screen = render(<RootLayout />);

    await waitFor(() => {
      expect(mockRunAppBootstrap).toHaveBeenCalledTimes(1);
    });

    expect(mockFeedbackHost).toHaveBeenCalled();
    expect(mockCloudSyncMonitorHost).toHaveBeenCalled();
    expect(screen.getByTestId('root-layout-shell')).toBeTruthy();
    expect(mockRunAppBootstrap).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshCloudSyncIndicator: expect.any(Function),
        onInitializationFailed: expect.any(Function),
      })
    );
  });

  it('shows branded feedback when bootstrap reports initialization failure', async () => {
    mockRunAppBootstrap.mockImplementationOnce(async (deps: { onInitializationFailed: () => void }) => {
      deps.onInitializationFailed();
    });

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockShowErrorFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '初始化失败',
          dedupeKey: 'app-initialization-failed',
        })
      );
    });

  });

  it('removes the AppState subscription when RootLayout unmounts', async () => {
    const screen = render(<RootLayout />);

    await waitFor(() => {
      expect(lastAppStateRemove).toBeTruthy();
    });

    const appStateRemove = lastAppStateRemove;
    screen.unmount();

    expect(appStateRemove).toBeDefined();
    expect(appStateRemove).toHaveBeenCalledTimes(1);
  });

  it('removes the network subscription when RootLayout unmounts', async () => {
    const screen = render(<RootLayout />);

    await waitFor(() => {
      expect(lastNetworkRemove).toBeTruthy();
    });

    const networkRemove = lastNetworkRemove;
    screen.unmount();

    expect(networkRemove).toBeDefined();
    expect(networkRemove).toHaveBeenCalledTimes(1);
  });

  it('does not trigger network recovery when the previous reachability is still unknown', async () => {
    render(<RootLayout />);

    await waitFor(() => {
      expect(networkListener).toBeTruthy();
    });

    act(() => {
      networkListener?.({ isConnected: true, isInternetReachable: true });
    });

    expect(mockRunPendingCloudRecovery).not.toHaveBeenCalled();
  });

  it('logs and swallows AppState listener failures from lifecycle handling', async () => {
    const { logger } = jest.requireMock('@/src/utils/logger') as {
      logger: { error: jest.Mock };
    };
    const lifecycleError = new Error('lifecycle failed');
    mockHandleAppStateChange.mockRejectedValueOnce(lifecycleError);

    render(<RootLayout />);

    await waitFor(() => {
      expect(appStateListener).toBeTruthy();
    });

    await expect(
      act(async () => {
        await appStateListener?.('background');
      })
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith('❌ 处理 AppState 变更失败:', lifecycleError);
  });
});
