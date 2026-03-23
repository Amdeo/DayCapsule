import React from 'react';
import { Text, View } from 'react-native';
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
    <View
      testID="calendar-timeline-item-root"
      className="relative pl-16 pr-6"
      style={{ paddingBottom: spacing }}
    >
      <View
        testID="calendar-timeline-item-dot"
        className="absolute left-[33px] top-px z-[2] h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm shadow-black/10"
      >
        <View className="h-[10px] w-[10px] rounded-full" style={{ backgroundColor: dotColor }} />
      </View>
      <View className="mb-2">
        <Text
          testID="calendar-timeline-item-time"
          className="text-xs font-semibold"
          style={{ color: dotColor }}
        >
          {formatHHMM(entry.timestamp)}
        </Text>
      </View>
      <View className="flex-1">
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
