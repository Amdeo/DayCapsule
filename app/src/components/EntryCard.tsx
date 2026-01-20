/**
 * 增强的 Entry 卡片组件 - 极简现代风格
 * 支持文本、照片和语音等多种媒体类型
 */

import React, { useState } from 'react';
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
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import { Entry } from '@/src/types/entry';
import { VoiceService } from '@/src/services/voiceService';

interface EntryCardProps {
  entry: Entry;
  onDelete: (id: string) => void;
  onEdit?: (entry: Entry) => void;
}

export function EntryCard({ entry, onDelete, onEdit }: EntryCardProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // 处理音频播放
  const handlePlayAudio = async () => {
    try {
      setIsPlayingAudio(true);
      await VoiceService.playAudio(entry.media?.uri || entry.content);
    } catch (error) {
      console.error('Failed to play audio:', error);
      alert('播放失败');
    } finally {
      setIsPlayingAudio(false);
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
      onPress={() => {
        console.log('卡片被点击，entry.id:', entry.id);
        console.log('onEdit 是否存在:', !!onEdit);
        if (onEdit) {
          onEdit(entry);
        }
      }}
      onLongPress={handleLongPress}
      style={[
        styles.cardContainer,
        {
          backgroundColor: getBackgroundColor(),
          borderLeftColor: getBorderColor(),
        },
      ]}
    >
      <Animated.View layout={Layout.springify()}>
        {/* 卡片主内容 */}
        <View style={styles.content}>
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
          ) : entry.type === 'voice' && entry.media ? (
            // 语音内容
            <View style={styles.voiceContainer}>
              <TouchableOpacity
                style={[
                  styles.playButton,
                  isPlayingAudio && styles.playButtonActive,
                ]}
                onPress={handlePlayAudio}
                disabled={isPlayingAudio}
              >
                {isPlayingAudio ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.playIcon}>▶</Text>
                )}
              </TouchableOpacity>

              <View style={styles.voiceInfo}>
                <Text style={styles.voiceDuration}>
                  {Math.floor(entry.media.duration / 1000)}秒
                </Text>
                <Text style={styles.voiceSize}>
                  {formatFileSize(entry.media.size)}
                </Text>
              </View>
            </View>
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
    color: '#525252', // 中性深色
    marginTop: 8,
  },
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5A623', // 新配色的语音橙色
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonActive: {
    backgroundColor: '#E09510', // 深一点的橙色
  },
  playIcon: {
    fontSize: 18,
    color: '#fff',
    marginLeft: 3,
  },
  voiceInfo: {
    flex: 1,
    gap: 4,
  },
  voiceDuration: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A', // 新配色的文字颜色
  },
  voiceSize: {
    fontSize: 13,
    color: '#737373', // 中灰
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tag: {
    backgroundColor: '#F9731620', // 浅橙背景
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F97316',
  },
  tagText: {
    fontSize: 12,
    color: '#EA580C', // 深橙
    fontWeight: '500',
  },
  moreTagsHint: {
    fontSize: 12,
    color: '#A3A3A3',
    alignSelf: 'center',
  },
  transcriptionContainer: {
    backgroundColor: '#F5F5F5', // 浅灰背景
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
});
