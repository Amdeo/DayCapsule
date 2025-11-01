import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Modal,
} from 'react-native';
import {useDispatch} from 'react-redux';
import {setFilters, clearFilters} from '@store/slices/searchSlice';
import {TagFilter} from './TagFilter';
import {MoodFilter} from './MoodFilter';
import {DateRangePicker} from './DateRangePicker';
import {LocationFilter} from './LocationFilter';

interface FilterPanelProps {
  onClose: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({onClose}) => {
  const dispatch = useDispatch();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{start: Date; end: Date} | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  // 应用筛选
  const handleApplyFilters = () => {
    dispatch(
      setFilters({
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        mood: selectedMood || undefined,
        startDate: dateRange?.start,
        endDate: dateRange?.end,
        location: selectedLocation || undefined,
      }),
    );
    onClose();
  };

  // 重置筛选
  const handleResetFilters = () => {
    setSelectedTags([]);
    setSelectedMood(null);
    setDateRange(null);
    setSelectedLocation(null);
    dispatch(clearFilters());
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>筛选条件</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 标签筛选 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>标签</Text>
            <TagFilter
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              testID="tag_filter"
            />
          </View>

          {/* 心情筛选 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>心情</Text>
            <MoodFilter
              selectedMood={selectedMood}
              onMoodChange={setSelectedMood}
              testID="mood_filter"
            />
          </View>

          {/* 日期范围筛选 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>日期范围</Text>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              testID="date_range_filter"
            />
          </View>

          {/* 地点筛选 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>地点</Text>
            <LocationFilter
              selectedLocation={selectedLocation}
              onLocationChange={setSelectedLocation}
              testID="location_filter"
            />
          </View>
        </ScrollView>

        {/* 底部按钮 */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetFilters}
            testID="reset_filter_button"
          >
            <Text style={styles.resetButtonText}>重置</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApplyFilters}
            testID="apply_filter_button"
          >
            <Text style={styles.applyButtonText}>应用</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    fontSize: 20,
    color: '#999',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  resetButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

