import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SettingsState, UserSettings } from '@types/index';

// Default settings
const defaultSettings: UserSettings = {
  theme: 'auto',
  fontSize: 'medium',
  language: 'zh-CN',
  notifications: {
    enabled: true,
    dailyReminder: false,
    reminderTime: '09:00',
    oneYearAgoReminder: true,
  },
  privacy: {
    biometricLock: false,
    passwordLock: false,
    autoLockTimeout: 5, // 5 minutes
    encryptData: true,
  },
  backup: {
    autoBackup: false,
    backupFrequency: 'weekly',
    lastBackupAt: undefined,
  },
  permissions: {
    camera: false,
    microphone: false,
    location: false,
    photoLibrary: false,
  },
};

// Async thunks
export const updateSettings = createAsyncThunk(
  'settings/updateSettings',
  async (settings: Partial<UserSettings>) => {
    // In a real app, this would persist to storage
    // For now, we'll just return the updated settings
    return settings;
  }
);

export const loadSettings = createAsyncThunk(
  'settings/loadSettings',
  async () => {
    // In a real app, this would load from persistent storage
    // For now, return default settings
    return defaultSettings;
  }
);

export const resetSettings = createAsyncThunk(
  'settings/resetSettings',
  async () => {
    // Reset to default settings
    return defaultSettings;
  }
);

// Initial state
const initialState: SettingsState = {
  settings: defaultSettings,
  loading: false,
};

// Slice
const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'auto'>) => {
      state.settings.theme = action.payload;
    },
    
    setFontSize: (state, action: PayloadAction<'small' | 'medium' | 'large'>) => {
      state.settings.fontSize = action.payload;
    },
    
    setLanguage: (state, action: PayloadAction<'zh-CN' | 'en-US'>) => {
      state.settings.language = action.payload;
    },
    
    // Notifications
    updateNotifications: (state, action: PayloadAction<Partial<UserSettings['notifications']>>) => {
      state.settings.notifications = {
        ...state.settings.notifications,
        ...action.payload,
      };
    },
    
    setNotificationEnabled: (state, action: PayloadAction<boolean>) => {
      state.settings.notifications.enabled = action.payload;
    },
    
    setDailyReminder: (state, action: PayloadAction<boolean>) => {
      state.settings.notifications.dailyReminder = action.payload;
    },
    
    setReminderTime: (state, action: PayloadAction<string>) => {
      state.settings.notifications.reminderTime = action.payload;
    },
    
    setOneYearAgoReminder: (state, action: PayloadAction<boolean>) => {
      state.settings.notifications.oneYearAgoReminder = action.payload;
    },
    
    // Privacy
    updatePrivacy: (state, action: PayloadAction<Partial<UserSettings['privacy']>>) => {
      state.settings.privacy = {
        ...state.settings.privacy,
        ...action.payload,
      };
    },
    
    setBiometricLock: (state, action: PayloadAction<boolean>) => {
      state.settings.privacy.biometricLock = action.payload;
    },
    
    setPasswordLock: (state, action: PayloadAction<boolean>) => {
      state.settings.privacy.passwordLock = action.payload;
    },
    
    setAutoLockTimeout: (state, action: PayloadAction<number>) => {
      state.settings.privacy.autoLockTimeout = action.payload;
    },
    
    setEncryptData: (state, action: PayloadAction<boolean>) => {
      state.settings.privacy.encryptData = action.payload;
    },
    
    // Backup
    updateBackup: (state, action: PayloadAction<Partial<UserSettings['backup']>>) => {
      state.settings.backup = {
        ...state.settings.backup,
        ...action.payload,
      };
    },
    
    setAutoBackup: (state, action: PayloadAction<boolean>) => {
      state.settings.backup.autoBackup = action.payload;
    },
    
    setBackupFrequency: (state, action: PayloadAction<'daily' | 'weekly' | 'monthly'>) => {
      state.settings.backup.backupFrequency = action.payload;
    },
    
    setLastBackupAt: (state, action: PayloadAction<Date | undefined>) => {
      state.settings.backup.lastBackupAt = action.payload;
    },
    
    // Permissions
    updatePermissions: (state, action: PayloadAction<Partial<UserSettings['permissions']>>) => {
      state.settings.permissions = {
        ...state.settings.permissions,
        ...action.payload,
      };
    },
    
    setCameraPermission: (state, action: PayloadAction<boolean>) => {
      state.settings.permissions.camera = action.payload;
    },
    
    setMicrophonePermission: (state, action: PayloadAction<boolean>) => {
      state.settings.permissions.microphone = action.payload;
    },
    
    setLocationPermission: (state, action: PayloadAction<boolean>) => {
      state.settings.permissions.location = action.payload;
    },
    
    setPhotoLibraryPermission: (state, action: PayloadAction<boolean>) => {
      state.settings.permissions.photoLibrary = action.payload;
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  
  extraReducers: (builder) => {
    builder
      .addCase(loadSettings.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(loadSettings.rejected, (state) => {
        state.loading = false;
        // Keep default settings on error
      })
      .addCase(updateSettings.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = {
          ...state.settings,
          ...action.payload,
        };
      })
      .addCase(updateSettings.rejected, (state) => {
        state.loading = false;
      })
      .addCase(resetSettings.fulfilled, (state) => {
        state.settings = defaultSettings;
      });
  },
});

export const {
  setTheme,
  setFontSize,
  setLanguage,
  updateNotifications,
  setNotificationEnabled,
  setDailyReminder,
  setReminderTime,
  setOneYearAgoReminder,
  updatePrivacy,
  setBiometricLock,
  setPasswordLock,
  setAutoLockTimeout,
  setEncryptData,
  updateBackup,
  setAutoBackup,
  setBackupFrequency,
  setLastBackupAt,
  updatePermissions,
  setCameraPermission,
  setMicrophonePermission,
  setLocationPermission,
  setPhotoLibraryPermission,
  setLoading,
} = settingsSlice.actions;

export default settingsSlice.reducer;

// Selectors
export const selectSettings = (state: any) => state.settings.settings;
export const selectSettingsLoading = (state: any) => state.settings.loading;
export const selectTheme = (state: any) => state.settings.settings.theme;
export const selectFontSize = (state: any) => state.settings.settings.fontSize;
export const selectLanguage = (state: any) => state.settings.settings.language;
export const selectNotifications = (state: any) => state.settings.settings.notifications;
export const selectPrivacy = (state: any) => state.settings.settings.privacy;
export const selectBackup = (state: any) => state.settings.settings.backup;
export const selectPermissions = (state: any) => state.settings.settings.permissions;

// Computed selectors
export const selectIsDarkMode = (state: any) => {
  const theme = state.settings.settings.theme;
  if (theme === 'auto') {
    // In a real app, this would check system theme
    return false;
  }
  return theme === 'dark';
};

export const selectIsLocked = (state: any) => {
  return state.settings.settings.privacy.biometricLock || 
         state.settings.settings.privacy.passwordLock;
};

export const selectHasAnyPermission = (state: any) => {
  const permissions = state.settings.settings.permissions;
  return permissions.camera || permissions.microphone || 
         permissions.location || permissions.photoLibrary;
};

export const selectMissingPermissions = (state: any) => {
  const permissions = state.settings.settings.permissions;
  const missing: string[] = [];
  
  if (!permissions.camera) missing.push('camera');
  if (!permissions.microphone) missing.push('microphone');
  if (!permissions.location) missing.push('location');
  if (!permissions.photoLibrary) missing.push('photoLibrary');
  
  return missing;
};
