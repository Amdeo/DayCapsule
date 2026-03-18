import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { suggestTags } from '@/src/services/tagSuggestionService';
import { useCommonTagsStore } from '@/src/store/commonTagsStore';

interface TextEditorProps {
  visible: boolean;
  onSave: (content: string, tags: string[]) => void;
  onCancel: () => void;
}

export function TextEditor({ visible, onSave, onCancel }: TextEditorProps) {
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // 内容变化时更新建议标签（300ms 防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      const existing = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      setSuggestions(suggestTags(content, existing));
    }, 300);
    return () => clearTimeout(timer);
  }, [content, tagsInput]);

  const handleAddSuggestion = useCallback((tag: string) => {
    setTagsInput((prev) => {
      const parts = prev.split(',').map((t) => t.trim()).filter(Boolean);
      if (parts.includes(tag)) return prev;
      return parts.length > 0 ? `${parts.join(', ')}, ${tag}` : tag;
    });
  }, []);

  const { tags: commonTags, isLoaded: tagsLoaded, loadCommonTags } = useCommonTagsStore();

  useEffect(() => {
    if (!tagsLoaded) loadCommonTags();
  }, [tagsLoaded, loadCommonTags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTagsInput((prev) => {
      const parts = prev.split(',').map((t) => t.trim()).filter(Boolean);
      return parts.filter((t) => t !== tag).join(', ');
    });
  }, []);

  const handleSave = () => {
    if (!content.trim()) return;
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    onSave(content, tags);
    setContent('');
    setTagsInput('');
    setSuggestions([]);
  };

  const handleCancel = () => {
    setContent('');
    setTagsInput('');
    setSuggestions([]);
    onCancel();
  };

  if (!visible) {
    return null;
  }

  const currentTagsList = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={handleCancel} />

        <View style={styles.editor}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>添加文字记录</Text>
            <Pressable onPress={handleCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#4A4A4A" />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.typeTag}>
              <Ionicons name="document-text" size={16} color="#6A89CC" />
              <Text style={styles.typeText}>文本</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>内容</Text>
              <TextInput
                style={styles.textInput}
                value={content}
                onChangeText={setContent}
                placeholder="输入内容..."
                placeholderTextColor="#A3A3A3"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                autoFocus
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>标签</Text>
              {commonTags.length > 0 && (
                <View style={styles.commonTagsRow}>
                  {commonTags.map((tag) => {
                    const selected = currentTagsList.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[styles.commonChip, selected && styles.commonChipSelected]}
                        onPress={() => selected ? handleRemoveTag(tag) : handleAddSuggestion(tag)}
                      >
                        <Text style={[styles.commonChipText, selected && styles.commonChipTextSelected]}>
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <TextInput
                style={styles.input}
                value={tagsInput}
                onChangeText={setTagsInput}
                placeholder="用逗号分隔多个标签，如：生活, 工作"
                placeholderTextColor="#A3A3A3"
              />
              {tagsInput.length > 0 && (
                <View style={styles.tagsPreview}>
                  {tagsInput
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter((tag) => tag.length > 0)
                    .map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                </View>
              )}
              {suggestions.length > 0 && (
                <View style={styles.suggestionsRow}>
                  <Text style={styles.suggestionsLabel}>建议：</Text>
                  {suggestions.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={styles.suggestionChip}
                      onPress={() => handleAddSuggestion(tag)}
                    >
                      <Ionicons name="add" size={13} color="#6A89CC" />
                      <Text style={styles.suggestionChipText}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>取消</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.saveButton, !content.trim() && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!content.trim()}
            >
              <Text style={[styles.saveButtonText, !content.trim() && styles.saveButtonTextDisabled]}>保存</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  editor: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    marginBottom: 20,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A89CC',
    marginLeft: 6,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#4A4A4A',
  },
  textInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#4A4A4A',
    minHeight: 120,
  },
  tagsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E8F0FE',
    borderRadius: 12,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6A89CC',
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  suggestionsLabel: {
    fontSize: 12,
    color: '#A3A3A3',
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F0F4FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D7F5',
    gap: 3,
  },
  suggestionChipText: {
    fontSize: 12,
    color: '#6A89CC',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#737373',
  },
  saveButton: {
    backgroundColor: '#6A89CC',
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D1D1',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButtonTextDisabled: {
    color: '#A3A3A3',
  },
  commonTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 10,
  },
  commonChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#E0DAFA',
  },
  commonChipSelected: {
    backgroundColor: '#A491D3',
    borderColor: '#A491D3',
  },
  commonChipText: {
    fontSize: 13,
    color: '#6A5ACD',
  },
  commonChipTextSelected: {
    color: '#FFFFFF',
  },
});
