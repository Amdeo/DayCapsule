import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FilterBarAnimatedButton } from './FilterBarAnimatedButton';
import { filterBarStyles as styles } from './FilterBar.styles';
import {
  FilterBarDateChip,
  FilterBarSelectedTag,
  FilterBarTagSelectionButton,
  FilterBarTypeChip,
} from './FilterBarSectionItems';
import {
  filterBarDateOptions,
  FilterBarDateRange,
  FilterBarEntryType,
  filterBarTypeOptions,
  FilterBarTypeStats,
} from './filterBarOptions';

export function FilterBarHeader({ onClose }: { onClose?: () => void }) {
  return (
    <View style={styles.headerRow}>
      <Text style={styles.headerTitle}>筛选</Text>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Ionicons name="chevron-up" size={20} color="#737373" />
      </TouchableOpacity>
    </View>
  );
}

interface FilterBarTypeSectionProps {
  filterType: FilterBarEntryType;
  typeStats: FilterBarTypeStats;
  onSelect: (type: FilterBarEntryType) => void;
}

export function FilterBarTypeSection({
  filterType,
  typeStats,
  onSelect,
}: FilterBarTypeSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>类型</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filterBarTypeOptions.map((filter) => {
          const isSelected = filterType === filter.type;
          return (
            <FilterBarTypeChip
              key={filter.type}
              filter={filter}
              selected={isSelected}
              count={typeStats[filter.type]}
              onPress={onSelect}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

interface FilterBarDateSectionProps {
  filterDateRange: FilterBarDateRange;
  onSelect: (range: FilterBarDateRange) => void;
}

export function FilterBarDateSection({
  filterDateRange,
  onSelect,
}: FilterBarDateSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>时间</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filterBarDateOptions.map((filter) => {
          const isSelected = filterDateRange === filter.range;
          return (
            <FilterBarDateChip
              key={filter.range}
              filter={filter}
              selected={isSelected}
              onPress={onSelect}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

export function FilterBarResetSection({ onReset }: { onReset: () => void }) {
  return (
    <View style={styles.resetSection}>
      <FilterBarAnimatedButton onPress={onReset} style={styles.resetButton}>
        <Ionicons name="refresh" size={16} color="#6A89CC" />
        <Text style={styles.resetText}>重置筛选</Text>
      </FilterBarAnimatedButton>
    </View>
  );
}

interface FilterBarTagsSectionProps {
  selectedTags: string[];
  onOpenTagModal: () => void;
  onRemoveTag: (tag: string) => void;
}

export function FilterBarTagsSection({
  selectedTags,
  onOpenTagModal,
  onRemoveTag,
}: FilterBarTagsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>标签</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <FilterBarTagSelectionButton
          selectedTagCount={selectedTags.length}
          onPress={onOpenTagModal}
        />

        {selectedTags.map((tag) => (
          <FilterBarSelectedTag key={tag} tag={tag} onRemove={onRemoveTag} />
        ))}
      </ScrollView>
    </View>
  );
}
