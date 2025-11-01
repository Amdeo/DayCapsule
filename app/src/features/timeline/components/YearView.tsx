import React, {useMemo} from 'react';
import {View, StyleSheet, ScrollView, Text} from 'react-native';

interface YearViewEntry {
  month: number;
  entries: any[];
  count: number;
  stats: {
    totalEntries: number;
    photoCount: number;
    textCount: number;
    voiceCount: number;
  };
}

interface YearViewProps {
  data: YearViewEntry[];
  currentDate: Date;
}

const MONTHS = [
  '一月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月',
];

export const YearView: React.FC<YearViewProps> = ({data, currentDate}) => {
  // 计算年度统计
  const yearStats = useMemo(() => {
    const stats = {
      totalEntries: 0,
      photoCount: 0,
      textCount: 0,
      voiceCount: 0,
      averagePerMonth: 0,
      maxMonth: 0,
      maxMonthName: '',
    };

    data.forEach(monthData => {
      stats.totalEntries += monthData.count;
      stats.photoCount += monthData.stats.photoCount;
      stats.textCount += monthData.stats.textCount;
      stats.voiceCount += monthData.stats.voiceCount;

      if (monthData.count > stats.maxMonth) {
        stats.maxMonth = monthData.count;
        stats.maxMonthName = MONTHS[monthData.month];
      }
    });

    stats.averagePerMonth = Math.round(stats.totalEntries / 12);

    return stats;
  }, [data]);

  // 计算最大值用于柱状图
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.yearTitle}>{currentDate.getFullYear()} 年度总结</Text>
      </View>

      {/* 年度统计 */}
      <View style={styles.statsContainer} testID="year_stats">
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>总记录数</Text>
          <Text style={styles.statValue}>{yearStats.totalEntries}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>平均每月</Text>
          <Text style={styles.statValue}>{yearStats.averagePerMonth}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>最活跃月份</Text>
          <Text style={styles.statValue}>{yearStats.maxMonthName}</Text>
        </View>
      </View>

      {/* 记录类型分布 */}
      <View style={styles.typeDistribution}>
        <Text style={styles.sectionTitle}>记录类型分布</Text>
        <View style={styles.typeItems}>
          <View style={styles.typeItem}>
            <View style={[styles.typeIndicator, {backgroundColor: '#FF9500'}]} />
            <Text style={styles.typeLabel}>照片</Text>
            <Text style={styles.typeCount}>{yearStats.photoCount}</Text>
          </View>
          <View style={styles.typeItem}>
            <View style={[styles.typeIndicator, {backgroundColor: '#007AFF'}]} />
            <Text style={styles.typeLabel}>文字</Text>
            <Text style={styles.typeCount}>{yearStats.textCount}</Text>
          </View>
          <View style={styles.typeItem}>
            <View style={[styles.typeIndicator, {backgroundColor: '#34C759'}]} />
            <Text style={styles.typeLabel}>语音</Text>
            <Text style={styles.typeCount}>{yearStats.voiceCount}</Text>
          </View>
        </View>
      </View>

      {/* 月度统计 */}
      <View style={styles.monthlyStats}>
        <Text style={styles.sectionTitle}>月度统计</Text>
        {data.map((monthData, index) => (
          <View key={index} style={styles.monthStatItem} testID="month_stat">
            <Text style={styles.monthName}>{MONTHS[monthData.month]}</Text>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${(monthData.count / maxCount) * 100}%`,
                    backgroundColor: getMonthColor(monthData.count, maxCount),
                  },
                ]}
              />
            </View>
            <Text style={styles.monthCount}>{monthData.count}</Text>
          </View>
        ))}
      </View>

      {/* 年度总结文字 */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>年度总结</Text>
        <Text style={styles.summaryText}>
          {yearStats.totalEntries > 0
            ? `在 ${currentDate.getFullYear()} 年，你记录了 ${yearStats.totalEntries} 条生活片段，平均每月 ${yearStats.averagePerMonth} 条。其中最活跃的月份是 ${yearStats.maxMonthName}，共有 ${yearStats.maxMonth} 条记录。`
            : `${currentDate.getFullYear()} 年还没有任何记录，开始记录你的生活吧！`}
        </Text>
      </View>
    </ScrollView>
  );
};

// 根据数值获取柱状图颜色
const getMonthColor = (count: number, maxCount: number): string => {
  const ratio = count / maxCount;
  if (ratio === 0) return '#f0f0f0';
  if (ratio < 0.25) return '#c6e48b';
  if (ratio < 0.5) return '#7bc96f';
  if (ratio < 0.75) return '#239a3b';
  return '#196127';
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
  yearTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  typeDistribution: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  typeItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  typeItem: {
    alignItems: 'center',
  },
  typeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  typeCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  monthlyStats: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  monthStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthName: {
    width: 40,
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  barContainer: {
    flex: 1,
    height: 24,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  monthCount: {
    width: 30,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  summary: {
    paddingVertical: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});

