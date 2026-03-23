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
}: UseTimelineFiltersOptions) {
  const hasFilters = Boolean(
    searchQuery.trim() ||
      filterType !== 'all' ||
      filterDateRange !== 'all' ||
      selectedTags.length > 0,
  );

  const clearQuery = () => setSearchQuery('');
  const clearType = () => setFilterType('all');
  const clearDate = () => setFilterDateRange('all');
  const clearTag = (tag: string) => toggleTag(tag);
  const clearAll = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterDateRange('all');
    clearTags();
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
