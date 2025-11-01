/**
 * MemoryCapsule - 生活记录应用
 * @format
 */

import React, {useEffect} from 'react';
import {useColorScheme, StatusBar} from 'react-native';
import {Provider as ReduxProvider} from 'react-redux';
import {PaperProvider} from 'react-native-paper';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {store} from '@store/index';
import {lightTheme, darkTheme} from '@app/theme';
import {AppNavigator} from '@app/navigation';
import {initializeApp, cleanupApp} from '@app/initialization';

function App(): React.JSX.Element {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  // 初始化应用
  useEffect(() => {
    initializeApp().catch(error => {
      console.error('Failed to initialize app:', error);
    });

    // 清理资源
    return () => {
      cleanupApp().catch(error => {
        console.error('Failed to cleanup app:', error);
      });
    };
  }, []);

  return (
    <ReduxProvider store={store}>
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <StatusBar
            barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
            backgroundColor={theme.colors.background}
          />
          <AppNavigator />
        </SafeAreaProvider>
      </PaperProvider>
    </ReduxProvider>
  );
}

export default App;
