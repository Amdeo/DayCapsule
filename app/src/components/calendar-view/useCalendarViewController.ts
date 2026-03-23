import { useCallback, useMemo, useState } from 'react';
import type { Entry } from '@/src/types/entry';
import {
  buildCalendarDays,
  buildCalendarEntryMap,
  filterMonthEntries,
  getCalendarDateKey,
  groupCalendarEntriesByDay,
} from './calendarViewHelpers';

interface UseCalendarViewControllerOptions {
  entries: Entry[];
}

export function useCalendarViewController({
  entries,
}: UseCalendarViewControllerOptions) {
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const entryMap = useMemo(() => buildCalendarEntryMap(entries), [entries]);

  const monthEntries = useMemo(
    () => filterMonthEntries(entries, year, month),
    [entries, month, year],
  );

  const monthDayGroups = useMemo(
    () => groupCalendarEntriesByDay(monthEntries),
    [monthEntries],
  );

  const calendarDays = useMemo(() => buildCalendarDays(year, month), [month, year]);

  const todayKey = useMemo(() => getCalendarDateKey(new Date()), []);

  const selectedEntries = useMemo(
    () => (selectedKey ? entryMap[selectedKey] ?? [] : []),
    [entryMap, selectedKey],
  );

  const previousMonth = useCallback(() => {
    setSelectedKey(null);
    setCurrentDate(new Date(year, month - 1, 1));
  }, [month, year]);

  const nextMonth = useCallback(() => {
    setSelectedKey(null);
    setCurrentDate(new Date(year, month + 1, 1));
  }, [month, year]);

  const handleDayPress = useCallback(
    (day: number) => {
      const key = `${year}-${month}-${day}`;
      setSelectedKey((value) => (value === key ? null : key));
    },
    [month, year],
  );

  const clearSelection = useCallback(() => {
    setSelectedKey(null);
  }, []);

  return {
    year,
    month,
    selectedKey,
    entryMap,
    monthEntries,
    monthDayGroups,
    calendarDays,
    todayKey,
    selectedEntries,
    previousMonth,
    nextMonth,
    handleDayPress,
    clearSelection,
  };
}
