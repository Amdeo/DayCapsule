/**
 * 应用状态slice
 */

import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface AppState {
  isFirstLaunch: boolean;
  isOnboardingCompleted: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AppState = {
  isFirstLaunch: true,
  isOnboardingCompleted: false,
  isLoading: false,
  error: null,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    // 设置首次启动状态
    setIsFirstLaunch: (state, action: PayloadAction<boolean>) => {
      state.isFirstLaunch = action.payload;
    },

    // 完成引导
    completeOnboarding: (state) => {
      state.isOnboardingCompleted = true;
      state.isFirstLaunch = false;
    },

    // 设置加载状态
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // 设置错误信息
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // 清除错误
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setIsFirstLaunch,
  completeOnboarding,
  setLoading,
  setError,
  clearError,
} = appSlice.actions;

// Selectors
export const selectIsFirstLaunch = (state: {app: AppState}) => state.app.isFirstLaunch;
export const selectIsOnboardingCompleted = (state: {app: AppState}) => state.app.isOnboardingCompleted;
export const selectIsLoading = (state: {app: AppState}) => state.app.isLoading;
export const selectError = (state: {app: AppState}) => state.app.error;

export default appSlice.reducer;