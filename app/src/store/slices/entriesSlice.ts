import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { LifeLogEntry, EntriesState } from '@types/index';
import databaseOperations from '@services/storage/databaseService';

// Async thunks
export const fetchEntries = createAsyncThunk(
  'entries/fetchEntries',
  async ({ page = 0, limit = 20 }: { page?: number; limit?: number }) => {
    const entries = await databaseOperations.getEntries(page, limit);
    return entries;
  }
);

export const createEntry = createAsyncThunk(
  'entries/createEntry',
  async (entryData: Partial<LifeLogEntry>) => {
    const entry = await databaseOperations.createEntry(entryData);
    return entry;
  }
);

export const updateEntry = createAsyncThunk(
  'entries/updateEntry',
  async ({ id, updates }: { id: string; updates: Partial<LifeLogEntry> }) => {
    const entry = await databaseOperations.updateEntry(id, updates);
    return entry;
  }
);

export const deleteEntry = createAsyncThunk(
  'entries/deleteEntry',
  async (id: string) => {
    await databaseOperations.deleteEntry(id);
    return id;
  }
);

export const fetchEntriesByDateRange = createAsyncThunk(
  'entries/fetchEntriesByDateRange',
  async ({ 
    startDate, 
    endDate, 
    view 
  }: { 
    startDate: Date; 
    endDate: Date; 
    view?: any;
  }) => {
    const entries = await databaseOperations.getEntriesByDateRange(startDate, endDate, view);
    return entries;
  }
);

export const searchEntries = createAsyncThunk(
  'entries/searchEntries',
  async ({ query, limit = 50 }: { query: string; limit?: number }) => {
    const results = await databaseOperations.searchEntries(query, limit);
    return results;
  }
);

// Initial state
const initialState: EntriesState = {
  entries: [],
  loading: false,
  error: undefined,
};

// Slice
const entriesSlice = createSlice({
  name: 'entries',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = undefined;
    },
    clearEntries: (state) => {
      state.entries = [];
    },
    updateEntryInList: (state, action: PayloadAction<LifeLogEntry>) => {
      const index = state.entries.findIndex(entry => entry.id === action.payload.id);
      if (index !== -1) {
        state.entries[index] = action.payload;
      }
    },
    removeEntryFromList: (state, action: PayloadAction<string>) => {
      state.entries = state.entries.filter(entry => entry.id !== action.payload);
    },
    addEntryToList: (state, action: PayloadAction<LifeLogEntry>) => {
      state.entries.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    // Fetch entries
    builder
      .addCase(fetchEntries.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(fetchEntries.fulfilled, (state, action) => {
        state.loading = false;
        // For page 0, replace entries; for other pages, append
        if (action.meta.arg.page === 0) {
          state.entries = action.payload;
        } else {
          state.entries.push(...action.payload);
        }
      })
      .addCase(fetchEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });

    // Create entry
    builder
      .addCase(createEntry.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(createEntry.fulfilled, (state, action) => {
        state.loading = false;
        state.entries.unshift(action.payload);
      })
      .addCase(createEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });

    // Update entry
    builder
      .addCase(updateEntry.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(updateEntry.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.entries.findIndex(entry => entry.id === action.payload.id);
        if (index !== -1) {
          state.entries[index] = action.payload;
        }
      })
      .addCase(updateEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });

    // Delete entry
    builder
      .addCase(deleteEntry.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(deleteEntry.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = state.entries.filter(entry => entry.id !== action.payload);
      })
      .addCase(deleteEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });

    // Fetch entries by date range
    builder
      .addCase(fetchEntriesByDateRange.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(fetchEntriesByDateRange.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = action.payload;
      })
      .addCase(fetchEntriesByDateRange.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });

    // Search entries
    builder
      .addCase(searchEntries.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(searchEntries.fulfilled, (state, action) => {
        state.loading = false;
        // Update entries with search results
        state.entries = action.payload.map(result => result.entry);
      })
      .addCase(searchEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const {
  clearError,
  clearEntries,
  updateEntryInList,
  removeEntryFromList,
  addEntryToList,
} = entriesSlice.actions;

export default entriesSlice.reducer;

// Selectors
export const selectEntries = (state: any) => state.entries.entries;
export const selectEntriesLoading = (state: any) => state.entries.loading;
export const selectEntriesError = (state: any) => state.entries.error;

export const selectEntryById = (id: string) => (state: any) =>
  state.entries.entries.find((entry: LifeLogEntry) => entry.id === id);

export const selectEntriesByType = (type: string) => (state: any) =>
  state.entries.entries.filter((entry: LifeLogEntry) => entry.type === type);

export const selectEntriesByDateRange = (startDate: Date, endDate: Date) => (state: any) =>
  state.entries.entries.filter((entry: LifeLogEntry) => {
    const entryDate = new Date(entry.createdAt);
    return entryDate >= startDate && entryDate <= endDate;
  });

export const selectRecentEntries = (limit: number = 10) => (state: any) =>
  state.entries.entries.slice(0, limit);

export const selectEntriesByMood = (mood: string) => (state: any) =>
  state.entries.entries.filter((entry: LifeLogEntry) => entry.mood === mood);

export const selectEntriesWithTags = (tags: string[]) => (state: any) =>
  state.entries.entries.filter((entry: LifeLogEntry) =>
    tags.some(tag => entry.tags.includes(tag))
  );
