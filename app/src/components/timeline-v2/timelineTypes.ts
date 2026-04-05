import type { Entry } from '@/src/types/entry';

export type ViewMode = 'timeline' | 'card' | 'calendar';

export interface TimeSection {
  title: string;
  timestamp: number;
  data: Entry[];
}
