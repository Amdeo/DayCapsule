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

interface CalendarViewProps {
  entries: Entry[];
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const TYPE_COLOR: Record<string, string> = {
  text: '#6A89CC',
  photo: '#4ECDC4',
  voice: '#FF9F43',
};

export function CalendarView({ entries }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

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

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
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

      {/* 内容区标题 */}
      <View style={styles.contentHeader}>
        <Text style={styles.contentTitle}>
          {selectedKey
            ? (() => {
                const d = new Date(selectedEntries[0]?.timestamp ?? Date.now());
                return `${d.getMonth() + 1}月${d.getDate()}日 · ${selectedEntries.length} 条`;
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
        // 单日模式：直接渲染当天记录行
        selectedEntries.length === 0 ? (
          <Text style={styles.emptyText}>当天无记录</Text>
        ) : (
          selectedEntries
            .sort((a, b) => b.timestamp - a.timestamp)
            .map((entry) => (
              <View key={entry.id} style={styles.entryRow}>
                <View style={[styles.entryTypeDot, { backgroundColor: TYPE_COLOR[entry.type] }]} />
                <Text style={styles.entryTime}>
                  {new Date(entry.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.entryContent} numberOfLines={2}>{entry.content}</Text>
              </View>
            ))
        )
      ) : (
        // 全月模式：按日分组渲染
        monthEntries.length === 0 ? (
          <Text style={styles.emptyText}>本月暂无记录</Text>
        ) : (
          monthDayGroups.map((group) => (
            <View key={group.dateKey}>
              <Text style={styles.dayGroupLabel}>{group.label}</Text>
              {group.entries.map((entry) => (
                <View key={entry.id} style={styles.entryRow}>
                  <View style={[styles.entryTypeDot, { backgroundColor: TYPE_COLOR[entry.type] }]} />
                  <Text style={styles.entryTime}>
                    {new Date(entry.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.entryContent} numberOfLines={2}>{entry.content}</Text>
                </View>
              ))}
            </View>
          ))
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  content: { paddingBottom: 120 },
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
    marginBottom: 4,
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
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 2,
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
    marginTop: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dayDetail: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dayDetailTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 12,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
  },
  entryTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entryTime: {
    fontSize: 12,
    color: '#A3A3A3',
    width: 44,
  },
  entryContent: {
    flex: 1,
    fontSize: 14,
    color: '#4A4A4A',
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 8,
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
    fontWeight: '600',
    color: '#A3A3A3',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#A3A3A3',
    textAlign: 'center',
    marginTop: 24,
  },
});
