import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
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
      <View style={styles.container}>
        <Pressable
          testID="action-sheet-overlay"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        >
          <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <Animated.View
          style={[styles.sheetWrap, sheetStyle]}
          {...panResponder.panHandlers}
        >
          <View style={styles.panel}>
            <View
              testID="action-sheet-handle"
              style={[styles.handle, { backgroundColor: typeColor }]}
            />

            {mode === 'menu' ? (
              <>
                <View style={styles.optionGroup}>
                  <TouchableOpacity
                    testID="action-sheet-edit"
                    style={styles.optionRow}
                    onPress={() => {
                      onEdit();
                      onClose();
                    }}
                  >
                    <Ionicons name="pencil-outline" size={20} color="#8E8E93" />
                    <Text style={styles.optionText}>编辑</Text>
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity
                    testID="action-sheet-delete"
                    style={styles.optionRow}
                    onPress={() => setMode('confirm')}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    <Text style={styles.deleteText}>删除</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  testID="action-sheet-cancel"
                  style={styles.cancelButton}
                  onPress={onClose}
                >
                  <Text style={styles.cancelText}>取消</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.confirmGroup}>
                <Text style={styles.confirmTitle}>确认删除这条记录？</Text>
                <Text style={styles.confirmSubtitle}>此操作无法撤销</Text>

                <TouchableOpacity
                  testID="action-sheet-confirm-delete"
                  style={styles.confirmDeleteButton}
                  onPress={() => {
                    onDelete();
                    onClose();
                  }}
                >
                  <Text style={styles.confirmDeleteText}>删除</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="action-sheet-confirm-cancel"
                  style={styles.confirmCancelButton}
                  onPress={() => setMode('menu')}
                >
                  <Text style={styles.cancelText}>取消</Text>
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

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelText: {
    color: '#8E8E93',
    fontSize: 17,
    fontWeight: '500',
  },
  confirmCancelButton: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  confirmDeleteButton: {
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    marginTop: 16,
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  confirmGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  confirmSubtitle: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  confirmTitle: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  deleteText: {
    color: '#FF3B30',
    fontSize: 17,
    marginLeft: 12,
  },
  divider: {
    backgroundColor: '#F0F0F0',
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
  handle: {
    alignSelf: 'center',
    borderRadius: 999,
    height: 6,
    marginBottom: 16,
    marginTop: 12,
    width: 40,
  },
  optionGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
  },
  optionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    paddingHorizontal: 16,
  },
  optionText: {
    color: '#1A1A1A',
    fontSize: 17,
    marginLeft: 12,
  },
  panel: {
    paddingHorizontal: 12,
    paddingTop: 0,
  },
  sheetWrap: {
    justifyContent: 'flex-end',
  },
});
