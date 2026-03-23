import { useCallback, useMemo } from 'react';
import type { Entry } from '@/src/types/entry';
import { TimelineEntryMarker } from './TimelineEntryMarker';
import { TimelineSectionHeader } from './TimelineSectionHeader';
import { generateTimeSections } from './timelineSections';
import type { TimeSection, ViewMode } from './timelineTypes';

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
    return <TimelineSectionHeader title={section.title} />;
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
