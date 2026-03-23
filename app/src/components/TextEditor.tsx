import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
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

const TEXT_EDITOR_PLACEHOLDER_COLOR = '#A3A3A3';

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
        className="flex-1 justify-end"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable className="absolute inset-0 bg-black/50" onPress={handleCancel} />

        <View
          testID="text-editor-sheet"
          className="h-[90%] w-full flex-col rounded-t-[24px] bg-background-elevated shadow-lg shadow-black/10"
        >
          <View className="flex-row items-center justify-between border-b border-border-subtle px-5 pb-4 pt-5">
            <Text className="text-[20px] font-bold text-copy-primary">添加文字记录</Text>
            <Pressable onPress={handleCancel} className="h-10 w-10 items-center justify-center rounded-full">
              <Ionicons name="close" size={24} color="#4A4A4A" />
            </Pressable>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="px-5 pb-5 pt-5">
              <View className="mb-5 self-start rounded-chip bg-home-filter px-3 py-1.5">
                <View className="flex-row items-center">
                  <Ionicons name="document-text" size={16} color="#6A89CC" />
                  <Text className="ml-1.5 text-sm font-semibold text-primary">文本</Text>
                </View>
              </View>

              <View className="mb-6">
                <Text className="mb-2 text-sm font-semibold text-copy-primary">内容</Text>
                <TextInput
                  testID="text-editor-content-input"
                  className="min-h-[120px] rounded-chip bg-neutral-100 px-4 py-3 text-[15px] text-copy-primary"
                  value={content}
                  onChangeText={setContent}
                  placeholder="输入内容..."
                  placeholderTextColor={TEXT_EDITOR_PLACEHOLDER_COLOR}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  autoFocus
                />
              </View>

              <View className="mb-6">
                <Text className="mb-2 text-sm font-semibold text-copy-primary">标签</Text>
                {commonTags.length > 0 && (
                  <View className="mb-2.5 flex-row flex-wrap gap-[7px]">
                    {commonTags.map((tag) => {
                      const selected = currentTagsList.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          className={selected
                            ? 'rounded-full border border-text bg-text px-[11px] py-[5px]'
                            : 'rounded-full border border-border-text-chip bg-text/10 px-[11px] py-[5px]'}
                          onPress={() => selected ? handleRemoveTag(tag) : handleAddSuggestion(tag)}
                        >
                          <Text className={selected ? 'text-[13px] text-white' : 'text-[13px] text-editor-text-chip-accent'}>
                            {tag}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                <TextInput
                  testID="text-editor-tags-input"
                  className="rounded-chip bg-neutral-100 px-4 py-3 text-[15px] text-copy-primary"
                  value={tagsInput}
                  onChangeText={setTagsInput}
                  placeholder="用逗号分隔多个标签，如：生活, 工作"
                  placeholderTextColor={TEXT_EDITOR_PLACEHOLDER_COLOR}
                />
                {tagsInput.length > 0 && (
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {tagsInput
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter((tag) => tag.length > 0)
                      .map((tag, index) => (
                        <View key={index} className="rounded-chip bg-home-filter px-3 py-1.5">
                          <Text className="text-[13px] font-medium text-primary">{tag}</Text>
                        </View>
                      ))}
                  </View>
                )}
                {suggestions.length > 0 && (
                  <View className="mt-2.5 flex-row flex-wrap items-center gap-1.5">
                    <Text className="text-xs text-copy-muted">建议：</Text>
                    {suggestions.map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        className="flex-row items-center gap-[3px] rounded-[10px] border border-border-filter-strong bg-home-filter px-2.5 py-[5px]"
                        onPress={() => handleAddSuggestion(tag)}
                      >
                        <Ionicons name="add" size={13} color="#6A89CC" />
                        <Text className="text-xs font-medium text-primary">{tag}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          <View className="flex-row gap-3 border-t border-border-subtle px-5 py-4">
            <Pressable
              className="h-12 flex-1 items-center justify-center rounded-full bg-neutral-100"
              onPress={handleCancel}
            >
              <Text className="text-base font-semibold text-neutral-500">取消</Text>
            </Pressable>
            <Pressable
              testID="text-editor-save-button"
              className={content.trim()
                ? 'h-12 flex-1 items-center justify-center rounded-full bg-primary'
                : 'h-12 flex-1 items-center justify-center rounded-full bg-neutral-300'}
              onPress={handleSave}
              disabled={!content.trim()}
            >
              <Text className={content.trim() ? 'text-base font-semibold text-white' : 'text-base font-semibold text-copy-muted'}>
                保存
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
