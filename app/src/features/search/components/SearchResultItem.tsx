import React from 'react';
import {View, StyleSheet, Image, TouchableOpacity} from 'react-native';
import {Text, Card, Chip, useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {LifelogEntry} from '@services/storage/database';
import {HighlightedText} from './HighlightedText';

interface SearchResultItemProps {
  entry: LifelogEntry;
  query: string;
  onPress?: (entry: LifelogEntry) => void;
  testID?: string;
}

/**
 * 搜索结果项组件
 * 显示单个搜索结果，并高亮显示匹配的关键词
 */
export const SearchResultItem: React.FC<SearchResultItemProps> = ({
  entry,
  query,
  onPress,
  testID,
}) => {
  const theme = useTheme();
  const hasMedia = !!entry.mediaPath;
  const isVoice = entry.type === 'voice';
  const isPhoto = entry.type === 'photo';

  const getTypeIcon = () => {
    switch (entry.type) {
      case 'photo':
        return 'image';
      case 'voice':
        return 'microphone';
      case 'text':
        return 'text';
      default:
        return 'file';
    }
  };

  const getTypeLabel = () => {
    switch (entry.type) {
      case 'photo':
        return '照片';
      case 'voice':
        return '语音';
      case 'text':
        return '文字';
      default:
        return '记录';
    }
  };

  return (
    <TouchableOpacity
      onPress={() => onPress?.(entry)}
      activeOpacity={0.7}
      disabled={!onPress}
      testID={testID}>
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          {/* 类型标签 */}
          <View style={styles.typeContainer}>
            <Icon name={getTypeIcon()} size={16} color={theme.colors.primary} />
            <Text variant="labelSmall" style={[styles.typeLabel, {color: theme.colors.primary}]}>
              {getTypeLabel()}
            </Text>
          </View>

          {/* 媒体预览 */}
          {hasMedia && isPhoto && (
            <Image
              source={{uri: entry.mediaPath}}
              style={styles.thumbnail}
              resizeMode="cover"
              testID={`${testID}-thumbnail`}
            />
          )}

          {isVoice && (
            <View
              style={[styles.voiceIndicator, {backgroundColor: theme.colors.primaryContainer}]}
              testID={`${testID}-voice-indicator`}>
              <Icon name="microphone" size={24} color={theme.colors.onPrimaryContainer} />
              <Text
                variant="bodyMedium"
                style={[styles.voiceDuration, {color: theme.colors.onPrimaryContainer}]}>
                {formatDuration(entry.voiceDuration || 0)}
              </Text>
            </View>
          )}

          {/* 内容（高亮显示） */}
          {entry.content && (
            <HighlightedText
              text={entry.content}
              query={query}
              variant="bodyMedium"
              numberOfLines={3}
              style={styles.content}
            />
          )}

          {/* 转录文本（高亮显示） */}
          {isVoice && entry.transcription && (
            <View style={styles.transcriptionContainer}>
              <Text
                variant="labelSmall"
                style={[styles.transcriptionLabel, {color: theme.colors.onSurfaceVariant}]}>
                转录：
              </Text>
              <HighlightedText
                text={entry.transcription}
                query={query}
                variant="bodySmall"
                numberOfLines={2}
                style={[styles.transcription, {color: theme.colors.onSurfaceVariant}]}
              />
            </View>
          )}

          {/* 标签 */}
          {entry.tags && entry.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {entry.tags.slice(0, 3).map(tag => (
                <Chip key={tag} mode="flat" compact style={styles.tag}>
                  {tag}
                </Chip>
              ))}
              {entry.tags.length > 3 && (
                <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                  +{entry.tags.length - 3}
                </Text>
              )}
            </View>
          )}

          {/* 时间 */}
          <View style={styles.metaContainer}>
            <Icon name="clock-outline" size={14} color={theme.colors.onSurfaceVariant} />
            <Text
              variant="bodySmall"
              style={[styles.metaText, {color: theme.colors.onSurfaceVariant}]}>
              {formatDate(entry.timestamp)}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});
  } else if (date.toDateString() === yesterday.toDateString()) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});
  } else {
    return date.toLocaleDateString('zh-CN');
  }
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeLabel: {
    marginLeft: 4,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  voiceDuration: {
    marginLeft: 8,
  },
  content: {
    marginBottom: 8,
  },
  transcriptionContainer: {
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 4,
  },
  transcriptionLabel: {
    marginBottom: 4,
  },
  transcription: {
    fontStyle: 'italic',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 4,
  },
  tag: {
    marginRight: 4,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  metaText: {
    marginLeft: 4,
  },
});
