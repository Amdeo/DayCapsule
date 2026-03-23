import React from 'react';
import { View } from 'react-native';
import { calendarTimelineItemStyles as styles } from './CalendarTimelineItem.styles';

interface CalendarTimelineItemMarkerProps {
  color: string;
}

export function CalendarTimelineItemMarker({
  color,
}: CalendarTimelineItemMarkerProps) {
  return (
    <View style={styles.dotOuter}>
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
}
