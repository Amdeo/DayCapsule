/**
 * 增强的 Entry 卡片组件
 * 支持文本、照片和语音等多种媒体类型
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Entry } from '@/src/types/entry';
import { VoiceService } from '@/src/services/voiceService';

interface EntryCardProps {
  entry: Entry;
  onDelete: (id: string) => void;
}

export function EntryCard({ entry, onDelete }: EntryCardProps) {
  const [isPlayingAudio, setIsPlayingAudio] = React.useState(false);

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

  // 格式化时间
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <View style={styles.card}>
      {/* 卡片头部：时间和删除按钮 */}
      <View style={styles.header}>
        <View style={styles.timeAndType}>
          <Text style={styles.timestamp}>{formatDate(entry.timestamp)}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeIcon}>
              {entry.type === 'text' ? '📝' : entry.type === 'photo' ? '📷' : '🎤'}
            </Text>
            <Text style={styles.typeLabel}>
              {entry.type === 'text' ? '文本' : entry.type === 'photo' ? '照片' : '语音'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(entry.id)}
        >
          <Text style={styles.deleteText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* 卡片内容：根据类型展示不同的内容 */}
      <View style={styles.content}>
        {entry.type === 'text' ? (
          // 文本内容
          <Text style={styles.textContent} numberOfLines={4}>
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
              <Text style={styles.photoCaption} numberOfLines={2}>
                {entry.content}
              </Text>
            )}
          </>
        ) : entry.type === 'voice' && entry.media ? (
          // 语音内容
          <View style={styles.voiceContainer}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={handlePlayAudio}
              disabled={isPlayingAudio}
            >
              {isPlayingAudio ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.playIcon}>▶</Text>
                  <Text style={styles.playText}>播放</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.voiceInfo}>
              <Text style={styles.voiceDuration}>
                时长: {Math.floor((entry.media.duration || 0) / 60)}:
                {String(Math.floor((entry.media.duration || 0) % 60)).padStart(2, '0')}
              </Text>
              <Text style={styles.voiceSize}>
                大小: {formatFileSize(entry.media.size)}
              </Text>
            </View>
          </View>
        ) : null}

        {/* 标签 */}
        {entry.tags && entry.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {entry.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 卡片底部：转录或其他信息 */}
      {entry.transcription && (
        <View style={styles.transcriptionContainer}>
          <Text style={styles.transcriptionLabel}>转录文本</Text>
          <Text style={styles.transcriptionText} numberOfLines={3}>
            {entry.transcription.text}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeAndType: {
    flex: 1,
    gap: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  typeIcon: {
    fontSize: 14,
  },
  typeLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d32f2f20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: 20,
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  content: {
    gap: 12,
  },
  textContent: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 24,
  },
  photoImage: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    backgroundColor: '#0a0a0a',
  },
  photoCaption: {
    fontSize: 14,
    color: '#ccc',
  },
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 16,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ff6f00',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  playIcon: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  playText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  voiceInfo: {
    flex: 1,
  },
  voiceDuration: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 4,
  },
  voiceSize: {
    fontSize: 12,
    color: '#999',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#6200ee20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6200ee40',
  },
  tagText: {
    fontSize: 12,
    color: '#6200ee',
    fontWeight: '500',
  },
  transcriptionContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  transcriptionLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
    fontWeight: '500',
  },
  transcriptionText: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 20,
  },
});
