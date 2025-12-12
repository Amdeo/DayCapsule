import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, Animated, Keyboard, Modal } from 'react-native';
import { useTheme, IconButton } from 'react-native-paper';
import { MD3Theme } from 'react-native-paper/lib/typescript/types';
import { useAutoSaveDraft } from '../../../hooks/useAutoSaveDraft';

interface FloatingInputDockProps {
  onTextInputFocus?: () => void;
  onCameraPress?: () => void;
  onMicLongPress?: () => void;
  onCameraPressOut?: () => void;
  onFilterPress?: () => void;
  onSendText?: (text: string) => void;
}

const FloatingInputDock: React.FC<FloatingInputDockProps> = ({
  onTextInputFocus,
  onCameraPress,
  onMicLongPress,
  onCameraPressOut,
  onFilterPress,
  onSendText,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { text, setText, clearDraft } = useAutoSaveDraft('capsule_dock_draft');

  const [isInputPanelVisible, setIsInputPanelVisible] = useState(false);
  const [fabScale] = useState(new Animated.Value(1));
  const [fabRotate] = useState(new Animated.Value(0));

  const handleFabPress = () => {
    setIsInputPanelVisible(true);
    Animated.parallel([
      Animated.spring(fabScale, {
        toValue: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(fabRotate, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleClosePanel = () => {
    setIsInputPanelVisible(false);
    Animated.parallel([
      Animated.spring(fabScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(fabRotate, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSend = () => {
    if (text.trim().length > 0 && onSendText) {
      onSendText(text);
      clearDraft();
      handleClosePanel();
    }
  };

  const rotateAnimation = fabRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const fabStyle = [
    styles.fab,
    {
      transform: [
        { scale: fabScale },
        { rotate: rotateAnimation },
      ],
    },
  ] as const;

  return (
    <>
      {/* 浮动操作按钮 */}
      <Animated.View style={styles.fabContainer}>
        <Animated.View style={fabStyle}>
          <TouchableOpacity style={styles.fabButton} onPress={handleFabPress} activeOpacity={0.8}>
            <Text style={{fontSize: 24, color: 'white'}}>✏️</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* 快捷操作按钮 */}
      <Animated.View style={styles.quickActionsContainer}>
        {/* 筛选按钮 */}
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={onFilterPress}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{fontSize: 24, color: '#6B7280'}}>#</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* 输入面板模态框 */}
      <Modal
        visible={isInputPanelVisible}
        animationType="none"
        transparent={true}
        onRequestClose={handleClosePanel}
        hardwareAccelerated={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.inputPanel}>
            {/* 面板头部 */}
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>记录生活</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClosePanel}
                activeOpacity={0.5}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Text style={{fontSize: 18, color: '#6B7280'}}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 文字输入区域 */}
            <View style={styles.inputContainer}>
              <TextInput
                testID="capsule-text-input"
                placeholder="分享你的想法..."
                placeholderTextColor="#9CA3AF"
                style={styles.textInput}
                onFocus={onTextInputFocus}
                value={text}
                onChangeText={setText}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
              {text.length > 0 && (
                <Text style={styles.charCount}>{text.length}/500</Text>
              )}
            </View>

            {/* 快捷选项 */}
            <View style={styles.quickOptions}>
              <TouchableOpacity style={styles.quickOption} onPress={onCameraPress} activeOpacity={0.7}>
                <Text style={{fontSize: 24, color: '#4F46E5'}}>📷</Text>
                <Text style={styles.quickOptionText}>拍照</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickOption}
                onPressIn={onMicLongPress}
                onPressOut={onCameraPressOut}
                activeOpacity={0.7}
              >
                <Text style={{fontSize: 24, color: '#4F46E5'}}>🎤</Text>
                <Text style={styles.quickOptionText}>录音</Text>
              </TouchableOpacity>
            </View>

            {/* 发送按钮 */}
            {text.trim().length > 0 && (
              <TouchableOpacity style={styles.sendButton} onPress={handleSend} activeOpacity={0.8}>
                <Text style={styles.sendButtonText}>发布</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const getStyles = (theme: MD3Theme) => StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    zIndex: 999,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionsContainer: {
    position: 'absolute',
    right: 20,
    bottom: 130,
    zIndex: 998,
  },
  quickActionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  inputPanel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  panelTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  inputContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textInput: {
    fontSize: 16,
    color: '#1F2937',
    minHeight: 100,
    maxHeight: 200,
    padding: 0,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 8,
  },
  quickOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  quickOption: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 80,
    gap: 4,
  },
  quickOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  sendButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default FloatingInputDock;
