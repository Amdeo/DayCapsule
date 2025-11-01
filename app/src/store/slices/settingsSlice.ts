import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SettingsState {
  theme: 'light' | 'dark' | 'auto';
  autoCapture: boolean;
  autoLocation: boolean;
  autoTags: boolean;
  biometricAuth: boolean;
  syncEnabled: boolean;
  storageUsed: number;
  storageLimit: number;
}

const initialState: SettingsState = {
  theme: 'auto',
  autoCapture: true,
  autoLocation: true,
  autoTags: true,
  biometricAuth: false,
  syncEnabled: false,
  storageUsed: 0,
  storageLimit: 1024 * 1024 * 1024, // 1GB
};

const SETTINGS_STORAGE_KEY = '@memorycapsule:settings';

/**
 * 从 AsyncStorage 加载设置
 */
export async function loadSettings(): Promise<Partial<SettingsState>> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return {};
}

/**
 * 保存设置到 AsyncStorage
 */
export async function saveSettings(settings: SettingsState): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
      saveSettings(state);
    },
    setAutoCapture: (state, action) => {
      state.autoCapture = action.payload;
      saveSettings(state);
    },
    setAutoLocation: (state, action) => {
      state.autoLocation = action.payload;
      saveSettings(state);
    },
    setAutoTags: (state, action) => {
      state.autoTags = action.payload;
      saveSettings(state);
    },
    setBiometricAuth: (state, action) => {
      state.biometricAuth = action.payload;
      saveSettings(state);
    },
    setSyncEnabled: (state, action) => {
      state.syncEnabled = action.payload;
      saveSettings(state);
    },
    setStorageUsed: (state, action) => {
      state.storageUsed = action.payload;
    },
    setStorageLimit: (state, action) => {
      state.storageLimit = action.payload;
      saveSettings(state);
    },
    loadSettingsSuccess: (state, action) => {
      Object.assign(state, action.payload);
    },
    resetSettings: state => {
      Object.assign(state, initialState);
      saveSettings(state);
    },
  },
});

export const {
  setTheme,
  setAutoCapture,
  setAutoLocation,
  setAutoTags,
  setBiometricAuth,
  setSyncEnabled,
  setStorageUsed,
  setStorageLimit,
  loadSettingsSuccess,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
