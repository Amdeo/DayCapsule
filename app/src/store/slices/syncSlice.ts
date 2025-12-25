import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SyncState, SyncQueueItem } from '@types/index';
import NetInfo from '@react-native-community/netinfo';

// Async thunks
export const addToSyncQueue = createAsyncThunk(
  'sync/addToQueue',
  async (item: Omit<SyncQueueItem, 'id' | 'createdAt'>) => {
    // In a real app, this would persist to database
    const queueItem: SyncQueueItem = {
      ...item,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    return queueItem;
  }
);

export const processSyncQueue = createAsyncThunk(
  'sync/processQueue',
  async (_, { getState }) => {
    const state = getState() as any;
    const { sync } = state;
    
    // Process items in queue
    const results = await Promise.allSettled(
      sync.queue.map(async (item: SyncQueueItem) => {
        // Simulate sync operation
        console.log(`Syncing ${item.operation} for entry ${item.entryId}`);
        
        // In a real app, this would call the actual sync API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return item.id;
      })
    );
    
    return results.map((result, index) => ({
      id: sync.queue[index].id,
      success: result.status === 'fulfilled',
      error: result.status === 'rejected' ? result.reason : undefined,
    }));
  }
);

export const clearSyncQueue = createAsyncThunk(
  'sync/clearQueue',
  async () => {
    // Clear all items from sync queue
    return [];
  }
);

export const removeSyncItem = createAsyncThunk(
  'sync/removeItem',
  async (id: string) => {
    return id;
  }
);

// Initial state
const initialState: SyncState = {
  queue: [],
  isOnline: true,
  lastSyncAt: undefined,
  loading: false,
};

// Helper functions
const shouldRetry = (item: SyncQueueItem): boolean => {
  return item.retryCount < 5; // Max 5 retries
};

const calculateBackoffDelay = (retryCount: number): number => {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s
  return Math.pow(2, retryCount) * 1000;
};

// Slice
const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    
    updateNetworkStatus: (state, action: PayloadAction<any>) => {
      state.isOnline = action.payload.isConnected;
    },
    
    setLastSyncAt: (state, action: PayloadAction<Date | undefined>) => {
      state.lastSyncAt = action.payload;
    },
    
    incrementRetryCount: (state, action: PayloadAction<string>) => {
      const item = state.queue.find(item => item.id === action.payload);
      if (item) {
        item.retryCount += 1;
        item.lastAttemptAt = new Date();
      }
    },
    
    removeFailedItems: (state) => {
      state.queue = state.queue.filter(item => shouldRetry(item));
    },
    
    clearCompletedItems: (state) => {
      // Remove successfully synced items (in real app, they'd be marked as completed)
      state.queue = state.queue.filter(item => !shouldRetry(item));
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    // Manual sync triggers
    triggerManualSync: (state) => {
      // This would trigger a manual sync process
      state.loading = true;
    },
    
    // Queue management
    addItemToQueue: (state, action: PayloadAction<SyncQueueItem>) => {
      const existingIndex = state.queue.findIndex(item => item.id === action.payload.id);
      if (existingIndex !== -1) {
        state.queue[existingIndex] = action.payload;
      } else {
        state.queue.push(action.payload);
      }
    },
    
    updateQueueItem: (state, action: PayloadAction<{ id: string; updates: Partial<SyncQueueItem> }>) => {
      const { id, updates } = action.payload;
      const item = state.queue.find(item => item.id === id);
      if (item) {
        Object.assign(item, updates);
      }
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Add to queue
      .addCase(addToSyncQueue.fulfilled, (state, action) => {
        state.queue.push(action.payload);
      })
      
      // Process queue
      .addCase(processSyncQueue.pending, (state) => {
        state.loading = true;
      })
      .addCase(processSyncQueue.fulfilled, (state, action) => {
        state.loading = false;
        state.lastSyncAt = new Date();
        
        // Update queue based on results
        const processedIds = action.payload.map(result => result.id);
        state.queue = state.queue.filter(item => !processedIds.includes(item.id));
        
        // Handle failed items
        const failedItems = action.payload.filter(result => !result.success);
        failedItems.forEach(result => {
          const item = state.queue.find(item => item.id === result.id);
          if (item && shouldRetry(item)) {
            item.retryCount += 1;
            item.lastAttemptAt = new Date();
          }
        });
      })
      .addCase(processSyncQueue.rejected, (state) => {
        state.loading = false;
      })
      
      // Clear queue
      .addCase(clearSyncQueue.fulfilled, (state) => {
        state.queue = [];
      })
      
      // Remove item
      .addCase(removeSyncItem.fulfilled, (state, action) => {
        state.queue = state.queue.filter(item => item.id !== action.payload);
      });
  },
});

export const {
  setOnlineStatus,
  updateNetworkStatus,
  setLastSyncAt,
  incrementRetryCount,
  removeFailedItems,
  clearCompletedItems,
  setLoading,
  triggerManualSync,
  addItemToQueue,
  updateQueueItem,
} = syncSlice.actions;

export default syncSlice.reducer;

// Selectors
export const selectSyncQueue = (state: any) => state.sync.queue;
export const selectIsOnline = (state: any) => state.sync.isOnline;
export const selectLastSyncAt = (state: any) => state.sync.lastSyncAt;
export const selectSyncLoading = (state: any) => state.sync.loading;
export const selectQueueLength = (state: any) => state.sync.queue.length;

// Computed selectors
export const selectPendingItems = (state: any) => 
  state.sync.queue.filter((item: SyncQueueItem) => item.retryCount === 0);

export const selectRetryingItems = (state: any) => 
  state.sync.queue.filter((item: SyncQueueItem) => item.retryCount > 0);

export const selectFailedItems = (state: any) => 
  state.sync.queue.filter((item: SyncQueueItem) => !shouldRetry(item));

export const selectItemsByOperation = (operation: 'create' | 'update' | 'delete') => (state: any) =>
  state.sync.queue.filter((item: SyncQueueItem) => item.operation === operation);

export const selectSyncProgress = (state: any) => {
  const total = state.sync.queue.length;
  const completed = total - selectPendingItems(state).length;
  return total > 0 ? (completed / total) * 100 : 0;
};

export const selectShouldAutoSync = (state: any) => {
  return state.sync.isOnline && state.sync.queue.length > 0;
};

// Network status helper
export const initializeNetworkListener = (dispatch: any) => {
  return NetInfo.addEventListener(state => {
    dispatch(updateNetworkStatus({
      isConnected: !!state.isConnected,
      type: state.type,
      isInternetReachable: state.isInternetReachable,
    }));
  });
};
