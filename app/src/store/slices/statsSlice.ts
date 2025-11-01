import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {
  transcriptionStatsService,
  TranscriptionStats,
} from '@services/speechToText/transcriptionStats';

export interface StatsState {
  transcriptionStats: TranscriptionStats | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: StatsState = {
  transcriptionStats: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

/**
 * 获取转录统计信息
 */
export const fetchTranscriptionStats = createAsyncThunk(
  'stats/fetchTranscriptionStats',
  async (_, {rejectWithValue}) => {
    try {
      const stats = await transcriptionStatsService.getStats();
      return stats;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * 获取按日期范围的统计信息
 */
export const fetchTranscriptionStatsByDateRange = createAsyncThunk(
  'stats/fetchTranscriptionStatsByDateRange',
  async ({startDate, endDate}: {startDate: number; endDate: number}, {rejectWithValue}) => {
    try {
      const stats = await transcriptionStatsService.getStatsByDateRange(startDate, endDate);
      return stats;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * 获取按语言的统计信息
 */
export const fetchTranscriptionStatsByLanguage = createAsyncThunk(
  'stats/fetchTranscriptionStatsByLanguage',
  async ({language}: {language: string}, {rejectWithValue}) => {
    try {
      const stats = await transcriptionStatsService.getStatsByLanguage(language);
      return stats;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {
    clearStats: state => {
      state.transcriptionStats = null;
      state.error = null;
      state.lastUpdated = null;
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      // fetchTranscriptionStats
      .addCase(fetchTranscriptionStats.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTranscriptionStats.fulfilled, (state, action) => {
        state.loading = false;
        state.transcriptionStats = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchTranscriptionStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchTranscriptionStatsByDateRange
      .addCase(fetchTranscriptionStatsByDateRange.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTranscriptionStatsByDateRange.fulfilled, (state, action) => {
        state.loading = false;
        state.transcriptionStats = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchTranscriptionStatsByDateRange.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchTranscriptionStatsByLanguage
      .addCase(fetchTranscriptionStatsByLanguage.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTranscriptionStatsByLanguage.fulfilled, (state, action) => {
        state.loading = false;
        state.transcriptionStats = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchTranscriptionStatsByLanguage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {clearStats, clearError} = statsSlice.actions;

export default statsSlice.reducer;
