/**
 * 语音录制组件
 * 提供录音界面和控制
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { VoiceService } from '@/src/services/voiceService';

interface VoiceRecorderProps {
  visible: boolean;
  onSave: (uri: string, duration: number) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ visible, onSave, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 更新时长
  useEffect(() => {
    if (!isRecording || isPaused) return;

    const timer = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isRecording, isPaused]);

  // 开始录音
  const handleStartRecording = async () => {
    try {
      setIsLoading(true);
      await VoiceService.startRecording();
      setIsRecording(true);
      setDuration(0);
      setIsPaused(false);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('无法启动录音，请检查权限');
    } finally {
      setIsLoading(false);
    }
  };

  // 暂停录音
  const handlePauseRecording = async () => {
    try {
      await VoiceService.pauseRecording();
      setIsPaused(true);
    } catch (error) {
      console.error('Failed to pause recording:', error);
    }
  };

  // 继续录音
  const handleResumeRecording = async () => {
    try {
      await VoiceService.resumeRecording();
      setIsPaused(false);
    } catch (error) {
      console.error('Failed to resume recording:', error);
    }
  };

  // 停止录音
  const handleStopRecording = async () => {
    try {
      setIsLoading(true);
      const audioFile = await VoiceService.stopRecording();
      setRecordingUri(audioFile.uri);
      setIsRecording(false);
      setIsPaused(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      alert('保存录音失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 取消录音
  const handleCancelRecording = async () => {
    try {
      if (isRecording) {
        await VoiceService.cancelRecording();
      }
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      setRecordingUri(null);
      onCancel();
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  };

  // 保存录音
  const handleSave = async () => {
    if (!recordingUri) return;

    try {
      onSave(recordingUri, duration);
      setDuration(0);
      setRecordingUri(null);
    } catch (error) {
      console.error('Failed to save recording:', error);
    }
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancelRecording}
    >
      <View style={styles.container}>
        {/* 标题 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancelRecording}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🎤 语音记录</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* 主要内容 */}
        <View style={styles.content}>
          {isRecording ? (
            <>
              {/* 录音中 */}
              <View style={styles.wavformContainer}>
                <View style={styles.wavform}>
                  {[...Array(5)].map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.bar,
                        {
                          height: Math.random() * 60 + 20,
                          animationDelay: `${i * 100}ms`,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>

              {/* 时长和文件大小 */}
              <View style={styles.statsContainer}>
                <Text style={styles.duration}>{formatTime(duration)}</Text>
                <Text style={styles.quality}>质量: 高</Text>
              </View>

              {/* 控制按钮 */}
              <View style={styles.controls}>
                {isPaused ? (
                  <TouchableOpacity
                    style={[styles.button, styles.continueButton]}
                    onPress={handleResumeRecording}
                  >
                    <Text style={styles.buttonText}>▶ 继续</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.button, styles.pauseButton]}
                    onPress={handlePauseRecording}
                  >
                    <Text style={styles.buttonText}>⏸ 暂停</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.button, styles.stopButton]}
                  onPress={handleStopRecording}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>⏹ 停止</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : recordingUri ? (
            <>
              {/* 录音完成 */}
              <Text style={styles.completeText}>✓ 录音完成</Text>
              <Text style={styles.fileInfo}>时长: {formatTime(duration)}</Text>

              <View style={styles.controls}>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSave}
                >
                  <Text style={styles.buttonText}>💾 保存</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.retryButton]}
                  onPress={() => {
                    setRecordingUri(null);
                    setDuration(0);
                  }}
                >
                  <Text style={styles.buttonText}>🔄 重新录制</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* 准备录音 */}
              <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderIcon}>🎤</Text>
                <Text style={styles.placeholderText}>准备好了吗？</Text>
                <Text style={styles.placeholderSubtext}>
                  点击下方按钮开始录音
                </Text>
              </View>

              <View style={styles.controls}>
                <TouchableOpacity
                  style={[styles.button, styles.startButton]}
                  onPress={handleStartRecording}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>🎙 开始录音</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  closeButton: {
    fontSize: 28,
    color: '#999',
    width: 44,
    textAlign: 'left',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  wavformContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  wavform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bar: {
    width: 6,
    backgroundColor: '#6200ee',
    borderRadius: 3,
  },
  statsContainer: {
    alignItems: 'center',
    gap: 12,
  },
  duration: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  quality: {
    fontSize: 14,
    color: '#999',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#ff6f00',
  },
  pauseButton: {
    backgroundColor: '#6200ee',
  },
  continueButton: {
    backgroundColor: '#6200ee',
  },
  stopButton: {
    backgroundColor: '#d32f2f',
  },
  saveButton: {
    backgroundColor: '#4caf50',
  },
  retryButton: {
    backgroundColor: '#2196f3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  placeholderIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#999',
  },
  completeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#4caf50',
    textAlign: 'center',
    marginBottom: 12,
  },
  fileInfo: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 40,
  },
});
