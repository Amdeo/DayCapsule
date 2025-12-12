import React, {useMemo} from 'react';
import {View, StyleSheet, ScrollView, Text, SectionList} from 'react-native';
import EntryCard from './EntryCard';

interface DayViewEntry {
  hour: number;
  entries: any[];
  count: number;
}

interface DayViewProps {
  data: DayViewEntry[];
  currentDate: Date;
  onEntryPress?: (entry: any) => void;
}

export const DayView: React.FC<DayViewProps> = ({data, currentDate, onEntryPress}) => {
  // 格式化小时显示
  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  // 转换为 SectionList 数据格式
  const sections = useMemo(() => {
    return data
      .filter(item => item.count > 0) // 只显示有记录的小时
      .map(item => ({
        title: formatHour(item.hour),
        data: item.entries,
        hour: item.hour,
      }));
  }, [data]);

  // 渲染小时标题
  const renderSectionHeader = ({section}: {section: any}) => (
    <View style={styles.sectionHeader} testID="hour_card">
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length} 条记录</Text>
    </View>
  );

  // 渲染记录卡片
  const renderItem = ({item}: {item: any}) => (
    <EntryCard entry={item} onPress={onEntryPress || (() => {})} testID="entry_card" />
  );

  // 如果没有数据，显示空状态
  if (sections.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {currentDate.toLocaleDateString('zh-CN')} 没有记录
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>
          {currentDate.toLocaleDateString('zh-CN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={true}
        scrollEnabled={true}
        style={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  dateHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  list: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sectionCount: {
    fontSize: 14,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});

