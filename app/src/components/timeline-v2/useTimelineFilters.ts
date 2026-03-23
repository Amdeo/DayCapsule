import { useCallback, useMemo } from 'react';

interface UseTimelineFiltersOptions {
  searchQuery: string;
  filterType: string;
  filterDateRange: string;
  selectedTags: string[];
  setSearchQuery: (value: string) => void;
  setFilterType: (value: string) => void;
  setFilterDateRange: (value: string) => void;
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
  const hasFilters = useMemo(
    () =>
      !!(
        searchQuery.trim() ||
        filterType !== 'all' ||
        filterDateRange !== 'all' ||
        selectedTags.length > 0
      ),
    [searchQuery, filterType, filterDateRange, selectedTags],
  );

  const clearQuery = useCallback(() => {
    setSearchQuery('');
  }, [setSearchQuery]);

  const clearType = useCallback(() => {
    setFilterType('all');
  }, [setFilterType]);

  const clearDate = useCallback(() => {
    setFilterDateRange('all');
  }, [setFilterDateRange]);

  const clearTag = useCallback(
    (tag: string) => {
      toggleTag(tag);
    },
    [toggleTag],
  );

  const clearAll = useCallback(() => {
    setSearchQuery('');
    setFilterType('all');
    setFilterDateRange('all');
    clearTags();
  }, [setSearchQuery, setFilterType, setFilterDateRange, clearTags]);

  return {
    hasFilters,
    clearQuery,
    clearType,
    clearDate,
    clearTag,
    clearAll,
  };
}
