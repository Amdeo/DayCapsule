import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SearchState, SearchResult } from '@types/index';
import databaseOperations from '@services/storage/databaseService';

// Async thunks
export const performSearch = createAsyncThunk(
  'search/performSearch',
  async ({ query, limit = 50 }: { query: string; limit?: number }) => {
    const results = await databaseOperations.searchEntries(query, limit);
    return { query, results };
  }
);

export const clearSearchHistory = createAsyncThunk(
  'search/clearSearchHistory',
  async () => {
    // In a real app, this might clear from persistent storage
    return [];
  }
);

// Initial state
const initialState: SearchState = {
  query: '',
  results: [],
  filters: {},
  history: [],
  loading: false,
};

// Helper functions
const addToSearchHistory = (history: string[], query: string): string[] => {
  if (!query.trim()) return history;
  
  const filtered = history.filter(item => item !== query);
  return [query, ...filtered].slice(0, 10); // Keep only last 10 searches
};

const removeFromSearchHistory = (history: string[], queryToRemove: string): string[] => {
  return history.filter(item => item !== queryToRemove);
};

// Slice
const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload;
    },
    
    clearQuery: (state) => {
      state.query = '';
    },
    
    setResults: (state, action: PayloadAction<SearchResult[]>) => {
      state.results = action.payload;
    },
    
    clearResults: (state) => {
      state.results = [];
    },
    
    setFilters: (state, action: PayloadAction<any>) => {
      state.filters = action.payload;
    },
    
    clearFilters: (state) => {
      state.filters = {};
    },
    
    addToHistory: (state, action: PayloadAction<string>) => {
      state.history = addToSearchHistory(state.history, action.payload);
    },
    
    removeFromHistory: (state, action: PayloadAction<string>) => {
      state.history = removeFromSearchHistory(state.history, action.payload);
    },
    
    clearHistory: (state) => {
      state.history = [];
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  
  extraReducers: (builder) => {
    builder
      .addCase(performSearch.pending, (state) => {
        state.loading = true;
      })
      .addCase(performSearch.fulfilled, (state, action) => {
        state.loading = false;
        state.query = action.payload.query;
        state.results = action.payload.results;
        
        // Add to history
        state.history = addToSearchHistory(state.history, action.payload.query);
      })
      .addCase(performSearch.rejected, (state, action) => {
        state.loading = false;
        console.error('Search failed:', action.error);
      })
      .addCase(clearSearchHistory.fulfilled, (state) => {
        state.history = [];
      });
  },
});

export const {
  setQuery,
  clearQuery,
  setResults,
  clearResults,
  setFilters,
  clearFilters,
  addToHistory,
  removeFromHistory,
  clearHistory,
  setLoading,
} = searchSlice.actions;

export default searchSlice.reducer;

// Selectors
export const selectSearchQuery = (state: any) => state.search.query;
export const selectSearchResults = (state: any) => state.search.results;
export const selectSearchFilters = (state: any) => state.search.filters;
export const selectSearchHistory = (state: any) => state.search.history;
export const selectSearchLoading = (state: any) => state.search.loading;
export const selectHasSearchResults = (state: any) => state.search.results.length > 0;
export const selectSearchResultsCount = (state: any) => state.search.results.length;
