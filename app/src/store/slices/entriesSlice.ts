import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';
import {LifelogEntry, databaseService} from '@services/storage/database';

export interface EntriesState {
  items: LifelogEntry[];
  loading: boolean;
  error: string | null;
  currentEntry: LifelogEntry | null;
  syncStatus: {
    [entryId: string]: 'draft' | 'pending' | 'synced' | 'failed';
  };
  syncRetryCount: {
    [entryId: string]: number;
  };
}

const initialState: EntriesState = {
  items: [],
  loading: false,
  error: null,
  currentEntry: null,
  syncStatus: {},
  syncRetryCount: {},
};

/**
 * 异步 thunk：加载所有记录
 */
export const loadEntries = createAsyncThunk(
  'entries/loadEntries',
  async ({limit = 50, offset = 0}: {limit?: number; offset?: number}, {rejectWithValue}) => {
    try {
      const entries = await databaseService.getEntries(limit, offset);
      return entries;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * 异步 thunk：创建新记录
 */
export const createEntry = createAsyncThunk(
  'entries/createEntry',
  async (entry: Omit<LifelogEntry, 'id'>, {rejectWithValue}) => {
    try {
      const id = await databaseService.insertEntry(entry);
      return {id, ...entry};
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * 异步 thunk：更新记录
 */
export const updateEntry = createAsyncThunk(
  'entries/updateEntry',
  async (entry: LifelogEntry, {rejectWithValue}) => {
    try {
      await databaseService.updateEntry(entry);
      return entry;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * 异步 thunk：删除记录
 */
export const deleteEntry = createAsyncThunk(
  'entries/deleteEntry',
  async (entryId: string, {rejectWithValue}) => {
    try {
      await databaseService.deleteEntry(entryId);
      return entryId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * 异步 thunk：搜索记录
 */
export const searchEntries = createAsyncThunk(
  'entries/searchEntries',
  async (query: string, {rejectWithValue}) => {
    try {
      const entries = await databaseService.searchEntries(query);
      return entries;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

const entriesSlice = createSlice({
  name: 'entries',
  initialState,
  reducers: {
    setCurrentEntry: (state, action) => {
      state.currentEntry = action.payload;
    },
    setSyncStatus: (state, action) => {
      state.syncStatus[action.payload.entryId] = action.payload.status;
    },
    incrementSyncRetry: (state, action) => {
      const entryId = action.payload;
      state.syncRetryCount[entryId] = (state.syncRetryCount[entryId] || 0) + 1;
    },
    resetSyncRetry: (state, action) => {
      const entryId = action.payload;
      state.syncRetryCount[entryId] = 0;
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    // loadEntries
    builder
      .addCase(loadEntries.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(loadEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // createEntry
    builder
      .addCase(createEntry.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createEntry.fulfilled, (state, action) => {
        state.loading = false;
        const newEntry = action.payload as LifelogEntry;
        state.items.unshift(newEntry);
        state.syncStatus[newEntry.id] = 'draft';
        state.syncRetryCount[newEntry.id] = 0;
      })
      .addCase(createEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // updateEntry
    builder
      .addCase(updateEntry.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEntry.fulfilled, (state, action) => {
        state.loading = false;
        const updatedEntry = action.payload;
        const index = state.items.findIndex(item => item.id === updatedEntry.id);
        if (index !== -1) {
          state.items[index] = updatedEntry;
        }
      })
      .addCase(updateEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // deleteEntry
    builder
      .addCase(deleteEntry.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteEntry.fulfilled, (state, action) => {
        state.loading = false;
        const entryId = action.payload;
        state.items = state.items.filter(item => item.id !== entryId);
        delete state.syncStatus[entryId];
        delete state.syncRetryCount[entryId];
      })
      .addCase(deleteEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // searchEntries
    builder
      .addCase(searchEntries.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(searchEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {setCurrentEntry, setSyncStatus, incrementSyncRetry, resetSyncRetry, clearError} =
  entriesSlice.actions;

export default entriesSlice.reducer;

