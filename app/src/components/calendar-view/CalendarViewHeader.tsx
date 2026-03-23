import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calendarViewStyles as styles } from './CalendarView.styles';
import { CALENDAR_WEEKDAYS } from './calendarViewHelpers';

interface CalendarViewHeaderProps {
  year: number;
  month: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

export function CalendarViewHeader({
  year,
  month,
  onPreviousMonth,
  onNextMonth,
}: CalendarViewHeaderProps) {
  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={onPreviousMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color="#4A4A4A" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {year}年{month + 1}月
        </Text>
        <TouchableOpacity onPress={onNextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color="#4A4A4A" />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {CALENDAR_WEEKDAYS.map((day) => (
          <Text key={day} style={styles.weekday}>
            {day}
          </Text>
        ))}
      </View>
    </>
  );
}
