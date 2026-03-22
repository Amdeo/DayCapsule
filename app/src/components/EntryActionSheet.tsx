import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type EntryType = 'text' | 'photo' | 'voice';
type ActionSheetMode = 'menu' | 'confirm';

const SHEET_ENTER_DURATION = 240;
export const ENTRY_ACTION_SHEET_EXIT_DURATION = 220;
const SHEET_RETURN_DURATION = 180;

interface EntryActionSheetProps {
  visible: boolean;
  entryType: EntryType;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const ENTRY_TYPE_COLORS: Record<EntryType, string> = {
  text: '#A491D3',
  photo: '#77C9D4',
  voice: '#F5A623',
};

export function EntryActionSheet({
  visible,
  entryType,
  onEdit,
  onDelete,
  onClose,
}: EntryActionSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [mode, setMode] = useState<ActionSheetMode>('menu');
  const [shouldRender, setShouldRender] = useState(visible);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateY = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (visible) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setShouldRender(true);
      setMode('menu');
      translateY.value = screenHeight;
      backdropOpacity.value = 0;
      translateY.value = withTiming(0, {
        duration: SHEET_ENTER_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(1, { duration: 180 });
      return;
    }

    setMode('menu');

    if (!shouldRender) {
      return;
    }

    translateY.value = withTiming(screenHeight, { duration: ENTRY_ACTION_SHEET_EXIT_DURATION });
    backdropOpacity.value = withTiming(0, { duration: 180 });
    closeTimeoutRef.current = setTimeout(() => {
      setShouldRender(false);
      closeTimeoutRef.current = null;
    }, ENTRY_ACTION_SHEET_EXIT_DURATION);
  }, [screenHeight, shouldRender, visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_event, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.value = gestureState.dy;
          }
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.vy > 0.5 || gestureState.dy > 120) {
            onClose();
            return;
          }
          translateY.value = withTiming(0, {
            duration: SHEET_RETURN_DURATION,
            easing: Easing.out(Easing.cubic),
          });
        },
        onPanResponderTerminate: () => {
          translateY.value = withTiming(0, {
            duration: SHEET_RETURN_DURATION,
            easing: Easing.out(Easing.cubic),
          });
        },
      }),
    [onClose, translateY]
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!shouldRender) {
    return null;
  }

  const typeColor = ENTRY_TYPE_COLORS[entryType];

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          testID="action-sheet-overlay"
          className="absolute inset-0"
          onPress={onClose}
        >
          <Animated.View
            pointerEvents="none"
            className="absolute inset-0 bg-black/40"
            style={backdropStyle}
          />
        </Pressable>

        <Animated.View
          className="justify-end"
          style={sheetStyle}
          {...panResponder.panHandlers}
        >
          <View className="px-3" testID="action-sheet-panel">
            <View
              testID="action-sheet-handle"
              className="mb-4 mt-3 h-1.5 w-10 self-center rounded-full"
              style={{ backgroundColor: typeColor }}
            />

            {mode === 'menu' ? (
              <>
                <View
                  className="overflow-hidden rounded-[18px] bg-white"
                  testID="action-sheet-option-group"
                >
                  <TouchableOpacity
                    testID="action-sheet-edit"
                    className="h-14 flex-row items-center px-4"
                    onPress={() => {
                      onEdit();
                    }}
                  >
                    <Ionicons name="pencil-outline" size={20} color="#8E8E93" />
                    <Text className="ml-3 text-[17px] text-[#1A1A1A]">编辑</Text>
                  </TouchableOpacity>

                  <View className="ml-12 h-px bg-[#F0F0F0]" />

                  <TouchableOpacity
                    testID="action-sheet-delete"
                    className="h-14 flex-row items-center px-4"
                    onPress={() => setMode('confirm')}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    <Text className="ml-3 text-[17px] text-[#FF3B30]">删除</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  testID="action-sheet-cancel"
                  className="mt-2 h-[52px] items-center justify-center rounded-[14px] bg-white"
                  onPress={onClose}
                >
                  <Text className="text-[17px] font-medium text-[#8E8E93]">取消</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View className="rounded-[18px] bg-white px-4 pt-2">
                <Text className="text-center text-base font-semibold text-[#1A1A1A]">
                  确认删除这条记录？
                </Text>
                <Text className="mt-1 text-center text-[13px] text-[#8E8E93]">
                  此操作无法撤销
                </Text>

                <TouchableOpacity
                  testID="action-sheet-confirm-delete"
                  className="mt-4 h-[52px] items-center justify-center rounded-[14px] bg-[#FF3B30]"
                  onPress={() => {
                    onDelete();
                    onClose();
                  }}
                >
                  <Text className="text-[17px] font-semibold text-white">删除</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="action-sheet-confirm-cancel"
                  className="mt-2 items-center py-2"
                  onPress={() => setMode('menu')}
                >
                  <Text className="text-[17px] font-medium text-[#8E8E93]">取消</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: insets.bottom }} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
