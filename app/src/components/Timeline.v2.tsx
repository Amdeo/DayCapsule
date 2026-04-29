/**
 * 时间轴视图组件 - 连续不间断版本（带 Sticky Header）
 * 整合搜索栏和快速添加功能
 */

import React from 'react';
import { View } from 'react-native';
import { useEntryStore } from '@/src/store/entryStore';
import { useEntryFilterUIStore } from '@/src/store/entryFilterUIStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore, SPACING_VALUES } from '@/src/store/settingsStore';
import { FABMenu } from './FABMenu';
import { PhotoResult } from '@/src/services/photoService';
import { TimelineCloudSyncStatusAction } from './timeline-v2/TimelineCloudSyncStatusAction';
import { TimelineContent } from './timeline-v2/TimelineContent';
import { TimelineDialogs } from './timeline-v2/TimelineDialogs';
import { TimelineHeaderArea } from './timeline-v2/TimelineHeaderArea';
import { TimelineScrollTopButton } from './timeline-v2/TimelineScrollTopButton';
import { useTimelineController } from './timeline-v2/useTimelineController';
import { useTimelineFilters } from './timeline-v2/useTimelineFilters';
import { useTimelineList } from './timeline-v2/useTimelineList';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';

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
    revealFab,
  } = useTimelineController({
    updateEntry,
  });

  const { cardSpacing: cardSpacingKey } = useSettingsStore();
  const cardSpacing = SPACING_VALUES[cardSpacingKey];
  const displayEntries = entries;

  const handleDeleteEntry = React.useCallback(
    async (id: string) => {
      try {
        await deleteEntry(id);
      } catch {
        showErrorFeedback({
          title: '删除失败',
          message: '删除这条记录失败，请重试',
          actions: [{ label: '知道了', role: 'primary' }],
        });
      }
    },
    [deleteEntry],
  );

  const handleLoadMore = React.useCallback(() => {
    try {
      loadMore();
    } catch {
      showErrorFeedback({
        title: '加载失败',
        message: '更多记录加载失败，请稍后重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    }
  }, [loadMore]);

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
    deleteEntry: handleDeleteEntry,
    onViewEntry: handleViewEntry,
    onEditEntry: handleEditEntry,
    onStopRecording,
    activeActionSheetId,
    onActionSheetOpen: handleActionSheetOpen,
  });

  return (
    <View className="flex-1 bg-white">
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
        deleteEntry={handleDeleteEntry}
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
        loadMore={handleLoadMore}
        isLoadingMore={isLoadingMore}
      />

      <TimelineDialogs
        viewingEntry={viewingEntry}
        editingEntry={editingEntry}
        onCloseViewing={closeViewingEntry}
        onSaveTextDetail={handleSaveEdit}
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
      {!showSearchOverlay && displayMode === 'timeline' && (
        <FABMenu
          onSelect={onQuickAdd ?? (() => {})}
          shouldHide={fabShouldHide}
          onRevealRequest={revealFab}
        />
      )}
    </View>
  );
}
