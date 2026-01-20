/**
 * 时间轴视图组件 - 重新设计版
 * 整合搜索栏和快速添加功能
 */

import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Entry } from '../types/entry';
import { EntryCard } from './EntryCard';
import { SearchBar } from './SearchBar';
import { QuickAddButtons } from './QuickAddButtons';
import { EntryEditor } from './EntryEditor';
import { FilterBar } from './FilterBar';
import {
  groupEntriesByTime,
  TIME_GROUP_LABELS,
  TimeGroup,
  formatRelativeTime,
} from '../utils/timeUtils';
import { useEntryStore } from '../store/entryStore';
import type { TextInput } from 'react-native';

/**
 * 时间分组区块
 */
interface TimeGroupSectionProps {
  title: string;
  groupKey: TimeGroup;
  entries: Entry[];
  onDeleteEntry: (id: string) => void;
  onEditEntry?: (entry: Entry) => void;
  onQuickAdd?: (type: 'text' | 'photo' | 'voice') => void;
  showQuickAdd?: boolean;
}

function TimeGroupSection({
  title,
  groupKey,
  entries,
  onDeleteEntry,
  onEditEntry,
  onQuickAdd,
  showQuickAdd = false,
}: TimeGroupSectionProps) {
  if (entries.length === 0 && !showQuickAdd) {
    return null;
  }

  const isToday = groupKey === 'today';
  const timelineLeft = 40; // 统一的时间线位置（所有圆点的中心点）

  return (
    <View style={{ marginBottom: 0, position: 'relative' }}>
      {/* 整个分组的连续时间线 */}
      <View
        style={{
          position: 'absolute',
          left: timelineLeft,
          top: isToday ? 48 : 30, // 从圆形标记底部开始
          bottom: 0,
          width: 2,
          backgroundColor: '#E5E5E5',
          zIndex: 1,
        }}
      />

      {/* 分组标题 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: isToday ? 16 : 30, paddingVertical: 20, position: 'relative', zIndex: 10 }}>
        {/* 时间轴圆形标记 */}
        <View
          style={{
            width: isToday ? 48 : 20,
            height: isToday ? 48 : 20,
            borderRadius: 999,
            backgroundColor: isToday ? '#6A89CC' : '#D1D1D1',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: isToday ? '#6A89CC' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isToday ? 0.3 : 0.1,
            shadowRadius: 4,
            elevation: isToday ? 4 : 2,
          }}
        >
          {isToday && (
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 }}>
              今天
            </Text>
          )}
        </View>

        {/* 标题文本 */}
        <Text style={{ fontSize: isToday ? 20 : 18, fontWeight: '700', color: '#4A4A4A', marginLeft: 16 }}>
          {title}
        </Text>
      </View>

      {/* 快速添加按钮（仅在"今天"分组显示） */}
      {showQuickAdd && onQuickAdd && (
        <View style={{ paddingLeft: 64, paddingRight: 24, paddingBottom: 20, position: 'relative', zIndex: 5 }}>
          {/* 圆点 */}
          <View
            style={{
              position: 'absolute',
              left: timelineLeft - 5,
              top: 12,
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: '#FFFFFF',
              borderWidth: 2,
              borderColor: '#D1D1D1',
              zIndex: 10,
            }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#A3A3A3' }}>
              添加新的记忆...
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#E5E5E5', marginLeft: 12 }} />
          </View>
          <QuickAddButtons onPress={onQuickAdd} />
        </View>
      )}

      {/* 记录列表 */}
      {entries.length > 0 && (
        <View style={{ position: 'relative', zIndex: 5 }}>
          {entries.map((entry, index) => {
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
              <Animated.View
                key={entry.id}
                style={{ paddingLeft: 64, paddingRight: 24, paddingBottom: 24, position: 'relative' }}
                entering={FadeIn.delay(index * 50).springify()}
                exiting={FadeOut.duration(200)}
              >
                {/* 时间点圆点（带外圈） */}
                <View
                  style={{
                    position: 'absolute',
                    left: timelineLeft - 5,
                    top: 8,
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: getDotColor(),
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                    zIndex: 10,
                  }}
                />

                {/* 相对时间 */}
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: '#A3A3A3', fontWeight: '500' }}>
                    {formatRelativeTime(entry.timestamp)}
                  </Text>
                </View>

                {/* 卡片 */}
                <EntryCard entry={entry} onDelete={onDeleteEntry} onEdit={onEditEntry} />
              </Animated.View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/**
 * 空状态组件
 */
function EmptyState() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>📭</Text>
      <Text style={{ fontSize: 16, color: '#A3A3A3', textAlign: 'center' }}>
        还没有记忆
      </Text>
      <Text style={{ fontSize: 14, color: '#D1D1D1', textAlign: 'center', marginTop: 8 }}>
        点击下方按钮开始记录
      </Text>
    </View>
  );
}

/**
 * 时间轴主组件
 */
interface TimelineProps {
  onQuickAdd?: (type: 'text' | 'photo' | 'voice') => void;
  onMenuPress?: () => void;
}

export function Timeline({ onQuickAdd, onMenuPress }: TimelineProps) {
  const { entries, deleteEntry, searchQuery, filteredEntries, updateEntry, filterType, filterDateRange } = useEntryStore();
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [showFilterBar, setShowFilterBar] = useState(false);
  const searchInputRef = React.useRef<TextInput>(null);

  // 使用过滤后的记录：如果有搜索或过滤条件，显示过滤结果，否则显示所有记录
  const hasFilters = searchQuery.trim() || filterType !== 'all' || filterDateRange !== 'all';
  const displayEntries = hasFilters ? filteredEntries : entries;

  // 按时间分组
  const groupedEntries = groupEntriesByTime(displayEntries);

  // 检查是否有记录
  const hasEntries = displayEntries.length > 0;

  // 处理编辑保存
  const handleSaveEdit = (id: string, content: string, tags: string[]) => {
    updateEntry(id, { content, tags });
    setEditingEntry(null);
  };

  // 处理搜索框聚焦
  const handleSearchFocus = () => {
    setShowFilterBar(true);
  };

  // 处理搜索框失焦
  const handleSearchBlur = () => {
    setShowFilterBar(false);
  };

  // 处理筛选栏关闭
  const handleFilterBarClose = () => {
    setShowFilterBar(false);
    // 让搜索框失去焦点
    searchInputRef.current?.blur();
  };

  // 处理编辑
  const handleEditEntry = (entry: Entry) => {
    console.log('Timeline handleEditEntry 被调用，entry:', entry);
    setEditingEntry(entry);
    console.log('editingEntry 已设置');
  };

  // 分组配置
  const groups: Array<{ key: TimeGroup; title: string }> = [
    { key: 'today', title: '2024年6月' }, // 今天显示为月份
    { key: 'yesterday', title: '昨天' },
    { key: 'thisWeek', title: '本周' },
    { key: 'thisMonth', title: '本月' },
    { key: 'earlier', title: '更早' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      {/* 搜索栏 */}
      <SearchBar
        onMenuPress={onMenuPress}
        onSearchFocus={handleSearchFocus}
        onSearchBlur={handleSearchBlur}
        searchInputRef={searchInputRef}
      />

      {/* 过滤栏 */}
      <FilterBar isVisible={showFilterBar} onClose={handleFilterBarClose} />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {!hasEntries ? (
          <EmptyState />
        ) : (
          <View style={{ paddingTop: 8 }}>
            {groups.map((group, groupIndex) => (
              <TimeGroupSection
                key={group.key}
                title={group.title}
                groupKey={group.key}
                entries={groupedEntries[group.key]}
                onDeleteEntry={deleteEntry}
                onEditEntry={handleEditEntry}
                onQuickAdd={onQuickAdd}
                showQuickAdd={groupIndex === 0} // 只在第一个分组（今天）显示快速添加
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* 编辑器模态框 */}
      <EntryEditor
        visible={editingEntry !== null}
        entry={editingEntry}
        onSave={handleSaveEdit}
        onClose={() => setEditingEntry(null)}
      />
    </View>
  );
}
