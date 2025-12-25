import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { theme } from './theme';
import { store, persistor } from '../../store/index';
import { AppNavigator } from './navigation';
import { ErrorBoundary, FullScreenLoading } from '../../ui/components';
import { selectIsAppReady } from '../../store/slices/appSlice';
import { initializeAppIfNeeded } from '../../store/slices/appSlice';
import { initializeNetworkListener } from '../../store/slices/syncSlice';
import FlashMessage from 'react-native-flash-message';

// App Content Component
const AppContent: React.FC = () => {
  const isAppReady = useSelector(selectIsAppReady);

  useEffect(() => {
    // Initialize app if needed
    store.dispatch(initializeAppIfNeeded());
    
    // Initialize network listener
    const unsubscribe = initializeNetworkListener(store.dispatch);
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  if (!isAppReady) {
    return (
      <PaperProvider theme={theme}>
        <FullScreenLoading message="正在初始化应用..." />
        <FlashMessage position="top" />
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <StatusBar 
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <AppNavigator />
      <FlashMessage position="top" />
    </PaperProvider>
  );
};

// Main App Component
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate 
          loading={<FullScreenLoading message="正在加载..." />}
          persistor={persistor}
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            {/* <SafeAreaProvider> */}
              <AppContent />
            {/* </SafeAreaProvider> */}
          </GestureHandlerRootView>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
