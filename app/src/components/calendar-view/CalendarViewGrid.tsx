import React from 'react';
import { Text, Pressable, View } from 'react-native';
import type { Entry } from '@/src/types/entry';
import { calendarViewStyles as styles } from './CalendarView.styles';
import { CALENDAR_TYPE_COLORS } from './calendarViewHelpers';

interface CalendarViewGridProps {
  year: number;
  month: number;
  days: Array<number | null>;
  entryMap: Record<string, Entry[]>;
  selectedKey: string | null;
  todayKey: string;
  onDayPress: (day: number) => void;
}

export function CalendarViewGrid({
  year,
  month,
  days,
  entryMap,
  selectedKey,
  todayKey,
  onDayPress,
}: CalendarViewGridProps) {
  return (
    <View testID="calendar-grid" style={styles.grid}>
      {days.map((day, index) => {
        if (!day) {
          return <View key={`empty-${index}`} style={styles.dayCell} />;
        }

        const key = `${year}-${month}-${day}`;
        const dayEntries = entryMap[key] ?? [];
        const hasEntries = dayEntries.length > 0;
        const isToday = key === todayKey;
        const isSelected = key === selectedKey;
        const isOtherSelected = selectedKey !== null && key !== selectedKey;

        return (
          <Pressable
            key={key}
            style={[
              styles.dayCell,
              isSelected && styles.dayCellSelected,
              isToday && !isSelected && styles.dayCellToday,
            ]}
            onPress={() => onDayPress(day)}
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
            {hasEntries ? (
              <View style={styles.dotsRow}>
                {(['text', 'photo', 'voice'] as const).map((type) => {
                  const count = dayEntries.filter((entry) => entry.type === type).length;
                  if (!count) {
                    return null;
                  }

                  return (
                    <View
                      key={type}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: isSelected
                            ? '#FFFFFF'
                            : CALENDAR_TYPE_COLORS[type],
                        },
                        isOtherSelected && { opacity: 0.3 },
                      ]}
                    />
                  );
                })}
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
