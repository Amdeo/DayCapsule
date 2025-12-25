import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AppReducerState } from '@types/index';
import databaseService from '@services/storage/database';

// Async thunks
export const initializeApp = createAsyncThunk(
  'app/initializeApp',
  async () => {
    try {
      // Initialize database
      await databaseService.initialize();
      
      // Load initial data, check permissions, etc.
      // This is where you'd do other app initialization tasks
      
      return {
        isInitialized: true,
        version: '1.0.0',
      };
    } catch (error) {
      console.error('App initialization failed:', error);
      throw error;
    }
  }
);

export const lockApp = createAsyncThunk(
  'app/lockApp',
  async () => {
    // In a real app, this would trigger biometric or password authentication
    return true;
  }
);

export const unlockApp = createAsyncThunk(
  'app/unlockApp',
  async (credentials: { biometric?: boolean; password?: string }) => {
    // In a real app, this would verify credentials
    if (credentials.biometric) {
      // Verify biometric
      return true;
    } else if (credentials.password) {
      // Verify password
      return true;
    }
    return false;
  }
);

export const updateLastActivity = createAsyncThunk(
  'app/updateLastActivity',
  async () => {
    return new Date();
  }
);

// Initial state
const initialState: AppReducerState = {
  isInitialized: false,
  isLocked: false,
  version: '1.0.0',
  error: undefined,
};

// Slice
const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    
    setLocked: (state, action: PayloadAction<boolean>) => {
      state.isLocked = action.payload;
    },
    
    setVersion: (state, action: PayloadAction<string>) => {
      state.version = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | undefined>) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = undefined;
    },
    
    updateLastActivity: (state, action: PayloadAction<Date>) => {
      state.lastActivityAt = action.payload;
    },
    
    // App state actions
    setAppState: (state, action: PayloadAction<'active' | 'background' | 'inactive'>) => {
      // Handle app state changes
      // In a real app, you might want to auto-lock after certain time in background
    },
    
    resetApp: (state) => {
      // Reset to initial state
      return initialState;
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Initialize app
      .addCase(initializeApp.pending, (state) => {
        state.error = undefined;
      })
      .addCase(initializeApp.fulfilled, (state, action) => {
        state.isInitialized = action.payload.isInitialized;
        state.version = action.payload.version;
      })
      .addCase(initializeApp.rejected, (state, action) => {
        state.error = action.error.message;
        state.isInitialized = false;
      })
      
      // Lock app
      .addCase(lockApp.fulfilled, (state) => {
        state.isLocked = true;
      })
      
      // Unlock app
      .addCase(unlockApp.fulfilled, (state, action) => {
        if (action.payload) {
          state.isLocked = false;
        }
      })
      .addCase(unlockApp.rejected, (state) => {
        state.error = '解锁失败';
      })
      
      // Update last activity
      .addCase(updateLastActivity.fulfilled, (state, action) => {
        state.lastActivityAt = action.payload;
      });
  },
});

export const {
  setInitialized,
  setLocked,
  setVersion,
  setError,
  clearError,
  updateLastActivity,
  setAppState,
  resetApp,
} = appSlice.actions;

export default appSlice.reducer;

// Selectors
export const selectIsInitialized = (state: any) => state.app.isInitialized;
export const selectIsLocked = (state: any) => state.app.isLocked;
export const selectAppVersion = (state: any) => state.app.version;
export const selectAppError = (state: any) => state.app.error;
export const selectLastActivityAt = (state: any) => state.app.lastActivityAt;

// Computed selectors
export const selectIsAppReady = (state: any) => 
  state.app.isInitialized && !state.app.isLocked;

export const selectShouldShowLockScreen = (state: any) => 
  state.app.isInitialized && state.app.isLocked;

export const selectAppStatus = (state: any) => {
  if (!state.app.isInitialized) return 'initializing';
  if (state.app.isLocked) return 'locked';
  return 'active';
};

export const selectTimeSinceLastActivity = (state: any) => {
  if (!state.app.lastActivityAt) return 0;
  
  const now = new Date();
  const lastActivity = new Date(state.app.lastActivityAt);
  const diffInMinutes = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60));
  
  return diffInMinutes;
};

export const selectShouldAutoLock = (state: any) => {
  // Check if enough time has passed to trigger auto-lock
  const minutesSinceLastActivity = selectTimeSinceLastActivity(state);
  // In a real app, this would use the settings to determine timeout
  return minutesSinceLastActivity >= 5; // 5 minutes for demo
};

// App initialization helper
export const initializeAppIfNeeded = () => async (dispatch: any, getState: any) => {
  const state = getState();
  
  if (!selectIsInitialized(state)) {
    try {
      await dispatch(initializeApp()).unwrap();
      console.log('App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }
};

// Auto-lock timer
export const startAutoLockTimer = (timeoutMinutes: number = 5) => {
  return (dispatch: any, getState: any) => {
    const timeout = timeoutMinutes * 60 * 1000; // Convert to milliseconds
    
    const timer = setTimeout(() => {
      const state = getState();
      const shouldLock = selectShouldAutoLock(state);
      
      if (shouldLock) {
        dispatch(lockApp());
      }
    }, timeout);
    
    return () => clearTimeout(timer);
  };
};
