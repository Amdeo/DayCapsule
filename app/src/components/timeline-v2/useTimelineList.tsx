import { memo, useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';
import type { Entry } from '@/src/types/entry';
import { EntryCard } from '../EntryCard';
import { TimelineSectionHeader } from '../TimelineSectionHeader';
import { formatDateLabel, formatHHMM } from '@/src/utils/timeUtils';

type ViewMode = 'list' | 'calendar';

interface TimeSection {
  title: string;
  timestamp: number;
  data: Entry[];
}

interface EntryMarkerProps {
  entry: Entry;
  onDeleteEntry: (id: string) => void;
  onViewEntry: (entry: Entry) => void;
  onEditEntry: (entry: Entry) => void;
  onStopRecording?: (id: string) => void;
  isActionSheetActive: boolean;
  onActionSheetOpen: (id: string) => void;
  isLast: boolean;
  cardSpacing: number;
  enterDelay?: number;
}

function getEntryAccentClassName(type: Entry['type']) {
  switch (type) {
    case 'text':
      return 'text-entry-text';
    case 'photo':
      return 'text-entry-photo';
    case 'voice':
      return 'text-entry-voice';
    default:
      return 'text-neutral-300';
  }
}

function getEntryDotClassName(type: Entry['type']) {
  switch (type) {
    case 'text':
      return 'bg-entry-text';
    case 'photo':
      return 'bg-entry-photo';
    case 'voice':
      return 'bg-entry-voice';
    default:
      return 'bg-neutral-300';
  }
}

function generateTimeSections(entries: Entry[]): TimeSection[] {
  const sections: TimeSection[] = [];
  let currentDateLabel = '';
  let currentSection: TimeSection | null = null;

  entries.forEach((entry) => {
    const dateLabel = formatDateLabel(entry.timestamp);

    if (dateLabel !== currentDateLabel) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: dateLabel,
        timestamp: entry.timestamp,
        data: [],
      };
      currentDateLabel = dateLabel;
    }

    currentSection?.data.push(entry);
  });

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

const TimelineEntryMarker = memo(function TimelineEntryMarker({
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
}: EntryMarkerProps) {
  const accentTextClassName = getEntryAccentClassName(entry.type);
  const dotClassName = getEntryDotClassName(entry.type);

  return (
    <View className="relative pl-16 pr-6" style={{ paddingBottom: isLast ? 0 : cardSpacing }}>
      <View
        className={`absolute left-[33px] top-[1px] z-10 h-4 w-4 rounded-full border-2 border-home-surface shadow-sm ${dotClassName}`}
      />
      <View className="mb-2">
        <Text className={`text-xs font-medium ${accentTextClassName}`}>
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

interface UseTimelineListOptions {
  entries: Entry[];
  displayMode: ViewMode;
  cardSpacing: number;
  deleteEntry: (id: string) => void;
  onViewEntry: (entry: Entry) => void;
  onEditEntry: (entry: Entry) => void;
  onStopRecording?: (id: string) => void;
  activeActionSheetId: string | null;
  onActionSheetOpen: (id: string) => void;
}

export function useTimelineList({
  entries,
  displayMode,
  cardSpacing,
  deleteEntry,
  onViewEntry,
  onEditEntry,
  onStopRecording,
  activeActionSheetId,
  onActionSheetOpen,
}: UseTimelineListOptions) {
  const sections = useMemo(() => {
    return generateTimeSections(entries);
  }, [entries, displayMode]);

  const globalIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let index = 0;

    sections.forEach((section) => {
      section.data.forEach((entry) => {
        map.set(entry.id, index++);
      });
    });

    return map;
  }, [sections]);

  const hasEntries = entries.length > 0;

  const keyExtractor = useCallback((item: Entry) => item.id, []);

  const renderSectionHeader = useCallback(({ section }: { section: TimeSection }) => {
    return <TimelineSectionHeader title={section.title} timestamp={section.timestamp} />;
  }, []);

  const renderItem = useCallback(
    ({ item, index, section }: { item: Entry; index: number; section: TimeSection }) => {
      const isLast = index === section.data.length - 1;
      const globalIndex = globalIndexMap.get(item.id) ?? 0;
      const staggerIndex = Math.min(globalIndex, 8);
      const enterDelay = staggerIndex * 90;

      return (
        <TimelineEntryMarker
          entry={item}
          onDeleteEntry={deleteEntry}
          onViewEntry={onViewEntry}
          onEditEntry={onEditEntry}
          onStopRecording={onStopRecording}
          isActionSheetActive={activeActionSheetId === item.id}
          onActionSheetOpen={onActionSheetOpen}
          isLast={isLast}
          cardSpacing={cardSpacing}
          enterDelay={enterDelay}
        />
      );
    },
    [
      activeActionSheetId,
      cardSpacing,
      deleteEntry,
      globalIndexMap,
      onActionSheetOpen,
      onEditEntry,
      onStopRecording,
      onViewEntry,
    ],
  );

  return {
    sections,
    renderItem,
    renderSectionHeader,
    keyExtractor,
    hasEntries,
  };
}
