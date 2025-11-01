import React, {useState, useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, IconButton, useTheme, ProgressBar} from 'react-native-paper';
import {voiceService} from '@services/voice';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onCancel: () => void;
  maxDuration?: number; // 最大录音时长（秒）
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onCancel,
  maxDuration = 120,
}) => {
  const theme = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          // 达到最大时长自动停止
          if (newDuration >= maxDuration) {
            handleStop();
          }
          return newDuration;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording, isPaused, maxDuration]);

  const handleStart = async () => {
    const uri = await voiceService.startRecording();
    if (uri) {
      setRecordingUri(uri);
      setIsRecording(true);
      setDuration(0);
    }
  };

  const handleStop = async () => {
    const recording = await voiceService.stopRecording();
    if (recording && recordingUri) {
      setIsRecording(false);
      onRecordingComplete(recordingUri, duration);
    }
  };

  const handleCancel = async () => {
    await voiceService.cancelRecording();
    setIsRecording(false);
    setDuration(0);
    setRecordingUri(null);
    onCancel();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration / maxDuration;

  return (
    <View style={styles.container} testID="voice-recorder">
      {/* 录音状态指示 */}
      <View style={styles.statusContainer}>
        {isRecording && (
          <View
            style={[styles.recordingIndicator, {backgroundColor: theme.colors.error}]}
            testID="recording-indicator"
          />
        )}
        <Text
          variant="headlineSmall"
          style={[styles.timer, {color: theme.colors.onSurface}]}
          testID="recording-timer">
          {formatTime(duration)}
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.maxDuration, {color: theme.colors.onSurfaceVariant}]}>
          / {formatTime(maxDuration)}
        </Text>
      </View>

      {/* 进度条 */}
      {isRecording && (
        <ProgressBar
          progress={progress}
          color={progress > 0.9 ? theme.colors.error : theme.colors.primary}
          testID="recording-progress"
          style={styles.progressBar}
        />
      )}

      {/* 控制按钮 */}
      <View style={styles.controls}>
        {!isRecording ? (
          <IconButton
            icon="microphone"
            size={48}
            iconColor={theme.colors.onPrimary}
            containerColor={theme.colors.primary}
            onPress={handleStart}
            style={styles.recordButton}
            testID="record-button"
          />
        ) : (
          <>
            <IconButton
              icon="close"
              size={32}
              iconColor={theme.colors.onSurfaceVariant}
              containerColor={theme.colors.surfaceVariant}
              onPress={handleCancel}
              testID="cancel-button"
            />
            <IconButton
              icon="stop"
              size={48}
              iconColor={theme.colors.onError}
              containerColor={theme.colors.errorContainer}
              onPress={handleStop}
              style={styles.stopButton}
              testID="stop-button"
            />
          </>
        )}
      </View>

      {/* 提示文字 */}
      <Text variant="bodySmall" style={[styles.hint, {color: theme.colors.onSurfaceVariant}]}>
        {!isRecording ? '点击麦克风开始录音' : '点击停止按钮完成录音'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  timer: {
    fontVariant: ['tabular-nums'],
  },
  maxDuration: {
    marginLeft: 4,
  },
  progressBar: {
    width: '100%',
    height: 4,
    marginBottom: 24,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  recordButton: {
    margin: 0,
  },
  stopButton: {
    margin: 0,
  },
  hint: {
    textAlign: 'center',
  },
});
