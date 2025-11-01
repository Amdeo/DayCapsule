import {configureStore} from '@reduxjs/toolkit';
import {TypedUseSelectorHook, useDispatch, useSelector} from 'react-redux';

// 导入 reducers
import captureReducer from './slices/captureSlice';
import timelineReducer from './slices/timelineSlice';
import searchReducer from './slices/searchSlice';
import settingsReducer from './slices/settingsSlice';
import statsReducer from './slices/statsSlice';
import entriesReducer from './slices/entriesSlice';

export const store = configureStore({
  reducer: {
    capture: captureReducer,
    timeline: timelineReducer,
    search: searchReducer,
    settings: settingsReducer,
    stats: statsReducer,
    entries: entriesReducer,
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

// 导出类型化的 hooks
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
