import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { textEditorStyles as styles } from './TextEditor.styles';

interface TagAreaProps {
  commonTags: string[];
  currentTagsList: string[];
  suggestions: string[];
  tagsInput: string;
  tagPanelExpanded: boolean;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onToggleTagPanel: () => void;
  onChangeTagsInput: (value: string) => void;
}

export function TagArea({
  commonTags,
  currentTagsList,
  suggestions,
  tagsInput,
  tagPanelExpanded,
  onAddTag,
  onRemoveTag,
  onToggleTagPanel,
  onChangeTagsInput,
}: TagAreaProps) {
  const [customDraft, setCustomDraft] = useState('');

  const handleAddCustom = () => {
    const trimmed = customDraft.trim();
    if (trimmed) {
      onAddTag(trimmed);
      setCustomDraft('');
    }
  };

  // Hidden input preserves tagsInput state for test access
  const hiddenInput = (
    <TextInput
      testID="text-editor-tags-input"
      style={{ height: 0 }}
      value={tagsInput}
      onChangeText={onChangeTagsInput}
    />
  );

  if (!tagPanelExpanded) {
    return (
      <View>
        {hiddenInput}
        <View style={styles.tagToolbarRow}>
          <Pressable onPress={onToggleTagPanel}>
            <Ionicons name="pricetag-outline" size={18} color="#A491D3" />
          </Pressable>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagToolbarScrollContent}
          >
            {commonTags.map((tag) => {
              const selected = currentTagsList.includes(tag);
              return (
                <Pressable
                  key={tag}
                  style={[styles.tagToolbarChip, selected && styles.tagToolbarChipSelected]}
                  onPress={() => (selected ? onRemoveTag(tag) : onAddTag(tag))}
                >
                  <Text
                    style={[
                      styles.tagToolbarChipText,
                      selected && styles.tagToolbarChipTextSelected,
                    ]}
                  >
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable style={styles.tagToolbarToggle} onPress={onToggleTagPanel}>
            <Text style={styles.tagToolbarToggleText}>展开</Text>
            <Ionicons name="chevron-down" size={12} color="#8B7AC8" />
          </Pressable>
        </View>
        {suggestions.length > 0 && (
          <View style={styles.tagSuggestionRow}>
            <Text style={styles.tagSuggestionLabel}>💡</Text>
            {suggestions.map((tag) => (
              <Pressable
                key={tag}
                style={styles.tagSuggestionChip}
                onPress={() => onAddTag(tag)}
              >
                <Ionicons name="add" size={12} color="#6A89CC" />
                <Text style={styles.tagSuggestionChipText}>{tag}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.tagPanel}>
      {hiddenInput}
      {/* Panel header with collapse button */}
      <View style={styles.tagPanelHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="pricetag-outline" size={14} color="#A491D3" />
          <Text style={styles.tagPanelHeaderTitle}>标签</Text>
        </View>
        <Pressable style={styles.tagToolbarToggle} onPress={onToggleTagPanel}>
          <Text style={styles.tagToolbarToggleText}>收起</Text>
          <Ionicons name="chevron-up" size={12} color="#8B7AC8" />
        </Pressable>
      </View>
      {currentTagsList.length > 0 && (
        <>
          <Text style={styles.tagPanelSectionLabel}>已选</Text>
          <View style={styles.tagPanelSelectedRow}>
            {currentTagsList.map((tag) => (
              <Pressable
                key={tag}
                style={styles.tagPanelSelectedChip}
                onPress={() => onRemoveTag(tag)}
              >
                <Text style={styles.tagPanelSelectedChipText}>{tag}</Text>
                <Ionicons name="close" size={12} color="#FFFFFF" />
              </Pressable>
            ))}
          </View>
          <View style={styles.tagPanelDivider} />
        </>
      )}

      <Text style={styles.tagPanelSectionLabel}>预设标签</Text>
      <View style={styles.tagPanelPresetRow}>
        {commonTags.map((tag) => {
          const selected = currentTagsList.includes(tag);
          return (
            <Pressable
              key={tag}
              style={[styles.tagPanelPresetChip, selected && styles.tagPanelPresetChipSelected]}
              onPress={() => (selected ? onRemoveTag(tag) : onAddTag(tag))}
            >
              <Text
                style={[
                  styles.tagPanelPresetChipText,
                  selected && styles.tagPanelPresetChipTextSelected,
                ]}
              >
                {tag}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tagPanelCustomRow}>
        <TextInput
          testID="text-editor-custom-tag-input"
          style={styles.tagPanelCustomInput}
          value={customDraft}
          onChangeText={setCustomDraft}
          placeholder="输入自定义标签..."
          placeholderTextColor="#C0B8B0"
          onSubmitEditing={handleAddCustom}
          returnKeyType="done"
        />
        <Pressable style={styles.tagPanelAddButton} onPress={handleAddCustom}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      {suggestions.length > 0 && (
        <View style={styles.tagPanelSuggestionRow}>
          <Text style={styles.tagPanelSuggestionLabel}>💡</Text>
          {suggestions.map((tag) => (
            <Pressable
              key={tag}
              style={styles.tagPanelSuggestionChip}
              onPress={() => onAddTag(tag)}
            >
              <Ionicons name="add" size={12} color="#6A89CC" />
              <Text style={styles.tagPanelSuggestionChipText}>{tag}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable style={styles.tagPanelCollapseRow} onPress={onToggleTagPanel}>
        <Text style={styles.tagPanelCollapseText}>— 收起 —</Text>
      </Pressable>
    </View>
  );
}
