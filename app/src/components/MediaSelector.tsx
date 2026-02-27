/**
 * 媒体类型选择器组件
 * 用于选择要创建的记录类型（文本、照片、语音）
 */

import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated } from 'react-native';
// @ts-ignore - expo-blur types not available
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

interface MediaSelectorProps {
  visible: boolean;
  onSelect: (type: 'text' | 'photo' | 'voice') => void;
  onCancel: () => void;
}

export function MediaSelector({ visible, onSelect, onCancel }: MediaSelectorProps) {
  const slideAnim = React.useRef(new Animated.Value(300)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelect = (type: 'text' | 'photo' | 'voice') => {
    onSelect(type);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onCancel}
        />

        <Animated.View
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* 顶部指示条 */}
          <View style={styles.handle} />

          <Text style={styles.title}>创建新记忆</Text>

          {/* 选项网格 */}
          <View style={styles.optionsGrid}>
            {/* 文本选项 */}
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => handleSelect('text')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#A491D3' }]}>
                <Ionicons name="create-outline" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.optionLabel}>文本</Text>
              <Text style={styles.optionDescription}>写下想法</Text>
            </TouchableOpacity>

            {/* 照片选项 */}
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => handleSelect('photo')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#77C9D4' }]}>
                <Ionicons name="camera-outline" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.optionLabel}>照片</Text>
              <Text style={styles.optionDescription}>拍照记录</Text>
            </TouchableOpacity>

            {/* 语音选项 */}
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => handleSelect('voice')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#F5A623' }]}>
                <Ionicons name="mic-outline" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.optionLabel}>语音</Text>
              <Text style={styles.optionDescription}>录音备忘</Text>
            </TouchableOpacity>
          </View>

          {/* 取消按钮 */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 24,
    textAlign: 'center',
  },
  optionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  optionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
    marginHorizontal: 6,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: '#A3A3A3',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#737373',
  },
});
