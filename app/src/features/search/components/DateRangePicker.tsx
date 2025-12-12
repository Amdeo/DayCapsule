import React, {useState} from 'react';
import {View, StyleSheet, TouchableOpacity, Text, TextInput} from 'react-native';

interface DateRangePickerProps {
  dateRange: {start: Date; end: Date} | null;
  onDateRangeChange: (range: {start: Date; end: Date} | null) => void;
  testID?: string;
}

// 格式化日期
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateRange,
  onDateRangeChange,
  testID,
}) => {
  const [startDateStr, setStartDateStr] = useState(
    dateRange?.start ? formatDate(dateRange.start) : '',
  );
  const [endDateStr, setEndDateStr] = useState(
    dateRange?.end ? formatDate(dateRange.end) : '',
  );

  // 解析日期字符串
  const parseDate = (dateStr: string): Date | null => {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  // 更新日期范围
  const handleDateChange = () => {
    const startDate = parseDate(startDateStr);
    const endDate = parseDate(endDateStr);

    if (startDate && endDate) {
      if (startDate <= endDate) {
        onDateRangeChange({start: startDate, end: endDate});
      }
    }
  };

  // 快速选择
  const handleQuickSelect = (type: 'today' | 'thisWeek' | 'thisMonth') => {
    const today = new Date();
    let start: Date;
    let end: Date = new Date(today);

    switch (type) {
      case 'today':
        start = new Date(today);
        break;
      case 'thisWeek':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
    }

    setStartDateStr(formatDate(start));
    setEndDateStr(formatDate(end));
    onDateRangeChange({start, end});
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* 快速选择按钮 */}
      <View style={styles.quickSelectContainer}>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => handleQuickSelect('today')}
        >
          <Text style={styles.quickButtonText}>今天</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => handleQuickSelect('thisWeek')}
        >
          <Text style={styles.quickButtonText}>本周</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => handleQuickSelect('thisMonth')}
        >
          <Text style={styles.quickButtonText}>本月</Text>
        </TouchableOpacity>
      </View>

      {/* 日期输入 */}
      <View style={styles.dateInputContainer}>
        <View style={styles.dateInput}>
          <Text style={styles.label}>开始日期</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={startDateStr}
            onChangeText={setStartDateStr}
            onBlur={handleDateChange}
            testID="start_date_input"
          />
        </View>

        <Text style={styles.separator}>至</Text>

        <View style={styles.dateInput}>
          <Text style={styles.label}>结束日期</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={endDateStr}
            onChangeText={setEndDateStr}
            onBlur={handleDateChange}
            testID="end_date_input"
          />
        </View>
      </View>

      {/* 清除按钮 */}
      {dateRange && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            setStartDateStr('');
            setEndDateStr('');
            onDateRangeChange(null);
          }}
        >
          <Text style={styles.clearButtonText}>清除日期范围</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  quickSelectContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    paddingVertical: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  dateInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#333',
  },
  separator: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 4,
    marginBottom: 8,
  },
  clearButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 12,
    color: '#999',
  },
});

