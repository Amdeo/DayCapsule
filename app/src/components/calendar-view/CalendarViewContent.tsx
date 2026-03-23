import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { Entry } from '@/src/types/entry';
import type { CalendarDensity } from '@/src/store/settingsStore';
import { CalendarTimelineItem } from '../CalendarTimelineItem';
import { calendarViewStyles as styles } from './CalendarView.styles';
import { getCalendarContentTitle } from './calendarViewHelpers';
import type { CalendarDayGroup } from './calendarViewTypes';

interface CalendarViewContentProps {
  selectedKey: string | null;
  selectedEntries: Entry[];
  monthEntries: Entry[];
  monthDayGroups: CalendarDayGroup[];
  calendarDensity: CalendarDensity;
  onClearSelection: () => void;
  onDeleteEntry?: (id: string) => void;
  onViewEntry?: (entry: Entry) => void;
  onEditEntry?: (entry: Entry) => void;
  onStopRecording?: (id: string) => void;
  activeActionSheetId?: string | null;
  onActionSheetOpen?: (id: string) => void;
}

function CalendarTimelineGroup({
  entries,
  calendarDensity,
  onDeleteEntry,
  onViewEntry,
  onEditEntry,
  onStopRecording,
  activeActionSheetId,
  onActionSheetOpen,
}: Omit<CalendarViewContentProps, 'selectedKey' | 'selectedEntries' | 'monthEntries' | 'monthDayGroups' | 'onClearSelection'> & {
  entries: Entry[];
}) {
  return (
    <View style={styles.timelineGroup}>
      <View style={styles.timelineLine} />
      {entries.map((entry) => (
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
}

export function CalendarViewContent({
  selectedKey,
  selectedEntries,
  monthEntries,
  monthDayGroups,
  calendarDensity,
  onClearSelection,
  onDeleteEntry,
  onViewEntry,
  onEditEntry,
  onStopRecording,
  activeActionSheetId,
  onActionSheetOpen,
}: CalendarViewContentProps) {
  return (
    <>
      <View style={styles.sectionDivider} />

      <View style={styles.contentHeader}>
        <Text style={styles.contentTitle}>
          {getCalendarContentTitle(
            selectedKey,
            selectedEntries.length,
            monthEntries.length
          )}
        </Text>
        {selectedKey ? (
          <TouchableOpacity
            testID="calendar-deselect-btn"
            onPress={onClearSelection}
            style={styles.deselectBtn}
          >
            <Text style={styles.deselectText}>✕ 取消</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {selectedKey ? (
        selectedEntries.length === 0 ? (
          <Text style={styles.emptyText}>当天无记录</Text>
        ) : (
          <CalendarTimelineGroup
            entries={[...selectedEntries].sort((left, right) => right.timestamp - left.timestamp)}
            calendarDensity={calendarDensity}
            onDeleteEntry={onDeleteEntry}
            onViewEntry={onViewEntry}
            onEditEntry={onEditEntry}
            onStopRecording={onStopRecording}
            activeActionSheetId={activeActionSheetId}
            onActionSheetOpen={onActionSheetOpen}
          />
        )
      ) : monthEntries.length === 0 ? (
        <Text style={styles.emptyText}>本月暂无记录</Text>
      ) : (
        monthDayGroups.map((group) => (
          <View key={group.dateKey}>
            <Text style={styles.dayGroupLabel}>{group.label}</Text>
            <CalendarTimelineGroup
              entries={group.entries}
              calendarDensity={calendarDensity}
              onDeleteEntry={onDeleteEntry}
              onViewEntry={onViewEntry}
              onEditEntry={onEditEntry}
              onStopRecording={onStopRecording}
              activeActionSheetId={activeActionSheetId}
              onActionSheetOpen={onActionSheetOpen}
            />
          </View>
        ))
      )}
    </>
  );
}
