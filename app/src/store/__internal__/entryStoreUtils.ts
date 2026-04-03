import type { Entry, EntryFilters } from '@/src/types/entry';
import type { EntryFilterState } from '@/src/store/entryFilterUIStore';

export const buildFilters = (state: EntryFilterState): EntryFilters => {
  const filters: EntryFilters = {};
  if (state.filterType !== 'all') {
    filters.type = state.filterType as EntryFilters['type'];
  }
  if (state.filterDateRange !== 'all') {
    const now = Date.now();
    const ranges: Record<string, number> = {
      today: 86_400_000,
      week: 604_800_000,
      month: 2_592_000_000,
    };
    filters.startTime = now - (ranges[state.filterDateRange] ?? 0);
  }
  if (state.searchQuery.trim()) {
    filters.search = state.searchQuery;
  }
  if (state.selectedTags.length) {
    filters.tags = state.selectedTags;
  }
  return filters;
};

export const buildQueryKey = (state: EntryFilterState) =>
  JSON.stringify({
    query: state.searchQuery,
    type: state.filterType,
    dateRange: state.filterDateRange,
    tags: [...state.selectedTags].sort((a, b) => a.localeCompare(b)),
  });

export const mergeUniqueById = (prev: Entry[], next: Entry[]): Entry[] => {
  const seen = new Set(prev.map((entry) => entry.id));
  const uniqueNext = next.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
  return [...prev, ...uniqueNext];
};
