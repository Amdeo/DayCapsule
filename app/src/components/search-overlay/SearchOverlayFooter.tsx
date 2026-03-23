import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchOverlayStyles as styles } from './SearchOverlay.styles';

interface SearchOverlayFooterProps {
  onCancel: () => void;
  onSearch: () => void;
}

export function SearchOverlayFooter({
  onCancel,
  onSearch,
}: SearchOverlayFooterProps) {
  return (
    <View style={styles.footer}>
      <Pressable style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelText}>取消</Text>
      </Pressable>
      <Pressable testID="search-overlay-submit-button" style={styles.searchButton} onPress={onSearch}>
        <Ionicons name="search" size={18} color="#FFFFFF" />
        <Text style={styles.searchButtonText}>搜索</Text>
      </Pressable>
    </View>
  );
}
