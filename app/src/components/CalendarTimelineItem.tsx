import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Entry } from '@/src/types/entry';
import { EntryCard } from './EntryCard';
import { CalendarDensity } from '@/src/store/settingsStore';

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

const DENSITY_SPACING: Record<CalendarDensity, number> = {
  comfortable: 20,
  default: 14,
  compact: 10,
};

const TYPE_COLORS: Record<Entry['type'], string> = {
  text: '#A491D3',
  photo: '#77C9D4',
  voice: '#F5A623',
};

const formatHHMM = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

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
  const spacing = DENSITY_SPACING[density];
  const dotColor = TYPE_COLORS[entry.type];

  return (
    <View style={[styles.container, { paddingBottom: spacing }]}>
      <View style={[styles.dotOuter, { borderColor: '#FFFFFF' }]}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      </View>
      <View style={styles.timeWrap}>
        <Text style={[styles.timeText, { color: dotColor }]}>{formatHHMM(entry.timestamp)}</Text>
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

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingLeft: 64,
    paddingRight: 24,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeWrap: {
    marginBottom: 8,
  },
  dotOuter: {
    position: 'absolute',
    left: 33,
    top: 1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardWrap: {
    flex: 1,
  },
});
