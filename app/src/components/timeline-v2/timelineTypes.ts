import type { Entry } from '@/src/types/entry';

export type ViewMode = 'list' | 'calendar';

export interface TimeSection {
  title: string;
  timestamp: number;
  data: Entry[];
}
