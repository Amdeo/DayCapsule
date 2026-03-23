import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { voiceRecorderStyles as styles } from './VoiceRecorder.styles';

interface VoiceRecorderActionsProps {
  isRecording: boolean;
  isPaused: boolean;
  recordingUri: string | null;
  isLoading: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRetry: () => void;
  onSave: () => void;
}

export function VoiceRecorderActions({
  isRecording,
  isPaused,
  recordingUri,
  isLoading,
  onStart,
  onPause,
  onResume,
  onStop,
  onRetry,
  onSave,
}: VoiceRecorderActionsProps) {
  return (
    <View style={styles.actions}>
      {!isRecording && !recordingUri ? (
        <TouchableOpacity
          style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
          onPress={onStart}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="mic" size={20} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>开始录音</Text>
            </>
          )}
        </TouchableOpacity>
      ) : isRecording ? (
        <>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={isPaused ? onResume : onPause}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={20}
              color="#4A4A4A"
            />
            <Text style={styles.secondaryBtnText}>{isPaused ? '继续' : '暂停'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stopBtn, isLoading && styles.btnDisabled]}
            onPress={onStop}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <View style={styles.stopIcon} />
                <Text style={styles.primaryBtnText}>停止</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#4A4A4A" />
            <Text style={styles.secondaryBtnText}>重新录制</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onSave}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>保存</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
