import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DetailPageShell } from './DetailPageShell';
import { useCommonTagsStore, DEFAULT_COMMON_TAGS } from '@/src/store/commonTagsStore';

interface TagManagementPageProps {
  visible: boolean;
  onClose: () => void;
}

const MAX_TAGS = 20;

export function TagManagementPage({ visible, onClose }: TagManagementPageProps) {
  const { tags, isLoaded, loadCommonTags, addCommonTag, removeCommonTag, resetToDefaults } =
    useCommonTagsStore();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (visible && !isLoaded) {
      loadCommonTags();
    }
  }, [visible, isLoaded, loadCommonTags]);

  const handleAdd = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (tags.length >= MAX_TAGS) {
      Alert.alert('已达上限', `最多 ${MAX_TAGS} 个常用标签`);
      return;
    }
    await addCommonTag(trimmed);
    setInputValue('');
  };

  const handleDelete = (tag: string) => {
    Alert.alert('删除标签', `确认删除「${tag}」吗？`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => removeCommonTag(tag) },
    ]);
  };

  const handleReset = () => {
    Alert.alert('恢复默认', `将恢复为 ${DEFAULT_COMMON_TAGS.length} 个默认标签，当前自定义将丢失。`, [
      { text: '取消', style: 'cancel' },
      { text: '恢复', style: 'destructive', onPress: () => resetToDefaults() },
    ]);
  };

  const atLimit = tags.length >= MAX_TAGS;

  return (
    <DetailPageShell visible={visible} title="标签管理" onClose={onClose}>
      {/* 恢复默认 */}
      <TouchableOpacity style={styles.resetRow} onPress={handleReset}>
        <Ionicons name="refresh" size={18} color="#6A89CC" />
        <Text style={styles.resetText}>恢复默认标签</Text>
      </TouchableOpacity>

      {/* 标签列表 */}
      <Text style={styles.hint}>共 {tags.length} / {MAX_TAGS} 个</Text>
      <FlatList
        data={tags}
        keyExtractor={(item) => item}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.tagRow}>
            <Text style={styles.tagName}>#{item}</Text>
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color="#E57373" />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* 添加新标签 */}
      <View style={styles.addRow}>
        <TextInput
          style={[styles.addInput, atLimit && styles.addInputDisabled]}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={atLimit ? `最多 ${MAX_TAGS} 个` : '输入新标签名'}
          placeholderTextColor="#A3A3A3"
          editable={!atLimit}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity
          style={[styles.addButton, atLimit && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={atLimit}
        >
          <Text style={[styles.addButtonText, atLimit && styles.addButtonTextDisabled]}>添加</Text>
        </TouchableOpacity>
      </View>
    </DetailPageShell>
  );
}

const styles = StyleSheet.create({
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 12,
  },
  resetText: { fontSize: 15, color: '#6A89CC', fontWeight: '500' },
  hint: { fontSize: 12, color: '#A3A3A3', marginBottom: 8 },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  tagName: { fontSize: 15, color: '#4A4A4A' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  addInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: '#FAFAFA',
    color: '#4A4A4A',
  },
  addInputDisabled: { backgroundColor: '#F5F5F5', color: '#C0C0C0' },
  addButton: {
    height: 44,
    paddingHorizontal: 18,
    backgroundColor: '#6A89CC',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { backgroundColor: '#E5E5E5' },
  addButtonText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
  addButtonTextDisabled: { color: '#A3A3A3' },
});
