import type { Entry } from '@/src/types/entry';
import type { CalendarDayGroup } from './calendarViewTypes';

export const CALENDAR_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export const CALENDAR_TYPE_COLORS: Record<Entry['type'], string> = {
  text: '#6A89CC',
  photo: '#4ECDC4',
  voice: '#FF9F43',
};

export const getCalendarDateKey = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export const getCalendarDateLabel = (date: Date): string =>
  `${date.getMonth() + 1}月${date.getDate()}日`;

export const buildCalendarEntryMap = (entries: Entry[]): Record<string, Entry[]> => {
  const map: Record<string, Entry[]> = {};

  entries.forEach((entry) => {
    const key = getCalendarDateKey(new Date(entry.timestamp));
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(entry);
  });

  return map;
};

export const filterMonthEntries = (
  entries: Entry[],
  year: number,
  month: number
): Entry[] =>
  entries
    .filter((entry) => {
      const date = new Date(entry.timestamp);
      return date.getFullYear() === year && date.getMonth() === month;
    })
    .sort((left, right) => right.timestamp - left.timestamp);

export const groupCalendarEntriesByDay = (entries: Entry[]): CalendarDayGroup[] => {
  const groups: CalendarDayGroup[] = [];
  let currentKey = '';

  for (const entry of entries) {
    const date = new Date(entry.timestamp);
    const key = getCalendarDateKey(date);

    if (key !== currentKey) {
      groups.push({
        dateKey: key,
        label: getCalendarDateLabel(date),
        entries: [],
      });
      currentKey = key;
    }

    groups[groups.length - 1].entries.push(entry);
  }

  return groups;
};

export const buildCalendarDays = (year: number, month: number): Array<number | null> => {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: Array<number | null> = Array(firstWeekday).fill(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(day);
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
};

export const getCalendarContentTitle = (
  selectedKey: string | null,
  selectedEntryCount: number,
  monthEntryCount: number
): string => {
  if (!selectedKey) {
    return `全月 · ${monthEntryCount} 条`;
  }

  const [, month, day] = selectedKey.split('-').map(Number);
  return `${month + 1}月${day}日 · ${selectedEntryCount} 条`;
};
