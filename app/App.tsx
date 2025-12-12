/**
 * MemoryCapsule - 生活记录应用
 * 简化版本：单一页面，所有功能整合在一起
 * @format
 */

import React from 'react';
import {StatusBar} from 'react-native';
import {Provider as ReduxProvider} from 'react-redux';
import {PaperProvider} from 'react-native-paper';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {ErrorBoundary} from '@ui/ErrorBoundary';
import {lightTheme} from './src/app/theme';

import {store} from '@store/index';
import TimelineScreen from '@features/timeline/screens/TimelineScreen';

function App(): React.JSX.Element {

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <React.StrictMode>
        <ErrorBoundary>
          <ReduxProvider store={store}>
            <PaperProvider theme={lightTheme}>
              <StatusBar
                barStyle="dark-content"
                backgroundColor={lightTheme.colors.background}
              />
              <TimelineScreen />
            </PaperProvider>
          </ReduxProvider>
        </ErrorBoundary>
      </React.StrictMode>
    </GestureHandlerRootView>
  );
}

export default App;
