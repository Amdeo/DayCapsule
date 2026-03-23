import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, Animated, PanResponder,
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
      <View testID="tag-management-root">
        <TouchableOpacity
          className="mb-3 flex-row items-center gap-2 border-b border-overlay-muted py-[14px]"
          onPress={handleReset}
        >
          <Ionicons name="refresh" size={18} color="#6A89CC" />
          <Text className="text-[15px] font-medium text-primary">恢复初始预制标签</Text>
        </TouchableOpacity>

        <View className="mb-2">
          <Text className="mb-1 text-base font-semibold text-[#2F3A4A]">当前预制标签</Text>
          <Text className="text-[13px] text-[#7A8797]">这组标签会出现在快速选择区域</Text>
        </View>
        <Text className="mb-2 text-xs text-copy-muted">{tags.length} / {MAX_TAGS} 个</Text>

        <View
          className="relative"
          style={{ height: containerHeight }}
          testID="tag-management-tags-container"
        >
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
              ? [{ top: index * ROW_HEIGHT, transform: [{ translateY: dragTranslationY }] }]
              : [{ top: shiftedTop }];

            return (
              <Animated.View
                key={tag}
                className={`absolute inset-x-0 h-[52px] ${isActive ? 'z-10' : ''}`}
                style={rowStyle}
              >
                <View
                  className={`flex-1 flex-row items-center justify-between bg-background-elevated py-3 ${
                    isActive
                      ? 'rounded-[10px] bg-[#F7F9FC] shadow-sm shadow-black/10'
                      : 'border-b border-neutral-100'
                  }`}
                >
                  <View className="flex-row items-center gap-2">
                    <View
                      className="h-7 w-7 items-center justify-center"
                      testID={`preset-tag-drag-handle-${index}`}
                      {...handleResponder.panHandlers}
                    >
                      <Ionicons name="reorder-three-outline" size={18} color="#9AA4B2" />
                    </View>
                    <Text className="text-[15px] text-copy-primary">#{tag}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(tag)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color="#E57373" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            );
          })}
        </View>

        <View className="mt-5 flex-row items-center gap-2.5 border-t border-overlay-muted pt-4">
          <TextInput
            className={`h-11 flex-1 rounded-[10px] border px-3 text-[15px] ${
              atLimit
                ? 'border-neutral-200 bg-neutral-100 text-copy-hint'
                : 'border-border-subtle bg-overlay-subtle text-copy-primary'
            }`}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder={atLimit ? `最多 ${MAX_TAGS} 个预制标签` : '输入新预制标签'}
            placeholderTextColor="#A3A3A3"
            editable={!atLimit}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <TouchableOpacity
            className={`h-11 items-center justify-center rounded-[10px] px-[18px] ${
              atLimit ? 'bg-neutral-200' : 'bg-primary'
            }`}
            onPress={handleAdd}
            disabled={atLimit}
          >
            <Text className={`text-[15px] font-semibold ${atLimit ? 'text-copy-muted' : 'text-white'}`}>
              添加
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </DetailPageShell>
  );
}
