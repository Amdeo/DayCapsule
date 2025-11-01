import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';
import {databaseService, LifelogEntry} from '@services/storage/database';

export type TimelineView = 'day' | 'week' | 'month' | 'year';

export interface TimelineState {
  entries: LifelogEntry[];
  currentView: TimelineView;
  selectedDate: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
}

const initialState: TimelineState = {
  entries: [],
  currentView: 'day',
  selectedDate: Date.now(),
  loading: false,
  error: null,
  hasMore: true,
  page: 0,
};

/**
 * 加载时间线数据
 */
export const loadTimelineEntries = createAsyncThunk(
  'timeline/loadEntries',
  async (
    {view, date, page = 0}: {view: TimelineView; date: number; page?: number},
    {rejectWithValue},
  ) => {
    try {
      const {startDate, endDate} = getDateRange(view, date);
      const entries = await databaseService.getEntriesByDateRange(startDate, endDate);
      return {entries, page};
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * 加载更多数据（分页）
 */
export const loadMoreEntries = createAsyncThunk(
  'timeline/loadMore',
  async (_, {getState, rejectWithValue}) => {
    try {
      const state = getState() as {timeline: TimelineState};
      const {currentView, selectedDate, page} = state.timeline;

      const {startDate, endDate} = getDateRange(currentView, selectedDate);
      const limit = 20;
      const offset = (page + 1) * limit;

      const entries = await databaseService.getEntries(limit, offset);
      return {entries, page: page + 1};
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * 根据视图类型和日期计算日期范围
 */
function getDateRange(view: TimelineView, date: number): {startDate: number; endDate: number} {
  const d = new Date(date);

  switch (view) {
    case 'day': {
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      return {startDate: start.getTime(), endDate: end.getTime()};
    }
    case 'week': {
      const dayOfWeek = d.getDay();
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dayOfWeek);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (7 - dayOfWeek));
      return {startDate: start.getTime(), endDate: end.getTime()};
    }
    case 'month': {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return {startDate: start.getTime(), endDate: end.getTime()};
    }
    case 'year': {
      const start = new Date(d.getFullYear(), 0, 1);
      const end = new Date(d.getFullYear() + 1, 0, 1);
      return {startDate: start.getTime(), endDate: end.getTime()};
    }
  }
}

const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    setView: (state, action) => {
      state.currentView = action.payload;
      state.page = 0;
      state.hasMore = true;
    },
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
      state.page = 0;
      state.hasMore = true;
    },
    clearError: state => {
      state.error = null;
    },
    resetTimeline: state => {
      state.entries = [];
      state.page = 0;
      state.hasMore = true;
      state.error = null;
    },
  },
  extraReducers: builder => {
    // loadTimelineEntries
    builder
      .addCase(loadTimelineEntries.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadTimelineEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = action.payload.entries;
        state.page = action.payload.page;
        state.hasMore = action.payload.entries.length > 0;
      })
      .addCase(loadTimelineEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // loadMoreEntries
    builder
      .addCase(loadMoreEntries.pending, state => {
        state.loading = true;
      })
      .addCase(loadMoreEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = [...state.entries, ...action.payload.entries];
        state.page = action.payload.page;
        state.hasMore = action.payload.entries.length > 0;
      })
      .addCase(loadMoreEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {setView, setSelectedDate, clearError, resetTimeline} = timelineSlice.actions;

export default timelineSlice.reducer;
