/**
 * 搜索栏组件
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, cancelAnimation } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useEntryStore } from '@/src/store/entryStore';

interface SearchBarProps {
  onMenuPress?: () => void;
  onSearchFocus?: () => void;
  onSearchBlur?: () => void;
  searchInputRef?: React.RefObject<TextInput>;
}

export function SearchBar({ onMenuPress, onSearchFocus, onSearchBlur, searchInputRef }: SearchBarProps) {
  const scale = useSharedValue(1);
  const { searchQuery, setSearchQuery } = useEntryStore();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const inputRef = useRef<TextInput>(null);

  // 组件卸载时清理动画
  useEffect(() => {
    return () => {
      cancelAnimation(scale);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handleSearchChange = (text: string) => {
    setLocalQuery(text);
    setSearchQuery(text);
  };

  const handleClearSearch = () => {
    setLocalQuery('');
    setSearchQuery('');
  };

  const handleSearch = () => {
    // 触发搜索（当前已经是实时搜索，这里可以添加额外的搜索逻辑）
    if (onSearchFocus) {
      onSearchFocus();
    }
  };

  return (
    <View style={styles.container}>
      {/* 菜单按钮 */}
      <Pressable
        onPress={onMenuPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[styles.menuButton, animatedStyle]}>
          <Ionicons name="menu" size={24} color="#4A4A4A" />
        </Animated.View>
      </Pressable>

      <View style={styles.searchBox}>
        <TextInput
          ref={searchInputRef || inputRef}
          style={styles.input}
          placeholder="搜索记忆..."
          placeholderTextColor="#A3A3A3"
          value={localQuery}
          onChangeText={handleSearchChange}
          onFocus={onSearchFocus}
          onBlur={onSearchBlur}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        {localQuery.length > 0 && (
          <Pressable onPress={handleClearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#A3A3A3" />
          </Pressable>
        )}
        <Pressable onPress={handleSearch} style={styles.searchButton}>
          <Ionicons name="search" size={20} color="#6A89CC" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60, // 增加顶部间距，避免被灵动岛覆盖
    backgroundColor: '#FAF8F5',
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
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#4A4A4A',
    padding: 0,
  },
  clearButton: {
    padding: 4,
    marginRight: 8,
  },
  searchButton: {
    padding: 8,
    marginLeft: 4,
  },
  menuButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});
