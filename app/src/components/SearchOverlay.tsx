/**
 * 搜索遮罩组件
 * 全屏搜索界面：关键词 + 类型/时间/标签筛选
 * 点击"搜索"后提交并返回时间线显示结果
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useEntryStore } from '@/src/store/entryStore';

interface SearchOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
}

type FilterType = 'all' | 'text' | 'photo' | 'voice';
type DateRange = 'all' | 'today' | 'week' | 'month';

export function SearchOverlay({ visible, onClose, onSearch }: SearchOverlayProps) {
  const {
    searchQuery,
    filterType,
    filterDateRange,
    selectedTags,
    setSearchQuery,
    setFilterType,
    setFilterDateRange,
    getAllTags,
    toggleTag,
    clearTags,
  } = useEntryStore();

  // 本地状态，点击搜索才提交
  const [localQuery, setLocalQuery] = useState('');
  const [localType, setLocalType] = useState<FilterType>('all');
  const [localDate, setLocalDate] = useState<DateRange>('all');
  const [localTags, setLocalTags] = useState<string[]>([]);
  const [allTagsList, setAllTagsList] = useState<string[]>([]);

  // 打开时同步当前筛选状态
  useEffect(() => {
    if (visible) {
      setLocalQuery(searchQuery);
      setLocalType(filterType);
      setLocalDate(filterDateRange);
      setLocalTags([...selectedTags]);
      getAllTags().then(setAllTagsList);
    }
  }, [visible]);

  // 标签列表只在 overlay 打开时加载一次，不跟随 entries 变化（避免录音计时器触发高频查询）

  const handleToggleTag = (tag: string) => {
    setLocalTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSearch = () => {
    // 提交所有筛选到 store
    setSearchQuery(localQuery);
    setFilterType(localType);
    setFilterDateRange(localDate);
    // 同步标签：先清除再逐个添加
    clearTags();
    localTags.forEach((tag) => toggleTag(tag));
    onSearch(localQuery);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleReset = () => {
    setLocalQuery('');
    setLocalType('all');
    setLocalDate('all');
    setLocalTags([]);
  };

  const hasActiveFilters =
    localQuery.trim() ||
    localType !== 'all' ||
    localDate !== 'all' ||
    localTags.length > 0;

  const typeFilters: Array<{ key: FilterType; label: string; icon: string; color: string }> = [
    { key: 'all',   label: '全部', icon: 'apps',          color: '#737373' },
    { key: 'text',  label: '文字', icon: 'document-text', color: '#A491D3' },
    { key: 'photo', label: '照片', icon: 'image',         color: '#77C9D4' },
    { key: 'voice', label: '语音', icon: 'mic',           color: '#F5A623' },
  ];

  const dateOptions: Array<{ key: DateRange; label: string }> = [
    { key: 'all',   label: '全部时间' },
    { key: 'today', label: '今天' },
    { key: 'week',  label: '本周' },
    { key: 'month', label: '本月' },
  ];

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={styles.overlay}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                <Pressable onPress={() => setLocalQuery('')} hitSlop={8}>
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
          >
            {/* 类型 */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>类型</Text>
              <View style={styles.chips}>
                {typeFilters.map((opt) => {
                  const active = localType === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      style={[styles.typeChip, active && { backgroundColor: opt.color }]}
                      onPress={() => setLocalType(opt.key)}
                    >
                      <Ionicons
                        name={opt.icon as any}
                        size={15}
                        color={active ? '#FFFFFF' : opt.color}
                      />
                      <Text style={[styles.typeChipText, active && styles.activeText]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 时间 */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>时间</Text>
              <View style={styles.chips}>
                {dateOptions.map((opt) => {
                  const active = localDate === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      style={[styles.dateChip, active && styles.dateChipActive]}
                      onPress={() => setLocalDate(opt.key)}
                    >
                      <Text style={[styles.dateChipText, active && styles.activeText]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 标签 */}
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionLabel}>标签</Text>
                {localTags.length > 0 && (
                  <TouchableOpacity onPress={() => setLocalTags([])}>
                    <Text style={styles.clearTagsText}>清除</Text>
                  </TouchableOpacity>
                )}
              </View>
              {allTagsList.length === 0 ? (
                <Text style={styles.emptyTagsHint}>暂无标签，在编辑记录时添加</Text>
              ) : (
                <View style={styles.chips}>
                  {allTagsList.map((tag) => {
                    const selected = localTags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        style={[styles.tagChip, selected && styles.tagChipActive]}
                        onPress={() => handleToggleTag(tag)}
                      >
                        {selected && (
                          <Ionicons name="checkmark" size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
                        )}
                        <Text style={[styles.tagChipText, selected && styles.activeText]}>
                          #{tag}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 重置 */}
            {hasActiveFilters && (
              <Pressable style={styles.resetButton} onPress={handleReset}>
                <Ionicons name="refresh" size={15} color="#6A89CC" />
                <Text style={styles.resetText}>重置全部</Text>
              </Pressable>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* 底部固定按钮 */}
          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <Pressable style={styles.searchButton} onPress={handleSearch}>
              <Ionicons name="search" size={18} color="#FFFFFF" />
              <Text style={styles.searchButtonText}>搜索</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#FAF8F5',
    zIndex: 100,
  },
  container: {
    flex: 1,
    paddingTop: 60,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 28,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A3A3A3',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    gap: 6,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#737373',
  },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
  },
  dateChipActive: {
    backgroundColor: '#6A89CC',
  },
  dateChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#737373',
  },
  activeText: {
    color: '#FFFFFF',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
  },
  tagChipActive: {
    backgroundColor: '#6A89CC',
  },
  tagChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  clearTagsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6A89CC',
  },
  emptyTagsHint: {
    fontSize: 13,
    color: '#C0C0C0',
    fontStyle: 'italic',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    marginBottom: 8,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A89CC',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
    backgroundColor: '#FAF8F5',
  },
  cancelButton: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 25,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#737373',
  },
  searchButton: {
    flex: 2,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6A89CC',
    borderRadius: 25,
    gap: 8,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
