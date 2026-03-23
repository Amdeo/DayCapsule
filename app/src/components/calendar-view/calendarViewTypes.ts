import type { Entry } from '@/src/types/entry';

export interface CalendarDayGroup {
  dateKey: string;
  label: string;
  entries: Entry[];
}
