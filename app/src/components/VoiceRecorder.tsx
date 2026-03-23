/**
 * 语音录制组件 - 现代浅色风格
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VoiceService } from '@/src/services/voiceService';
import WaveformAnimation from './WaveformAnimation';
import { logger } from '@/src/utils/logger';
import { formatMMSS } from '@/src/utils/timeUtils';

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View className="flex-1 justify-end" testID="voice-recorder-root">
        <TouchableOpacity className="absolute inset-0 bg-black/45" activeOpacity={1} onPress={handleCancel} />

        <View className="rounded-t-[24px] bg-white px-5 shadow-lg shadow-black/10">
          {/* 拖动条 */}
          <View className="mb-1 mt-3 h-1 w-9 self-center rounded-full bg-neutral-200" />

          {/* 标题栏 */}
          <View className="flex-row items-center justify-between py-4">
            <View className="flex-row items-center gap-1.5 rounded-[10px] bg-[#FFF8EE] px-3 py-1.5">
              <Ionicons name="mic" size={14} color="#F5A623" />
              <Text className="text-[13px] font-semibold text-[#F5A623]">语音记录</Text>
            </View>
            <TouchableOpacity onPress={handleCancel} className="h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
              <Ionicons name="close" size={20} color="#737373" />
            </TouchableOpacity>
          </View>

          {/* 内容区 */}
          <View className="min-h-[180px] items-center justify-center py-6">
            {!isRecording && !recordingUri ? (
              /* ── 待机状态 ── */
              <View className="items-center gap-3" testID="voice-recorder-idle">
                <View className="mb-1 h-[88px] w-[88px] items-center justify-center rounded-full bg-[#FFF8EE]">
                  <Ionicons name="mic" size={40} color="#F5A623" />
                </View>
                <Text className="text-[20px] font-bold text-[#1A1A1A]">准备录音</Text>
                <Text className="text-sm text-copy-muted">点击下方按钮开始</Text>
              </View>
            ) : isRecording ? (
              /* ── 录音中 ── */
              <View className="w-full items-center gap-4" testID="voice-recorder-recording">
                <Text className="tabular-nums text-[52px] font-bold tracking-[2px] text-[#1A1A1A]">
                  {formatMMSS(duration)}
                </Text>
                <View className="h-7 w-full">
                  <WaveformAnimation
                    isRecording={!isPaused}
                    color={isPaused ? '#D1D1D1' : '#F5A623'}
                  />
                </View>
                <Text className="text-[13px] font-medium text-copy-muted">
                  {isPaused ? '已暂停' : '录音中...'}
                </Text>
              </View>
            ) : (
              /* ── 录音完成 ── */
              <View className="items-center gap-3" testID="voice-recorder-done">
                <View className="mb-1 h-[72px] w-[72px] items-center justify-center rounded-full bg-[#4CAF50]">
                  <Ionicons name="checkmark" size={36} color="#FFFFFF" />
                </View>
                <Text className="text-[20px] font-bold text-[#1A1A1A]">录音完成</Text>
                <Text className="tabular-nums text-base text-neutral-500">{formatMMSS(duration)}</Text>
              </View>
            )}
          </View>

          {/* 操作按钮 */}
          <View className="mt-2 flex-row gap-3">
            {!isRecording && !recordingUri ? (
              /* 开始录音 */
              <TouchableOpacity
                className={`h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-full ${
                  isLoading ? 'bg-[#F5A623] opacity-50' : 'bg-[#F5A623] shadow-lg shadow-[#F5A623]/30'
                }`}
                onPress={handleStart}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="mic" size={20} color="#FFFFFF" />
                    <Text className="text-base font-semibold text-white">开始录音</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : isRecording ? (
              /* 暂停 + 停止 */
              <>
                <TouchableOpacity
                  className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-full bg-neutral-100"
                  onPress={isPaused ? handleResume : handlePause}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isPaused ? 'play' : 'pause'}
                    size={20}
                    color="#4A4A4A"
                  />
                  <Text className="text-base font-semibold text-[#4A4A4A]">{isPaused ? '继续' : '暂停'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-full ${
                    isLoading ? 'bg-[#EF4444] opacity-50' : 'bg-[#EF4444] shadow-lg shadow-[#EF4444]/25'
                  }`}
                  onPress={handleStop}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                      <View className="h-[14px] w-[14px] rounded-[3px] bg-white" />
                      <Text className="text-base font-semibold text-white">停止</Text>
                  </>
                )}
              </TouchableOpacity>
              </>
            ) : (
              /* 重录 + 保存 */
              <>
                <TouchableOpacity
                  className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-full bg-neutral-100"
                  onPress={handleRetry}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={20} color="#4A4A4A" />
                  <Text className="text-base font-semibold text-[#4A4A4A]">重新录制</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-full bg-[#F5A623] shadow-lg shadow-[#F5A623]/30"
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text className="text-base font-semibold text-white">保存</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View className="h-6" />
        </View>
      </View>
    </Modal>
  );
}
