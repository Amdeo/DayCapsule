/**
 * 时间轴视图组件 - 连续不间断版本（带 Sticky Header）
 * 整合搜索栏和快速添加功能
 */

import React from 'react';
import { View } from 'react-native';
import { useEntryStore } from '../store/entryStore';
import { useEntryFilterUIStore } from '../store/entryFilterUIStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore, SPACING_VALUES } from '@/src/store/settingsStore';
import { FABMenu } from './FABMenu';
import { PhotoResult } from '../services/photoService';
import { TimelineCloudSyncStatusAction } from './timeline-v2/TimelineCloudSyncStatusAction';
import { TimelineContent } from './timeline-v2/TimelineContent';
import { TimelineDialogs } from './timeline-v2/TimelineDialogs';
import { TimelineHeaderArea } from './timeline-v2/TimelineHeaderArea';
import { TimelineScrollTopButton } from './timeline-v2/TimelineScrollTopButton';
import { useTimelineController } from './timeline-v2/useTimelineController';
import { useTimelineFilters } from './timeline-v2/useTimelineFilters';
import { useTimelineList } from './timeline-v2/useTimelineList';

/**
 * 时间轴主组件
 */
interface TimelineProps {
  onQuickAdd?: (type: 'text' | 'photo' | 'voice', photos?: PhotoResult[]) => void;
  onMenuPress?: () => void;
  onStopRecording?: (id: string) => void;
}

export function Timeline({ onQuickAdd, onMenuPress, onStopRecording }: TimelineProps) {
  const entries = useEntryStore((state) => state.entries);
  const deleteEntry = useEntryStore((state) => state.deleteEntry);
  const updateEntry = useEntryStore((state) => state.updateEntry);
  const applyFilters = useEntryStore((state) => state.applyFilters);
  const loadMore = useEntryStore((state) => state.loadMore);
  const isLoadingMore = useEntryStore((state) => state.isLoadingMore);
  const hasMore = useEntryStore((state) => state.hasMore);
  const searchQuery = useEntryFilterUIStore((state) => state.searchQuery);
  const filterType = useEntryFilterUIStore((state) => state.filterType);
  const filterDateRange = useEntryFilterUIStore((state) => state.filterDateRange);
  const selectedTags = useEntryFilterUIStore((state) => state.selectedTags);
  const setSearchQuery = useEntryFilterUIStore((state) => state.setSearchQuery);
  const setFilterType = useEntryFilterUIStore((state) => state.setFilterType);
  const setFilterDateRange = useEntryFilterUIStore((state) => state.setFilterDateRange);
  const toggleTag = useEntryFilterUIStore((state) => state.toggleTag);
  const clearTags = useEntryFilterUIStore((state) => state.clearTags);
  const insets = useSafeAreaInsets();
  const {
    viewingEntry,
    editingEntry,
    showSearchOverlay,
    showScrollTop,
    viewMode,
    setViewMode,
    displayMode,
    showViewToggle,
    activeActionSheetId,
    sectionListRef,
    scrollTopOpacity,
    scrollTopScale,
    fabShouldHide,
    isTransitioning,
    handleSaveEdit,
    handleSearchFocus,
    handleCloseSearch,
    handleToggleViewMode,
    handleViewEntry,
    handleEditEntry,
    handleActionSheetOpen,
    handleScroll,
    scrollToTop,
    handlePressIn,
    handlePressOut,
    closeViewingEntry,
    closeEditingEntry,
    handleDetailEdit,
    revealFab,
  } = useTimelineController({
    updateEntry,
  });

  const { cardSpacing: cardSpacingKey } = useSettingsStore();
  const cardSpacing = SPACING_VALUES[cardSpacingKey];
  const displayEntries = entries;

  const {
    hasFilters,
    clearQuery,
    clearType,
    clearDate,
    clearTag,
    clearAll,
  } = useTimelineFilters({
    searchQuery,
    filterType,
    filterDateRange,
    selectedTags,
    setSearchQuery,
    setFilterType,
    setFilterDateRange,
    toggleTag,
    clearTags,
    applyFilters,
  });

  const {
    sections,
    renderItem,
    renderSectionHeader,
    keyExtractor,
    hasEntries,
  } = useTimelineList({
    entries: displayEntries,
    displayMode,
    cardSpacing,
    deleteEntry,
    onViewEntry: handleViewEntry,
    onEditEntry: handleEditEntry,
    onStopRecording,
    activeActionSheetId,
    onActionSheetOpen: handleActionSheetOpen,
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <TimelineHeaderArea
        showSearchOverlay={showSearchOverlay}
        onCloseSearch={handleCloseSearch}
        onSearchFocus={handleSearchFocus}
        onMenuPress={onMenuPress}
        onToggleViewMode={handleToggleViewMode}
        showViewToggle={showViewToggle}
        rightActions={<TimelineCloudSyncStatusAction />}
        hasFilters={hasFilters}
        searchQuery={searchQuery}
        filterType={filterType}
        filterDateRange={filterDateRange}
        selectedTags={selectedTags}
        resultCount={displayEntries.length}
        onClearQuery={clearQuery}
        onClearType={clearType}
        onClearDate={clearDate}
        onClearTag={clearTag}
        onClearAll={clearAll}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <TimelineContent
        isTransitioning={isTransitioning}
        displayMode={displayMode}
        displayEntries={displayEntries}
        hasEntries={hasEntries}
        deleteEntry={deleteEntry}
        onViewEntry={handleViewEntry}
        onEditEntry={handleEditEntry}
        onStopRecording={onStopRecording}
        activeActionSheetId={activeActionSheetId}
        onActionSheetOpen={handleActionSheetOpen}
        sectionListRef={sectionListRef}
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        bottomInset={insets.bottom}
        onScroll={handleScroll}
        hasMore={hasMore}
        loadMore={loadMore}
        isLoadingMore={isLoadingMore}
      />

      <TimelineDialogs
        viewingEntry={viewingEntry}
        editingEntry={editingEntry}
        onCloseViewing={closeViewingEntry}
        onDetailEdit={handleDetailEdit}
        onSaveEdit={handleSaveEdit}
        onCloseEditing={closeEditingEntry}
      />

      <TimelineScrollTopButton
        visible={showScrollTop}
        opacity={scrollTopOpacity}
        scale={scrollTopScale}
        onPress={scrollToTop}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      />

      {/* FAB 浮动操作按钮（搜索界面时隐藏）- 花瓣展开动画 */}
      {!showSearchOverlay && displayMode === 'list' && (
        <FABMenu
          onSelect={onQuickAdd ?? (() => {})}
          shouldHide={fabShouldHide}
          onRevealRequest={revealFab}
        />
      )}
    </View>
  );
}
