import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform, Text } from 'react-native';
import { useTheme, IconButton } from 'react-native-paper';
import { MD3Theme } from 'react-native-paper/lib/typescript/types';
import Animated from 'react-native-reanimated';
import useKeyboardHandler from './useKeyboardHandler';
import { useAutoSaveDraft } from '../../../hooks/useAutoSaveDraft';

interface CapsuleDockProps {
  onTextInputFocus?: () => void;
  onCameraPress?: () => void;
  onMicLongPress?: () => void; // Long press to start recording
  onCameraPressOut?: () => void; // Release to stop recording
  onFilterPress?: () => void;
  onSendText?: (text: string) => void;
}

const CapsuleDock: React.FC<CapsuleDockProps> = ({
  onTextInputFocus,
  onCameraPress,
  onMicLongPress,
  onCameraPressOut,
  onFilterPress,
  onSendText,
}) => {
  const theme = useTheme();
  const { animatedKeyboardStyle } = useKeyboardHandler();
  const styles = getStyles(theme);
  
  const { text, setText, clearDraft } = useAutoSaveDraft('capsule_dock_draft');

  const handleSend = () => {
    if (text.trim().length > 0 && onSendText) {
      onSendText(text);
      clearDraft();
    }
  };

  const showSendButton = text.length > 0;

  return (
    <Animated.View style={[styles.containerWrapper, animatedKeyboardStyle]}>
      <View style={styles.container}>
        <TouchableOpacity onPress={onFilterPress} style={styles.filterButton}>
          <Text style={{fontSize: 24, color: theme.colors.onPrimaryContainer}}>#</Text>
        </TouchableOpacity>

        <TextInput
          testID="capsule-text-input"
          placeholder="输入想法..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
          style={styles.textInput}
          onFocus={onTextInputFocus}
          value={text}
          onChangeText={setText}
          multiline
        />

        {showSendButton ? (
          <TouchableOpacity
            onPress={handleSend}
            style={styles.sendButton}
            testID="capsule-send-button"
          >
            <Text style={{fontSize: 24, color: theme.colors.onPrimary}}>📤</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onCameraPress}
            onLongPress={onMicLongPress}
            onPressOut={onCameraPressOut}
            delayLongPress={300}
            style={styles.cameraButton}
            testID="capsule-camera-button"
          >
            <Text style={{fontSize: 24, color: theme.colors.onPrimary}}>📷</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const getStyles = (theme: MD3Theme) => StyleSheet.create({
  containerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: 30,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 30 : 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  filterButton: {
    marginRight: 8,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 16,
    color: theme.colors.onPrimaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cameraButton: {
    marginLeft: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    padding: 2,
    alignItems: 'center',
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    padding: 2,
    alignItems: 'center',
  }
});

export default CapsuleDock;