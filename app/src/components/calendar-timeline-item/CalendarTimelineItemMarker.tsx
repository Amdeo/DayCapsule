import React from 'react';
import { View } from 'react-native';
import { calendarTimelineItemStyles as styles } from './CalendarTimelineItem.styles';

interface CalendarTimelineItemMarkerProps {
  color: string;
  testID?: string;
}

export function CalendarTimelineItemMarker({
  color,
  testID,
}: CalendarTimelineItemMarkerProps) {
  return (
    <View testID={testID} style={styles.dotOuter}>
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
}
