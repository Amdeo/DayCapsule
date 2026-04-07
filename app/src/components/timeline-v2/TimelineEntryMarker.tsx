import React from 'react';
import { Text, View } from 'react-native';
import type { Entry } from '@/src/types/entry';
import { formatHHMM } from '@/src/utils/timeUtils';
import { EntryCard } from '@/src/components/EntryCard';
import {
  TIMELINE_CONTENT_PADDING_LEFT,
  TIMELINE_DOT_LEFT,
} from '@/src/components/timelineGeometry';
import { getTimelineEntryAccentColor } from './timelineAppearance';

interface TimelineEntryMarkerProps {
  entry: Entry;
  onDeleteEntry: (id: string) => void | Promise<void>;
  onViewEntry?: (entry: Entry) => void;
  onEditEntry?: (entry: Entry) => void;
  onStopRecording?: (id: string) => void;
  isActionSheetActive: boolean;
  onActionSheetOpen: (id: string) => void;
  isLast: boolean;
  cardSpacing: number;
  enterDelay?: number;
  showTimelineDecorations?: boolean;
}

const dotStyle = {
  position: 'absolute' as const,
  left: TIMELINE_DOT_LEFT,
  top: 2,
  width: 16,
  height: 16,
  borderRadius: 8,
  borderWidth: 2,
  borderColor: '#FFFFFF',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
  zIndex: 2,
};

const timeRowStyle = {
  marginBottom: 8,
  height: 20,
  justifyContent: 'center' as const,
};

const timeTextStyle = {
  fontSize: 12,
  fontWeight: '500' as const,
  lineHeight: 16,
};

export const TimelineEntryMarker = React.memo(function TimelineEntryMarker({
  entry,
  onDeleteEntry,
  onViewEntry,
  onEditEntry,
  onStopRecording,
  isActionSheetActive,
  onActionSheetOpen,
  isLast,
  cardSpacing,
  enterDelay = 0,
  showTimelineDecorations = true,
}: TimelineEntryMarkerProps) {
  const accentColor = getTimelineEntryAccentColor(entry.type);

  return (
    <View
      testID={`timeline-entry-marker-${entry.id}`}
      style={{
        paddingLeft: showTimelineDecorations ? TIMELINE_CONTENT_PADDING_LEFT : 16,
        paddingRight: 24,
        paddingBottom: isLast ? 0 : cardSpacing,
        position: 'relative',
      }}
    >
      {showTimelineDecorations && (
        <View
          testID={`timeline-entry-marker-dot-${entry.id}`}
          style={[dotStyle, { backgroundColor: accentColor }]}
        />
      )}

      {showTimelineDecorations && (
        <View style={timeRowStyle}>
          <Text style={[timeTextStyle, { color: accentColor }]}>
            {formatHHMM(entry.timestamp)}
          </Text>
        </View>
      )}

      <EntryCard
        entry={entry}
        onDelete={onDeleteEntry}
        onView={onViewEntry}
        onEdit={onEditEntry}
        onStopRecording={onStopRecording}
        isActionSheetActive={isActionSheetActive}
        onActionSheetOpen={onActionSheetOpen}
        variant="calendar"
        cardSpacing={cardSpacing}
        enterDelay={enterDelay}
      />
    </View>
  );
});
