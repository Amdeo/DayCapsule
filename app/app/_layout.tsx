import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/components/useColorScheme';
import { initializeFileSystem } from '@/src/utils/fileSystem';
import { VoiceService } from '@/src/services/voiceService';
import { initDatabase } from '@/src/database/sqlite';
import { migrateFromAsyncStorage } from '@/src/database/migration';

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
    // 初始化文件系统
    initializeFileSystem().catch((err) => {
      console.error('Failed to initialize file system:', err);
    });

    // 初始化音频系统，避免第一次播放时卡顿
    VoiceService.initializeAudio().catch((err) => {
      console.error('Failed to initialize audio:', err);
    });

    // 初始化 SQLite 数据库
    initDatabase().then((success) => {
      if (success) {
        console.log('✅ SQLite 数据库初始化成功');

        // 执行数据迁移
        migrateFromAsyncStorage().then((result) => {
          if (result.success) {
            console.log(`✅ 数据迁移完成，迁移了 ${result.migratedCount} 条记录`);
          } else {
            console.error('❌ 数据迁移失败:', result.error);
          }
        }).catch((err) => {
          console.error('❌ 数据迁移异常:', err);
        });
      } else {
        console.error('❌ SQLite 数据库初始化失败');
      }
    }).catch((err) => {
      console.error('❌ SQLite 数据库初始化异常:', err);
    });
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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
