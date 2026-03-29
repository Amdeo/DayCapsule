import React from 'react';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';
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
        <TouchableOpacity
          style={styles.actionSheetItem}
          onPress={onSaveToAlbum}
          activeOpacity={0.7}
        >
          <Text style={styles.actionSheetItemText}>保存到相册</Text>
        </TouchableOpacity>
        <View style={styles.actionSheetDivider} />
        <TouchableOpacity
          style={styles.actionSheetItem}
          onPress={onShare}
          activeOpacity={0.7}
        >
          <Text style={styles.actionSheetItemText}>分享</Text>
        </TouchableOpacity>
        <View style={styles.actionSheetGap} />
        <TouchableOpacity
          style={styles.actionSheetItem}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={styles.actionSheetCancelText}>取消</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
