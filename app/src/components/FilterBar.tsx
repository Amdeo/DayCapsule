/**
 * 筛选栏组件 - 简化版
 * 提供类型、日期范围和标签筛选功能
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutDown, useSharedValue, useAnimatedStyle, withSpring, cancelAnimation } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useEntryStore } from '../store/entryStore';

// 动画按钮组件
interface AnimatedButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
}

function AnimatedButton({ children, onPress, style }: AnimatedButtonProps) {
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

  // 计算各类型数量
  const typeStats = {
    all: entries.length,
    text: entries.filter((e) => e.type === 'text').length,
    photo: entries.filter((e) => e.type === 'photo').length,
    voice: entries.filter((e) => e.type === 'voice').length,
  };

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
    <View style={styles.container}>
      {/* 收起按钮 */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>筛选</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="chevron-up" size={20} color="#737373" />
        </TouchableOpacity>
      </View>

      {/* 筛选内容 */}
      <View>
        {/* 类型筛选 */}
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>类型</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {typeFilters.map((filter) => {
            const isSelected = filterType === filter.type;
            return (
              <AnimatedButton
                key={filter.type}
                onPress={() => setFilterType(filter.type)}
                style={[
                  styles.filterButton,
                  isSelected && styles.filterButtonActive,
                ]}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: isSelected ? filter.color : '#F5F5F5' },
                  ]}
                >
                  <Ionicons
                    name={filter.icon as any}
                    size={18}
                    color={isSelected ? '#FFFFFF' : filter.color}
                  />
                </View>
                <Text
                  style={[
                    styles.filterLabel,
                    isSelected && styles.filterLabelActive,
                  ]}
                >
                  {filter.label}
                </Text>
                <Text
                  style={[
                    styles.filterCount,
                    isSelected && styles.filterCountActive,
                  ]}
                >
                  {typeStats[filter.type]}
                </Text>
              </AnimatedButton>
            );
          })}
        </ScrollView>
      </View>

      {/* 日期范围筛选 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>时间</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {dateFilters.map((filter) => {
            const isSelected = filterDateRange === filter.range;
            return (
              <AnimatedButton
                key={filter.range}
                onPress={() => setFilterDateRange(filter.range)}
                style={[
                  styles.dateButton,
                  isSelected && styles.dateButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.dateLabel,
                    isSelected && styles.dateLabelActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </AnimatedButton>
            );
          })}
        </ScrollView>
      </View>

      {/* 重置按钮 */}
      {(filterType !== 'all' || filterDateRange !== 'all' || selectedTags.length > 0) && (
        <View style={styles.resetSection}>
          <AnimatedButton
            onPress={() => {
              setFilterType('all');
              setFilterDateRange('all');
              clearTags();
            }}
            style={styles.resetButton}
          >
            <Ionicons name="refresh" size={16} color="#6A89CC" />
            <Text style={styles.resetText}>重置筛选</Text>
          </AnimatedButton>
        </View>
      )}

      {/* 标签筛选按钮 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>标签</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <AnimatedButton
            onPress={() => setShowTagModal(true)}
            style={[styles.tagButton, selectedTags.length > 0 && styles.tagButtonActive]}
          >
            <Ionicons
              name="pricetags"
              size={16}
              color={selectedTags.length > 0 ? '#FFFFFF' : '#6A89CC'}
            />
            <Text
              style={[
                styles.tagButtonText,
                selectedTags.length > 0 && styles.tagButtonTextActive,
              ]}
            >
              {selectedTags.length > 0 ? `已选 ${selectedTags.length} 个` : '选择标签'}
            </Text>
          </AnimatedButton>

          {selectedTags.map((tag) => (
            <View key={tag} style={styles.selectedTag}>
              <Text style={styles.selectedTagText}>#{tag}</Text>
              <TouchableOpacity onPress={() => toggleTag(tag)} style={styles.removeTagButton}>
                <Ionicons name="close-circle" size={16} color="#6A89CC" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
      </View>

      {/* 标签选择模态框 */}
      {showTagModal && (
        <TagModal
          visible={showTagModal}
          allTags={getAllTags() || []}
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
      <View style={styles.modalContainer}>
        {/* 半透明背景 */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          {isAnimating && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={styles.modalBackdrop}
              pointerEvents="none"
            />
          )}
        </Pressable>

        {/* 模态框内容 */}
        {isAnimating && (
          <Animated.View
            entering={SlideInUp.duration(300).springify()}
            exiting={SlideOutDown.duration(250)}
            style={styles.modalContent}
          >
            <View
              style={{ flex: 1 }}
              onStartShouldSetResponder={() => true}
              onResponderRelease={() => {}}
            >
              {/* 头部 */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>选择标签</Text>
                <View style={styles.modalHeaderButtons}>
                  {selectedTags.length > 0 && (
                    <TouchableOpacity onPress={onClear} style={styles.clearButton}>
                      <Text style={styles.clearButtonText}>清除</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={onClose} style={styles.closeModalButton}>
                    <Ionicons name="close" size={24} color="#4A4A4A" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 标签列表 */}
              <ScrollView style={styles.tagList} showsVerticalScrollIndicator={false}>
                {allTags.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="pricetags-outline" size={48} color="#D1D1D1" />
                    <Text style={styles.emptyText}>暂无标签</Text>
                    <Text style={styles.emptyHint}>在编辑记录时添加标签</Text>
                  </View>
                ) : (
                  <View style={styles.tagGrid}>
                    {allTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                          onPress={() => onToggleTag(tag)}
                        >
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                          )}
                          <Text style={[styles.tagChipText, isSelected && styles.tagChipTextSelected]}>
                            #{tag}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </ScrollView>

              {/* 底部按钮 */}
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                  <Text style={styles.doneButtonText}>完成</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },
  closeButton: {
    padding: 4,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
  },
  section: {
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A3A3A3',
    marginLeft: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: '#F0F4FF',
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#737373',
  },
  filterLabelActive: {
    color: '#4A4A4A',
  },
  filterCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#A3A3A3',
  },
  filterCountActive: {
    color: '#6A89CC',
  },
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
  },
  dateButtonActive: {
    backgroundColor: '#6A89CC',
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#737373',
  },
  dateLabelActive: {
    color: '#FFFFFF',
  },
  resetSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    gap: 6,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A89CC',
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F0F4FF',
    borderRadius: 20,
    gap: 6,
  },
  tagButtonActive: {
    backgroundColor: '#6A89CC',
  },
  tagButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A89CC',
  },
  tagButtonTextActive: {
    color: '#FFFFFF',
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    backgroundColor: '#E8F0FE',
    borderRadius: 20,
    gap: 6,
  },
  selectedTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6A89CC',
  },
  removeTagButton: {
    padding: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  modalHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A89CC',
  },
  closeModalButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  tagList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A3A3A3',
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: '#D1D1D1',
    marginTop: 8,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 20,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
  },
  tagChipSelected: {
    backgroundColor: '#6A89CC',
  },
  tagChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  tagChipTextSelected: {
    color: '#FFFFFF',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  doneButton: {
    backgroundColor: '#6A89CC',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
