/**
 * 搜索遮罩组件
 * 点击搜索框时显示，覆盖所有内容，显示搜索选项
 */

import React from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useEntryStore } from '@/src/store/entryStore';

interface SearchOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
}

export function SearchOverlay({ visible, onClose, onSearch }: SearchOverlayProps) {
  const { searchQuery, setSearchQuery, filterType, setFilterType, filterDateRange, setFilterDateRange } = useEntryStore();
  const [localQuery, setLocalQuery] = React.useState(searchQuery);

  const handleSearch = () => {
    setSearchQuery(localQuery);
    onSearch(localQuery);
  };

  const handleClear = () => {
    setLocalQuery('');
    setSearchQuery('');
    setFilterType('all');
    setFilterDateRange('all');
  };

  const filterOptions = [
    { key: 'all', label: '全部' },
    { key: 'text', label: '文字' },
    { key: 'photo', label: '照片' },
    { key: 'voice', label: '语音' },
  ];

  const dateOptions = [
    { key: 'all', label: '全部' },
    { key: 'today', label: '今天' },
    { key: 'week', label: '本周' },
    { key: 'month', label: '本月' },
  ];

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={styles.overlay}
    >
      <View style={styles.container}>
        {/* 顶部操作栏 */}
        <View style={styles.header}>
          {/* 返回/关闭按钮 */}
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="chevron-back" size={24} color="#4A4A4A" />
            <Text style={styles.backButtonText}>返回</Text>
          </TouchableOpacity>
        </View>

        {/* 搜索输入区域 */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#A3A3A3" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="搜索记忆..."
              placeholderTextColor="#A3A3A3"
              value={localQuery}
              onChangeText={setLocalQuery}
              autoFocus
            />
            {localQuery.length > 0 && (
              <Pressable onPress={() => setLocalQuery('')}>
                <Ionicons name="close-circle" size={20} color="#A3A3A3" />
              </Pressable>
            )}
          </View>

          {/* 搜索按钮 */}
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>搜索</Text>
          </TouchableOpacity>
        </View>

        {/* 筛选选项 */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>类型</Text>
          <View style={styles.filterOptions}>
            {filterOptions.map((option) => (
              <Pressable
                key={option.key}
                style={[
                  styles.filterChip,
                  filterType === option.key && styles.filterChipActive,
                ]}
                onPress={() => setFilterType(option.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterType === option.key && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>时间</Text>
          <View style={styles.filterOptions}>
            {dateOptions.map((option) => (
              <Pressable
                key={option.key}
                style={[
                  styles.filterChip,
                  filterDateRange === option.key && styles.filterChipActive,
                ]}
                onPress={() => setFilterDateRange(option.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterDateRange === option.key && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 清除按钮 */}
        <Pressable style={styles.clearButton} onPress={handleClear}>
          <Ionicons name="trash-outline" size={18} color="#666" />
          <Text style={styles.clearButtonText}>清除筛选</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FAF8F5',
    zIndex: 100,
  },
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4A4A4A',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  searchButton: {
    height: 48,
    paddingHorizontal: 20,
    backgroundColor: '#6A89CC',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  filterChipActive: {
    backgroundColor: '#6A89CC',
    borderColor: '#6A89CC',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 20,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#666',
  },
});
