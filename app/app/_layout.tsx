import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Network from 'expo-network';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, LogBox } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../global.css';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { logger } from '@/src/utils/logger';
import { useSyncStore } from '@/src/store/syncStore';
import { useCloudSyncIndicatorStore } from '@/src/store/cloudSyncIndicatorStore';
import { FeedbackHost } from '@/src/components/FeedbackHost';
import { ConfirmDialogHost } from '@/src/components/ConfirmDialogHost';
import { CloudSyncMonitorHost } from '@/src/components/cloud-sync-monitor/CloudSyncMonitorHost';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { buildAppInitializationFailedFeedback } from '@/src/services/errorFeedbackPresets';
import { runAppBootstrap } from '@/src/services/appBootstrapService';
import { createCloudRecoveryRunner, handleAppStateChange } from '@/src/services/appLifecycleService';
import { useAppLifecycleStore } from '@/src/store/appLifecycleStore';
import { AppRestartingOverlay } from '@/src/components/AppRestartingOverlay';
import { useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';

LogBox.ignoreLogs([
  "SafeAreaView has been deprecated and will be removed in a future release. Please use 'react-native-safe-area-context' instead.",
]);

// 初始化 Sentry（Expo 只暴露 EXPO_PUBLIC_ 前缀的变量到客户端 JS）
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const ENABLE_CRASH_REPORTING = process.env.EXPO_PUBLIC_ENABLE_CRASH_REPORTING === 'true';

if (SENTRY_DSN && ENABLE_CRASH_REPORTING) {
  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    environment: process.env.EXPO_PUBLIC_APP_ENV || 'development',
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
  });
  logger.log('✅ Sentry 错误监控已启用');
} else {
  logger.log('ℹ️ Sentry 错误监控未启用');
}

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const refreshCloudSyncIndicator = useCallback(async (label: string) => {
    await useCloudSyncIndicatorStore.getState().refresh().catch((refreshError) => {
      logger.warn(`⚠️ ${label}刷新顶部同步状态失败:`, refreshError);
    });
  }, []);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  const needsRestart = useAppLifecycleStore((s) => s.needsRestart);
  const clearRestart = useAppLifecycleStore((s) => s.clearRestart);

  const runBootstrap = useCallback(async () => {
    await runAppBootstrap({
      refreshCloudSyncIndicator,
      onInitializationFailed: () => {
        showErrorFeedback(buildAppInitializationFailedFeedback());
      },
    });
  }, [refreshCloudSyncIndicator]);

  // 初始化文件系统和音频系统
  useEffect(() => {
    void runBootstrap();
  }, [runBootstrap]);

  // 账号切换后重跑 bootstrap
  useEffect(() => {
    if (!needsRestart) return;
    useSyncStore.setState({ isLoaded: false });
    useSettingsStore.setState({ isLoaded: false });
    useEntryStore.getState().invalidateActiveQueries();
    void runBootstrap().then(() => clearRestart());
  }, [needsRestart, runBootstrap, clearRestart]);

  // 监听 App 进入后台，触发自动备份
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const wasNetworkReachableRef = useRef<boolean | null>(null);
  const runPendingCloudRecovery = useRef(
    createCloudRecoveryRunner({ refreshCloudSyncIndicator, wasNetworkReachableRef })
  ).current;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      void handleAppStateChange(prev, nextState, runPendingCloudRecovery).catch((error) => {
        logger.error('❌ 处理 AppState 变更失败:', error);
      });
    });
    return () => subscription.remove();
  }, [runPendingCloudRecovery]);

  useEffect(() => {
    const subscription = Network.addNetworkStateListener((state) => {
      const isReachable = state.isConnected === true && state.isInternetReachable !== false;
      const wasReachable = wasNetworkReachableRef.current;
      wasNetworkReachableRef.current = isReachable;

      if (wasReachable === false && isReachable) {
        void runPendingCloudRecovery('网络恢复时');
      }
    });

    return () => subscription.remove();
  }, [runPendingCloudRecovery]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <>
      <RootLayoutNav />
      {needsRestart && <AppRestartingOverlay />}
    </>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView className="flex-1" testID="root-layout-shell">
      <SafeAreaProvider>
        <ErrorBoundary>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
              </Stack>
              <FeedbackHost />
              <ConfirmDialogHost />
              <CloudSyncMonitorHost />
            </>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
