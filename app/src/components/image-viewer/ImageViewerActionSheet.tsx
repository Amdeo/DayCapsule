import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { imageViewerStyles as styles } from './ImageViewer.styles';

interface ImageViewerActionSheetProps {
  visible: boolean;
  bottomInset: number;
  onClose: () => void;
  onSaveToAlbum: () => void;
  onShare: () => void;
}

export function ImageViewerActionSheet({
  visible,
  bottomInset,
  onClose,
  onSaveToAlbum,
  onShare,
}: ImageViewerActionSheetProps) {
  if (!visible) {
    return null;
  }

  return (
    <View testID="image-viewer-action-sheet" style={styles.actionSheetOverlay}>
      <Pressable
        testID="image-viewer-action-sheet-overlay"
        style={styles.actionSheetOverlayDismissArea}
        onPress={onClose}
      />
      <View style={[styles.actionSheet, { paddingBottom: bottomInset + 8 }]}> 
        <View style={styles.actionSheetHandle} />
        <Pressable
          style={styles.actionSheetItem}
          onPress={onSaveToAlbum}
        >
          <Text style={styles.actionSheetItemText}>保存到相册</Text>
        </Pressable>
        <View style={styles.actionSheetDivider} />
        <Pressable
          style={styles.actionSheetItem}
          onPress={onShare}
        >
          <Text style={styles.actionSheetItemText}>分享</Text>
        </Pressable>
        <View style={styles.actionSheetGap} />
        <Pressable
          style={styles.actionSheetItem}
          onPress={onClose}
        >
          <Text style={styles.actionSheetCancelText}>取消</Text>
        </Pressable>
      </View>
    </View>
  );
}
