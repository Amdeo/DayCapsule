/**
 * 语音录制组件 - 现代浅色风格
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VoiceRecorderActions } from './voice-recorder/VoiceRecorderActions';
import { VoiceRecorderContent } from './voice-recorder/VoiceRecorderContent';
import { voiceRecorderStyles as styles } from './voice-recorder/VoiceRecorder.styles';
import { useVoiceRecorderController } from './voice-recorder/useVoiceRecorderController';

interface VoiceRecorderProps {
  visible: boolean;
  onSave: (uri: string, duration: number) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ visible, onSave, onCancel }: VoiceRecorderProps) {
  const {
    isRecording,
    duration,
    isPaused,
    recordingUri,
    isLoading,
    handleStart,
    handlePause,
    handleResume,
    handleStop,
    handleCancel,
    handleSave,
    handleRetry,
  } = useVoiceRecorderController({
    visible,
    onSave,
    onCancel,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleCancel} />

        <View testID="voice-recorder-root" style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.typeBadge}>
              <Ionicons name="mic" size={14} color="#F5A623" />
              <Text style={styles.typeBadgeText}>语音记录</Text>
            </View>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#737373" />
            </TouchableOpacity>
          </View>

          <VoiceRecorderContent
            isRecording={isRecording}
            isPaused={isPaused}
            recordingUri={recordingUri}
            duration={duration}
          />
          <VoiceRecorderActions
            isRecording={isRecording}
            isPaused={isPaused}
            recordingUri={recordingUri}
            isLoading={isLoading}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onStop={handleStop}
            onRetry={handleRetry}
            onSave={handleSave}
          />

          <View style={styles.bottomSpacer} />
        </View>
      </View>
    </Modal>
  );
}
