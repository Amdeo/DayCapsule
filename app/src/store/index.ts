import {configureStore} from '@reduxjs/toolkit';

// 导入 reducers
import appReducer from './slices/appSlice';
import notificationsReducer from './slices/notificationsSlice';
import captureReducer from './slices/captureSlice';
import timelineReducer from './slices/timelineSlice';
import searchReducer from './slices/searchSlice';
import settingsReducer from './slices/settingsSlice';
import statsReducer from './slices/statsSlice';
import entriesReducer from './slices/entriesSlice';
import syncReducer from './slices/syncSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    notifications: notificationsReducer,
    capture: captureReducer,
    timeline: timelineReducer,
    search: searchReducer,
    settings: settingsReducer,
    stats: statsReducer,
    entries: entriesReducer,
    sync: syncReducer,
  },
  middleware: (getDefaultMiddleware: any) =>
    getDefaultMiddleware({
      serializableCheck: {
        // 忽略这些 action types 的序列化检查
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

// 导出类型
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
