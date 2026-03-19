/**
 * 日历视图组件
 * 月历格子，有记录的日期高亮，点击查看当天记录
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Entry } from '../types/entry';
import { useSettingsStore } from '@/src/store/settingsStore';
import { CalendarTimelineItem } from './CalendarTimelineItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CalendarViewProps {
  entries: Entry[];
  onDeleteEntry?: (id: string) => void;
  onViewEntry?: (entry: Entry) => void;
  onEditEntry?: (entry: Entry) => void;
  onPauseRecording?: (id: string) => void;
  onResumeRecording?: (id: string) => void;
  onStopRecording?: (id: string) => void;
  activeActionSheetId?: string | null;
  onActionSheetOpen?: (id: string) => void;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const TYPE_COLOR: Record<string, string> = {
  text: '#6A89CC',
  photo: '#4ECDC4',
  voice: '#FF9F43',
};

export function CalendarView({
  entries,
  onDeleteEntry,
  onViewEntry,
  onEditEntry,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  activeActionSheetId,
  onActionSheetOpen,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const calendarDensity = useSettingsStore((s) => s.calendarDensity);
  const insets = useSafeAreaInsets();

  // 按日期分组 entries
  const entryMap = useMemo(() => {
    const map: Record<string, Entry[]> = {};
    entries.forEach((e) => {
      const d = new Date(e.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [entries]);

  // 当月所有记录（按时间倒序）
  const monthEntries = useMemo(() => {
    return entries
      .filter((e) => {
        const d = new Date(e.timestamp);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [entries, year, month]);

  // 按日分组（用于全月显示）
  const monthDayGroups = useMemo(() => {
    const groups: { dateKey: string; label: string; entries: Entry[] }[] = [];
    let currentKey = '';
    for (const entry of monthEntries) {
      const d = new Date(entry.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const label = `${d.getMonth() + 1}月${d.getDate()}日`;
      if (key !== currentKey) {
        groups.push({ dateKey: key, label, entries: [] });
        currentKey = key;
      }
      groups[groups.length - 1].entries.push(entry);
    }
    return groups;
  }, [monthEntries]);

  // 生成日历格子（含前置空格）
  const calendarDays = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = Array(firstWeekday).fill(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [year, month]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  const selectedEntries = useMemo(
    () => (selectedKey ? entryMap[selectedKey] ?? [] : []),
    [selectedKey, entryMap]
  );

  const prevMonth = () => {
    setSelectedKey(null);
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setSelectedKey(null);
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayPress = (day: number) => {
    const key = `${year}-${month}-${day}`;
    setSelectedKey((prev) => (prev === key ? null : key));
  };

  const renderTimelineItems = (items: Entry[]) => (
    <View style={styles.timelineGroup}>
      <View style={styles.timelineLine} />
      {items.map((entry) => (
        <CalendarTimelineItem
          key={entry.id}
          entry={entry}
          density={calendarDensity}
          onDeleteEntry={onDeleteEntry}
          onViewEntry={onViewEntry}
          onEditEntry={onEditEntry}
          onPauseRecording={onPauseRecording}
          onResumeRecording={onResumeRecording}
          onStopRecording={onStopRecording}
          isActionSheetActive={activeActionSheetId === entry.id}
          onActionSheetOpen={onActionSheetOpen}
        />
      ))}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
    >
      {/* 月份导航 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color="#4A4A4A" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {year}年{month + 1}月
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color="#4A4A4A" />
        </TouchableOpacity>
      </View>

      {/* 星期标题行 */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      {/* 日历格子 */}
      <View style={styles.grid}>
        {calendarDays.map((day, i) => {
          if (!day) return <View key={`empty-${i}`} style={styles.dayCell} />;
          const key = `${year}-${month}-${day}`;
          const dayEntries = entryMap[key] ?? [];
          const hasEntries = dayEntries.length > 0;
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const isOtherSelected = selectedKey !== null && key !== selectedKey;

          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isToday && !isSelected && styles.dayCellToday,
              ]}
              onPress={() => handleDayPress(day)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.dayTextSelected,
                  isToday && !isSelected && styles.dayTextToday,
                ]}
              >
                {day}
              </Text>
              {hasEntries && (
                <View style={styles.dotsRow}>
                  {['text', 'photo', 'voice'].map((type) => {
                    const count = dayEntries.filter((e) => e.type === type).length;
                    if (!count) return null;
                    return (
                      <View
                        key={type}
                        style={[
                          styles.dot,
                          { backgroundColor: isSelected ? '#FFFFFF' : TYPE_COLOR[type] },
                          isOtherSelected && { opacity: 0.3 },
                        ]}
                      />
                    );
                  })}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sectionDivider} />

      {/* 内容区标题 */}
      <View style={styles.contentHeader}>
        <Text style={styles.contentTitle}>
          {selectedKey
            ? (() => {
                const [, m, dd] = selectedKey!.split('-').map(Number);
                return `${m + 1}月${dd}日 · ${selectedEntries.length} 条`;
              })()
            : `全月 · ${monthEntries.length} 条`}
        </Text>
        {selectedKey && (
          <TouchableOpacity
            testID="calendar-deselect-btn"
            onPress={() => setSelectedKey(null)}
            style={styles.deselectBtn}
          >
            <Text style={styles.deselectText}>✕ 取消</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 内容列表 */}
      {selectedKey ? (
        // 单日模式：完整时间轴卡片
        selectedEntries.length === 0 ? (
          <Text style={styles.emptyText}>当天无记录</Text>
        ) : (
          renderTimelineItems([...selectedEntries].sort((a, b) => b.timestamp - a.timestamp))
        )
      ) : (
        // 全月模式：按日分组渲染完整时间轴卡片
        monthEntries.length === 0 ? (
          <Text style={styles.emptyText}>本月暂无记录</Text>
        ) : (
          monthDayGroups.map((group) => (
            <View key={group.dateKey}>
              <Text style={styles.dayGroupLabel}>{group.label}</Text>
              {renderTimelineItems(group.entries)}
            </View>
          ))
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  content: { paddingBottom: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 2,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#A3A3A3',
    paddingVertical: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 1,
  },
  dayCellSelected: {
    backgroundColor: '#6A89CC',
  },
  dayCellToday: {
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: '#6A89CC',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A4A4A',
  },
  dayTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  dayTextToday: { color: '#6A89CC', fontWeight: '700' },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sectionDivider: {
    height: 1,
    marginTop: 10,
    marginHorizontal: 16,
    backgroundColor: '#E7DED3',
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  deselectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
  },
  deselectText: {
    fontSize: 12,
    color: '#A3A3A3',
  },
  dayGroupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#968878',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#A3A3A3',
    textAlign: 'center',
    marginTop: 24,
  },
  timelineGroup: {
    position: 'relative',
    paddingTop: 4,
    paddingBottom: 2,
  },
  timelineLine: {
    position: 'absolute',
    left: 40,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#E7DED3',
  },
});
