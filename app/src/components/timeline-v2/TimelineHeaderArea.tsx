import React from 'react';
import { SearchBar } from '@/src/components/SearchBar';
import { SearchOverlay } from '@/src/components/SearchOverlay';
import { TimelineActiveFiltersBar } from './TimelineActiveFiltersBar';
import { TimelineViewModeToggle } from './TimelineViewModeToggle';
import type { ViewMode } from './timelineTypes';

interface TimelineHeaderAreaProps {
  showSearchOverlay: boolean;
  onCloseSearch: () => void;
  onSearchFocus: () => void;
  onMenuPress?: () => void;
  onToggleViewMode: () => void;
  showViewToggle: boolean;
  rightActions: React.ReactNode;
  hasFilters: boolean;
  searchQuery: string;
  filterType: string;
  filterDateRange: string;
  selectedTags: string[];
  resultCount: number;
  onClearQuery: () => void;
  onClearType: () => void;
  onClearDate: () => void;
  onClearTag: (tag: string) => void;
  onClearAll: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function TimelineHeaderArea({
  showSearchOverlay,
  onCloseSearch,
  onSearchFocus,
  onMenuPress,
  onToggleViewMode,
  showViewToggle,
  rightActions,
  hasFilters,
  searchQuery,
  filterType,
  filterDateRange,
  selectedTags,
  resultCount,
  onClearQuery,
  onClearType,
  onClearDate,
  onClearTag,
  onClearAll,
  viewMode,
  onViewModeChange,
}: TimelineHeaderAreaProps) {
  return (
    <>
      <SearchOverlay
        visible={showSearchOverlay}
        onClose={onCloseSearch}
        onSearch={onCloseSearch}
      />

      <SearchBar
        onMenuPress={onMenuPress}
        onSearchFocus={onSearchFocus}
        onViewModePress={onToggleViewMode}
        showViewModeActive={showViewToggle}
        rightActions={rightActions}
      />

      {showViewToggle ? (
        <TimelineViewModeToggle current={viewMode} onChange={onViewModeChange} />
      ) : null}

      {hasFilters ? (
        <TimelineActiveFiltersBar
          searchQuery={searchQuery}
          filterType={filterType}
          filterDateRange={filterDateRange}
          selectedTags={selectedTags}
          resultCount={resultCount}
          onClearQuery={onClearQuery}
          onClearType={onClearType}
          onClearDate={onClearDate}
          onClearTag={onClearTag}
          onClearAll={onClearAll}
          onOpenSearch={onSearchFocus}
        />
      ) : null}
    </>
  );
}
