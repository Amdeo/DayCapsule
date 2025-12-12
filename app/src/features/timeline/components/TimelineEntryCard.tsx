import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MD3Theme } from 'react-native-paper/lib/typescript/types';

interface Entry {
  id: string;
  type: 'text' | 'photo' | 'voice';
  content: string;
  timestamp: number;
  media?: any;
  location?: { address?: string };
  mood?: string;
  tags?: string[];
  thumbnailPath?: string;
}

interface TimelineEntryCardProps {
  entry: Entry;
  onPress: (entry: Entry) => void;
  isLast: boolean;
}

const TimelineEntryCard: React.FC<TimelineEntryCardProps> = ({ entry, onPress, isLast }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const getEntryIcon = () => {
    switch (entry.type) {
      case 'text':
        return '📝';
      case 'photo':
        return '📸';
      case 'voice':
        return '🎤';
      default:
        return '📄';
    }
  };

  const getEntryColor = () => {
    switch (entry.type) {
      case 'text':
        return '#4A90E2';
      case 'photo':
        return '#F39C12';
      case 'voice':
        return '#9B59B6';
      default:
        return theme.colors.primary;
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return '刚刚';
    } else if (diffInHours < 24) {
      return `${diffInHours}小时前`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays}天前`;
      } else {
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* 时间线左侧 */}
      <View style={styles.timelineLeft}>
        {/* 时间线连接线 */}
        {!isLast && <View style={[styles.timelineLine, { backgroundColor: getEntryColor() + '40' }]} />}

        {/* 时间线节点 */}
        <View style={[styles.timelineDot, { backgroundColor: getEntryColor() }]}>
          <Text style={styles.timelineIcon}>{getEntryIcon()}</Text>
        </View>
      </View>

      {/* 卡片内容 */}
      <TouchableOpacity style={styles.card} onPress={() => onPress(entry)} activeOpacity={0.8}>
        {/* 卡片头部 */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{formatTime(entry.timestamp)}</Text>
            <Text style={styles.cardMood}>{entry.mood || ''}</Text>
          </View>
          {entry.location?.address && (
            <Text style={styles.cardLocation}>📍 {entry.location.address}</Text>
          )}
        </View>

        {/* 媒体内容 */}
        {entry.type === 'photo' && entry.media && (
          <View style={styles.mediaContainer}>
            {Array.isArray(entry.media) ? (
              entry.media.slice(0, 3).map((photo: any, index: number) => (
                <Image key={index} source={{ uri: photo.uri }} style={styles.mediaImage} />
              ))
            ) : (
              <Image source={{ uri: entry.media.uri || entry.media }} style={styles.mediaImage} />
            )}
            {Array.isArray(entry.media) && entry.media.length > 3 && (
              <View style={styles.moreImagesOverlay}>
                <Text style={styles.moreImagesText}>+{entry.media.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        {/* 文本内容 */}
        {entry.content && (
          <Text style={styles.cardContent} numberOfLines={3}>
            {entry.content}
          </Text>
        )}

        {/* 标签 */}
        {entry.tags && entry.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {entry.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: getEntryColor() + '20' }]}>
                <Text style={[styles.tagText, { color: getEntryColor() }]}>#{tag}</Text>
              </View>
            ))}
            {entry.tags.length > 3 && (
              <Text style={styles.moreTagsText}>+{entry.tags.length - 3}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const getStyles = (theme: MD3Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    top: 20,
    bottom: -24,
    width: 2,
    borderRadius: 1,
  },
  timelineDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  timelineIcon: {
    fontSize: 16,
  },
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.outline + '20',
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  cardMood: {
    fontSize: 18,
  },
  cardLocation: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  mediaContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  mediaImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cardContent: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
});

export default TimelineEntryCard;
