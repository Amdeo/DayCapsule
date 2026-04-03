/**
 * 搜索遮罩组件
 * 全屏搜索界面：关键词 + 类型/时间/标签筛选
 * 点击"搜索"后提交并返回时间线显示结果
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useEntryStore } from '@/src/store/entryStore';
import { useEntryFilterUIStore } from '@/src/store/entryFilterUIStore';
import { useCommonTagsStore } from '@/src/store/commonTagsStore';
import {
  SearchOverlayDateSection,
  SearchOverlayTagsSection,
  SearchOverlayTypeSection,
} from './search-overlay/SearchOverlayFilterSections';
import { SearchOverlayFooter } from './search-overlay/SearchOverlayFooter';
import { searchOverlayStyles as styles } from './search-overlay/SearchOverlay.styles';
import { useSearchOverlayController } from './search-overlay/useSearchOverlayController';

interface SearchOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
}

export function SearchOverlay({ visible, onClose, onSearch }: SearchOverlayProps) {
  const searchQuery = useEntryFilterUIStore((state) => state.searchQuery);
  const filterType = useEntryFilterUIStore((state) => state.filterType);
  const filterDateRange = useEntryFilterUIStore((state) => state.filterDateRange);
  const selectedTags = useEntryFilterUIStore((state) => state.selectedTags);
  const getAllTags = useEntryStore((state) => state.getAllTags);
  const applySearchFilters = useEntryStore((state) => state.applySearchFilters);

  const { tags: commonTags, isLoaded: tagsLoaded, loadCommonTags } = useCommonTagsStore();
  const {
    localQuery,
    setLocalQuery,
    localType,
    setLocalType,
    localDate,
    setLocalDate,
    localTags,
    allTagsList,
    extraCommonTags,
    hasActiveFilters,
    handleToggleTag,
    handleSearch,
    handleReset,
    clearLocalQuery,
    clearTags,
  } = useSearchOverlayController({
    visible,
    searchQuery,
    filterType,
    filterDateRange,
    selectedTags,
    commonTags,
    tagsLoaded,
    loadCommonTags,
    getAllTags,
    applySearchFilters,
    onClose,
    onSearch,
  });

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      testID="search-overlay-root"
      style={styles.overlay}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* 搜索输入框 */}
          <View style={styles.searchSection}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="#A3A3A3" />
              <TextInput
                style={styles.input}
                placeholder="搜索记忆..."
                placeholderTextColor="#A3A3A3"
                value={localQuery}
                onChangeText={setLocalQuery}
                autoFocus
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              {localQuery.length > 0 && (
                <Pressable
                  testID="search-overlay-clear-query-button"
                  accessibilityLabel="清空搜索关键词"
                  onPress={clearLocalQuery}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={20} color="#A3A3A3" />
                </Pressable>
              )}
            </View>
          </View>

          {/* 筛选内容（可滚动） */}
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
          >
            <SearchOverlayTypeSection value={localType} onChange={setLocalType} />
            <SearchOverlayDateSection value={localDate} onChange={setLocalDate} />
            <SearchOverlayTagsSection
              tags={allTagsList}
              extraCommonTags={extraCommonTags}
              selectedTags={localTags}
              onToggleTag={handleToggleTag}
              onClearTags={clearTags}
            />

            {/* 重置 */}
            {hasActiveFilters && (
              <Pressable testID="search-overlay-reset-button" style={styles.resetButton} onPress={handleReset}>
                <Ionicons name="refresh" size={15} color="#6A89CC" />
                <Text style={styles.resetText}>重置全部</Text>
              </Pressable>
            )}

            <View style={styles.scrollBottomSpacer} />
          </ScrollView>

          <SearchOverlayFooter onCancel={onClose} onSearch={handleSearch} />
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
