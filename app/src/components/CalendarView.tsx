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
    <View className="relative pb-0.5 pt-1">
      <View className="absolute bottom-0 left-10 top-0 w-0.5 bg-[#E7DED3]" />
      {items.map((entry) => (
        <CalendarTimelineItem
          key={entry.id}
          entry={entry}
          density={calendarDensity}
          onDeleteEntry={onDeleteEntry}
          onViewEntry={onViewEntry}
          onEditEntry={onEditEntry}
          onStopRecording={onStopRecording}
          isActionSheetActive={activeActionSheetId === entry.id}
          onActionSheetOpen={onActionSheetOpen}
        />
      ))}
    </View>
  );

  return (
    <ScrollView
      testID="calendar-view-root"
      className="flex-1 bg-[#FAF8F5]"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
    >
      {/* 月份导航 */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <TouchableOpacity onPress={prevMonth} className="h-9 w-9 items-center justify-center rounded-full bg-[#F0F0F0]">
          <Ionicons name="chevron-back" size={20} color="#4A4A4A" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-[#4A4A4A]">
          {year}年{month + 1}月
        </Text>
        <TouchableOpacity onPress={nextMonth} className="h-9 w-9 items-center justify-center rounded-full bg-[#F0F0F0]">
          <Ionicons name="chevron-forward" size={20} color="#4A4A4A" />
        </TouchableOpacity>
      </View>

      {/* 星期标题行 */}
      <View className="mb-0.5 flex-row px-3">
        {WEEKDAYS.map((d) => (
          <Text key={d} className="flex-1 py-1.5 text-center text-xs font-semibold text-[#A3A3A3]">
            {d}
          </Text>
        ))}
      </View>

      {/* 日历格子 */}
      <View testID="calendar-grid" className="flex-row flex-wrap px-3 pb-1">
        {calendarDays.map((day, i) => {
          if (!day) {
            return (
              <View
                key={`empty-${i}`}
                className="my-px h-[38px] items-center justify-center rounded-lg"
                style={{ width: `${100 / 7}%` }}
              />
            );
          }
          const key = `${year}-${month}-${day}`;
          const dayEntries = entryMap[key] ?? [];
          const hasEntries = dayEntries.length > 0;
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const isOtherSelected = selectedKey !== null && key !== selectedKey;

          return (
            <TouchableOpacity
              key={key}
              className={`my-px h-[38px] w-[14.285714%] items-center justify-center rounded-lg ${
                isSelected
                  ? 'bg-primary'
                  : isToday
                    ? 'border border-primary bg-[#F0F4FF]'
                    : ''
              }`}
              onPress={() => handleDayPress(day)}
              activeOpacity={0.7}
            >
              <Text
                className={`text-sm ${
                  isSelected
                    ? 'font-bold text-white'
                    : isToday
                      ? 'font-bold text-primary'
                      : 'font-medium text-[#4A4A4A]'
                }`}
              >
                {day}
              </Text>
              {hasEntries && (
                <View className="mt-0.5 flex-row gap-0.5">
                  {['text', 'photo', 'voice'].map((type) => {
                    const count = dayEntries.filter((e) => e.type === type).length;
                    if (!count) return null;
                    return (
                      <View
                        key={type}
                        className={`h-1 w-1 rounded-full ${
                          isSelected
                            ? 'bg-white'
                            : type === 'text'
                              ? 'bg-[#6A89CC]'
                              : type === 'photo'
                                ? 'bg-[#4ECDC4]'
                                : 'bg-[#FF9F43]'
                        } ${isOtherSelected ? 'opacity-30' : ''}`}
                      />
                    );
                  })}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View className="mx-4 mt-2.5 h-px bg-[#E7DED3]" />

      {/* 内容区标题 */}
      <View testID="calendar-content-header" className="mb-2 mt-2 flex-row items-center justify-between mx-4">
        <Text className="text-sm font-bold text-[#4A4A4A]">
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
            className="rounded-xl bg-[#F0F0F0] px-2.5 py-1"
          >
            <Text className="text-xs text-[#A3A3A3]">✕ 取消</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 内容列表 */}
      {selectedKey ? (
        // 单日模式：完整时间轴卡片
        selectedEntries.length === 0 ? (
          <Text className="mt-6 text-center text-sm text-[#A3A3A3]">当天无记录</Text>
        ) : (
          renderTimelineItems([...selectedEntries].sort((a, b) => b.timestamp - a.timestamp))
        )
      ) : (
        // 全月模式：按日分组渲染完整时间轴卡片
        monthEntries.length === 0 ? (
          <Text className="mt-6 text-center text-sm text-[#A3A3A3]">本月暂无记录</Text>
        ) : (
          monthDayGroups.map((group) => (
            <View key={group.dateKey}>
              <Text className="mx-4 mb-1.5 mt-3.5 text-xs font-bold text-[#968878]">{group.label}</Text>
              {renderTimelineItems(group.entries)}
            </View>
          ))
        )
      )}
    </ScrollView>
  );
}
