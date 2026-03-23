import { CalendarDensity } from '@/src/store/settingsStore';
import { Entry } from '@/src/types/entry';

const CALENDAR_TIMELINE_ITEM_SPACING: Record<CalendarDensity, number> = {
  comfortable: 20,
  default: 14,
  compact: 10,
};

const CALENDAR_TIMELINE_ITEM_TYPE_COLORS: Record<Entry['type'], string> = {
  text: '#A491D3',
  photo: '#77C9D4',
  voice: '#F5A623',
};

export function getCalendarTimelineItemSpacing(density: CalendarDensity) {
  return CALENDAR_TIMELINE_ITEM_SPACING[density];
}

export function getCalendarTimelineItemDotColor(type: Entry['type']) {
  return CALENDAR_TIMELINE_ITEM_TYPE_COLORS[type];
}

export function formatCalendarTimelineTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
