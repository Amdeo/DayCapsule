import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FilterBarAnimatedButton } from './FilterBarAnimatedButton';
import { filterBarStyles as styles } from './FilterBar.styles';
import type {
  FilterBarDateOption,
  FilterBarDateRange,
  FilterBarEntryType,
  FilterBarTypeOption,
} from './filterBarOptions';

interface FilterBarTypeChipProps {
  filter: FilterBarTypeOption;
  selected: boolean;
  count: number;
  onPress: (type: FilterBarEntryType) => void;
}

interface FilterBarDateChipProps {
  filter: FilterBarDateOption;
  selected: boolean;
  onPress: (range: FilterBarDateRange) => void;
}

interface FilterBarSelectedTagProps {
  tag: string;
  onRemove: (tag: string) => void;
}

interface FilterBarTagSelectionButtonProps {
  selectedTagCount: number;
  onPress: () => void;
}

export function FilterBarTypeChip({
  filter,
  selected,
  count,
  onPress,
}: FilterBarTypeChipProps) {
  return (
    <FilterBarAnimatedButton
      onPress={() => onPress(filter.type)}
      style={[
        styles.filterButton,
        selected && styles.filterButtonActive,
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: selected ? filter.color : '#F5F5F5' },
        ]}
      >
        <Ionicons
          name={filter.icon}
          size={18}
          color={selected ? '#FFFFFF' : filter.color}
        />
      </View>
      <Text
        style={[
          styles.filterLabel,
          selected && styles.filterLabelActive,
        ]}
      >
        {filter.label}
      </Text>
      <Text
        style={[
          styles.filterCount,
          selected && styles.filterCountActive,
        ]}
      >
        {count}
      </Text>
    </FilterBarAnimatedButton>
  );
}

export function FilterBarDateChip({
  filter,
  selected,
  onPress,
}: FilterBarDateChipProps) {
  return (
    <FilterBarAnimatedButton
      onPress={() => onPress(filter.range)}
      style={[
        styles.dateButton,
        selected && styles.dateButtonActive,
      ]}
    >
      <Text
        style={[
          styles.dateLabel,
          selected && styles.dateLabelActive,
        ]}
      >
        {filter.label}
      </Text>
    </FilterBarAnimatedButton>
  );
}

export function FilterBarTagSelectionButton({
  selectedTagCount,
  onPress,
}: FilterBarTagSelectionButtonProps) {
  const hasSelectedTags = selectedTagCount > 0;

  return (
    <FilterBarAnimatedButton
      onPress={onPress}
      style={[styles.tagButton, hasSelectedTags && styles.tagButtonActive]}
    >
      <Ionicons
        name="pricetags"
        size={16}
        color={hasSelectedTags ? '#FFFFFF' : '#6A89CC'}
      />
      <Text
        style={[
          styles.tagButtonText,
          hasSelectedTags && styles.tagButtonTextActive,
        ]}
      >
        {hasSelectedTags ? `已选 ${selectedTagCount} 个` : '选择标签'}
      </Text>
    </FilterBarAnimatedButton>
  );
}

export function FilterBarSelectedTag({
  tag,
  onRemove,
}: FilterBarSelectedTagProps) {
  return (
    <View style={styles.selectedTag}>
      <Text style={styles.selectedTagText}>#{tag}</Text>
      <TouchableOpacity
        onPress={() => onRemove(tag)}
        style={styles.removeTagButton}
      >
        <Ionicons name="close-circle" size={16} color="#6A89CC" />
      </TouchableOpacity>
    </View>
  );
}
