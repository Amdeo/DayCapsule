import { useMemo } from 'react';
import { useEntryStore } from '@/src/store/entryStore';
import { buildStatsSummary } from './statsPageHelpers';

export function useStatsPageController() {
  const { entries } = useEntryStore();

  const stats = useMemo(() => buildStatsSummary(entries), [entries]);

  return {
    stats,
  };
}
