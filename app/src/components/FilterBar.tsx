/**
 * 筛选栏组件 - 简化版
 * 提供类型、日期范围和标签筛选功能
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { useEntryStore } from '@/src/store/entryStore';
import { useEntryFilterUIStore } from '@/src/store/entryFilterUIStore';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
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
  const entries = useEntryStore((state) => state.entries);
  const getAllTags = useEntryStore((state) => state.getAllTags);
  const filterType = useEntryFilterUIStore((state) => state.filterType);
  const filterDateRange = useEntryFilterUIStore((state) => state.filterDateRange);
  const selectedTags = useEntryFilterUIStore((state) => state.selectedTags);
  const setFilterType = useEntryFilterUIStore((state) => state.setFilterType);
  const setFilterDateRange = useEntryFilterUIStore((state) => state.setFilterDateRange);
  const toggleTag = useEntryFilterUIStore((state) => state.toggleTag);
  const clearTags = useEntryFilterUIStore((state) => state.clearTags);

  const [showTagModal, setShowTagModal] = useState(false);
  const [allTagsList, setAllTagsList] = useState<string[]>([]);

  // 仅在 FilterBar 变为可见时加载标签，避免 entries 变化（录音计时器）触发高频查询
  useEffect(() => {
    if (isVisible) {
      void getAllTags()
        .then(setAllTagsList)
        .catch(() => {
          setAllTagsList([]);
          showErrorFeedback({
            title: '加载失败',
            message: '筛选标签加载失败，请稍后重试',
            actions: [{ label: '知道了', role: 'primary' }],
          });
        });
    }
  }, [getAllTags, isVisible]);

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
    <View testID="filter-bar-root" style={styles.container}>
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
