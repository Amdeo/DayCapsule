import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import 'react-native-reanimated';
import '../global.css';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import { initializeFileSystem } from '@/src/utils/fileSystem';
import { VoiceService } from '@/src/services/voiceService';
import { initDatabase } from '@/src/database/sqlite';
import { migrateFromAsyncStorage, migrateTagsToNormalized } from '@/src/database/migration';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { logger } from '@/src/utils/logger';
import { BackupService } from '@/src/services/backupService';
import { Storage } from '@/src/utils/storage';
import { useEntryStore } from '@/src/store/entryStore';

// 初始化 Sentry（Expo 只暴露 EXPO_PUBLIC_ 前缀的变量到客户端 JS）
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const ENABLE_CRASH_REPORTING = process.env.EXPO_PUBLIC_ENABLE_CRASH_REPORTING === 'true';

if (SENTRY_DSN && ENABLE_CRASH_REPORTING) {
  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    environment: process.env.APP_ENV || 'development',
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
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (prev !== 'background' && nextState === 'background') {
        const autoBackup = await Storage.getString('settings:autoBackup');
        if (autoBackup === 'true' && BackupService.shouldBackup()) {
          const entries = useEntryStore.getState().entries;
          await BackupService.createBackup(entries).catch((e) =>
            logger.error('自动备份失败:', e)
          );
        }
      }
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
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
