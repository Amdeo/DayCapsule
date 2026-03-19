import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.editorPage}>
          <View style={styles.headerBar}>
            <Pressable onPress={onClose} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>返回</Text>
            </Pressable>
            <Text style={styles.headerTitle}>编辑记录</Text>
            <Pressable onPress={handleSave} style={styles.headerButton}>
              <Text style={styles.headerSaveText}>保存</Text>
            </Pressable>
          </View>

          <View style={styles.main}>
            <ScrollView
              testID="entry-editor-scroll"
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.typeBadge, { borderColor: `${typeMeta.accent}33`, backgroundColor: `${typeMeta.accent}14` }]}>
                <Ionicons name={typeMeta.icon as any} size={15} color={typeMeta.accent} />
                <Text style={[styles.typeText, { color: typeMeta.accent }]}>{typeMeta.label}</Text>
              </View>

              <View testID="entry-editor-content-surface" style={styles.contentSurface}>
                <Text style={styles.surfaceLabel}>正文</Text>
                <TextInput
                  testID="entry-editor-content-input"
                  style={styles.contentInput}
                  value={content}
                  onChangeText={setContent}
                  placeholder="写下这段记忆..."
                  placeholderTextColor="#B6AAA0"
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
              </View>

              <View style={styles.metaSection}>
                <Text style={styles.metaLabel}>创建时间</Text>
                <Text style={styles.metaValue}>
                  {new Date(entry.timestamp).toLocaleString('zh-CN')}
                </Text>
              </View>
            </ScrollView>
          </View>

          <View testID="entry-editor-tag-dock" style={styles.tagDock}>
            <View style={styles.tagDockHeader}>
              <Text style={styles.tagDockTitle}>标签</Text>
              {currentTagsList.length > 0 ? (
                <Text style={styles.tagDockCount}>{currentTagsList.length} 个已选</Text>
              ) : null}
            </View>

            {commonTags.length > 0 && (
              <View style={styles.commonTagsRow}>
                {commonTags.map((tag) => {
                  const selected = currentTagsList.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.commonChip, selected && styles.commonChipSelected]}
                      onPress={() => (selected ? handleRemoveTag(tag) : handleAddSuggestion(tag))}
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
              testID="entry-editor-tags-input"
              style={styles.tagsInput}
              value={tagsInput}
              onChangeText={setTagsInput}
              placeholder="添加标签，用逗号分隔"
              placeholderTextColor="#B6AAA0"
            />

            {currentTagsList.length > 0 && (
              <View style={styles.tagsPreview}>
                {currentTagsList.map((tag) => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.tagChipText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {suggestions.length > 0 && (
              <View style={styles.suggestionsRow}>
                {suggestions.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.suggestionChip}
                    onPress={() => handleAddSuggestion(tag)}
                  >
                    <Ionicons name="add" size={13} color="#8F7AC8" />
                    <Text style={styles.suggestionChipText}>{tag}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24, 19, 14, 0.24)',
  },
  editorPage: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#FAF8F5',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 115, 85, 0.08)',
  },
  headerButton: {
    minWidth: 48,
    paddingVertical: 6,
  },
  headerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8A7C70',
  },
  headerSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6A89CC',
    textAlign: 'right',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3D342E',
  },
  main: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 220,
    gap: 16,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  contentSurface: {
    minHeight: 420,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.14)',
    backgroundColor: '#FFFDF9',
    shadowColor: '#5A4330',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  surfaceLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: '#A08F82',
    marginBottom: 14,
  },
  contentInput: {
    minHeight: 340,
    fontSize: 18,
    lineHeight: 32,
    color: '#2F241E',
    letterSpacing: 0.15,
    padding: 0,
  },
  metaSection: {
    gap: 6,
    paddingHorizontal: 4,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A08F82',
    letterSpacing: 0.6,
  },
  metaValue: {
    fontSize: 14,
    color: '#6B5B4D',
  },
  tagDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    backgroundColor: 'rgba(250, 248, 245, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 115, 85, 0.10)',
    gap: 12,
  },
  tagDockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagDockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  tagDockCount: {
    fontSize: 12,
    color: '#A08F82',
  },
  commonTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  commonChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F4F0FF',
    borderWidth: 1,
    borderColor: '#E2DAF8',
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
  tagsInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.12)',
    backgroundColor: '#FFFDF9',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#4A4A4A',
  },
  tagsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F7F2EA',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.10)',
  },
  tagChipText: {
    fontSize: 13,
    color: '#7A6758',
    fontWeight: '500',
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F7F4FF',
    borderWidth: 1,
    borderColor: '#E6DFF8',
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8F7AC8',
  },
});
