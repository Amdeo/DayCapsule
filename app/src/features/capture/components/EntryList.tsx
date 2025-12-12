import React from 'react';
import {View, StyleSheet, FlatList, Image, TouchableOpacity} from 'react-native';
import {Text, Card, Chip, useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {LifelogEntry} from '@services/storage/database';

interface EntryListProps {
  entries: LifelogEntry[];
  onEntryPress?: (entry: LifelogEntry) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onEndReached?: () => void;
  ListEmptyComponent?: React.ReactElement;
  testID?: string;
}

export const EntryList: React.FC<EntryListProps> = ({
  entries,
  onEntryPress,
  onRefresh,
  refreshing = false,
  onEndReached,
  ListEmptyComponent,
  testID,
}) => {
  const theme = useTheme();

  const renderEntry = ({item, index}: {item: LifelogEntry; index: number}) => {
    const hasMedia = !!item.mediaPath;
    const isVoice = item.type === 'voice';
    const isPhoto = item.type === 'photo';

    return (
      <TouchableOpacity
        onPress={() => onEntryPress?.(item)}
        activeOpacity={0.7}
        disabled={!onEntryPress}
        testID={`entry-item-${index}`}>
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            {/* 媒体预览 */}
            {hasMedia && isPhoto && (
              <Image
                source={{uri: item.mediaPath}}
                style={styles.thumbnail}
                resizeMode="cover"
                testID={`photo-thumbnail-${index}`}
              />
            )}

            {isVoice && (
              <View
                style={[styles.voiceIndicator, {backgroundColor: theme.colors.primaryContainer}]}
                testID={`voice-indicator-${index}`}>
                <Icon name="microphone" size={24} color={theme.colors.onPrimaryContainer} />
                <Text
                  variant="bodyMedium"
                  style={[styles.voiceDuration, {color: theme.colors.onPrimaryContainer}]}>
                  {formatDuration(item.voiceDuration || 0)}
                </Text>
              </View>
            )}

            {/* 内容 */}
            {item.content && (
              <Text variant="bodyMedium" numberOfLines={3} style={styles.content}>
                {item.content}
              </Text>
            )}

            {/* 转录文本（语音记录） */}
            {isVoice && item.transcription && (
              <Text
                variant="bodySmall"
                numberOfLines={2}
                style={[styles.transcription, {color: theme.colors.onSurfaceVariant}]}>
                "{item.transcription}"
              </Text>
            )}

            {/* 标签 */}
            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {item.tags.slice(0, 3).map(tag => (
                  <Chip key={tag} mode="flat" compact style={styles.tag}>
                    <Text>{tag}</Text>
                  </Chip>
                ))}
                {item.tags.length > 3 && (
                  <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                    +{item.tags.length - 3}
                  </Text>
                )}
              </View>
            )}

            {/* 元信息 */}
            <View style={styles.metaContainer}>
              {/* 时间 */}
              <View style={styles.metaItem}>
                <Icon name="clock-outline" size={14} color={theme.colors.onSurfaceVariant} />
                <Text
                  variant="bodySmall"
                  style={[styles.metaText, {color: theme.colors.onSurfaceVariant}]}>
                  {formatDate(item.timestamp)}
                </Text>
              </View>

              {/* 位置 */}
              {item.location && (
                <View style={styles.metaItem}>
                  <Icon name="map-marker-outline" size={14} color={theme.colors.onSurfaceVariant} />
                  <Text
                    variant="bodySmall"
                    numberOfLines={1}
                    style={[styles.metaText, {color: theme.colors.onSurfaceVariant}]}>
                    {item.location.address ||
                      `${item.location.latitude}, ${item.location.longitude}`}
                  </Text>
                </View>
              )}

              {/* 天气 */}
              {item.weather && (
                <View style={styles.metaItem}>
                  <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                    {item.weather.condition} {item.weather.temperature}°C
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={entries}
      renderItem={renderEntry}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContent}
      onRefresh={onRefresh}
      refreshing={refreshing}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={ListEmptyComponent}
      showsVerticalScrollIndicator={false}
      testID={testID || 'entry-list'}
    />
  );
};

// 辅助函数
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return '刚刚';
  }
  if (diffMins < 60) {
    return `${diffMins}分钟前`;
  }
  if (diffHours < 24) {
    return `${diffHours}小时前`;
  }
  if (diffDays < 7) {
    return `${diffDays}天前`;
  }

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
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
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  voiceDuration: {
    marginLeft: 8,
    fontWeight: '600',
  },
  content: {
    marginBottom: 8,
    lineHeight: 20,
  },
  transcription: {
    marginBottom: 8,
    fontStyle: 'italic',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  tag: {
    height: 24,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
});
