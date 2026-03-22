import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Network from 'expo-network';
import { useEffect, useRef } from 'react';
import { Alert, AppState, AppStateStatus, LogBox } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../global.css';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import { initializeFileSystem } from '@/src/utils/fileSystem';
import { VoiceService } from '@/src/services/voiceService';
import { initDatabase } from '@/src/database/sqlite';
import { migrateFromAsyncStorage, migrateTagsToNormalized, migrateMediaMetadataColumns, migrateToMediaJson, migrateSyncStatusColumn, migrateCloudSyncCoreColumns } from '@/src/database/migration';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { logger } from '@/src/utils/logger';
import { BackupService } from '@/src/services/backupService';
import { Storage } from '@/src/utils/storage';
import { useEntryStore } from '@/src/store/entryStore';
import { useAuthStore } from '@/src/store/authStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useSyncStore } from '@/src/store/syncStore';
import { useCloudSyncIndicatorStore } from '@/src/store/cloudSyncIndicatorStore';
import { flushPendingVoiceUploads } from '@/src/services/voiceUploadQueue';
import { flushPendingPhotoUploads } from '@/src/services/photoUploadQueue';
import { createCloudSyncService } from '@/src/services/cloudSyncService';
import { createSyncBootstrapService } from '@/src/services/syncBootstrapService';
import { FeedbackHost } from '@/src/components/FeedbackHost';

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

  const refreshCloudSyncIndicator = async (label: string) => {
    await useCloudSyncIndicatorStore.getState().refresh().catch((refreshError) => {
      logger.warn(`⚠️ ${label}刷新顶部同步状态失败:`, refreshError);
    });
  };

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // 初始化文件系统和音频系统
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 并行初始化互相独立的子系统
        await Promise.all([
          initializeFileSystem().then(() => logger.log('✅ 文件系统初始化成功')),
          VoiceService.initializeAudio().then(() => logger.log('✅ 音频系统初始化成功')),
        ]);

        // 数据库初始化（必须在迁移之前完成）
        const dbSuccess = await initDatabase();
        if (!dbSuccess) {
          throw new Error('数据库初始化失败');
        }
        logger.log('✅ SQLite 数据库初始化成功');

        // 执行数据迁移
        const migrationResult = await migrateFromAsyncStorage();
        if (migrationResult.success) {
          logger.log(`✅ 数据迁移完成，迁移了 ${migrationResult.migratedCount} 条记录`);
        } else {
          logger.warn('⚠️ 数据迁移警告:', migrationResult.error);
          Alert.alert('数据迁移警告', '部分数据可能未正确导入，但应用可以正常使用');
        }

        // Tags 规范化迁移（幂等，已迁移则跳过）
        await migrateTagsToNormalized();
        logger.log('✅ Tags 规范化迁移完成');

        // 媒体元数据列迁移（幂等，已迁移则跳过）
        await migrateMediaMetadataColumns();
        logger.log('✅ 媒体元数据列迁移完成');

        // media_json 列迁移（幂等，已迁移则跳过）
        await migrateToMediaJson();
        logger.log('✅ media_json 列迁移完成');

        // sync_status 列迁移（幂等，已迁移则跳过）
        await migrateSyncStatusColumn();
        logger.log('✅ sync_status 列迁移完成');

        // cloud sync core 列迁移（幂等，已迁移则跳过）
        await migrateCloudSyncCoreColumns();
        logger.log('✅ cloud sync core 列迁移完成');

        // 恢复登录状态
        await useAuthStore.getState().loadAuth();
        await useSyncStore.getState().load();

        // 检查 cloudMode 中断恢复
        const cloudModeRaw = await Storage.getString('settings:cloudMode');
        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        if (cloudModeRaw === 'switching') {
          logger.warn('⚠️ 检测到上次云端模式切换未完成，重置为离线模式');
          await Storage.setString('settings:cloudMode', 'false');
          Alert.alert('提示', '上次云端模式切换未完成，已恢复为离线模式。您可以在设置中重新切换。');
        } else if (cloudModeRaw === 'true' && isAuthenticated) {
          try {
            logger.log('✅ 恢复云端模式，执行本地优先同步初始化');
            const bootstrap = createSyncBootstrapService();
            const inspection = await bootstrap.inspectInitialState();
            const flow = bootstrap.buildInitialFlow(inspection);

            if (flow.type === 'restoring') {
              await bootstrap.runInitialFlow('cloud');
            } else if (flow.type === 'backing-up') {
              await bootstrap.runInitialFlow('local');
            } else if (flow.type === 'needs-decision') {
              await useSyncStore.getState().setInitialSyncState('needs-decision');
            }

            const cloudSync = createCloudSyncService();
            if (flow.type !== 'needs-decision') {
              await cloudSync.syncNow();
            }
          } catch (syncError) {
            logger.warn('⚠️ 启动时云同步失败:', syncError);
          }
        }

        await flushPendingVoiceUploads().catch((queueError) => {
          logger.warn('⚠️ 启动时补传待上传语音失败:', queueError);
        });
        await flushPendingPhotoUploads().catch((queueError) => {
          logger.warn('⚠️ 启动时补传待上传照片失败:', queueError);
        });
        await refreshCloudSyncIndicator('启动后');
      } catch (error) {
        logger.error('❌ 应用初始化失败:', error);
        Alert.alert(
          '初始化失败',
          '应用启动遇到问题，请重启应用。如果问题持续，请联系支持。',
          [{ text: '确定' }]
        );
      }
    };

    initializeApp();
  }, []);

  // 监听 App 进入后台，触发自动备份
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const wasNetworkReachableRef = useRef<boolean | null>(null);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (prev !== 'background' && nextState === 'background') {
        const [autoBackup, shouldBackup] = await Promise.all([
          Storage.getString('settings:autoBackup'),
          BackupService.shouldBackup(),
        ]);
        if (autoBackup === 'true' && shouldBackup) {
          const entries = useEntryStore.getState().entries;
          await BackupService.createBackup(entries).catch((e) =>
            logger.error('自动备份失败:', e)
          );
        }
      } else if (prev !== 'active' && nextState === 'active') {
        if (useAuthStore.getState().isAuthenticated && useSettingsStore.getState().cloudMode === true) {
          await createCloudSyncService().syncNow().catch((syncError) =>
            logger.warn('⚠️ 回到前台时 entry 云同步失败:', syncError)
          );
        }
        await flushPendingVoiceUploads().catch((queueError) =>
          logger.warn('⚠️ 回到前台时补传待上传语音失败:', queueError)
        );
        await flushPendingPhotoUploads().catch((queueError) =>
          logger.warn('⚠️ 回到前台时补传待上传照片失败:', queueError)
        );
        await refreshCloudSyncIndicator('回到前台后');
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = Network.addNetworkStateListener((state) => {
      const isReachable = state.isConnected === true && state.isInternetReachable !== false;
      const wasReachable = wasNetworkReachableRef.current;
      wasNetworkReachableRef.current = isReachable;

      if (!wasReachable && isReachable) {
        void flushPendingVoiceUploads().catch((queueError) =>
          logger.warn('⚠️ 网络恢复时补传待上传语音失败:', queueError)
        );
        void flushPendingPhotoUploads().catch((queueError) =>
          logger.warn('⚠️ 网络恢复时补传待上传照片失败:', queueError)
        );
        void refreshCloudSyncIndicator('网络恢复后');
      }
    });

    void Network.getNetworkStateAsync()
      .then((state) => {
        wasNetworkReachableRef.current =
          state.isConnected === true && state.isInternetReachable !== false;
      })
      .catch((error) => {
        logger.warn('⚠️ 初始化网络状态监听失败:', error);
      });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
              </Stack>
              <FeedbackHost />
            </>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
