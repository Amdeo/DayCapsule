import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { searchOverlayStyles as styles } from './SearchOverlay.styles';
import {
  SearchOverlayDateChip,
  SearchOverlayTagChip,
  SearchOverlayTypeChip,
} from './SearchOverlayFilterChips';
import {
  searchDateOptions,
  SearchDateRange,
  searchTypeFilters,
  SearchFilterType,
} from './searchOverlayOptions';

interface SearchOverlayTypeSectionProps {
  value: SearchFilterType;
  onChange: (value: SearchFilterType) => void;
}

interface SearchOverlayDateSectionProps {
  value: SearchDateRange;
  onChange: (value: SearchDateRange) => void;
}

interface SearchOverlayTagsSectionProps {
  tags: string[];
  extraCommonTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
}

export function SearchOverlayTypeSection({
  value,
  onChange,
}: SearchOverlayTypeSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>类型</Text>
      <View style={styles.chips}>
        {searchTypeFilters.map((option) => {
          const active = value === option.key;
          return (
            <SearchOverlayTypeChip
              key={option.key}
              option={option}
              active={active}
              onPress={onChange}
            />
          );
        })}
      </View>
    </View>
  );
}

export function SearchOverlayDateSection({
  value,
  onChange,
}: SearchOverlayDateSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>时间</Text>
      <View style={styles.chips}>
        {searchDateOptions.map((option) => {
          const active = value === option.key;
          return (
            <SearchOverlayDateChip
              key={option.key}
              option={option}
              active={active}
              onPress={onChange}
            />
          );
        })}
      </View>
    </View>
  );
}

export function SearchOverlayTagsSection({
  tags,
  extraCommonTags,
  selectedTags,
  onToggleTag,
  onClearTags,
}: SearchOverlayTagsSectionProps) {
  const hasTags = tags.length > 0 || extraCommonTags.length > 0;

  return (
    <View style={styles.section}>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>标签</Text>
        {selectedTags.length > 0 ? (
          <TouchableOpacity onPress={onClearTags}>
            <Text style={styles.clearTagsText}>清除</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {!hasTags ? (
        <Text style={styles.emptyTagsHint}>暂无标签，在编辑记录时添加</Text>
      ) : (
        <View style={styles.chips}>
          {tags.map((tag) => (
            <SearchOverlayTagChip
              key={tag}
              tag={tag}
              selected={selectedTags.includes(tag)}
              onPress={() => onToggleTag(tag)}
            />
          ))}
          {extraCommonTags.map((tag) => (
            <SearchOverlayTagChip
              key={tag}
              tag={tag}
              selected={selectedTags.includes(tag)}
              common
              onPress={() => onToggleTag(tag)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
