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
  Pressable,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useEntryStore } from '@/src/store/entryStore';
import { useCommonTagsStore } from '@/src/store/commonTagsStore';

interface SearchOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
}

type FilterType = 'all' | 'text' | 'photo' | 'voice';
type DateRange = 'all' | 'today' | 'week' | 'month';

const SEARCH_SECTION_LABEL_CLASS_NAME =
  'text-[11px] font-bold uppercase tracking-[0.8px] text-copy-muted';

export function SearchOverlay({ visible, onClose, onSearch }: SearchOverlayProps) {
  const {
    searchQuery,
    filterType,
    filterDateRange,
    selectedTags,
    getAllTags,
    applySearchFilters,
  } = useEntryStore();

  // 本地状态，点击搜索才提交
  const [localQuery, setLocalQuery] = useState('');
  const [localType, setLocalType] = useState<FilterType>('all');
  const [localDate, setLocalDate] = useState<DateRange>('all');
  const [localTags, setLocalTags] = useState<string[]>([]);
  const [allTagsList, setAllTagsList] = useState<string[]>([]);

  const { tags: commonTags, isLoaded: tagsLoaded, loadCommonTags } = useCommonTagsStore();

  useEffect(() => {
    if (!tagsLoaded) loadCommonTags();
  }, [tagsLoaded, loadCommonTags]);

  // 常用标签中尚未出现在已使用标签列表里的部分
  const extraCommonTags = commonTags.filter((t) => !allTagsList.includes(t));

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

  const handleSearch = async () => {
    // 批量提交所有筛选条件，只触发一次数据库查询
    await applySearchFilters({
      query: localQuery,
      type: localType,
      dateRange: localDate,
      tags: localTags,
    });
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
      testID="search-overlay-root"
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="absolute inset-0 z-[100] bg-home-background"
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 pt-[60px]">
          {/* 搜索输入框 */}
          <View className="mb-5 px-4">
            <View
              testID="search-overlay-input-shell"
              className="h-[50px] flex-row items-center gap-[10px] rounded-full bg-background-elevated px-4 shadow-sm shadow-black/10"
            >
              <Ionicons name="search" size={20} color="#A3A3A3" />
              <TextInput
                className="flex-1 text-base text-home-mask"
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
            className="flex-1 px-4"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 类型 */}
            <View className="mb-7">
              <Text className={`${SEARCH_SECTION_LABEL_CLASS_NAME} mb-3`}>类型</Text>
              <View className="flex-row flex-wrap gap-2">
                {typeFilters.map((opt) => {
                  const active = localType === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      className="flex-row items-center gap-1.5 rounded-full bg-overlay-muted px-[14px] py-[9px]"
                      style={active ? { backgroundColor: opt.color } : undefined}
                      onPress={() => setLocalType(opt.key)}
                    >
                      <Ionicons
                        name={opt.icon as any}
                        size={15}
                        color={active ? '#FFFFFF' : opt.color}
                      />
                      <Text className={active ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-neutral-500'}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 时间 */}
            <View className="mb-7">
              <Text className={`${SEARCH_SECTION_LABEL_CLASS_NAME} mb-3`}>时间</Text>
              <View className="flex-row flex-wrap gap-2">
                {dateOptions.map((opt) => {
                  const active = localDate === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      className={active
                        ? 'rounded-full bg-primary px-4 py-[9px]'
                        : 'rounded-full bg-overlay-muted px-4 py-[9px]'}
                      onPress={() => setLocalDate(opt.key)}
                    >
                      <Text className={active ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-neutral-500'}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 标签 */}
            <View className="mb-7">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className={SEARCH_SECTION_LABEL_CLASS_NAME}>标签</Text>
                {localTags.length > 0 && (
                  <TouchableOpacity onPress={() => setLocalTags([])}>
                    <Text className="text-[13px] font-semibold text-primary">清除</Text>
                  </TouchableOpacity>
                )}
              </View>
              {allTagsList.length === 0 && extraCommonTags.length === 0 ? (
                <Text className="text-[13px] italic text-copy-hint">暂无标签，在编辑记录时添加</Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {allTagsList.map((tag) => {
                    const selected = localTags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        className={selected
                          ? 'flex-row items-center rounded-full bg-primary px-[14px] py-[9px]'
                          : 'flex-row items-center rounded-full bg-overlay-muted px-[14px] py-[9px]'}
                        onPress={() => handleToggleTag(tag)}
                      >
                        {selected && (
                          <View className="mr-1">
                            <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                          </View>
                        )}
                        <Text className={selected ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-copy-primary'}>
                          #{tag}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {extraCommonTags.map((tag) => {
                    const selected = localTags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        className={selected
                          ? 'flex-row items-center rounded-full bg-primary px-[14px] py-[9px]'
                          : 'flex-row items-center rounded-full border border-border-subtle bg-overlay-subtle px-[14px] py-[9px]'}
                        onPress={() => handleToggleTag(tag)}
                      >
                        {selected && (
                          <View className="mr-1">
                            <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                          </View>
                        )}
                        <Text className={selected ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-copy-muted'}>
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
              <Pressable
                testID="search-overlay-reset-button"
                className="mb-2 flex-row items-center justify-center gap-1.5 rounded-xl bg-home-filter py-3"
                onPress={handleReset}
              >
                <Ionicons name="refresh" size={15} color="#6A89CC" />
                <Text className="text-sm font-semibold text-primary">重置全部</Text>
              </Pressable>
            )}

            <View className="h-[100px]" />
          </ScrollView>

          {/* 底部固定按钮 */}
          <View className="flex-row gap-3 border-t border-border-overlay bg-home-background px-4 pb-8 pt-4">
            <Pressable className="h-[50px] flex-1 items-center justify-center rounded-full bg-overlay-muted" onPress={handleCancel}>
              <Text className="text-base font-semibold text-neutral-500">取消</Text>
            </Pressable>
            <Pressable
              testID="search-overlay-submit-button"
              className="h-[50px] flex-[2] flex-row items-center justify-center gap-2 rounded-full bg-primary"
              onPress={handleSearch}
            >
              <Ionicons name="search" size={18} color="#FFFFFF" />
              <Text className="text-base font-bold text-white">搜索</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
