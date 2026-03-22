import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Entry } from '../types/entry';
import { suggestTags } from '@/src/services/tagSuggestionService';
import { useCommonTagsStore } from '@/src/store/commonTagsStore';

interface EntryEditorProps {
  visible: boolean;
  entry: Entry | null;
  onSave: (id: string, content: string, tags: string[]) => void;
  onClose: () => void;
}

const getTypeMeta = (type: Entry['type']) => {
  switch (type) {
    case 'text':
      return { icon: 'document-text', label: '文本记录', accent: '#8F7AC8' };
    case 'photo':
      return { icon: 'image', label: '照片记录', accent: '#66BFC8' };
    case 'voice':
      return { icon: 'mic', label: '语音记录', accent: '#F0A53A' };
    default:
      return { icon: 'document-text', label: '记录', accent: '#8F7AC8' };
  }
};

const ENTRY_EDITOR_PLACEHOLDER_COLOR = '#B6AAA0';

export function EntryEditor({ visible, entry, onSave, onClose }: EntryEditorProps) {
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { tags: commonTags, isLoaded: tagsLoaded, loadCommonTags } = useCommonTagsStore();

  useEffect(() => {
    if (!tagsLoaded) loadCommonTags();
  }, [tagsLoaded, loadCommonTags]);

  useEffect(() => {
    if (visible && entry) {
      setContent(entry.content);
      setTagsInput(entry.tags?.join(', ') || '');
      setSuggestions([]);
    }
  }, [visible, entry]);

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

  const handleRemoveTag = useCallback((tag: string) => {
    setTagsInput((prev) => {
      const parts = prev.split(',').map((t) => t.trim()).filter(Boolean);
      return parts.filter((t) => t !== tag).join(', ');
    });
  }, []);

  const currentTagsList = useMemo(
    () => tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    [tagsInput]
  );

  if (!visible || !entry) return null;

  const typeMeta = getTypeMeta(entry.type);

  const handleSave = () => {
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    onSave(entry.id, content, tags);
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 bg-black/20"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable className="absolute inset-0 bg-editor-backdrop" onPress={onClose} />

        <View className="flex-1 bg-editor-canvas">
          <View
            testID="entry-editor-header"
            className="flex-row items-center justify-between border-b border-border-editor-header bg-editor-canvas px-5 pb-4 pt-14"
          >
            <Pressable onPress={onClose} className="min-w-12 py-1.5">
              <Text className="text-[15px] font-semibold text-editor-action">返回</Text>
            </Pressable>
            <Text className="text-lg font-bold text-editor-title">编辑记录</Text>
            <Pressable onPress={handleSave} className="min-w-12 py-1.5">
              <Text className="text-right text-[15px] font-bold text-primary">保存</Text>
            </Pressable>
          </View>

          <View className="flex-1">
            <ScrollView
              testID="entry-editor-scroll"
              className="flex-1"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View className="gap-4 px-5 pb-[220px] pt-[18px]">
                <View
                  testID="entry-editor-type-badge"
                  className="self-start rounded-full border px-[11px] py-1.5"
                  style={{ borderColor: `${typeMeta.accent}33`, backgroundColor: `${typeMeta.accent}14` }}
                >
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name={typeMeta.icon as any} size={15} color={typeMeta.accent} />
                    <Text className="text-[13px] font-semibold" style={{ color: typeMeta.accent }}>
                      {typeMeta.label}
                    </Text>
                  </View>
                </View>

                <View
                  testID="entry-editor-content-surface"
                  className="min-h-[420px] rounded-[18px] border border-border-editor bg-editor-surface px-[18px] pb-5 pt-[18px] shadow-sm shadow-black/10"
                >
                  <Text className="mb-[14px] text-xs font-semibold tracking-[0.6px] text-editor-muted">正文</Text>
                  <TextInput
                    testID="entry-editor-content-input"
                    className="min-h-[340px] p-0 text-[18px] leading-8 tracking-[0.15px] text-editor-body"
                    value={content}
                    onChangeText={setContent}
                    placeholder="写下这段记忆..."
                    placeholderTextColor={ENTRY_EDITOR_PLACEHOLDER_COLOR}
                    multiline
                    textAlignVertical="top"
                    autoFocus
                  />
                </View>

                <View className="gap-1.5 px-1">
                  <Text className="text-xs font-semibold tracking-[0.6px] text-editor-muted">创建时间</Text>
                  <Text className="text-sm text-editor-meta">
                    {new Date(entry.timestamp).toLocaleString('zh-CN')}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>

          <View
            testID="entry-editor-tag-dock"
            className="absolute bottom-0 left-0 right-0 gap-3 border-t border-border-editor-dock bg-editor-dock px-5 pb-7 pt-[14px]"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-copy-primary">标签</Text>
              {currentTagsList.length > 0 ? (
                <Text className="text-xs text-editor-muted">{currentTagsList.length} 个已选</Text>
              ) : null}
            </View>

            {commonTags.length > 0 && (
              <View className="flex-row flex-wrap gap-2">
                {commonTags.map((tag) => {
                  const selected = currentTagsList.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      className={selected
                        ? 'rounded-full border border-text bg-text px-[11px] py-1.5'
                        : 'rounded-full border border-border-text-chip bg-editor-text-chip px-[11px] py-1.5'}
                      onPress={() => (selected ? handleRemoveTag(tag) : handleAddSuggestion(tag))}
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
              testID="entry-editor-tags-input"
              className="rounded-[14px] border border-border-editor-soft bg-editor-surface px-[14px] py-3 text-[15px] text-copy-primary"
              value={tagsInput}
              onChangeText={setTagsInput}
              placeholder="添加标签，用逗号分隔"
              placeholderTextColor={ENTRY_EDITOR_PLACEHOLDER_COLOR}
            />

            {currentTagsList.length > 0 && (
              <View className="flex-row flex-wrap gap-2">
                {currentTagsList.map((tag) => (
                  <View
                    key={tag}
                    className="rounded-full border border-border-editor-dock bg-editor-tag px-2.5 py-1.5"
                  >
                    <Text className="text-[13px] font-medium text-editor-tag-text">#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {suggestions.length > 0 && (
              <View className="flex-row flex-wrap gap-2">
                {suggestions.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    className="flex-row items-center gap-1 rounded-full border border-border-suggestion bg-editor-suggestion px-2.5 py-1.5"
                    onPress={() => handleAddSuggestion(tag)}
                  >
                    <Ionicons name="add" size={13} color="#8F7AC8" />
                    <Text className="text-xs font-medium text-text-dark">{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
