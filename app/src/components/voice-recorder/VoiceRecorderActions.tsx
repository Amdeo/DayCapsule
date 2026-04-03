import React from 'react';
import { ActivityIndicator, Text, Pressable, View } from 'react-native';
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
        <Pressable
          style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
          onPress={onStart}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="mic" size={20} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>开始录音</Text>
            </>
          )}
        </Pressable>
      ) : isRecording ? (
        <>
          <Pressable
            style={styles.secondaryBtn}
            onPress={isPaused ? onResume : onPause}
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={20}
              color="#4A4A4A"
            />
            <Text style={styles.secondaryBtnText}>{isPaused ? '继续' : '暂停'}</Text>
          </Pressable>
          <Pressable
            style={[styles.stopBtn, isLoading && styles.btnDisabled]}
            onPress={onStop}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <View style={styles.stopIcon} />
                <Text style={styles.primaryBtnText}>停止</Text>
              </>
            )}
          </Pressable>
        </>
      ) : (
        <>
          <Pressable
            style={styles.secondaryBtn}
            onPress={onRetry}
          >
            <Ionicons name="refresh" size={20} color="#4A4A4A" />
            <Text style={styles.secondaryBtnText}>重新录制</Text>
          </Pressable>
          <Pressable
            style={styles.primaryBtn}
            onPress={onSave}
          >
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>保存</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
