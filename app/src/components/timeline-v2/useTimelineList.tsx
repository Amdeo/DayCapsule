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
  deleteEntry: (id: string) => void | Promise<void>;
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
  const sections = useMemo(() => generateTimeSections(entries), [entries]);

  const globalIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let nextIndex = 0;

    for (const section of sections) {
      for (const entry of section.data) {
        map.set(entry.id, nextIndex);
        nextIndex += 1;
      }
    }

    return map;
  }, [sections]);

  const hasEntries = entries.length > 0;

  const keyExtractor = useCallback((item: Entry) => item.id, []);

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
          showTimelineDecorations={displayMode !== 'card'}
        />
      );
    },
    [
      activeActionSheetId,
      cardSpacing,
      deleteEntry,
      displayMode,
      globalIndexMap,
      onActionSheetOpen,
      onEditEntry,
      onStopRecording,
      onViewEntry,
    ],
  );

  const renderSectionHeader = useCallback(({ section }: { section: TimeSection }) => {
    return <TimelineSectionHeader title={section.title} showTimelineDecorations={displayMode !== 'card'} />;
  }, [displayMode]);

  return {
    sections,
    renderItem,
    renderSectionHeader,
    keyExtractor,
    hasEntries,
  };
}
