import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import slices
import entriesReducer from './slices/entriesSlice';
import timelineReducer from './slices/timelineSlice';
import searchReducer from './slices/searchSlice';
import settingsReducer from './slices/settingsSlice';
import syncReducer from './slices/syncSlice';
import appReducer from './slices/appSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['settings', 'app'], // Only persist non-sensitive data
  blacklist: ['entries', 'search', 'timeline', 'sync'], // Don't persist frequently changing data
};

// Root reducer
const rootReducer = combineReducers({
  entries: entriesReducer,
  timeline: timelineReducer,
  search: searchReducer,
  settings: settingsReducer,
  sync: syncReducer,
  app: appReducer,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/REGISTER',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/FLUSH',
        ],
      },
    }),
  devTools: __DEV__,
});

// Persistor
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks
export type AppThunk<ReturnType = void> = (
  ...args: any[]
) => Promise<ReturnType>;

export default store;
