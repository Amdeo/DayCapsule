import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  Alert,
  ActionSheetIOS,
} from 'react-native';
import {useDispatch} from 'react-redux';
import {selectEntry} from '@store/slices/timelineSlice';

interface EntryCardProps {
  entry: any;
  onPress?: () => void;
  testID?: string;
}

export const EntryCard: React.FC<EntryCardProps> = ({entry, onPress, testID}) => {
  const dispatch = useDispatch();
  const [showContextMenu, setShowContextMenu] = useState(false);

  // 获取记录类型图标
  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'photo':
        return '📷';
      case 'text':
        return '📝';
      case 'voice':
        return '🎙️';
      default:
        return '📌';
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 截断内容
  const truncateContent = (content: string, maxLength: number = 100): string => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  // 处理长按
  const handleLongPress = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['取消', '编辑', '删除', '分享'],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 0,
        title: '选择操作',
      },
      buttonIndex => {
        if (buttonIndex === 1) {
          // 编辑
          Alert.alert('编辑', '编辑功能开发中');
        } else if (buttonIndex === 2) {
          // 删除
          Alert.alert('删除', '确定要删除这条记录吗？', [
            {text: '取消', onPress: () => {}},
            {text: '删除', onPress: () => {}, style: 'destructive'},
          ]);
        } else if (buttonIndex === 3) {
          // 分享
          Alert.alert('分享', '分享功能开发中');
        }
      },
    );
  };

  // 处理点击
  const handlePress = () => {
    dispatch(selectEntry(entry.id));
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      onLongPress={handleLongPress}
      testID={testID}
    >
      <View style={styles.header}>
        <Text style={styles.typeIcon}>{getTypeIcon(entry.type)}</Text>
        <View style={styles.headerInfo}>
          <Text style={styles.time}>{formatTime(entry.createdAt)}</Text>
          {entry.mood && <Text style={styles.mood}>心情: {entry.mood}</Text>}
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.contentText} numberOfLines={3}>
          {truncateContent(entry.content)}
        </Text>
      </View>

      {/* 缩略图 */}
      {entry.mediaPath && entry.type === 'photo' && (
        <View style={styles.thumbnail}>
          <Image
            source={{uri: entry.mediaPath}}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* 标签 */}
      {entry.tags && entry.tags.length > 0 && (
        <View style={styles.tags}>
          {entry.tags.slice(0, 3).map((tag: string, index: number) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {entry.tags.length > 3 && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>+{entry.tags.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      {/* 位置信息 */}
      {entry.location && (
        <View style={styles.location}>
          <Text style={styles.locationText}>📍 {entry.location}</Text>
        </View>
      )}

      {/* 天气信息 */}
      {entry.weather && (
        <View style={styles.weather}>
          <Text style={styles.weatherText}>🌤️ {entry.weather}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  mood: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  content: {
    marginBottom: 8,
  },
  contentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  thumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },
  location: {
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
  },
  weather: {
    marginBottom: 4,
  },
  weatherText: {
    fontSize: 12,
    color: '#666',
  },
});

