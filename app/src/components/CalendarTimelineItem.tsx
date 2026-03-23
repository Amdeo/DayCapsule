import React from 'react';
import { Text, View } from 'react-native';
import { Entry } from '@/src/types/entry';
import { CalendarDensity } from '@/src/store/settingsStore';
import { EntryCard } from './EntryCard';
import {
  getCalendarTimelineItemDotColor,
  getCalendarTimelineItemSpacing,
  formatCalendarTimelineTime,
} from './calendar-timeline-item/calendarTimelineItemHelpers';
import { CalendarTimelineItemMarker } from './calendar-timeline-item/CalendarTimelineItemMarker';
import { calendarTimelineItemStyles as styles } from './calendar-timeline-item/CalendarTimelineItem.styles';

interface CalendarTimelineItemProps {
  entry: Entry;
  density: CalendarDensity;
  onDeleteEntry?: (id: string) => void;
  onViewEntry?: (entry: Entry) => void;
  onEditEntry?: (entry: Entry) => void;
  onStopRecording?: (id: string) => void;
  isActionSheetActive?: boolean;
  onActionSheetOpen?: (id: string) => void;
}

export function CalendarTimelineItem({
  entry,
  density,
  onDeleteEntry,
  onViewEntry,
  onEditEntry,
  onStopRecording,
  isActionSheetActive = false,
  onActionSheetOpen,
}: CalendarTimelineItemProps) {
  const spacing = getCalendarTimelineItemSpacing(density);
  const dotColor = getCalendarTimelineItemDotColor(entry.type);

  return (
    <View style={[styles.container, { paddingBottom: spacing }]}>
      <CalendarTimelineItemMarker color={dotColor} />
      <View style={styles.timeWrap}>
        <Text style={[styles.timeText, { color: dotColor }]}>
          {formatCalendarTimelineTime(entry.timestamp)}
        </Text>
      </View>
      <View style={styles.cardWrap}>
        <EntryCard
          entry={entry}
          onDelete={onDeleteEntry ?? (() => {})}
          onView={onViewEntry}
          onEdit={onEditEntry}
          onStopRecording={onStopRecording}
          isActionSheetActive={isActionSheetActive}
          onActionSheetOpen={onActionSheetOpen}
          variant="calendar"
          calendarDensity={density}
          cardSpacing={0}
        />
      </View>
    </View>
  );
}
