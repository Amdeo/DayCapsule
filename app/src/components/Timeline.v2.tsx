/**
 * 时间轴视图组件 - 连续不间断版本（带 Sticky Header）
 * 整合搜索栏和快速添加功能
 */

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated as RNAnimated, NativeScrollEvent, NativeSyntheticEvent, SectionList, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Entry } from '../types/entry';
import { EntryCard } from './EntryCard';
import { SearchBar } from './SearchBar';
import { SearchOverlay } from './SearchOverlay';
import { EntryEditor } from './EntryEditor';
import { formatDateLabel, formatHHMM } from '../utils/timeUtils';
import { useEntryStore } from '../store/entryStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarView } from './CalendarView';
import { useSettingsStore, SPACING_VALUES } from '@/src/store/settingsStore';
import { FABMenu } from './FABMenu';
import { PhotoResult } from '../services/photoService';

type ViewMode = 'list' | 'monthly' | 'calendar';

/**
 * 时间分组配置
 */
interface TimeSection {
  title: string;
  timestamp: number;
  data: Entry[];
}

/**
 * 生成时间分组数据
 */
function generateTimeSections(
  entries: Entry[]
): TimeSection[] {
  const sections: TimeSection[] = [];
  let currentDateLabel = '';
  let currentSection: TimeSection | null = null;

  entries.forEach((entry) => {
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

  return sections;
}

/**
 * 按月分组（月份列表视图）
 */
function generateMonthlySections(entries: Entry[]): TimeSection[] {
  const sections: TimeSection[] = [];
  let currentKey = '';
  let currentSection: TimeSection | null = null;

  entries.forEach((entry) => {
    const d = new Date(entry.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    if (key !== currentKey) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: label, timestamp: entry.timestamp, data: [] };
      currentKey = key;
    }
    currentSection!.data.push(entry);
  });
  if (currentSection) sections.push(currentSection);
  return sections;
}

/**
 * 视图模式切换 Tab
 */
const VIEW_MODES: { mode: ViewMode; icon: string; label: string }[] = [
  { mode: 'list', icon: 'list', label: '列表' },
  { mode: 'monthly', icon: 'layers', label: '按月' },
  { mode: 'calendar', icon: 'calendar', label: '日历' },
];

function ViewModeToggle({
  current,
  onChange,
}: {
  current: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <View style={vmStyles.container}>
      {VIEW_MODES.map(({ mode, icon, label }) => {
        const active = current === mode;
        return (
          <TouchableOpacity
            key={mode}
            style={[vmStyles.tab, active && vmStyles.tabActive]}
            onPress={() => onChange(mode)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={icon as any}
              size={16}
              color={active ? '#6A89CC' : '#A3A3A3'}
            />
            <Text style={[vmStyles.label, active && vmStyles.labelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const vmStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6A89CC',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#A3A3A3',
  },
  labelActive: {
    color: '#6A89CC',
    fontWeight: '700',
  },
});

/**
 * 时间轴头部组件 - Sticky
 */
interface TimelineHeaderProps {
  title: string;
  timestamp: number;
}

const TimelineHeader = React.memo(function TimelineHeader({ title, timestamp }: TimelineHeaderProps) {
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
});

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
  isActionSheetActive: boolean;
  onActionSheetOpen: (id: string) => void;
  isLast: boolean;
  cardSpacing: number;
  enterDelay?: number;
}

const EntryMarker = React.memo(function EntryMarker({
  entry,
  onDeleteEntry,
  onEditEntry,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  isActionSheetActive,
  onActionSheetOpen,
  isLast,
  cardSpacing,
  enterDelay = 0,
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

  return (
    <View
      style={{ paddingLeft: 64, paddingRight: 24, paddingBottom: isLast ? 0 : cardSpacing, position: 'relative' }}
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
          {formatHHMM(entry.timestamp)}
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
        isActionSheetActive={isActionSheetActive}
        onActionSheetOpen={onActionSheetOpen}
        cardSpacing={cardSpacing}
        enterDelay={enterDelay}
      />
    </View>
  );
});

const DotsLoader: React.FC = () => {
  const dot1 = useRef(new RNAnimated.Value(0)).current;
  const dot2 = useRef(new RNAnimated.Value(0)).current;
  const dot3 = useRef(new RNAnimated.Value(0)).current;
  const loaderDots = [
    { key: 'text', color: '#A491D3', translateY: dot1 },
    { key: 'photo', color: '#77C9D4', translateY: dot2 },
    { key: 'voice', color: '#F5A623', translateY: dot3 },
  ];

  useEffect(() => {
    const makeBounce = (anim: RNAnimated.Value) =>
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(anim, { toValue: -8, duration: 200, useNativeDriver: true }),
          RNAnimated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ])
      );

    const a1 = makeBounce(dot1);
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;
    let a2: RNAnimated.CompositeAnimation;
    let a3: RNAnimated.CompositeAnimation;

    a1.start();
    t2 = setTimeout(() => { a2 = makeBounce(dot2); a2.start(); }, 150);
    t3 = setTimeout(() => { a3 = makeBounce(dot3); a3.start(); }, 300);

    return () => {
      a1.stop();
      clearTimeout(t2);
      clearTimeout(t3);
      if (a2) a2.stop();
      if (a3) a3.stop();
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {loaderDots.map((dot) => (
          <RNAnimated.View
            key={dot.key}
            testID={`loader-dot-${dot.key}`}
            style={[
              dotStyle,
              { backgroundColor: dot.color },
              { transform: [{ translateY: dot.translateY }] },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

/**
 * 空状态组件
 */
function EmptyState() {
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
        <Text style={{ fontSize: 14, color: '#D1D1D1', textAlign: 'center', marginTop: 8 }}>
          点击右下角 + 按钮开始记录
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * 时间轴主组件
 */
interface TimelineProps {
  onQuickAdd?: (type: 'text' | 'photo' | 'voice', photos?: PhotoResult[]) => void;
  onMenuPress?: () => void;
  onPauseRecording?: (id: string) => void;
  onResumeRecording?: (id: string) => void;
  onStopRecording?: (id: string) => void;
}

export function Timeline({ onQuickAdd, onMenuPress, onPauseRecording, onResumeRecording, onStopRecording }: TimelineProps) {
  const {
    entries, deleteEntry, searchQuery, updateEntry,
    filterType, filterDateRange, selectedTags,
    setSearchQuery, setFilterType, setFilterDateRange, toggleTag, clearTags,
    loadMore, isLoadingMore, hasMore,
  } = useEntryStore();
  const insets = useSafeAreaInsets();
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [displayMode, setDisplayMode] = useState<ViewMode>('list');
  const skipTransitionRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const [showViewToggle, setShowViewToggle] = useState(false);
  const [activeActionSheetId, setActiveActionSheetId] = useState<string | null>(null);
  const sectionListRef = useRef<SectionList<Entry, TimeSection>>(null);
  const isTransitioning = viewMode !== displayMode;

  // 从共享 store 获取卡片间距设置（无需轮询，自动响应状态变化）
  const { cardSpacing: cardSpacingKey } = useSettingsStore();
  const cardSpacing = SPACING_VALUES[cardSpacingKey];

  const scrollTopOpacity = useRef(new RNAnimated.Value(0)).current;
  const scrollTopScale = useRef(new RNAnimated.Value(1)).current;
  const lastScrollY = useRef(0);
  const [fabShouldHide, setFabShouldHide] = useState(false);

  // 使用过滤后的记录：如果有搜索或过滤条件，显示过滤结果，否则显示所有记录
  const hasFilters = !!(searchQuery.trim() || filterType !== 'all' || filterDateRange !== 'all' || selectedTags.length > 0);
  const displayEntries = entries;

  // 视图切换圆点动画：viewMode 变化 → 显示圆点 600ms → 更新 displayMode → 直接渲染卡片
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    if (skipTransitionRef.current) {
      skipTransitionRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setDisplayMode(viewMode);
    }, 600);
    return () => clearTimeout(timer);
  }, [viewMode]);

  // 生成时间分组数据
  const sections = useMemo(() => {
    if (displayMode === 'monthly') return generateMonthlySections(displayEntries);
    return generateTimeSections(displayEntries);
  }, [displayEntries, displayMode]);

  const globalIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let i = 0;
    for (const section of sections) {
      for (const entry of section.data) {
        map.set(entry.id, i++);
      }
    }
    return map;
  }, [sections]);

  // 检查是否有记录
  const hasEntries = displayEntries.length > 0;

  // 处理编辑保存
  const handleSaveEdit = (id: string, content: string, tags: string[]) => {
    updateEntry(id, { content, tags });
    setEditingEntry(null);
  };

  // 处理搜索框聚焦 - 显示搜索遮罩
  const handleSearchFocus = () => setShowSearchOverlay(true);

  // 处理搜索遮罩关闭（搜索完成和关闭共用）
  const handleCloseSearch = () => setShowSearchOverlay(false);

  // 切换视图模式面板：收起时若非列表模式则重置回列表
  const handleToggleViewMode = () => {
    if (showViewToggle && viewMode !== 'list') {
      skipTransitionRef.current = true;
      setViewMode('list');
      setDisplayMode('list');
    }
    setShowViewToggle(v => !v);
  };

  // 处理编辑
  const handleEditEntry = useCallback((entry: Entry) => setEditingEntry(entry), []);

  const handleActionSheetOpen = useCallback((id: string) => {
    setActiveActionSheetId(id);
  }, []);

  // 稳定的 keyExtractor，避免视图切换时整批卸载重建
  const keyExtractor = useCallback((item: Entry) => item.id, []);

  // 处理滚动事件
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const scrollDirection = offsetY > lastScrollY.current ? 'down' : 'up';
    lastScrollY.current = offsetY;

    // FAB peek-hide：向下滚动超过 50dp 时隐藏，向上滚动时显示
    if (scrollDirection === 'down' && offsetY > 50) {
      setFabShouldHide(true);
    } else if (scrollDirection === 'up') {
      setFabShouldHide(false);
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
  }, [showScrollTop, scrollTopOpacity]);

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

  // 渲染列表项
  const renderItem = useCallback(({ item, index, section }: { item: Entry; index: number; section: TimeSection }) => {
    const isLast = index === section.data.length - 1;
    const globalIndex = globalIndexMap.get(item.id) ?? 0;
    const staggerIndex = Math.min(globalIndex, 8);
    const enterDelay = staggerIndex * 90;
    return (
      <EntryMarker
        entry={item}
        onDeleteEntry={deleteEntry}
        onEditEntry={handleEditEntry}
        onPauseRecording={onPauseRecording}
        onResumeRecording={onResumeRecording}
        onStopRecording={onStopRecording}
        isActionSheetActive={activeActionSheetId === item.id}
        onActionSheetOpen={handleActionSheetOpen}
        isLast={isLast}
        cardSpacing={cardSpacing}
        enterDelay={enterDelay}
      />
    );
  }, [activeActionSheetId, cardSpacing, deleteEntry, globalIndexMap, handleActionSheetOpen, handleEditEntry, onPauseRecording, onResumeRecording, onStopRecording]);

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
        onClose={handleCloseSearch}
        onSearch={handleCloseSearch}
      />

      {/* 搜索栏 */}
      <SearchBar
        onMenuPress={onMenuPress}
        onSearchFocus={handleSearchFocus}
        onViewModePress={handleToggleViewMode}
        showViewModeActive={showViewToggle}
      />

      {/* 视图模式切换（按需展开） */}
      {showViewToggle && <ViewModeToggle current={viewMode} onChange={setViewMode} />}

      {/* 筛选状态条 */}
      {hasFilters && (
        <ActiveFiltersBar
          searchQuery={searchQuery}
          filterType={filterType}
          filterDateRange={filterDateRange}
          selectedTags={selectedTags}
          resultCount={displayEntries.length}
          onClearQuery={() => setSearchQuery('')}
          onClearType={() => setFilterType('all')}
          onClearDate={() => setFilterDateRange('all')}
          onClearTag={(tag) => toggleTag(tag)}
          onClearAll={() => {
            setSearchQuery('');
            setFilterType('all');
            setFilterDateRange('all');
            clearTags();
          }}
          onOpenSearch={handleSearchFocus}
        />
      )}

      {isTransitioning ? (
        <DotsLoader />
      ) : displayMode === 'calendar' ? (
        <CalendarView entries={displayEntries} />
      ) : !hasEntries ? (
        <EmptyState />
      ) : (
        <View style={{ flex: 1, position: 'relative' }}>
          {/* 连续的时间线 - 仅列表模式显示 */}
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
          <SectionList<Entry, TimeSection>
            ref={sectionListRef}
            sections={sections}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={true}
            keyExtractor={keyExtractor}
            contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            onEndReached={() => { if (hasMore) loadMore(); }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={isLoadingMore ? (
              <ActivityIndicator size="small" color="#8B7355" style={{ paddingVertical: 16 }} />
            ) : null}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={21}
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

      {/* FAB 浮动操作按钮（搜索界面时隐藏）- 花瓣展开动画 */}
      {!showSearchOverlay && (
        <FABMenu
          onSelect={onQuickAdd ?? (() => {})}
          shouldHide={fabShouldHide}
          onRevealRequest={() => setFabShouldHide(false)}
        />
      )}
    </View>
  );
}

// ─── 筛选状态条 ───────────────────────────────────────────────

interface ActiveFiltersBarProps {
  searchQuery: string;
  filterType: string;
  filterDateRange: string;
  selectedTags: string[];
  resultCount: number;
  onClearQuery: () => void;
  onClearType: () => void;
  onClearDate: () => void;
  onClearTag: (tag: string) => void;
  onClearAll: () => void;
  onOpenSearch: () => void;
}

const DATE_LABEL: Record<string, string> = {
  today: '今天', week: '本周', month: '本月',
};
const TYPE_LABEL: Record<string, string> = {
  text: '文字', photo: '照片', voice: '语音',
};

function ActiveFiltersBar({
  searchQuery, filterType, filterDateRange, selectedTags,
  resultCount, onClearQuery, onClearType, onClearDate, onClearTag, onClearAll, onOpenSearch,
}: ActiveFiltersBarProps) {
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={filterBarStyles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={filterBarStyles.scroll}
      >
        {/* 结果数 */}
        <TouchableOpacity style={filterBarStyles.resultBadge} onPress={onOpenSearch}>
          <Ionicons name="search" size={13} color="#6A89CC" />
          <Text style={filterBarStyles.resultText}>{resultCount} 条</Text>
        </TouchableOpacity>

        {/* 关键词 chip */}
        {searchQuery.trim() ? (
          <View style={filterBarStyles.chip}>
            <Text style={filterBarStyles.chipText} numberOfLines={1}>"{searchQuery}"</Text>
            <TouchableOpacity onPress={onClearQuery} hitSlop={6}>
              <Ionicons name="close" size={13} color="#6A89CC" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* 类型 chip */}
        {filterType !== 'all' ? (
          <View style={filterBarStyles.chip}>
            <Text style={filterBarStyles.chipText}>{TYPE_LABEL[filterType] ?? filterType}</Text>
            <TouchableOpacity onPress={onClearType} hitSlop={6}>
              <Ionicons name="close" size={13} color="#6A89CC" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* 时间 chip */}
        {filterDateRange !== 'all' ? (
          <View style={filterBarStyles.chip}>
            <Text style={filterBarStyles.chipText}>{DATE_LABEL[filterDateRange] ?? filterDateRange}</Text>
            <TouchableOpacity onPress={onClearDate} hitSlop={6}>
              <Ionicons name="close" size={13} color="#6A89CC" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* 标签 chips */}
        {selectedTags.map((tag) => (
          <View key={tag} style={filterBarStyles.chip}>
            <Text style={filterBarStyles.chipText}>#{tag}</Text>
            <TouchableOpacity onPress={() => onClearTag(tag)} hitSlop={6}>
              <Ionicons name="close" size={13} color="#6A89CC" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* 清除全部 */}
      <TouchableOpacity style={filterBarStyles.clearAll} onPress={onClearAll}>
        <Ionicons name="close-circle" size={18} color="#A3A3A3" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const filterBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DDE5F8',
    paddingVertical: 8,
  },
  scroll: {
    paddingHorizontal: 12,
    gap: 6,
    alignItems: 'center',
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D7F5',
  },
  resultText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6A89CC',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D7F5',
    maxWidth: 140,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A6FA5',
    flexShrink: 1,
  },
  clearAll: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
