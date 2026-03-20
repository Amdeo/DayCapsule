import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Animated, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DetailPageShell } from './DetailPageShell';
import { useCommonTagsStore, DEFAULT_PRESET_TAGS } from '@/src/store/commonTagsStore';

interface TagManagementPageProps {
  visible: boolean;
  onClose: () => void;
}

interface DragState {
  tag: string;
  fromIndex: number;
  toIndex: number;
}

const MAX_TAGS = 20;
const ROW_HEIGHT = 52;
const LONG_PRESS_MS = 180;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function TagManagementPage({ visible, onClose }: TagManagementPageProps) {
  const { tags, isLoaded, loadCommonTags, addCommonTag, removeCommonTag, resetToDefaults, reorderCommonTags } =
    useCommonTagsStore();
  const [inputValue, setInputValue] = useState('');
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragTranslationY = useRef(new Animated.Value(0)).current;
  const dragStateRef = useRef<DragState | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (visible && !isLoaded) {
      loadCommonTags();
    }
  }, [visible, isLoaded, loadCommonTags]);

  const handleAdd = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (tags.length >= MAX_TAGS) {
      Alert.alert('已达上限', `最多 ${MAX_TAGS} 个预制标签`);
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
    Alert.alert('恢复初始预制标签', `将恢复为 ${DEFAULT_PRESET_TAGS.length} 个初始预制标签，当前修改将丢失。`, [
      { text: '取消', style: 'cancel' },
      { text: '恢复', style: 'destructive', onPress: () => resetToDefaults() },
    ]);
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startDrag = (tag: string, index: number) => {
    dragTranslationY.setValue(0);
    setDragState({ tag, fromIndex: index, toIndex: index });
  };

  const updateDrag = (translationY: number) => {
    const current = dragStateRef.current;
    if (!current) return;

    dragTranslationY.setValue(translationY);

    const nextIndex = clamp(
      current.fromIndex + Math.round(translationY / ROW_HEIGHT),
      0,
      Math.max(tags.length - 1, 0),
    );

    if (nextIndex !== current.toIndex) {
      setDragState({ ...current, toIndex: nextIndex });
    }
  };

  const finishDrag = async () => {
    const current = dragStateRef.current;
    clearLongPressTimer();

    if (!current) return;

    dragStateRef.current = null;
    setDragState(null);
    dragTranslationY.setValue(0);

    if (current.fromIndex !== current.toIndex) {
      await reorderCommonTags(current.fromIndex, current.toIndex);
    }
  };

  const atLimit = tags.length >= MAX_TAGS;
  const containerHeight = useMemo(() => tags.length * ROW_HEIGHT, [tags.length]);

  return (
    <DetailPageShell
      visible={visible}
      title="预制标签管理"
      onClose={onClose}
      scrollEnabled={dragState == null}
    >
      <TouchableOpacity style={styles.resetRow} onPress={handleReset}>
        <Ionicons name="refresh" size={18} color="#6A89CC" />
        <Text style={styles.resetText}>恢复初始预制标签</Text>
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>当前预制标签</Text>
        <Text style={styles.sectionSubtitle}>这组标签会出现在快速选择区域</Text>
      </View>
      <Text style={styles.hint}>{tags.length} / {MAX_TAGS} 个</Text>

      <View style={[styles.tagsContainer, { height: containerHeight }]}>
        {tags.map((tag, index) => {
          const isActive = dragState?.tag === tag;
          let shiftedTop = index * ROW_HEIGHT;

          if (dragState && !isActive) {
            if (dragState.fromIndex < dragState.toIndex && index > dragState.fromIndex && index <= dragState.toIndex) {
              shiftedTop -= ROW_HEIGHT;
            } else if (dragState.fromIndex > dragState.toIndex && index >= dragState.toIndex && index < dragState.fromIndex) {
              shiftedTop += ROW_HEIGHT;
            }
          }

          const handleResponder = PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => dragStateRef.current?.tag === tag,
            onPanResponderGrant: () => {
              clearLongPressTimer();
              longPressTimerRef.current = setTimeout(() => startDrag(tag, index), LONG_PRESS_MS);
            },
            onPanResponderMove: (_event, gestureState) => {
              if (dragStateRef.current?.tag !== tag) return;
              updateDrag(gestureState.dy);
            },
            onPanResponderRelease: () => {
              void finishDrag();
            },
            onPanResponderTerminate: () => {
              void finishDrag();
            },
          });

          const rowStyle = isActive
            ? [
                styles.positionedRow,
                styles.activeRow,
                { top: index * ROW_HEIGHT, transform: [{ translateY: dragTranslationY }] },
              ]
            : [styles.positionedRow, { top: shiftedTop }];

          return (
            <Animated.View key={tag} style={rowStyle}>
              <View style={[styles.tagRow, isActive && styles.tagRowActive]}>
                <View style={styles.tagLeft}>
                  <View
                    style={styles.dragHandle}
                    testID={`preset-tag-drag-handle-${index}`}
                    {...handleResponder.panHandlers}
                  >
                    <Ionicons name="reorder-three-outline" size={18} color="#9AA4B2" />
                  </View>
                  <Text style={styles.tagName}>#{tag}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(tag)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color="#E57373" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={[styles.addInput, atLimit && styles.addInputDisabled]}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={atLimit ? `最多 ${MAX_TAGS} 个预制标签` : '输入新预制标签'}
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
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F3A4A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#7A8797',
  },
  hint: { fontSize: 12, color: '#A3A3A3', marginBottom: 8 },
  tagsContainer: {
    position: 'relative',
  },
  positionedRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
  },
  activeRow: {
    zIndex: 10,
  },
  tagRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    backgroundColor: '#FFFFFF',
  },
  tagRowActive: {
    backgroundColor: '#F7F9FC',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dragHandle: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
