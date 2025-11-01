import React, {useState, useEffect} from 'react';
import {View, StyleSheet, SafeAreaView} from 'react-native';
import {Button, Text, ActivityIndicator} from 'react-native-paper';
import {audioRecorder} from '@services/voice/audioRecorder';
import {asrService} from '@services/ai/asrService';
import {audioStorage} from '@services/storage/audioStorage';
import {performanceMonitor} from '@services/telemetry/performance';
import {RecordButton} from '../components/RecordButton';
import {WaveformVisualizer} from '../components/WaveformVisualizer';
import {TranscriptionProgress} from '../components/TranscriptionProgress';
import {TranscriptEditor} from '../components/TranscriptEditor';
import {AudioPlayer} from '../components/AudioPlayer';

interface VoiceRecordScreenProps {
  onSave?: (data: VoiceRecordData) => void;
  onCancel?: () => void;
}

export interface VoiceRecordData {
  audioPath: string;
  transcript: string;
  duration: number;
  confidence: number;
}

export const VoiceRecordScreen: React.FC<VoiceRecordScreenProps> = ({
  onSave,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 更新录音时长
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        const duration = audioRecorder.getRecordingDuration();
        setRecordingDuration(duration);
      }, 100);
    }

    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const handleRecordStart = async () => {
    try {
      setError(null);
      performanceMonitor.startMeasure('voice_record_start');

      const result = await audioRecorder.startRecording();
      if (result) {
        setIsRecording(true);
        setRecordingDuration(0);
        setTranscript('');
        setAudioPath(null);
      } else {
        setError('无法开始录音，请检查权限');
      }

      performanceMonitor.endMeasure('voice_record_start');
    } catch (err) {
      setError('录音启动失败');
    }
  };

  const handleRecordStop = async () => {
    try {
      setError(null);
      performanceMonitor.startMeasure('voice_record_stop');

      const path = await audioRecorder.stopRecording();
      if (path) {
        setIsRecording(false);
        setIsPaused(false);
        setAudioPath(path);

        // 自动开始转写
        await handleTranscribe(path);
      } else {
        setError('录音时长过短，请至少录制 1 秒');
      }

      performanceMonitor.endMeasure('voice_record_stop');
    } catch (err) {
      setError('停止录音失败');
    }
  };

  const handleRecordPause = async () => {
    try {
      const result = await audioRecorder.pauseRecording();
      if (result) {
        setIsPaused(true);
      }
    } catch (err) {
      setError('暂停录音失败');
    }
  };

  const handleRecordResume = async () => {
    try {
      const result = await audioRecorder.resumeRecording();
      if (result) {
        setIsPaused(false);
      }
    } catch (err) {
      setError('恢复录音失败');
    }
  };

  const handleTranscribe = async (path: string) => {
    try {
      setIsTranscribing(true);
      setTranscriptionProgress(0);
      performanceMonitor.startMeasure('voice_transcribe');

      const result = await asrService.transcribe(path, 'zh-CN', {
        enablePunctuation: true,
        convertNumbers: true,
        onProgress: (current, total) => {
          setTranscriptionProgress((current / total) * 100);
        },
      });

      if (result) {
        setTranscript(result.text);
        setConfidence(result.confidence);
      } else {
        setError('转写失败，请重试');
      }

      performanceMonitor.endMeasure('voice_transcribe');
    } catch (err) {
      setError('转写过程出错');
    } finally {
      setIsTranscribing(false);
      setTranscriptionProgress(0);
    }
  };

  const handleSave = async () => {
    try {
      if (!audioPath) {
        setError('没有音频文件');
        return;
      }

      performanceMonitor.startMeasure('voice_save');

      // 保存音频
      const savedPath = await audioStorage.saveAudio(audioPath, true);
      if (!savedPath) {
        setError('保存音频失败');
        return;
      }

      // 调用回调
      if (onSave) {
        onSave({
          audioPath: savedPath,
          transcript,
          duration: recordingDuration,
          confidence,
        });
      }

      performanceMonitor.endMeasure('voice_save');
    } catch (err) {
      setError('保存失败');
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      audioRecorder.cancelRecording();
      setIsRecording(false);
    }
    if (onCancel) {
      onCancel();
    }
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* 标题 */}
        <Text style={styles.title}>语音记录</Text>

        {/* 录音区域 */}
        {!audioPath ? (
          <View style={styles.recordingArea}>
            {/* 波形可视化 */}
            {isRecording && (
              <WaveformVisualizer
                isRecording={isRecording}
                isPaused={isPaused}
              />
            )}

            {/* 时长显示 */}
            <Text style={styles.timer} testID="timer">
              {formatTime(recordingDuration)}
            </Text>

            {/* 录音按钮 */}
            <RecordButton
              isRecording={isRecording}
              isPaused={isPaused}
              onStart={handleRecordStart}
              onStop={handleRecordStop}
              onPause={handleRecordPause}
              onResume={handleRecordResume}
            />

            {/* 状态指示 */}
            {isRecording && (
              <View style={styles.recordingIndicator} testID="recording_indicator">
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>
                  {isPaused ? '已暂停' : '录音中...'}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.resultArea}>
            {/* 转写进度 */}
            {isTranscribing && (
              <TranscriptionProgress
                progress={transcriptionProgress}
                testID="transcription_progress"
              />
            )}

            {/* 转写结果 */}
            {transcript && !isTranscribing && (
              <View style={styles.transcriptSection}>
                <Text style={styles.transcriptLabel}>转写结果</Text>
                <TranscriptEditor
                  value={transcript}
                  onChange={setTranscript}
                  testID="transcript_editor"
                />
                <Text style={styles.confidenceText}>
                  置信度: {(confidence * 100).toFixed(1)}%
                </Text>
              </View>
            )}

            {/* 音频播放 */}
            <AudioPlayer
              audioPath={audioPath}
              isPlaying={isPlaying}
              onPlayingChange={setIsPlaying}
            />
          </View>
        )}

        {/* 错误提示 */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* 底部按钮 */}
        <View style={styles.buttonContainer}>
          {audioPath && !isTranscribing ? (
            <>
              <Button
                mode="outlined"
                onPress={handleCancel}
                style={styles.button}
                testID="cancel_button">
                取消
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                style={styles.button}
                testID="save_button">
                保存
              </Button>
            </>
          ) : (
            <Button
              mode="outlined"
              onPress={handleCancel}
              style={styles.button}
              testID="cancel_button">
              取消
            </Button>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  recordingArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultArea: {
    flex: 1,
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff4444',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    color: '#666',
  },
  transcriptSection: {
    marginBottom: 16,
  },
  transcriptLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  confidenceText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
});

