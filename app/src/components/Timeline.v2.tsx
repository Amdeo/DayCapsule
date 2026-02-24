/**
 * 时间轴视图组件 - 连续不间断版本（带 Sticky Header）
 * 整合搜索栏和快速添加功能
 */

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated as RNAnimated, NativeScrollEvent, NativeSyntheticEvent, SectionList } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Entry } from '../types/entry';
import { EntryCard } from './EntryCard';
import { SearchBar } from './SearchBar';
import { SearchOverlay } from './SearchOverlay';
import { QuickAddButtons } from './QuickAddButtons';
import { EntryEditor } from './EntryEditor';
import {
  formatDateLabel,
  formatShortDate,
} from '../utils/timeUtils';
import { useEntryStore } from '../store/entryStore';
import type { TextInput } from 'react-native';

/**
 * 时间分组配置
 */
interface TimeSection {
  title: string;
  timestamp: number;
  data: (Entry | { type: 'quickAdd' })[];
}

/**
 * 生成时间分组数据
 */
function generateTimeSections(
  entries: Entry[],
  showQuickAdd: boolean
): TimeSection[] {
  const sections: TimeSection[] = [];
  let currentDateLabel = '';
  let currentSection: TimeSection | null = null;

  // 按时间倒序排序
  const sortedEntries = [...entries].sort((a, b) => b.timestamp - a.timestamp);

  sortedEntries.forEach((entry, index) => {
    const dateLabel = formatDateLabel(entry.timestamp);

    // 如果日期标签变化，创建一个新的分组
    if (dateLabel !== currentDateLabel) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: dateLabel,
        timestamp: entry.timestamp,
        data: [],
      };
      currentDateLabel = dateLabel;
    }

    // 添加记录到当前分组
    if (currentSection) {
      currentSection.data.push(entry);
    }
  });

  // 添加最后一个分组
  if (currentSection) {
    sections.push(currentSection);
  }

  // 在第一个分组添加快速添加按钮（如果是今天）
  if (showQuickAdd && sections.length > 0) {
    const firstSection = sections[0];
    const today = new Date();
    const firstEntryDate = new Date(firstSection.timestamp);
    const isToday =
      firstEntryDate.getDate() === today.getDate() &&
      firstEntryDate.getMonth() === today.getMonth() &&
      firstEntryDate.getFullYear() === today.getFullYear();

    if (isToday) {
      firstSection.data.unshift({ type: 'quickAdd' } as any);
    }
  }

  return sections;
}

/**
 * 时间轴头部组件 - Sticky
 */
interface TimelineHeaderProps {
  title: string;
  timestamp: number;
}

function TimelineHeader({ title, timestamp }: TimelineHeaderProps) {
  const timelineLeft = 40;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 64, height: 48, backgroundColor: '#FAF8F5' }}>
      {/* 上方的线 - 从顶部到圆心，与主时间线对齐 */}
      <View
        style={{
          position: 'absolute',
          left: timelineLeft,
          top: 0,
          width: 2,
          height: 24,
          backgroundColor: '#E5E5E5',
          zIndex: 1,
        }}
      />

      {/* 时间轴圆形标记 - 小圆点，圆心在 x=41（线的中心） */}
      <View
        style={{
          position: 'absolute',
          left: timelineLeft - 7,
          top: 16,
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: '#6A89CC',
          shadowColor: '#6A89CC',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 2,
          zIndex: 10,
        }}
      />

      {/* 下方的线 - 从圆心到底部，与主时间线对齐 */}
      <View
        style={{
          position: 'absolute',
          left: timelineLeft,
          top: 24,
          width: 2,
          height: 24,
          backgroundColor: '#E5E5E5',
          zIndex: 1,
        }}
      />

      {/* 标题文本 */}
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#4A4A4A' }}>
        {title}
      </Text>
    </View>
  );
}

/**
 * 快速添加组件
 */
interface QuickAddMarkerProps {
  onQuickAdd?: (type: 'text' | 'photo' | 'voice') => void;
}

function QuickAddMarker({ onQuickAdd }: QuickAddMarkerProps) {
  return (
    <View style={{ paddingLeft: 64, paddingRight: 24, paddingBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#A3A3A3' }}>
          添加新的记忆...
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: '#E5E5E5', marginLeft: 12 }} />
      </View>
      <QuickAddButtons onPress={onQuickAdd} />
    </View>
  );
}

/**
 * 记录项组件
 */
interface EntryMarkerProps {
  entry: Entry;
  onDeleteEntry: (id: string) => void;
  onEditEntry?: (entry: Entry) => void;
  onPauseRecording?: (id: string) => void;
  onResumeRecording?: (id: string) => void;
  onStopRecording?: (id: string) => void;
  isLast: boolean;
}

function EntryMarker({
  entry,
  onDeleteEntry,
  onEditEntry,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  isLast,
}: EntryMarkerProps) {
  const timelineLeft = 40;

  // 根据类型获取圆点颜色
  const getDotColor = () => {
    switch (entry.type) {
      case 'text': return '#A491D3';
      case 'photo': return '#77C9D4';
      case 'voice': return '#F5A623';
      default: return '#D1D1D1';
    }
  };

  // 格式化为时分
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <Animated.View
      entering={FadeIn.springify()}
      exiting={FadeOut.duration(200)}
      layout={LinearTransition.springify()}
      style={{ paddingLeft: 64, paddingRight: 24, paddingBottom: isLast ? 0 : 24, position: 'relative' }}
    >
      {/* 时间点圆点（带外圈）- 固定在时间线上 */}
      <View
        style={{
          position: 'absolute',
          left: timelineLeft - 7,
          top: 1,
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: getDotColor(),
          borderWidth: 2,
          borderColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
          zIndex: 2,
        }}
      />

      {/* 时间文本 - 与卡片开头对齐，颜色和圆点一致 */}
      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: getDotColor(), fontWeight: '500' }}>
          {formatTime(entry.timestamp)}
        </Text>
      </View>

      {/* 卡片 */}
      <EntryCard
        entry={entry}
        onDelete={onDeleteEntry}
        onEdit={onEditEntry}
        onPauseRecording={onPauseRecording}
        onResumeRecording={onResumeRecording}
        onStopRecording={onStopRecording}
      />
    </Animated.View>
  );
}

/**
 * 空状态组件
 */
interface EmptyStateProps {
  onQuickAdd?: (type: 'text' | 'photo' | 'voice') => void;
}

function EmptyState({ onQuickAdd }: EmptyStateProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(300).delay(200)}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 24 }}
    >
      <Animated.View entering={FadeIn.delay(400).springify()}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📭</Text>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(600)}>
        <Text style={{ fontSize: 16, color: '#A3A3A3', textAlign: 'center' }}>
          还没有记忆
        </Text>
        <Text style={{ fontSize: 14, color: '#D1D1D1', textAlign: 'center', marginTop: 8, marginBottom: 32 }}>
          选择一种方式开始记录
        </Text>
      </Animated.View>

      {/* 添加快速添加按钮 */}
      {onQuickAdd && (
        <Animated.View
          entering={FadeIn.delay(800)}
          style={{ width: '100%', maxWidth: 400 }}
        >
          <QuickAddButtons onPress={onQuickAdd} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

/**
 * 时间轴主组件
 */
interface TimelineProps {
  onQuickAdd?: (type: 'text' | 'photo' | 'voice') => void;
  onMenuPress?: () => void;
  onPauseRecording?: (id: string) => void;
  onResumeRecording?: (id: string) => void;
  onStopRecording?: (id: string) => void;
  onOpenMediaSelector?: () => void;
}

export function Timeline({ onQuickAdd, onMenuPress, onPauseRecording, onResumeRecording, onStopRecording, onOpenMediaSelector }: TimelineProps) {
  const { entries, deleteEntry, searchQuery, filteredEntries, updateEntry, filterType, filterDateRange } = useEntryStore();
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const searchInputRef = React.useRef<TextInput>(null);
  const sectionListRef = useRef<SectionList>(null);
  const scrollTopOpacity = useRef(new RNAnimated.Value(0)).current;
  const scrollTopScale = useRef(new RNAnimated.Value(1)).current;
  const fabOpacity = useRef(new RNAnimated.Value(1)).current;
  const [fabColor, setFabColor] = useState('#6A89CC');
  const lastScrollY = useRef(0);

  // 使用过滤后的记录：如果有搜索或过滤条件，显示过滤结果，否则显示所有记录
  const hasFilters = searchQuery.trim() || filterType !== 'all' || filterDateRange !== 'all';
  const displayEntries = hasFilters ? filteredEntries : entries;

  // 生成时间分组数据
  const sections = useMemo(() => {
    return generateTimeSections(displayEntries, !hasFilters);
  }, [displayEntries, hasFilters]);

  // 检查是否有记录
  const hasEntries = displayEntries.length > 0;

  // 处理编辑保存
  const handleSaveEdit = (id: string, content: string, tags: string[]) => {
    updateEntry(id, { content, tags });
    setEditingEntry(null);
  };

  // 处理搜索框聚焦 - 显示搜索遮罩
  const handleSearchFocus = () => {
    setShowSearchOverlay(true);
  };

  // 处理搜索
  const handleSearch = () => {
    setShowSearchOverlay(false);
  };

  // 处理搜索遮罩关闭
  const handleSearchOverlayClose = () => {
    setShowSearchOverlay(false);
  };

  // 处理编辑
  const handleEditEntry = (entry: Entry) => {
    console.log('Timeline handleEditEntry 被调用，entry:', entry);
    setEditingEntry(entry);
    console.log('editingEntry 已设置');
  };

  // 处理滚动事件
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const scrollDirection = offsetY > lastScrollY.current ? 'down' : 'up';
    lastScrollY.current = offsetY;

    // FAB 颜色和透明度：根据滚动方向变化
    if (scrollDirection === 'down' && offsetY > 50) {
      // 向下滑动：淡灰色
      setFabColor('#D1D1D6');
      RNAnimated.timing(fabOpacity, {
        toValue: 0.7,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (scrollDirection === 'up') {
      // 向上滑动：恢复蓝色
      setFabColor('#6A89CC');
      RNAnimated.timing(fabOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }

    // 当快速添加按钮区域滚出屏幕时显示"返回顶部"按钮
    if (offsetY > 200 && !showScrollTop) {
      setShowScrollTop(true);
      RNAnimated.timing(scrollTopOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    // 当快速添加按钮区域还在屏幕内时隐藏"返回顶部"按钮
    else if (offsetY <= 200 && showScrollTop) {
      RNAnimated.timing(scrollTopOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowScrollTop(false);
      });
    }
  };

  // 返回顶部函数
  const scrollToTop = () => {
    sectionListRef.current?.scrollToLocation({
      sectionIndex: 0,
      itemIndex: 0,
      animated: true,
    });
  };

  // 按钮按下动画
  const handlePressIn = () => {
    RNAnimated.spring(scrollTopScale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  // 按钮释放动画
  const handlePressOut = () => {
    RNAnimated.spring(scrollTopScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePauseRecording = (id: string) => {
    onPauseRecording?.(id);
  };

  const handleResumeRecording = (id: string) => {
    onResumeRecording?.(id);
  };

  const handleStopRecording = (id: string) => {
    onStopRecording?.(id);
  };

  // 渲染列表项
  const renderItem = useCallback(({ item, index, section }: { item: Entry | { type: 'quickAdd' }; index: number; section: TimeSection }) => {
    if ('type' in item && item.type === 'quickAdd') {
      return <QuickAddMarker onQuickAdd={onQuickAdd} />;
    }

    const isLast = index === section.data.length - 1;
    return (
      <EntryMarker
        entry={item as Entry}
        onDeleteEntry={deleteEntry}
        onEditEntry={handleEditEntry}
        onPauseRecording={handlePauseRecording}
        onResumeRecording={handleResumeRecording}
        onStopRecording={handleStopRecording}
        isLast={isLast}
      />
    );
  }, [deleteEntry, handleEditEntry, handlePauseRecording, handleResumeRecording, handleStopRecording, onQuickAdd]);

  // 渲染分组头部 - Sticky
  const renderSectionHeader = useCallback(({ section }: { section: TimeSection }) => {
    return <TimelineHeader title={section.title} timestamp={section.timestamp} />;
  }, []);

  const timelineLeft = 40;

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      {/* 搜索遮罩 */}
      <SearchOverlay
        visible={showSearchOverlay}
        onClose={handleSearchOverlayClose}
        onSearch={handleSearch}
      />

      {/* 搜索栏 */}
      <SearchBar
        onMenuPress={onMenuPress}
        onSearchFocus={handleSearchFocus}
        onSearchBlur={() => {}}
        searchInputRef={searchInputRef}
      />

      {!hasEntries ? (
        <EmptyState onQuickAdd={onQuickAdd} />
      ) : (
        <View style={{ flex: 1, position: 'relative' }}>
          {/* 连续的时间线 - 贯穿整个时间轴（在最底层） */}
          <View
            style={{
              position: 'absolute',
              left: timelineLeft,
              top: 0,
              bottom: 0,
              width: 2,
              backgroundColor: '#E5E5E5',
              zIndex: 0,
            }}
          />

          <SectionList
            ref={sectionListRef}
            sections={sections}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={true}
            keyExtractor={(item, index) => {
              if ('type' in item && item.type === 'quickAdd') {
                return 'quick-add';
              }
              return (item as Entry).id;
            }}
            contentContainerStyle={{ paddingBottom: 160 }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* 编辑器模态框 */}
      <EntryEditor
        visible={editingEntry !== null}
        entry={editingEntry}
        onSave={handleSaveEdit}
        onClose={() => setEditingEntry(null)}
      />

      {/* 返回顶部按钮 */}
      {showScrollTop && (
        <RNAnimated.View
          style={{
            position: 'absolute',
            bottom: 80,
            right: 20,
            zIndex: 999,
            opacity: scrollTopOpacity,
            transform: [{ scale: scrollTopScale }],
          }}
        >
          <TouchableOpacity
            onPress={scrollToTop}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.8}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Ionicons name="arrow-up" size={24} color="#6A89CC" />
          </TouchableOpacity>
        </RNAnimated.View>
      )}

      {/* FAB 浮动操作按钮 */}
      <RNAnimated.View
        style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          marginLeft: -28,
          opacity: fabOpacity,
          zIndex: 1000,
        }}
      >
        <TouchableOpacity
          onPress={onOpenMediaSelector}
          activeOpacity={0.8}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: fabColor,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </RNAnimated.View>
    </View>
  );
}
