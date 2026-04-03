import React from 'react';
import type { GestureResponderHandlers } from 'react-native';
import { Modal, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { AnimatedStyle } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';
import {
  EntryActionSheetConfirm,
  EntryActionSheetMenu,
} from './EntryActionSheetViews';
import { entryActionSheetStyles as styles } from './EntryActionSheet.styles';
import type { ActionSheetMode } from './entryActionSheetConfig';

interface EntryActionSheetSceneProps {
  shouldRender: boolean;
  mode: ActionSheetMode;
  typeColor: string;
  bottomInset: number;
  panHandlers: GestureResponderHandlers;
  backdropStyle: AnimatedStyle<ViewStyle>;
  sheetStyle: AnimatedStyle<ViewStyle>;
  onClose: () => void;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export function EntryActionSheetScene({
  shouldRender,
  mode,
  typeColor,
  bottomInset,
  panHandlers,
  backdropStyle,
  sheetStyle,
  onClose,
  onEdit,
  onDeleteRequest,
  onConfirmDelete,
  onCancelDelete,
}: EntryActionSheetSceneProps) {
  if (!shouldRender) {
    return null;
  }

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
          style={styles.overlayPressable}
          onPress={onClose}
        >
          <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <Animated.View
          testID="action-sheet-panel"
          style={[styles.sheetWrap, sheetStyle]}
          {...panHandlers}
        >
          <View style={styles.panel}>
            <View
              testID="action-sheet-handle"
              style={[styles.handle, { backgroundColor: typeColor }]}
            />

            {mode === 'menu' ? (
              <EntryActionSheetMenu
                onEdit={onEdit}
                onDeleteRequest={onDeleteRequest}
                onClose={onClose}
              />
            ) : (
              <EntryActionSheetConfirm
                onConfirmDelete={onConfirmDelete}
                onCancel={onCancelDelete}
              />
            )}

            <View style={{ height: bottomInset }} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
