/**
 * 记录详情页面组件
 * 展示单个记录的详细信息
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import {useTheme, IconButton, Divider} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList, EntryDetailRouteProp} from '../../../navigation/types';

interface LifelogEntry {
  id: string;
  type: 'photo' | 'text' | 'voice';
  content: string;
  transcription?: string;
  timestamp: Date;
  location?: string;
  mood?: string;
  tags: string[];
  photos?: string[];
}

interface EntryDetailScreenProps {}

/**
 * 记录详情页面组件
 */
export const EntryDetailScreen: React.FC<EntryDetailScreenProps> = () => {
  const theme = useTheme();
  const route = useRoute<EntryDetailRouteProp>();
  const navigation = useNavigation();
  const {entryId} = route.params;

  const [entry, setEntry] = useState<LifelogEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 模拟加载数据
    loadEntryDetail();
  }, [entryId]);

  const loadEntryDetail = async () => {
    try {
      // 这里应该从数据库加载实际数据
      // 现在使用模拟数据
      const mockEntry: LifelogEntry = {
        id: entryId,
        type: 'photo',
        content: '今天去了公园，看到了美丽的樱花盛开，心情特别好。',
        transcription: '今天去了公园，看到了美丽的樱花盛开，心情特别好。',
        timestamp: new Date('2024-03-15T14:30:00'),
        location: '东京上野公园',
        mood: '😊',
        tags: ['公园', '樱花', '春游', '摄影'],
        photos: ['https://example.com/photo1.jpg'],
      };

      setEntry(mockEntry);
    } catch (error) {
      Alert.alert('错误', '无法加载记录详情');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!entry) return;

    try {
      await Share.share({
        message: `${entry.content}\n\n${entry.timestamp.toLocaleDateString()}`,
        title: 'MemoryCapsule 记录分享',
      });
    } catch (error) {
      // 分享取消或失败
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '删除记录',
      '确定要删除这条记录吗？此操作无法撤销。',
      [
        {text: '取消', style: 'cancel'},
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            // 这里应该执行删除操作
            navigation.goBack();
          },
        },
      ]
    );
  };

  const renderLoadingState = () => (
    <View style={[styles.loadingContainer, {backgroundColor: theme.colors.background}]}>
      <Text style={[styles.loadingText, {color: theme.colors.onSurface}]}>
        正在加载...
      </Text>
    </View>
  );

  const renderEntryDetail = () => {
    if (!entry) return null;

    return (
      <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
        {/* 头部操作栏 */}
        <View style={[styles.header, {borderColor: theme.colors.outline}]}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <View style={styles.headerActions}>
            <IconButton
              icon="share-variant"
              size={24}
              onPress={handleShare}
            />
            <IconButton
              icon="delete"
              size={24}
              onPress={handleDelete}
            />
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* 时间和位置信息 */}
          <View style={styles.metaContainer}>
            <View style={styles.dateTimeContainer}>
              <Text style={[styles.date, {color: theme.colors.primary}]}>
                {entry.timestamp.toLocaleDateString()}
              </Text>
              <Text style={[styles.time, {color: theme.colors.onSurfaceVariant}]}>
                {entry.timestamp.toLocaleTimeString()}
              </Text>
            </View>

            {entry.location && (
              <View style={styles.locationContainer}>
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={[styles.location, {color: theme.colors.onSurface}]}>
                  {entry.location}
                </Text>
              </View>
            )}

            {entry.mood && (
              <View style={styles.moodContainer}>
                <Text style={styles.moodIcon}>{entry.mood}</Text>
              </View>
            )}
          </View>

          <Divider style={[styles.divider, {backgroundColor: theme.colors.outline}]} />

          {/* 内容区域 */}
          <View style={styles.contentContainer}>
            {entry.type === 'photo' && entry.photos && entry.photos.length > 0 && (
              <View style={styles.photoContainer}>
                {/* 这里应该渲染实际的图片 */}
                <View style={[styles.photoPlaceholder, {backgroundColor: theme.colors.surfaceVariant}]}>
                  <Text style={styles.photoIcon}>📸</Text>
                  <Text style={[styles.photoText, {color: theme.colors.onSurfaceVariant}]}>
                    图片内容
                  </Text>
                </View>
              </View>
            )}

            {entry.type === 'voice' && (
              <View style={[styles.voiceContainer, {backgroundColor: theme.colors.surfaceVariant}]}>
                <Text style={styles.voiceIcon}>🎙️</Text>
                <Text style={[styles.voiceText, {color: theme.colors.onSurface}]}>
                  语音记录
                </Text>
                <Text style={[styles.duration, {color: theme.colors.onSurfaceVariant}]}>
                  时长: 0:45
                </Text>
              </View>
            )}

            {entry.content && (
              <View style={styles.textContent}>
                <Text style={[styles.contentText, {color: theme.colors.onBackground}]}>
                  {entry.content}
                </Text>
              </View>
            )}

            {entry.transcription && (
              <View style={styles.transcriptionContainer}>
                <Text style={[styles.transcriptionTitle, {color: theme.colors.onSurfaceVariant}]}>
                  语音转写
                </Text>
                <Text style={[styles.transcriptionText, {color: theme.colors.onBackground}]}>
                  {entry.transcription}
                </Text>
              </View>
            )}
          </View>

          {/* 标签 */}
          {entry.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              <Text style={[styles.tagsTitle, {color: theme.colors.onSurfaceVariant}]}>
                标签
              </Text>
              <View style={styles.tagList}>
                {entry.tags.map((tag, index) => (
                  <View
                    key={index}
                    style={[
                      styles.tag,
                      {backgroundColor: theme.colors.primaryContainer}
                    ]}>
                    <Text style={[
                      styles.tagText,
                      {color: theme.colors.onPrimaryContainer}
                    ]}>
                      #{tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  if (isLoading) {
    return renderLoadingState();
  }

  return renderEntryDetail();
};

const {width} = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  scrollView: {
    flex: 1,
  },
  metaContainer: {
    padding: 16,
  },
  dateTimeContainer: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  date: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  time: {
    fontSize: 14,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  location: {
    fontSize: 14,
  },
  moodContainer: {
    alignSelf: 'flex-start',
  },
  moodIcon: {
    fontSize: 24,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  contentContainer: {
    padding: 16,
  },
  photoContainer: {
    marginBottom: 16,
  },
  photoPlaceholder: {
    width: width - 32,
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  photoText: {
    fontSize: 16,
  },
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  voiceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  voiceText: {
    flex: 1,
    fontSize: 16,
  },
  duration: {
    fontSize: 14,
  },
  textContent: {
    marginBottom: 16,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
  },
  transcriptionContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 16,
  },
  transcriptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  transcriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  tagsContainer: {
    padding: 16,
  },
  tagsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default EntryDetailScreen;