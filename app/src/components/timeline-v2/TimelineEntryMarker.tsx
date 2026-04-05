import React from 'react';
import { Text, View } from 'react-native';
import type { Entry } from '@/src/types/entry';
import { formatHHMM } from '@/src/utils/timeUtils';
import { EntryCard } from '@/src/components/EntryCard';
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
}

const timelineLeft = 40;

const dotStyle = {
  position: 'absolute' as const,
  left: timelineLeft - 7,
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
}: TimelineEntryMarkerProps) {
  const accentColor = getTimelineEntryAccentColor(entry.type);

  return (
    <View
      style={{
        paddingLeft: 64,
        paddingRight: 24,
        paddingBottom: isLast ? 0 : cardSpacing,
        position: 'relative',
      }}
    >
      <View style={[dotStyle, { backgroundColor: accentColor }]} />

      <View style={timeRowStyle}>
        <Text style={[timeTextStyle, { color: accentColor }]}>
          {formatHHMM(entry.timestamp)}
        </Text>
      </View>

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
