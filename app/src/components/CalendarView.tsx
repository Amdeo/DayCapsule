/**
 * 日历视图组件
 * 月历格子，有记录的日期高亮，点击查看当天记录
 */

import React from 'react';
import { ScrollView } from 'react-native';
import { Entry } from '@/src/types/entry';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarViewContent } from './calendar-view/CalendarViewContent';
import { CalendarViewHeader } from './calendar-view/CalendarViewHeader';
import { CalendarViewGrid } from './calendar-view/CalendarViewGrid';
import { calendarViewStyles as styles } from './calendar-view/CalendarView.styles';
import { useCalendarViewController } from './calendar-view/useCalendarViewController';

interface CalendarViewProps {
  entries: Entry[];
  onDeleteEntry?: (id: string) => void;
  onViewEntry?: (entry: Entry) => void;
  onEditEntry?: (entry: Entry) => void;
  onStopRecording?: (id: string) => void;
  activeActionSheetId?: string | null;
  onActionSheetOpen?: (id: string) => void;
}

export function CalendarView({
  entries,
  onDeleteEntry,
  onViewEntry,
  onEditEntry,
  onStopRecording,
  activeActionSheetId,
  onActionSheetOpen,
}: CalendarViewProps) {
  const {
    year,
    month,
    selectedKey,
    entryMap,
    monthEntries,
    monthDayGroups,
    calendarDays,
    todayKey,
    selectedEntries,
    previousMonth,
    nextMonth,
    handleDayPress,
    clearSelection,
  } = useCalendarViewController({
    entries,
  });
  const calendarDensity = useSettingsStore((s) => s.calendarDensity);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      testID="calendar-view-root"
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
      contentInsetAdjustmentBehavior="automatic"
    >
      <CalendarViewHeader
        year={year}
        month={month}
        onPreviousMonth={previousMonth}
        onNextMonth={nextMonth}
      />
      <CalendarViewGrid
        year={year}
        month={month}
        days={calendarDays}
        entryMap={entryMap}
        selectedKey={selectedKey}
        todayKey={todayKey}
        onDayPress={handleDayPress}
      />
      <CalendarViewContent
        selectedKey={selectedKey}
        selectedEntries={selectedEntries}
        monthEntries={monthEntries}
        monthDayGroups={monthDayGroups}
        calendarDensity={calendarDensity}
        onClearSelection={clearSelection}
        onDeleteEntry={onDeleteEntry}
        onViewEntry={onViewEntry}
        onEditEntry={onEditEntry}
        onStopRecording={onStopRecording}
        activeActionSheetId={activeActionSheetId}
        onActionSheetOpen={onActionSheetOpen}
      />
    </ScrollView>
  );
}
