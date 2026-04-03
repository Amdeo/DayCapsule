import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WaveformAnimation from '@/src/components/WaveformAnimation';
import { formatMMSS } from '@/src/utils/timeUtils';
import { voiceRecorderStyles as styles } from './VoiceRecorder.styles';

interface VoiceRecorderContentProps {
  isRecording: boolean;
  isPaused: boolean;
  recordingUri: string | null;
  duration: number;
}

export function VoiceRecorderContent({
  isRecording,
  isPaused,
  recordingUri,
  duration,
}: VoiceRecorderContentProps) {
  return (
    <View style={styles.body}>
      {!isRecording && !recordingUri ? (
        <View testID="voice-recorder-idle" style={styles.idleContainer}>
          <View style={styles.micCircle}>
            <Ionicons name="mic" size={40} color="#F5A623" />
          </View>
          <Text style={styles.idleTitle}>准备录音</Text>
          <Text style={styles.idleSubtitle}>点击下方按钮开始</Text>
        </View>
      ) : isRecording ? (
        <View testID="voice-recorder-recording" style={styles.recordingContainer}>
          <Text style={styles.timer}>{formatMMSS(duration)}</Text>
          <View style={styles.waveformBox}>
            <WaveformAnimation
              isRecording={!isPaused}
              color={isPaused ? '#D1D1D1' : '#F5A623'}
            />
          </View>
          <Text style={styles.recordingHint}>
            {isPaused ? '已暂停' : '录音中...'}
          </Text>
        </View>
      ) : (
        <View testID="voice-recorder-done" style={styles.doneContainer}>
          <View style={styles.doneCircle}>
            <Ionicons name="checkmark" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.doneTitle}>录音完成</Text>
          <Text style={styles.doneDuration}>{formatMMSS(duration)}</Text>
        </View>
      )}
    </View>
  );
}
