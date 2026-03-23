/**
 * 筛选栏组件 - 简化版
 * 提供类型、日期范围和标签筛选功能
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutDown, useSharedValue, useAnimatedStyle, withSpring, cancelAnimation } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useEntryStore } from '../store/entryStore';

// 动画按钮组件
interface AnimatedButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  className?: string;
  style?: any;
  testID?: string;
}

function AnimatedButton({ children, onPress, className, style, testID }: AnimatedButtonProps) {
  const scale = useSharedValue(1);

  // 组件卸载时清理动画
  useEffect(() => {
    return () => {
      cancelAnimation(scale);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        testID={testID}
        className={className}
        onPressIn={() => {
          scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        }}
        onPress={onPress}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function FilterBar({ isVisible, onClose }: { isVisible: boolean; onClose?: () => void }) {
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
  const typeStats = useMemo(() => ({
    all: entries.length,
    text: entries.filter((e) => e.type === 'text').length,
    photo: entries.filter((e) => e.type === 'photo').length,
    voice: entries.filter((e) => e.type === 'voice').length,
  }), [entries]);

  // 类型筛选配置
  const typeFilters: Array<{
    type: 'all' | 'text' | 'photo' | 'voice';
    label: string;
    icon: string;
    color: string;
  }> = [
    { type: 'all', label: '全部', icon: 'apps', color: '#737373' },
    { type: 'text', label: '文本', icon: 'document-text', color: '#A491D3' },
    { type: 'photo', label: '照片', icon: 'image', color: '#77C9D4' },
    { type: 'voice', label: '语音', icon: 'mic', color: '#F5A623' },
  ];

  // 日期范围筛选配置
  const dateFilters: Array<{
    range: 'all' | 'today' | 'week' | 'month';
    label: string;
  }> = [
    { range: 'all', label: '全部时间' },
    { range: 'today', label: '今天' },
    { range: 'week', label: '本周' },
    { range: 'month', label: '本月' },
  ];

  if (!isVisible) {
    return null;
  }

  return (
    <View testID="filter-bar-root" className="border-b border-neutral-200 bg-white">
      {/* 收起按钮 */}
      <View className="flex-row items-center justify-between border-b border-[#F0F0F0] px-4 py-3">
        <Text className="text-base font-semibold text-neutral-800">筛选</Text>
        <TouchableOpacity onPress={onClose} className="p-1">
          <Ionicons name="chevron-up" size={20} color="#737373" />
        </TouchableOpacity>
      </View>

      {/* 筛选内容 */}
      <View>
        {/* 类型筛选 */}
        <View className="py-3">
        <Text className="mb-2 ml-4 text-xs font-bold uppercase tracking-[0.5px] text-neutral-400">类型</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <View className="flex-row gap-2 px-4">
          {typeFilters.map((filter) => {
            const isSelected = filterType === filter.type;
            return (
              <AnimatedButton
                key={filter.type}
                onPress={() => setFilterType(filter.type)}
                className={`flex-row items-center gap-2 rounded-full px-3 py-2 ${
                  isSelected ? 'bg-[#F0F4FF]' : 'bg-[#F5F5F5]'
                }`}
              >
                <View
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: isSelected ? filter.color : '#F5F5F5' }}
                >
                  <Ionicons
                    name={filter.icon as any}
                    size={18}
                    color={isSelected ? '#FFFFFF' : filter.color}
                  />
                </View>
                <Text
                  className={`text-sm font-semibold ${
                    isSelected ? 'text-neutral-600' : 'text-neutral-500'
                  }`}
                >
                  {filter.label}
                </Text>
                <Text
                  className={`text-xs font-medium ${
                    isSelected ? 'text-primary' : 'text-neutral-400'
                  }`}
                >
                  {typeStats[filter.type]}
                </Text>
              </AnimatedButton>
            );
          })}
          </View>
        </ScrollView>
      </View>

      {/* 日期范围筛选 */}
      <View className="py-3">
        <Text className="mb-2 ml-4 text-xs font-bold uppercase tracking-[0.5px] text-neutral-400">时间</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <View className="flex-row gap-2 px-4">
          {dateFilters.map((filter) => {
            const isSelected = filterDateRange === filter.range;
            return (
              <AnimatedButton
                key={filter.range}
                onPress={() => setFilterDateRange(filter.range)}
                className={`rounded-full px-4 py-2 ${
                  isSelected ? 'bg-primary' : 'bg-[#F5F5F5]'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isSelected ? 'text-white' : 'text-neutral-500'
                  }`}
                >
                  {filter.label}
                </Text>
              </AnimatedButton>
            );
          })}
          </View>
        </ScrollView>
      </View>

      {/* 重置按钮 */}
      {(filterType !== 'all' || filterDateRange !== 'all' || selectedTags.length > 0) && (
        <View className="px-4 pb-3">
          <AnimatedButton
            testID="filter-bar-reset-button"
            onPress={() => {
              setFilterType('all');
              setFilterDateRange('all');
              clearTags();
            }}
            className="flex-row items-center justify-center gap-1.5 rounded-xl bg-[#F0F4FF] py-2.5"
          >
            <Ionicons name="refresh" size={16} color="#6A89CC" />
            <Text className="text-sm font-semibold text-primary">重置筛选</Text>
          </AnimatedButton>
        </View>
      )}

      {/* 标签筛选按钮 */}
      <View className="py-3">
        <Text className="mb-2 ml-4 text-xs font-bold uppercase tracking-[0.5px] text-neutral-400">标签</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <View className="flex-row gap-2 px-4">
          <AnimatedButton
            onPress={() => setShowTagModal(true)}
            className={`flex-row items-center gap-1.5 rounded-full px-4 py-2 ${
              selectedTags.length > 0 ? 'bg-primary' : 'bg-[#F0F4FF]'
            }`}
          >
            <Ionicons
              name="pricetags"
              size={16}
              color={selectedTags.length > 0 ? '#FFFFFF' : '#6A89CC'}
            />
            <Text
              className={`text-sm font-semibold ${
                selectedTags.length > 0 ? 'text-white' : 'text-primary'
              }`}
            >
              {selectedTags.length > 0 ? `已选 ${selectedTags.length} 个` : '选择标签'}
            </Text>
          </AnimatedButton>

          {selectedTags.map((tag) => (
            <View key={tag} className="flex-row items-center gap-1.5 rounded-full bg-[#E8F0FE] py-2 pl-3 pr-2">
              <Text className="text-[13px] font-semibold text-primary">#{tag}</Text>
              <TouchableOpacity onPress={() => toggleTag(tag)} className="p-0.5">
                <Ionicons name="close-circle" size={16} color="#6A89CC" />
              </TouchableOpacity>
            </View>
          ))}
          </View>
        </ScrollView>
      </View>
      </View>

      {/* 标签选择模态框 */}
      {showTagModal && (
        <TagModal
          visible={showTagModal}
          allTags={allTagsList}
          selectedTags={selectedTags}
          onToggleTag={toggleTag}
          onClose={() => setShowTagModal(false)}
          onClear={clearTags}
        />
      )}
    </View>
  );
}

// 标签选择模态框组件
function TagModal({
  visible,
  allTags,
  selectedTags,
  onToggleTag,
  onClose,
  onClear,
}: {
  visible: boolean;
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClose: () => void;
  onClear: () => void;
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        {/* 半透明背景 */}
        <Pressable className="absolute inset-0" onPress={onClose}>
          {isAnimating && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              className="absolute inset-0 bg-black/50"
              pointerEvents="none"
            />
          )}
        </Pressable>

        {/* 模态框内容 */}
        {isAnimating && (
          <Animated.View
            testID="filter-bar-tag-modal"
            entering={SlideInUp.duration(300).springify()}
            exiting={SlideOutDown.duration(250)}
            className="max-h-[70%] rounded-t-[24px] bg-white shadow-lg shadow-black/10"
          >
            <View className="flex-1" onStartShouldSetResponder={() => true} onResponderRelease={() => {}}>
              {/* 头部 */}
              <View className="flex-row items-center justify-between border-b border-neutral-200 px-5 pb-4 pt-5">
                <Text className="text-[20px] font-bold text-neutral-600">选择标签</Text>
                <View className="flex-row items-center gap-3">
                  {selectedTags.length > 0 && (
                    <TouchableOpacity onPress={onClear} className="px-3 py-1.5">
                      <Text className="text-sm font-semibold text-primary">清除</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full">
                    <Ionicons name="close" size={24} color="#4A4A4A" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 标签列表 */}
              <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
                {allTags.length === 0 ? (
                  <View className="items-center justify-center py-[60px]">
                    <Ionicons name="pricetags-outline" size={48} color="#D1D1D1" />
                    <Text className="mt-4 text-base font-semibold text-neutral-400">暂无标签</Text>
                    <Text className="mt-2 text-sm text-neutral-300">在编辑记录时添加标签</Text>
                  </View>
                ) : (
                  <View className="flex-row flex-wrap gap-2 pb-5">
                    {allTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          className={`flex-row items-center rounded-full px-4 py-2.5 ${
                            isSelected ? 'bg-primary' : 'bg-[#F5F5F5]'
                          }`}
                          onPress={() => onToggleTag(tag)}
                        >
                          {isSelected && (
                            <View className="mr-1">
                              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                            </View>
                          )}
                          <Text className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-neutral-600'}`}>
                            #{tag}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </ScrollView>

              {/* 底部按钮 */}
              <View className="border-t border-neutral-200 px-5 py-4">
                <TouchableOpacity className="items-center rounded-xl bg-primary py-3.5" onPress={onClose}>
                  <Text className="text-base font-semibold text-white">完成</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}
