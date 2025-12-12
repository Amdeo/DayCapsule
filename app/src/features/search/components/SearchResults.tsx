import React, {useCallback} from 'react';
import {View, StyleSheet, FlatList, Text, TouchableOpacity, ActivityIndicator} from 'react-native';
import {selectResults} from '@store/slices/searchSlice';
import {useAppSelector} from '@store/hooks';
import {useTheme} from 'react-native-paper';
import {MD3Theme} from 'react-native-paper/lib/typescript/types';
import {LifelogEntry} from '@services/storage/database';

interface SearchResultEntry extends LifelogEntry {
  relevance?: number;
  highlightedContent?: string;
}

interface SearchResultsProps {
  onEntryPress: (entry: LifelogEntry) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({onEntryPress}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const results = useAppSelector(selectResults);
  const isLoading = useAppSelector(state => state.search.loading);

  // 高亮匹配的文本
  const renderHighlightedText = useCallback((text: string, highlighted?: string) => {
    if (!highlighted) {
      return <Text style={styles.normalText}>{text}</Text>;
    }

    const parts = text.split(/<mark>|<\/mark>/);
    return parts.map((part, index) => (
      <Text
        key={index}
        style={index % 2 === 1 ? styles.highlightedText : styles.normalText}
      >
        {part}
      </Text>
    ));
  }, [styles.highlightedText, styles.normalText]);

  // 获取类型颜色
  const getTypeColor = useCallback((type: LifelogEntry['type']): string => {
    switch (type) {
      case 'photo':
        return '#FF9500'; // Orange
      case 'text':
        return '#007AFF'; // Blue
      case 'voice':
        return '#34C759'; // Green
      default:
        return '#999';
    }
  }, []);

  // 获取类型标签
  const getTypeLabel = useCallback((type: LifelogEntry['type']): string => {
    switch (type) {
      case 'photo':
        return '📷 照片';
      case 'text':
        return '📝 文字';
      case 'voice':
        return '🎙️ 语音';
      default:
        return '📌 其他';
    }
  }, []);

  // 渲染结果项
  const renderResultItem = useCallback(({item, index}: {item: SearchResultEntry; index: number}) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => onEntryPress(item)}
      testID={`result_item_${index}`}
    >
      {/* 类型标签 */}
      <View style={styles.header}>
        <View style={[styles.typeTag, {backgroundColor: getTypeColor(item.type)}]}>
          <Text style={styles.typeTagText}>{getTypeLabel(item.type)}</Text>
        </View>
        {item.relevance && (
          <Text style={styles.relevance}>相关度: {(item.relevance * 100).toFixed(0)}%</Text>
        )}
      </View>

      {/* 内容 */}
      <View style={styles.content}>
        <Text style={styles.contentText} numberOfLines={3}>
          {renderHighlightedText(item.content, item.highlightedContent)}
        </Text>
      </View>

      {/* 元数据 */}
      <View style={styles.metadata}>
        {item.mood && (
          <Text style={styles.metadataText}>💭 {item.mood}</Text>
        )}
        {item.location && typeof item.location === 'string' && (
          <Text style={styles.metadataText}>📍 {item.location}</Text>
        )}
        <Text style={styles.metadataText}>
          🕐 {new Date(item.createdAt).toLocaleString('zh-CN')}
        </Text>
      </View>

      {/* 标签 */}
      {item.tags && item.tags.length > 0 && (
        <View style={styles.tags}>
          {item.tags.slice(0, 3).map((tag: string, tagIndex: number) => (
            <View key={tagIndex} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {item.tags.length > 3 && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>+{item.tags.length - 3}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  ), [onEntryPress, renderHighlightedText, getTypeColor, getTypeLabel, styles]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>搜索中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="search_results">
      <FlatList
        data={results}
        keyExtractor={(item, index) => `${item.id}_${index}`}
        renderItem={renderResultItem}
        scrollEnabled={true}
        ListHeaderComponent={
          <Text style={styles.resultCount}>找到 {results.length} 条结果</Text>
        }
      />
    </View>
  );
};

const getStyles = (currentTheme: MD3Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: currentTheme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: currentTheme.colors.onBackground,
  },
  resultCount: {
    fontSize: 12,
    color: currentTheme.colors.onBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultItem: {
    backgroundColor: currentTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: currentTheme.colors.outline,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeTag: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeTagText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  relevance: {
    fontSize: 11,
    color: currentTheme.colors.onSurfaceVariant,
  },
  content: {
    marginBottom: 8,
  },
  contentText: {
    fontSize: 13,
    color: currentTheme.colors.onSurface,
    lineHeight: 18,
  },
  normalText: {
    color: currentTheme.colors.onSurface,
  },
  highlightedText: {
    color: currentTheme.colors.primary,
    fontWeight: '600',
    backgroundColor: currentTheme.colors.primaryContainer,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 11,
    color: currentTheme.colors.onSurfaceVariant,
    marginRight: 12,
    marginBottom: 4,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: currentTheme.colors.surfaceVariant,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    color: currentTheme.colors.onSurfaceVariant,
  },
});