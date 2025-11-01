import React, {useCallback} from 'react';
import {View, StyleSheet, FlatList, Text, TouchableOpacity, ActivityIndicator} from 'react-native';
import {useDispatch} from 'react-redux';
import {selectResult} from '@store/slices/searchSlice';

interface SearchResultsProps {
  results: any[];
  isLoading: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({results, isLoading}) => {
  const dispatch = useDispatch();

  // 处理结果点击
  const handleResultPress = useCallback(
    (result: any) => {
      dispatch(selectResult(result));
    },
    [dispatch],
  );

  // 高亮匹配的文本
  const renderHighlightedText = (text: string, highlighted?: string) => {
    if (!highlighted) {
      return text;
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
  };

  // 渲染结果项
  const renderResultItem = ({item, index}: {item: any; index: number}) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleResultPress(item)}
      testID={`result_item_${index}`}
    >
      {/* 类型标签 */}
      <View style={styles.header}>
        <View style={[styles.typeTag, {backgroundColor: getTypeColor(item.type)}]}>
          <Text style={styles.typeTagText}>{getTypeLabel(item.type)}</Text>
        </View>
        <Text style={styles.relevance}>相关度: {(item.relevance * 100).toFixed(0)}%</Text>
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
        {item.location && (
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
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
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

// 获取类型颜色
const getTypeColor = (type: string): string => {
  switch (type) {
    case 'photo':
      return '#FF9500';
    case 'text':
      return '#007AFF';
    case 'voice':
      return '#34C759';
    default:
      return '#999';
  }
};

// 获取类型标签
const getTypeLabel = (type: string): string => {
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  resultCount: {
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultItem: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    color: '#999',
  },
  content: {
    marginBottom: 8,
  },
  contentText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  normalText: {
    color: '#333',
  },
  highlightedText: {
    color: '#FF9500',
    fontWeight: '600',
    backgroundColor: '#FFF3E0',
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 11,
    color: '#999',
    marginRight: 12,
    marginBottom: 4,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    color: '#666',
  },
});

