/**
 * 媒体类型选择器组件
 * 用于选择要创建的记录类型（文本、照片、语音）
 */

import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { ENTRY_TYPES } from '@/src/utils/constants';

interface MediaSelectorProps {
  visible: boolean;
  onSelect: (type: 'text' | 'photo' | 'voice') => void;
  onCancel: () => void;
}

export function MediaSelector({ visible, onSelect, onCancel }: MediaSelectorProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      {/* 背景遮罩 */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        {/* 菜单容器 */}
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>选择记录类型</Text>

          {/* 文本选项 */}
          <TouchableOpacity
            style={styles.option}
            onPress={() => {
              onSelect('text');
              onCancel();
            }}
          >
            <Text style={styles.icon}>{ENTRY_TYPES.TEXT.icon}</Text>
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>{ENTRY_TYPES.TEXT.label}</Text>
              <Text style={styles.optionDescription}>写下你的想法</Text>
            </View>
          </TouchableOpacity>

          {/* 照片选项 */}
          <TouchableOpacity
            style={styles.option}
            onPress={() => {
              onSelect('photo');
              onCancel();
            }}
          >
            <Text style={styles.icon}>{ENTRY_TYPES.PHOTO.icon}</Text>
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>{ENTRY_TYPES.PHOTO.label}</Text>
              <Text style={styles.optionDescription}>拍照或选择图片</Text>
            </View>
          </TouchableOpacity>

          {/* 语音选项 */}
          <TouchableOpacity
            style={styles.option}
            onPress={() => {
              onSelect('voice');
              onCancel();
            }}
          >
            <Text style={styles.icon}>{ENTRY_TYPES.VOICE.icon}</Text>
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>{ENTRY_TYPES.VOICE.label}</Text>
              <Text style={styles.optionDescription}>录制语音备忘录</Text>
            </View>
          </TouchableOpacity>

          {/* 取消按钮 */}
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // 半透明遮罩
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF', // 白色背景
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#262626', // 深色文字
    marginBottom: 24,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F5F5F5', // 浅灰背景
    borderRadius: 12,
  },
  icon: {
    fontSize: 32,
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626', // 深色
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#737373', // 中灰
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F97316', // 橙色
  },
});
