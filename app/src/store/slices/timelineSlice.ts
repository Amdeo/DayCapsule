import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TimelineState, TimelineView, TimelineFilter, DateRange } from '@types/index';

// Initial state
const initialState: TimelineState = {
  currentView: TimelineView.DAY,
  currentDate: new Date(),
  filters: {},
  loading: false,
};

// Helper functions
const getDateRange = (view: TimelineView, baseDate: Date): DateRange => {
  const start = new Date(baseDate);
  const end = new Date(baseDate);

  switch (view) {
    case TimelineView.DAY:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
      
    case TimelineView.WEEK:
      const dayOfWeek = start.getDay();
      const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
      
    case TimelineView.MONTH:
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
      
    case TimelineView.YEAR:
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
};

const navigateDate = (currentDate: Date, view: TimelineView, direction: 'prev' | 'next'): Date => {
  const newDate = new Date(currentDate);
  
  switch (view) {
    case TimelineView.DAY:
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
      break;
      
    case TimelineView.WEEK:
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
      break;
      
    case TimelineView.MONTH:
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
      break;
      
    case TimelineView.YEAR:
      newDate.setFullYear(currentDate.getFullYear() + (direction === 'next' ? 1 : -1));
      break;
  }
  
  return newDate;
};

// Slice
const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    setCurrentView: (state, action: PayloadAction<TimelineView>) => {
      state.currentView = action.payload;
      // Reset filters when view changes
      state.filters = {};
    },
    
    setCurrentDate: (state, action: PayloadAction<Date>) => {
      state.currentDate = new Date(action.payload);
    },
    
    navigateToPrevious: (state) => {
      state.currentDate = navigateDate(state.currentDate, state.currentView, 'prev');
    },
    
    navigateToNext: (state) => {
      state.currentDate = navigateDate(state.currentDate, state.currentView, 'next');
    },
    
    goToToday: (state) => {
      state.currentDate = new Date();
    },
    
    setDateRange: (state, action: PayloadAction<{ start: Date; end: Date }>) => {
      state.filters.dateRange = action.payload;
    },
    
    clearDateRange: (state) => {
      delete state.filters.dateRange;
    },
    
    setTagFilters: (state, action: PayloadAction<string[]>) => {
      state.filters.tags = action.payload;
    },
    
    addTagFilter: (state, action: PayloadAction<string>) => {
      if (!state.filters.tags) {
        state.filters.tags = [];
      }
      if (!state.filters.tags.includes(action.payload)) {
        state.filters.tags.push(action.payload);
      }
    },
    
    removeTagFilter: (state, action: PayloadAction<string>) => {
      if (state.filters.tags) {
        state.filters.tags = state.filters.tags.filter(tag => tag !== action.payload);
      }
    },
    
    clearTagFilters: (state) => {
      delete state.filters.tags;
    },
    
    setMoodFilters: (state, action: PayloadAction<string[]>) => {
      state.filters.mood = action.payload;
    },
    
    addMoodFilter: (state, action: PayloadAction<string>) => {
      if (!state.filters.mood) {
        state.filters.mood = [];
      }
      if (!state.filters.mood.includes(action.payload)) {
        state.filters.mood.push(action.payload);
      }
    },
    
    removeMoodFilter: (state, action: PayloadAction<string>) => {
      if (state.filters.mood) {
        state.filters.mood = state.filters.mood.filter(mood => mood !== action.payload);
      }
    },
    
    clearMoodFilters: (state) => {
      delete state.filters.mood;
    },
    
    setLocationFilter: (state, action: PayloadAction<string>) => {
      state.filters.location = action.payload;
    },
    
    clearLocationFilter: (state) => {
      delete state.filters.location;
    },
    
    setEntryTypeFilters: (state, action: PayloadAction<string[]>) => {
      state.filters.entryType = action.payload;
    },
    
    addEntryTypeFilter: (state, action: PayloadAction<string>) => {
      if (!state.filters.entryType) {
        state.filters.entryType = [];
      }
      if (!state.filters.entryType.includes(action.payload)) {
        state.filters.entryType.push(action.payload);
      }
    },
    
    removeEntryTypeFilter: (state, action: PayloadAction<string>) => {
      if (state.filters.entryType) {
        state.filters.entryType = state.filters.entryType.filter(type => type !== action.payload);
      }
    },
    
    clearEntryTypeFilters: (state) => {
      delete state.filters.entryType;
    },
    
    clearAllFilters: (state) => {
      state.filters = {};
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    // Complex actions
    switchToDayView: (state) => {
      state.currentView = TimelineView.DAY;
      state.filters = {};
    },
    
    switchToWeekView: (state) => {
      state.currentView = TimelineView.WEEK;
      state.filters = {};
    },
    
    switchToMonthView: (state) => {
      state.currentView = TimelineView.MONTH;
      state.filters = {};
    },
    
    switchToYearView: (state) => {
      state.currentView = TimelineView.YEAR;
      state.filters = {};
    },
  },
});

export const {
  setCurrentView,
  setCurrentDate,
  navigateToPrevious,
  navigateToNext,
  goToToday,
  setDateRange,
  clearDateRange,
  setTagFilters,
  addTagFilter,
  removeTagFilter,
  clearTagFilters,
  setMoodFilters,
  addMoodFilter,
  removeMoodFilter,
  clearMoodFilters,
  setLocationFilter,
  clearLocationFilter,
  setEntryTypeFilters,
  addEntryTypeFilter,
  removeEntryTypeFilter,
  clearEntryTypeFilters,
  clearAllFilters,
  setLoading,
  switchToDayView,
  switchToWeekView,
  switchToMonthView,
  switchToYearView,
} = timelineSlice.actions;

export default timelineSlice.reducer;

// Selectors
export const selectCurrentView = (state: any) => state.timeline.currentView;
export const selectCurrentDate = (state: any) => state.timeline.currentDate;
export const selectFilters = (state: any) => state.timeline.filters;
export const selectTimelineLoading = (state: any) => state.timeline.loading;

export const selectDateRange = (state: any) => {
  const { currentView, currentDate } = state.timeline;
  return getDateRange(currentView, currentDate);
};

export const selectIsFiltered = (state: any) => {
  const filters = state.timeline.filters;
  return Object.keys(filters).length > 0;
};

export const selectHasActiveFilters = (state: any) => {
  const filters = state.timeline.filters;
  return {
    hasDateRange: !!filters.dateRange,
    hasTags: !!(filters.tags && filters.tags.length > 0),
    hasMood: !!(filters.mood && filters.mood.length > 0),
    hasLocation: !!filters.location,
    hasEntryType: !!(filters.entryType && filters.entryType.length > 0),
  };
};

export const selectFilterCount = (state: any) => {
  const filters = state.timeline.filters;
  let count = 0;
  if (filters.dateRange) count++;
  if (filters.tags) count += filters.tags.length;
  if (filters.mood) count += filters.mood.length;
  if (filters.location) count++;
  if (filters.entryType) count += filters.entryType.length;
  return count;
};

export const selectViewTitle = (state: any) => {
  const { currentView, currentDate } = state.timeline;
  const date = new Date(currentDate);
  
  switch (currentView) {
    case TimelineView.DAY:
      return date.toLocaleDateString('zh-CN', {
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      });
      
    case TimelineView.WEEK:
      const weekStart = getDateRange(currentView, date).start;
      const weekEnd = getDateRange(currentView, date).end;
      return `${weekStart.getMonth() + 1}月${weekStart.getDate()}日 - ${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日`;
      
    case TimelineView.MONTH:
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
      });
      
    case TimelineView.YEAR:
      return date.getFullYear() + '年';
      
    default:
      return '';
  }
};

// Utility functions (export for use in components)
export { getDateRange, navigateDate };
