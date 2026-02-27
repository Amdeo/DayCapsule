/**
 * 语音录制组件 - 现代浅色风格
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VoiceService } from '@/src/services/voiceService';
import WaveformAnimation from './WaveformAnimation';
import { logger } from '@/src/utils/logger';

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

  // 计时器
  useEffect(() => {
    if (!isRecording || isPaused) return;
    const timer = setInterval(() => setDuration((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, [isRecording, isPaused]);

  // 关闭时重置状态
  useEffect(() => {
    if (!visible) {
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      setRecordingUri(null);
      setIsLoading(false);
    }
  }, [visible]);

  const handleStart = async () => {
    try {
      setIsLoading(true);
      await VoiceService.startRecording();
      setIsRecording(true);
      setDuration(0);
      setIsPaused(false);
    } catch (error) {
      logger.error('Failed to start recording:', error);
      Alert.alert('录音失败', '无法启动录音，请检查麦克风权限');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      await VoiceService.pauseRecording();
      setIsPaused(true);
    } catch (error) {
      logger.error('Failed to pause recording:', error);
    }
  };

  const handleResume = async () => {
    try {
      await VoiceService.resumeRecording();
      setIsPaused(false);
    } catch (error) {
      logger.error('Failed to resume recording:', error);
    }
  };

  const handleStop = async () => {
    try {
      setIsLoading(true);
      const audioFile = await VoiceService.stopRecording();
      setRecordingUri(audioFile.uri);
      setIsRecording(false);
      setIsPaused(false);
    } catch (error) {
      logger.error('Failed to stop recording:', error);
      Alert.alert('保存失败', '保存录音失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      if (isRecording) await VoiceService.cancelRecording();
    } catch (error) {
      logger.error('Failed to cancel recording:', error);
    }
    onCancel();
  };

  const handleSave = () => {
    if (!recordingUri) return;
    onSave(recordingUri, duration);
  };

  const handleRetry = () => {
    setRecordingUri(null);
    setDuration(0);
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleCancel} />

        <View style={styles.sheet}>
          {/* 拖动条 */}
          <View style={styles.handle} />

          {/* 标题栏 */}
          <View style={styles.header}>
            <View style={styles.typeBadge}>
              <Ionicons name="mic" size={14} color="#F5A623" />
              <Text style={styles.typeBadgeText}>语音记录</Text>
            </View>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#737373" />
            </TouchableOpacity>
          </View>

          {/* 内容区 */}
          <View style={styles.body}>
            {!isRecording && !recordingUri ? (
              /* ── 待机状态 ── */
              <View style={styles.idleContainer}>
                <View style={styles.micCircle}>
                  <Ionicons name="mic" size={40} color="#F5A623" />
                </View>
                <Text style={styles.idleTitle}>准备录音</Text>
                <Text style={styles.idleSubtitle}>点击下方按钮开始</Text>
              </View>
            ) : isRecording ? (
              /* ── 录音中 ── */
              <View style={styles.recordingContainer}>
                <Text style={styles.timer}>{formatTime(duration)}</Text>
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
              /* ── 录音完成 ── */
              <View style={styles.doneContainer}>
                <View style={styles.doneCircle}>
                  <Ionicons name="checkmark" size={36} color="#FFFFFF" />
                </View>
                <Text style={styles.doneTitle}>录音完成</Text>
                <Text style={styles.doneDuration}>{formatTime(duration)}</Text>
              </View>
            )}
          </View>

          {/* 操作按钮 */}
          <View style={styles.actions}>
            {!isRecording && !recordingUri ? (
              /* 开始录音 */
              <TouchableOpacity
                style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                onPress={handleStart}
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
              /* 暂停 + 停止 */
              <>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={isPaused ? handleResume : handlePause}
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
                  onPress={handleStop}
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
              /* 重录 + 保存 */
              <>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handleRetry}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={20} color="#4A4A4A" />
                  <Text style={styles.secondaryBtnText}>重新录制</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>保存</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={{ height: 24 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5E5',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF8EE',
    borderRadius: 10,
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F5A623',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingVertical: 24,
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'center',
  },
  // 待机
  idleContainer: {
    alignItems: 'center',
    gap: 12,
  },
  micCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFF8EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  idleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  idleSubtitle: {
    fontSize: 14,
    color: '#A3A3A3',
  },
  // 录音中
  recordingContainer: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  timer: {
    fontSize: 52,
    fontWeight: '700',
    color: '#1A1A1A',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  waveformBox: {
    width: '100%',
    height: 28,
  },
  recordingHint: {
    fontSize: 13,
    color: '#A3A3A3',
    fontWeight: '500',
  },
  // 完成
  doneContainer: {
    alignItems: 'center',
    gap: 12,
  },
  doneCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  doneTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  doneDuration: {
    fontSize: 16,
    color: '#737373',
    fontVariant: ['tabular-nums'],
  },
  // 按钮
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F5A623',
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  stopBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F5F5F5',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  stopIcon: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
