import { useMemo } from 'react';
import { useEntryStore } from '@/src/store/entryStore';

export interface TagStatItem {
  count: number;
  tag: string;
}

export function useTagsPageController() {
  const { entries } = useEntryStore();

  const tagStats = useMemo<TagStatItem[]>(() => {
    const counts: Record<string, number> = {};

    entries.forEach((entry) => {
      (entry.tags || []).forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .sort((left, right) => right[1] - left[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [entries]);

  return {
    isEmpty: tagStats.length === 0,
    tagStats,
  };
}
