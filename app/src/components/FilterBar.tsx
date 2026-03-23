/**
 * 筛选栏组件 - 简化版
 * 提供类型、日期范围和标签筛选功能
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { useEntryStore } from '../store/entryStore';
import {
  FilterBarDateSection,
  FilterBarHeader,
  FilterBarResetSection,
  FilterBarTagsSection,
  FilterBarTypeSection,
} from './filter-bar/FilterBarSections';
import { FilterBarTagModal } from './filter-bar/FilterBarTagModal';
import { filterBarStyles as styles } from './filter-bar/FilterBar.styles';
import { FilterBarTypeStats } from './filter-bar/filterBarOptions';

interface FilterBarProps {
  isVisible: boolean;
  onClose?: () => void;
}

export function FilterBar({ isVisible, onClose }: FilterBarProps) {
  const {
    entries,
    filterType,
    filterDateRange,
    selectedTags,
    setFilterType,
    setFilterDateRange,
    getAllTags,
    toggleTag,
    clearTags,
  } = useEntryStore();

  const [showTagModal, setShowTagModal] = useState(false);
  const [allTagsList, setAllTagsList] = useState<string[]>([]);

  // 仅在 FilterBar 变为可见时加载标签，避免 entries 变化（录音计时器）触发高频查询
  useEffect(() => {
    if (isVisible) getAllTags().then(setAllTagsList);
  }, [isVisible]);

  // 用 useMemo 缓存类型统计，避免每次渲染重新遍历
  const typeStats = useMemo<FilterBarTypeStats>(
    () => ({
      all: entries.length,
      text: entries.filter((entry) => entry.type === 'text').length,
      photo: entries.filter((entry) => entry.type === 'photo').length,
      voice: entries.filter((entry) => entry.type === 'voice').length,
    }),
    [entries]
  );

  const hasActiveFilters =
    filterType !== 'all' || filterDateRange !== 'all' || selectedTags.length > 0;

  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FilterBarHeader onClose={onClose} />

      <View>
        <FilterBarTypeSection
          filterType={filterType}
          typeStats={typeStats}
          onSelect={setFilterType}
        />
        <FilterBarDateSection
          filterDateRange={filterDateRange}
          onSelect={setFilterDateRange}
        />
        {hasActiveFilters ? (
          <FilterBarResetSection
            onReset={() => {
              setFilterType('all');
              setFilterDateRange('all');
              clearTags();
            }}
          />
        ) : null}
        <FilterBarTagsSection
          selectedTags={selectedTags}
          onOpenTagModal={() => setShowTagModal(true)}
          onRemoveTag={toggleTag}
        />
      </View>

      {showTagModal ? (
        <FilterBarTagModal
          visible={showTagModal}
          allTags={allTagsList}
          selectedTags={selectedTags}
          onToggleTag={toggleTag}
          onClose={() => setShowTagModal(false)}
          onClear={clearTags}
        />
      ) : null}
    </View>
  );
}
