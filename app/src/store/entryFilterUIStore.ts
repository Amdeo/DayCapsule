import { create } from 'zustand';

export interface EntryFilterState {
  searchQuery: string;
  filterType: 'all' | 'text' | 'photo' | 'voice';
  filterDateRange: 'all' | 'today' | 'week' | 'month';
  selectedTags: string[];
}

interface EntryFilterUIStore extends EntryFilterState {
  setSearchQuery: (query: string) => void;
  setFilterType: (type: EntryFilterState['filterType']) => void;
  setFilterDateRange: (range: EntryFilterState['filterDateRange']) => void;
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  applySearchFilters: (filters: {
    query?: string;
    type?: EntryFilterState['filterType'];
    dateRange?: EntryFilterState['filterDateRange'];
    tags?: string[];
  }) => void;
}

export const useEntryFilterUIStore = create<EntryFilterUIStore>((set, get) => ({
  searchQuery: '',
  filterType: 'all',
  filterDateRange: 'all',
  selectedTags: [],
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterType: (type) => set({ filterType: type }),
  setFilterDateRange: (range) => set({ filterDateRange: range }),
  toggleTag: (tag) => {
    const { selectedTags } = get();
    set({
      selectedTags: selectedTags.includes(tag)
        ? selectedTags.filter((item) => item !== tag)
        : [...selectedTags, tag],
    });
  },
  clearTags: () => set({ selectedTags: [] }),
  applySearchFilters: (filters) =>
    set((state) => ({
      searchQuery: filters.query ?? state.searchQuery,
      filterType: filters.type ?? state.filterType,
      filterDateRange: filters.dateRange ?? state.filterDateRange,
      selectedTags: filters.tags ?? state.selectedTags,
    })),
}));
