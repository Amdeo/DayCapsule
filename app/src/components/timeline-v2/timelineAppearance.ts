import type { Entry } from '@/src/types/entry';

export function getTimelineEntryAccentColor(type: Entry['type']): string {
  switch (type) {
    case 'text':
      return '#A491D3';
    case 'photo':
      return '#77C9D4';
    case 'voice':
      return '#F5A623';
    default:
      return '#D1D1D1';
  }
}
