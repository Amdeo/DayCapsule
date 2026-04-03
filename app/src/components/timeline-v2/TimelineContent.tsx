import React from 'react';
import {
  ActivityIndicator,
  SectionList,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type SectionListProps,
} from 'react-native';
import type { Entry } from '@/src/types/entry';
import { CalendarView } from '@/src/components/CalendarView';
import { TimelineEmptyState } from './TimelineEmptyState';
import { TimelineTransitionLoader } from './TimelineTransitionLoader';
import type { TimeSection, ViewMode } from './timelineTypes';

interface TimelineContentProps {
  isTransitioning: boolean;
  displayMode: ViewMode;
  displayEntries: Entry[];
  hasEntries: boolean;
  deleteEntry: (id: string) => void;
  onViewEntry: (entry: Entry) => void;
  onEditEntry: (entry: Entry) => void;
  onStopRecording?: (id: string) => void;
  activeActionSheetId: string | null;
  onActionSheetOpen: (id: string) => void;
  sectionListRef: React.RefObject<SectionList<Entry, TimeSection> | null>;
  sections: TimeSection[];
  renderItem: SectionListProps<Entry, TimeSection>['renderItem'];
  renderSectionHeader: SectionListProps<Entry, TimeSection>['renderSectionHeader'];
  keyExtractor: SectionListProps<Entry, TimeSection>['keyExtractor'];
  bottomInset: number;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  hasMore: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
}

export function TimelineContent({
  isTransitioning,
  displayMode,
  displayEntries,
  hasEntries,
  deleteEntry,
  onViewEntry,
  onEditEntry,
  onStopRecording,
  activeActionSheetId,
  onActionSheetOpen,
  sectionListRef,
  sections,
  renderItem,
  renderSectionHeader,
  keyExtractor,
  bottomInset,
  onScroll,
  hasMore,
  loadMore,
  isLoadingMore,
}: TimelineContentProps) {
  if (isTransitioning) {
    return <TimelineTransitionLoader />;
  }

  if (displayMode === 'calendar') {
    return (
      <CalendarView
        entries={displayEntries}
        onDeleteEntry={deleteEntry}
        onViewEntry={onViewEntry}
        onEditEntry={onEditEntry}
        onStopRecording={onStopRecording}
        activeActionSheetId={activeActionSheetId}
        onActionSheetOpen={onActionSheetOpen}
      />
    );
  }

  if (!hasEntries) {
    return <TimelineEmptyState />;
  }

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <View
        style={{
          position: 'absolute',
          left: 40,
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: '#E5E5E5',
          zIndex: 0,
        }}
      />
      <SectionList<Entry, TimeSection>
        ref={sectionListRef}
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={true}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingBottom: 160 + bottomInset }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (hasMore) {
            loadMore();
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator size="small" color="#8B7355" style={{ paddingVertical: 16 }} />
          ) : null
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={21}
      />
    </View>
  );
}
