/**
 * 增强的 Entry 卡片组件 - 极简现代风格
 * 支持文本、照片和语音等多种媒体类型
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Animated, {
  FadeIn,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Entry } from '@/src/types/entry';
import { VoiceService } from '@/src/services/voiceService';
import WaveformAnimation from './WaveformAnimation';

interface EntryCardProps {
  entry: Entry;
  onDelete: (id: string) => void;
  onEdit?: (entry: Entry) => void;
  onPauseRecording?: (id: string) => void;
  onResumeRecording?: (id: string) => void;
  onStopRecording?: (id: string) => void;
}

export function EntryCard({
  entry,
  onDelete,
  onEdit,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
}: EntryCardProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 红点闪烁动画
  const redDotOpacity = useSharedValue(1);

  useEffect(() => {
    if (entry.recordingStatus === 'recording') {
      redDotOpacity.value = withRepeat(
        withTiming(0.3, {
          duration: 800,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    } else {
      redDotOpacity.value = 1;
    }
  }, [entry.recordingStatus]);

  const redDotStyle = useAnimatedStyle(() => ({
    opacity: redDotOpacity.value,
  }));

  // 处理音频播放
  const handlePlayAudio = async () => {
    try {
      setIsPlayingAudio(true);
      setPlaybackPosition(0);

      // 播放音频，传入完成回调和进度回调
      await VoiceService.playAudio(
        entry.media?.uri || entry.content,
        () => {
          // 播放完成回调
          setIsPlayingAudio(false);
          setPlaybackPosition(0);
        },
        (position) => {
          // 播放进度回调
          setPlaybackPosition(position);
        }
      );
    } catch (error) {
      console.error('Failed to play audio:', error);
      alert('播放失败');
      setIsPlayingAudio(false);
      setPlaybackPosition(0);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // 格式化录音时长
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 根据类型获取左边框颜色
  const getBorderColor = () => {
    switch (entry.type) {
      case 'text': return '#A491D3';    // 紫色
      case 'photo': return '#77C9D4';   // 青色
      case 'voice': return '#F5A623';   // 橙色
      default: return '#D1D1D1';
    }
  };

  // 根据类型获取背景色（统一白色）
  const getBackgroundColor = () => {
    return '#FFFFFF'; // 纯白背景
  };

  // 判断是否需要展开
  const needsExpansion = entry.content.length > 150 || (entry.tags && entry.tags.length > 3);

  // 处理长按删除
  const handleLongPress = () => {
    console.log('长按触发，准备删除:', entry.id);
    Alert.alert(
      '删除记录',
      '确定要删除这条记录吗？',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => onDelete(entry.id),
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <Pressable
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onPress={() => {
        console.log('卡片被点击，entry.id:', entry.id);
        console.log('onEdit 是否存在:', !!onEdit);
        if (onEdit) {
          onEdit(entry);
        }
      }}
      onLongPress={handleLongPress}
      android_ripple={{ color: '#E5E5E5' }}
      style={[
        styles.cardContainer,
        {
          backgroundColor: isPressed ? '#E8F0FF' : getBackgroundColor(),
          borderLeftColor: getBorderColor(),
        },
      ]}
    >
      <Animated.View layout={Layout.springify()}>
        {/* 卡片主内容 */}
        <View style={entry.type === 'voice' ? styles.contentVoice : styles.content}>
          {entry.type === 'text' ? (
            // 文本内容
            <Text
              style={styles.textContent}
              numberOfLines={isExpanded ? undefined : 4}
            >
              {entry.content}
            </Text>
          ) : entry.type === 'photo' && entry.media?.uri ? (
            // 照片内容
            <>
              <Image
                source={{ uri: entry.media.uri }}
                style={styles.photoImage}
                resizeMode="cover"
              />
              {entry.content && (
                <Text style={styles.photoCaption} numberOfLines={isExpanded ? undefined : 2}>
                  {entry.content}
                </Text>
              )}
            </>
           ) : entry.type === 'voice' ? (
             entry.recordingStatus === 'recording' ? (
               <View style={styles.recordingContainer}>
                 <View style={styles.recordingCompact}>
                   {/* 左侧：停止按钮 */}
                   <TouchableOpacity
                     style={[styles.stopButtonCompact, isProcessing && styles.buttonDisabled]}
                     disabled={isProcessing}
                     activeOpacity={0.7}
                     onPress={async () => {
                       if (isProcessing) return;
                       setIsProcessing(true);
                       try {
                         await onStopRecording?.(entry.id);
                       } catch (error) {
                         console.error('Failed to stop recording:', error);
                       } finally {
                         setTimeout(() => setIsProcessing(false), 300);
                       }
                     }}
                   >
                     <View style={styles.stopIconCompact} />
                   </TouchableOpacity>

                   {/* 中间：波形 + 文字 */}
                   <View style={styles.recordingCenter}>
                     <View style={styles.waveformCompact}>
                       <WaveformAnimation isRecording={true} color="#F5A68D" />
                     </View>
                     <Text style={styles.recordingLabel}>录音中...</Text>
                   </View>

                   {/* 右侧：时长 */}
                   <Text style={styles.recordingTimeCompact}>
                     {formatDuration(entry.recordingDuration || 0)}
                   </Text>
                 </View>
                </View>
             ) : entry.media ? (
               <View style={styles.voicePlayContainer}>
                 <View style={styles.voicePlayCompact}>
                   {/* 左侧：播放按钮 */}
                   <TouchableOpacity
                     style={[styles.playButtonCompact, isPlayingAudio && styles.buttonDisabled]}
                     onPress={handlePlayAudio}
                     disabled={isPlayingAudio}
                     activeOpacity={0.7}
                   >
                     {isPlayingAudio ? (
                       <ActivityIndicator size={24} color="#FFFFFF" />
                     ) : (
                       <Ionicons name="play" size={28} color="#FFFFFF" style={{ marginLeft: 3 }} />
                     )}
                   </TouchableOpacity>

                   {/* 中间：波形 */}
                   <View style={styles.voiceWaveformCompact}>
                     <WaveformAnimation isRecording={isPlayingAudio} color="#5E5E5E" />
                   </View>

                   {/* 右侧：时长 */}
                   <Text style={styles.voiceTimeCompact}>
                     {isPlayingAudio
                       ? formatDuration(Math.floor(playbackPosition / 1000))
                       : formatDuration(entry.media.duration ? Math.floor(entry.media.duration / 1000) : 0)
                     }
                   </Text>
                 </View>
               </View>
            ) : null
          ) : null}

          {/* 标签（如果有） */}
          {entry.tags && entry.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {(isExpanded ? entry.tags : entry.tags.slice(0, 3)).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
              {!isExpanded && entry.tags.length > 3 && (
                <Text style={styles.moreTagsHint}>+{entry.tags.length - 3}</Text>
              )}
            </View>
          )}

          {/* 转录文本（如果有） */}
          {entry.transcription && (
            <View style={styles.transcriptionContainer}>
              <Text style={styles.transcriptionLabel}>转录</Text>
              <Text
                style={styles.transcriptionText}
                numberOfLines={isExpanded ? undefined : 2}
              >
                {entry.transcription.text}
              </Text>
            </View>
          )}
        </View>

        {/* 展开提示（如果需要） */}
        {needsExpansion && !isExpanded && (
          <Text style={styles.expandHint}>点击展开更多</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 12,
    borderLeftWidth: 6, // 稍微粗一些的左边框
    overflow: 'hidden',
    marginBottom: 12,
    // 浅色阴影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    padding: 16,
    paddingLeft: 20, // 左侧增加padding
    gap: 12,
  },
  contentVoice: {
    padding: 0,
  },
  textContent: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4A4A4A', // 新配色的文字颜色
  },
  photoImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  photoCaption: {
    fontSize: 14,
    lineHeight: 20,
    color: '#525252',
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#F9731620',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F97316',
  },
  tagText: {
    fontSize: 12,
    color: '#EA580C',
    fontWeight: '500',
  },
  moreTagsHint: {
    fontSize: 12,
    color: '#A3A3A3',
    alignSelf: 'center',
  },
  transcriptionContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  transcriptionLabel: {
    fontSize: 11,
    color: '#737373',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  transcriptionText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#525252',
  },
  expandHint: {
    fontSize: 12,
    color: '#A3A3A3',
    textAlign: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  recordingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  recordingCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  recordingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  recordingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF3B30',
    letterSpacing: 1,
  },
  recordingCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  waveformCompact: {
    width: '100%',
    height: 28,
  },
  recordingLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 4,
  },
  recordingTimeCompact: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    fontVariant: ['tabular-nums'],
    minWidth: 60,
    textAlign: 'right',
  },
  stopButtonCompact: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5A68D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5A68D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  stopIconCompact: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  playButtonCompact: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  voicePlayContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  voicePlayCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  voiceWaveformCompact: {
    flex: 1,
    height: 28,
  },
  voiceTimeCompact: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    fontVariant: ['tabular-nums'],
    minWidth: 60,
    textAlign: 'right',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  playButtonPlaying: {
    backgroundColor: '#5AC8FA',
  },
  voiceDetails: {
    gap: 8,
  },
  voiceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  voiceMetaText: {
    fontSize: 15,
    color: '#3C3C43',
    fontWeight: '500',
  },
  voiceWaveform: {
    flex: 1,
    height: 40,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
});

// 使用 React.memo 优化性能，避免不必要的重新渲染
export default React.memo(EntryCard);
