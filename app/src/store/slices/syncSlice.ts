import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {SyncQueueItem} from '@services/sync/syncQueue';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  queueSize: number;
  queueStats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  syncErrors: Array<{
    id: string;
    error: string;
    timestamp: number;
  }>;
  syncHistory: Array<{
    timestamp: number;
    itemCount: number;
    successCount: number;
    failureCount: number;
    duration: number;
  }>;
}

const initialState: SyncState = {
  isOnline: true,
  isSyncing: false,
  lastSyncTime: null,
  queueSize: 0,
  queueStats: {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  },
  syncErrors: [],
  syncHistory: [],
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    // 设置在线状态
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },

    // 设置同步状态
    setSyncingStatus: (state, action: PayloadAction<boolean>) => {
      state.isSyncing = action.payload;
    },

    // 更新队列大小
    setQueueSize: (state, action: PayloadAction<number>) => {
      state.queueSize = action.payload;
    },

    // 更新队列统计
    setQueueStats: (
      state,
      action: PayloadAction<{
        total: number;
        pending: number;
        processing: number;
        completed: number;
        failed: number;
      }>,
    ) => {
      state.queueStats = action.payload;
    },

    // 添加同步错误
    addSyncError: (
      state,
      action: PayloadAction<{id: string; error: string}>,
    ) => {
      state.syncErrors.push({
        ...action.payload,
        timestamp: Date.now(),
      });

      // 保持最多 50 个错误
      if (state.syncErrors.length > 50) {
        state.syncErrors = state.syncErrors.slice(-50);
      }
    },

    // 清除同步错误
    clearSyncErrors: state => {
      state.syncErrors = [];
    },

    // 添加同步历史
    addSyncHistory: (
      state,
      action: PayloadAction<{
        itemCount: number;
        successCount: number;
        failureCount: number;
        duration: number;
      }>,
    ) => {
      state.syncHistory.push({
        timestamp: Date.now(),
        ...action.payload,
      });

      // 保持最多 100 条历史
      if (state.syncHistory.length > 100) {
        state.syncHistory = state.syncHistory.slice(-100);
      }

      state.lastSyncTime = Date.now();
    },

    // 清除同步历史
    clearSyncHistory: state => {
      state.syncHistory = [];
    },

    // 重置同步状态
    resetSyncState: state => {
      return initialState;
    },
  },
});

export const {
  setOnlineStatus,
  setSyncingStatus,
  setQueueSize,
  setQueueStats,
  addSyncError,
  clearSyncErrors,
  addSyncHistory,
  clearSyncHistory,
  resetSyncState,
} = syncSlice.actions;

export default syncSlice.reducer;

