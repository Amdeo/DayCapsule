import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';
import {databaseService, LifelogEntry} from '@services/storage/database';

export interface SearchFilters {
  type?: 'photo' | 'text' | 'voice';
  tags?: string[];
  dateRange?: {
    start: number;
    end: number;
  };
  hasLocation?: boolean;
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  results: LifelogEntry[];
  loading: boolean;
  error: string | null;
  recentSearches: string[];
}

const initialState: SearchState = {
  query: '',
  filters: {},
  results: [],
  loading: false,
  error: null,
  recentSearches: [],
};

/**
 * 执行搜索
 */
export const performSearch = createAsyncThunk(
  'search/performSearch',
  async ({query, filters}: {query: string; filters?: SearchFilters}, {rejectWithValue}) => {
    try {
      let results: LifelogEntry[];

      if (query.trim()) {
        // 使用 FTS5 全文搜索
        results = await databaseService.searchEntries(query);
      } else {
        // 无查询词时，获取所有记录
        results = await databaseService.getEntries(100, 0);
      }

      // 应用过滤器
      if (filters) {
        results = applyFilters(results, filters);
      }

      return {results, query};
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * 应用过滤器
 */
function applyFilters(entries: LifelogEntry[], filters: SearchFilters): LifelogEntry[] {
  let filtered = [...entries];

  // 按类型过滤
  if (filters.type) {
    filtered = filtered.filter(entry => entry.type === filters.type);
  }

  // 按标签过滤
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(entry => filters.tags!.some(tag => entry.tags.includes(tag)));
  }

  // 按日期范围过滤
  if (filters.dateRange) {
    filtered = filtered.filter(
      entry =>
        entry.timestamp >= filters.dateRange!.start && entry.timestamp <= filters.dateRange!.end,
    );
  }

  // 按位置过滤
  if (filters.hasLocation !== undefined) {
    filtered = filtered.filter(entry => (filters.hasLocation ? !!entry.location : !entry.location));
  }

  return filtered;
}

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery: (state, action) => {
      state.query = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = action.payload;
    },
    clearFilters: state => {
      state.filters = {};
    },
    addRecentSearch: (state, action) => {
      const query = action.payload.trim();
      if (query && !state.recentSearches.includes(query)) {
        state.recentSearches = [query, ...state.recentSearches].slice(0, 10);
      }
    },
    clearRecentSearches: state => {
      state.recentSearches = [];
    },
    clearResults: state => {
      state.results = [];
      state.query = '';
      state.error = null;
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(performSearch.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(performSearch.fulfilled, (state, action) => {
        state.loading = false;
        state.results = action.payload.results;
        if (action.payload.query.trim()) {
          // 添加到最近搜索
          const query = action.payload.query.trim();
          if (!state.recentSearches.includes(query)) {
            state.recentSearches = [query, ...state.recentSearches].slice(0, 10);
          }
        }
      })
      .addCase(performSearch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setQuery,
  setFilters,
  clearFilters,
  addRecentSearch,
  clearRecentSearches,
  clearResults,
  clearError,
} = searchSlice.actions;

export default searchSlice.reducer;
