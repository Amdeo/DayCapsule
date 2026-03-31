interface UseTimelineFiltersOptions {
  searchQuery: string;
  filterType: 'all' | 'text' | 'photo' | 'voice';
  filterDateRange: 'all' | 'today' | 'week' | 'month';
  selectedTags: string[];
  setSearchQuery: (value: string) => void;
  setFilterType: (value: 'all' | 'text' | 'photo' | 'voice') => void;
  setFilterDateRange: (value: 'all' | 'today' | 'week' | 'month') => void;
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  applyFilters: () => Promise<void>;
}

export function useTimelineFilters({
  searchQuery,
  filterType,
  filterDateRange,
  selectedTags,
  setSearchQuery,
  setFilterType,
  setFilterDateRange,
  toggleTag,
  clearTags,
  applyFilters,
}: UseTimelineFiltersOptions) {
  const hasFilters = Boolean(
    searchQuery.trim() ||
      filterType !== 'all' ||
      filterDateRange !== 'all' ||
      selectedTags.length > 0,
  );

  const clearQuery = () => {
    setSearchQuery('');
    void applyFilters();
  };
  const clearType = () => {
    setFilterType('all');
    void applyFilters();
  };
  const clearDate = () => {
    setFilterDateRange('all');
    void applyFilters();
  };
  const clearTag = (tag: string) => {
    toggleTag(tag);
    void applyFilters();
  };
  const clearAll = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterDateRange('all');
    clearTags();
    void applyFilters();
  };

  return {
    hasFilters,
    clearQuery,
    clearType,
    clearDate,
    clearTag,
    clearAll,
  };
}
