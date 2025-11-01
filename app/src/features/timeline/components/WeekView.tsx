import React, {useMemo} from 'react';
import {View, StyleSheet, ScrollView, Text, TouchableOpacity} from 'react-native';

interface WeekViewEntry {
  dayOfWeek: number;
  date: Date;
  entries: any[];
  count: number;
  heat: number;
}

interface WeekViewProps {
  data: WeekViewEntry[];
  currentDate: Date;
  onDayPress?: (date: Date) => void;
}

const DAYS_OF_WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export const WeekView: React.FC<WeekViewProps> = ({data, currentDate, onDayPress}) => {
  // 计算热度颜色
  const getHeatColor = (heat: number): string => {
    if (heat === 0) return '#f0f0f0';
    if (heat < 25) return '#c6e48b';
    if (heat < 50) return '#7bc96f';
    if (heat < 75) return '#239a3b';
    return '#196127';
  };

  // 获取周开始日期
  const weekStart = useMemo(() => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - date.getDay());
    return date;
  }, [currentDate]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.weekTitle}>
          {weekStart.toLocaleDateString('zh-CN', {
            month: 'long',
            day: 'numeric',
          })}{' '}
          - 周
        </Text>
      </View>

      <View style={styles.weekGrid}>
        {data.map((dayData, index) => (
          <TouchableOpacity
            key={index}
            style={styles.dayContainer}
            onPress={() => onDayPress?.(dayData.date)}
            testID="day_dot"
          >
            <View
              style={[
                styles.dayDot,
                {backgroundColor: getHeatColor(dayData.heat)},
              ]}
            >
              <Text style={styles.dayLabel}>{DAYS_OF_WEEK[dayData.dayOfWeek]}</Text>
            </View>
            <Text style={styles.dayCount}>{dayData.count}</Text>
            <View style={styles.heatIndicator} testID="heat_indicator">
              <Text style={styles.heatText}>{dayData.heat.toFixed(0)}%</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>热度指示</Text>
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
  weekTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  weekGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dayDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
  },
  dayCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  heatIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  heatText: {
    fontSize: 10,
    color: '#999',
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
    borderRadius: 10,
    marginBottom: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: '#666',
  },
});

