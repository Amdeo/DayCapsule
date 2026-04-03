import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const mockFeedbackHost = jest.fn(() => null);
const mockCloudSyncMonitorHost = jest.fn(() => null);
const mockRunAppBootstrap = jest.fn(async () => undefined);
const mockShowErrorFeedback = jest.fn();
const mockShouldBackup = jest.fn(async () => false);
const mockCreateBackup = jest.fn(async () => undefined);
const mockIsICloudAvailable = jest.fn(() => true);
const mockUpdateRecordingDuration = jest.fn();

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

jest.mock('@expo/vector-icons', () => {
  const mockReact = require('react');
  return {
    Ionicons: ({ name }: { name?: string }) => mockReact.createElement('Text', null, name ?? 'icon'),
  };
});

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
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
  getNetworkStateAsync: jest.fn(async () => ({
    isConnected: true,
    isInternetReachable: true,
  })),
}));

jest.mock('../../global.css', () => ({}), { virtual: true });
jest.mock('react-native-css-interop', () => {
  const mockReact = require('react') as typeof import('react');
  return {
    createInteropElement: (component: unknown, props: unknown, ...children: unknown[]) =>
      mockReact.createElement(component as React.ElementType, props as Record<string, unknown> | null, ...children),
  };
});
jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native-css-interop/src/runtime/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native-reanimated', () => {
  const mockAnimated = {
    View: 'Animated.View',
  };
  const mockTransition = {
    duration: jest.fn(() => mockTransition),
    springify: jest.fn(() => mockTransition),
  };

  return {
    __esModule: true,
    default: mockAnimated,
    FadeIn: mockTransition,
    FadeOut: mockTransition,
    SlideInRight: mockTransition,
    SlideOutRight: mockTransition,
  };
});

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'GestureHandlerRootView',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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

jest.mock('@/src/components/Timeline.v2', () => ({
  Timeline: 'Timeline',
}));

jest.mock('@/src/components/Sidebar', () => ({
  Sidebar: 'Sidebar',
}));

jest.mock('@/src/components/TextEditor', () => ({
  TextEditor: 'TextEditor',
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
    shouldBackup: (...args: unknown[]) => mockShouldBackup(...args),
    createBackup: (...args: unknown[]) => mockCreateBackup(...args),
    listBackups: jest.fn().mockResolvedValue([]),
    getLastBackupTime: jest.fn().mockResolvedValue(null),
    shareBackup: jest.fn().mockResolvedValue(undefined),
    saveBackupToUserDirectory: jest.fn().mockResolvedValue({
      saved: true,
      canceled: false,
      fileName: 'latest.zip',
    }),
  },
}));

jest.mock('@/src/services/syncService', () => ({
  SyncService: {
    isICloudAvailable: (...args: unknown[]) => mockIsICloudAvailable(...args),
    pickAndParseBackup: jest.fn(),
    extractMediaFromZip: jest.fn(),
  },
}));

jest.mock('@/src/services/cloudSyncService', () => ({
  createCloudSyncService: jest.fn(() => ({
    syncNow: jest.fn(async () => undefined),
  })),
}));

jest.mock('@/src/services/voiceUploadQueue', () => ({
  enqueueVoiceUpload: jest.fn(),
  configureVoiceUploadQueueCallbacks: jest.fn(),
  flushPendingVoiceUploads: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/services/photoUploadQueue', () => ({
  enqueuePhotoUpload: jest.fn(),
  configurePhotoUploadQueueCallbacks: jest.fn(),
  flushPendingPhotoUploads: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: (...args: unknown[]) => mockShowErrorFeedback(...args),
}));

jest.mock('@/src/services/appBootstrapService', () => ({
  runAppBootstrap: (...args: unknown[]) => mockRunAppBootstrap(...args),
}));

jest.mock('@/src/services/voiceService', () => ({
  VoiceService: {
    prewarmAudioSystem: jest.fn().mockResolvedValue(undefined),
    cancelRecording: jest.fn().mockResolvedValue(undefined),
    getRecordingDuration: jest.fn(),
    startRecording: jest.fn().mockResolvedValue(undefined),
    stopRecording: jest.fn().mockResolvedValue({ uri: '', duration: 0, size: 0, mimeType: 'audio/m4a' }),
    saveVoiceToCache: jest.fn().mockResolvedValue(''),
    preloadAudio: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/src/services/photoService', () => ({
  PhotoService: {
    savePhotoToStorage: jest.fn(),
    savePhotoToCache: jest.fn(),
  },
}));

jest.mock('@/src/services/photoIntegrityService', () => ({
  buildPhotoLogPayload: jest.fn(() => ({})),
  fingerprintPhotoFile: jest.fn(),
}));

const mockUseEntryStore = jest.fn(() => ({
  entries: [{ id: 'entry-1' }],
  restoreEntries: jest.fn(),
  updateEntry: jest.fn(),
  loadEntries: jest.fn(),
  addEntry: jest.fn(),
  addLocalEntry: jest.fn(),
  deleteEntry: jest.fn(),
  updateLocalEntry: jest.fn(),
  replaceEntry: jest.fn(),
  updateRecordingStatus: jest.fn(),
  updateRecordingDuration: mockUpdateRecordingDuration,
  completeRecording: jest.fn(),
}));

const mockGetEntryState = () => ({ entries: [{ id: 'entry-1' }] });

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: Object.assign(
    (...args: unknown[]) => mockUseEntryStore(...args),
    {
      getState: mockGetEntryState,
    }
  ),
}));

jest.mock('@/src/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({ isAuthenticated: false }),
  },
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      cloudMode: true,
      loadSettings: jest.fn().mockResolvedValue(undefined),
      lastAddType: 'text',
    }),
  },
}));

jest.mock('@/src/store/commonTagsStore', () => ({
  useCommonTagsStore: {
    getState: () => ({
      loadCommonTags: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock('@/src/store/cloudSyncIndicatorStore', () => ({
  useCloudSyncIndicatorStore: {
    getState: () => ({
      refresh: jest.fn(async () => undefined),
    }),
  },
}));

jest.mock('@/src/utils/fileSystem', () => ({
  getStorageStats: jest.fn().mockResolvedValue({ totalSize: 1024 }),
  deleteFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Modal: 'Modal',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn() },
  BackHandler: { addEventListener: jest.fn(() => ({ remove: jest.fn() })), removeEventListener: jest.fn() },
  Pressable: 'Pressable',
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  Platform: { OS: 'ios', select: (obj: Record<string, unknown>) => obj.ios ?? obj.default },
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => style,
    hairlineWidth: 0.5,
    absoluteFill: {},
    absoluteFillObject: {},
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Appearance: {
    getColorScheme: jest.fn(() => 'light'),
    addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  LogBox: { ignoreLogs: jest.fn() },
}));

import RootLayout from '../../app/_layout';
import { BackupPage } from '../components/BackupPage';
import { handleAppStateChange } from '../services/appLifecycleService';

describe('runtime regression guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShouldBackup.mockResolvedValue(false);
    mockCreateBackup.mockResolvedValue(undefined);
    mockIsICloudAvailable.mockReturnValue(true);
  });

  it('keeps the app layout root shell renderable inside the gesture handler wrapper', async () => {
    const screen = render(React.createElement(RootLayout));

    await waitFor(() => {
      expect(mockRunAppBootstrap).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByTestId('root-layout-shell')).toBeTruthy();
    expect(mockFeedbackHost).toHaveBeenCalled();
  });

  it('consumes SyncService through the backup page runtime path', async () => {
    render(React.createElement(BackupPage, { visible: true, onClose: jest.fn() }));

    await waitFor(() => {
      expect(mockIsICloudAvailable).toHaveBeenCalledTimes(1);
    });
  });

  it('only checks backup throttling on background transitions', async () => {
    const runRecovery = jest.fn(async () => undefined);

    await handleAppStateChange('active', 'background', runRecovery);

    expect(mockShouldBackup).toHaveBeenCalledTimes(1);

    mockShouldBackup.mockClear();
    await handleAppStateChange('background', 'active', runRecovery);

    expect(mockShouldBackup).not.toHaveBeenCalled();
    expect(runRecovery).toHaveBeenCalledWith('回到前台时');
  });

});
