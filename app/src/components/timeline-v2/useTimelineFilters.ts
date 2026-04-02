import { showErrorFeedback } from '@/src/services/showErrorFeedback';

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
  const applyFiltersWithFeedback = () => {
    void applyFilters().catch(() => {
      showErrorFeedback({
        title: '筛选失败',
        message: '筛选结果刷新失败，请稍后重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    });
  };

  const hasFilters = Boolean(
    searchQuery.trim() ||
      filterType !== 'all' ||
      filterDateRange !== 'all' ||
      selectedTags.length > 0,
  );

  const clearQuery = () => {
    setSearchQuery('');
    applyFiltersWithFeedback();
  };
  const clearType = () => {
    setFilterType('all');
    applyFiltersWithFeedback();
  };
  const clearDate = () => {
    setFilterDateRange('all');
    applyFiltersWithFeedback();
  };
  const clearTag = (tag: string) => {
    toggleTag(tag);
    applyFiltersWithFeedback();
  };
  const clearAll = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterDateRange('all');
    clearTags();
    applyFiltersWithFeedback();
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
