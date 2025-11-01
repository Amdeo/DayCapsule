import React, {useMemo} from 'react';
import {View, StyleSheet, ScrollView, Text, TouchableOpacity} from 'react-native';

interface MonthViewEntry {
  date: number;
  entries: any[];
  count: number;
  heat: number;
}

interface MonthViewProps {
  data: MonthViewEntry[];
  currentDate: Date;
  onDayPress?: (date: Date) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({data, currentDate, onDayPress}) => {
  // 计算热度颜色
  const getHeatColor = (heat: number): string => {
    if (heat === 0) return '#f0f0f0';
    if (heat < 25) return '#c6e48b';
    if (heat < 50) return '#7bc96f';
    if (heat < 75) return '#239a3b';
    return '#196127';
  };

  // 生成日历网格
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // 添加前一个月的日期（灰显）
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({
        date: prevDate.getDate(),
        isCurrentMonth: false,
        fullDate: prevDate,
      });
    }

    // 添加当月日期
    for (let i = 1; i <= daysInMonth; i++) {
      const fullDate = new Date(year, month, i);
      const entryData = data.find(d => d.date === i);
      days.push({
        date: i,
        isCurrentMonth: true,
        fullDate,
        count: entryData?.count || 0,
        heat: entryData?.heat || 0,
      });
    }

    // 添加下一个月的日期（灰显）
    const remainingDays = 42 - days.length; // 6 行 × 7 列
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        date: i,
        isCurrentMonth: false,
        fullDate: nextDate,
      });
    }

    return days;
  }, [currentDate, data]);

  // 分组为周
  const weeks = useMemo(() => {
    const result = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.monthTitle}>
          {currentDate.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
          })}
        </Text>
      </View>

      <View style={styles.weekdayHeader}>
        {['日', '一', '二', '三', '四', '五', '六'].map(day => (
          <Text key={day} style={styles.weekdayLabel}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.calendar} testID="calendar_heatmap">
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.week}>
            {week.map((day, dayIndex) => (
              <TouchableOpacity
                key={dayIndex}
                style={styles.dayCell}
                onPress={() => {
                  if (day.isCurrentMonth) {
                    onDayPress?.(day.fullDate);
                  }
                }}
                testID={day.isCurrentMonth ? 'calendar_day' : undefined}
              >
                <View
                  style={[
                    styles.dayBox,
                    {
                      backgroundColor: day.isCurrentMonth
                        ? getHeatColor(day.heat || 0)
                        : '#fafafa',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      !day.isCurrentMonth && styles.dayNumberInactive,
                    ]}
                  >
                    {day.date}
                  </Text>
                  {day.isCurrentMonth && day.count > 0 && (
                    <Text style={styles.dayCount}>{day.count}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>热力图说明</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: '#f0f0f0'}]} />
            <Text style={styles.legendLabel}>无</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: '#c6e48b'}]} />
            <Text style={styles.legendLabel}>低</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: '#7bc96f'}]} />
            <Text style={styles.legendLabel}>中</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: '#239a3b'}]} />
            <Text style={styles.legendLabel}>高</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: '#196127'}]} />
            <Text style={styles.legendLabel}>很高</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  header: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  weekdayHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  calendar: {
    paddingVertical: 12,
  },
  week: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    padding: 2,
  },
  dayBox: {
    flex: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  dayNumberInactive: {
    color: '#ccc',
  },
  dayCount: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  legend: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    alignItems: 'center',
  },
  legendDot: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginBottom: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: '#666',
  },
});

