import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import {logger} from '@services/telemetry/logger';

interface NoResultsHelperProps {
  searchQuery: string;
  appliedFilters?: {
    tags?: string[];
    mood?: string;
    dateRange?: {start: number; end: number};
    location?: string;
  };
  onClearFilters?: () => void;
  onModifySearch?: (query: string) => void;
  testID?: string;
}

export const NoResultsHelper: React.FC<NoResultsHelperProps> = ({
  searchQuery,
  appliedFilters,
  onClearFilters,
  onModifySearch,
  testID,
}) => {
  // 获取建议
  const getSuggestions = (): string[] => {
    const suggestions: string[] = [];

    if (searchQuery.length < 2) {
      suggestions.push('尝试输入更多字符来改进搜索结果');
    }

    if (appliedFilters?.tags && appliedFilters.tags.length > 0) {
      suggestions.push(`尝试移除标签筛选器（当前: ${appliedFilters.tags.join(', ')}）`);
    }

    if (appliedFilters?.mood) {
      suggestions.push(`尝试移除心情筛选器（当前: ${appliedFilters.mood}）`);
    }

    if (appliedFilters?.dateRange) {
      suggestions.push('尝试扩大日期范围');
    }

    if (appliedFilters?.location) {
      suggestions.push(`尝试移除地点筛选器（当前: ${appliedFilters.location}）`);
    }

    if (suggestions.length === 0) {
      suggestions.push('尝试使用不同的关键词');
      suggestions.push('检查拼写是否正确');
      suggestions.push('尝试搜索相关的词汇');
    }

    return suggestions;
  };

  // 获取替代搜索建议
  const getAlternativeSearches = (): Array<{query: string; icon: string}> => {
    const alternatives: Array<{query: string; icon: string}> = [];

    // 基于搜索词的建议
    if (searchQuery.includes('照片')) {
      alternatives.push({query: '图片', icon: '🖼️'});
    }
    if (searchQuery.includes('记录')) {
      alternatives.push({query: '日记', icon: '📝'});
    }
    if (searchQuery.includes('视频')) {
      alternatives.push({query: '录像', icon: '🎥'});
    }

    // 通用建议
    alternatives.push({query: '最近', icon: '⏰'});
    alternatives.push({query: '热门', icon: '🔥'});
    alternatives.push({query: '收藏', icon: '⭐'});

    return alternatives;
  };

  const suggestions = getSuggestions();
  const alternatives = getAlternativeSearches();

  const handleClearFilters = () => {
    logger.info('Clearing search filters');
    onClearFilters?.();
  };

  const handleAlternativeSearch = (query: string) => {
    logger.info('Trying alternative search', {query});
    onModifySearch?.(query);
  };

  return (
    <ScrollView style={styles.container} testID={testID}>
      {/* 空状态图标 */}
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>未找到结果</Text>
        <Text style={styles.emptyDescription}>
          没有找到与"{searchQuery}"相关的记录
        </Text>
      </View>

      {/* 建议 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 建议</Text>
        <View style={styles.suggestionsList}>
          {suggestions.map((suggestion, index) => (
            <View key={index} style={styles.suggestionItem}>
              <Text style={styles.suggestionBullet}>•</Text>
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 清除筛选器 */}
      {(appliedFilters?.tags?.length || appliedFilters?.mood || appliedFilters?.location) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 筛选器</Text>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearFilters}
            testID="clear_filters_button"
          >
            <Text style={styles.clearButtonText}>清除所有筛选器</Text>
          </TouchableOpacity>

          {/* 当前筛选器 */}
          <View style={styles.activeFilters}>
            {appliedFilters?.tags?.map(tag => (
              <View key={tag} style={styles.filterTag}>
                <Text style={styles.filterTagText}>标签: {tag}</Text>
              </View>
            ))}
            {appliedFilters?.mood && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>心情: {appliedFilters.mood}</Text>
              </View>
            )}
            {appliedFilters?.location && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>地点: {appliedFilters.location}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* 替代搜索 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔄 尝试搜索</Text>
        <View style={styles.alternativeGrid}>
          {alternatives.map((alt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.alternativeButton}
              onPress={() => handleAlternativeSearch(alt.query)}
              testID={`alternative_search_${alt.query}`}
            >
              <Text style={styles.alternativeIcon}>{alt.icon}</Text>
              <Text style={styles.alternativeText}>{alt.query}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 帮助信息 */}
      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>📚 搜索技巧</Text>
        <View style={styles.helpList}>
          <Text style={styles.helpItem}>• 使用引号搜索精确短语："我的假期"</Text>
          <Text style={styles.helpItem}>• 使用 AND/OR 组合搜索词</Text>
          <Text style={styles.helpItem}>• 使用标签、心情、日期等筛选器</Text>
          <Text style={styles.helpItem}>• 尝试搜索相关的同义词</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  suggestionsList: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  suggestionBullet: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 8,
    fontWeight: '600',
  },
  suggestionText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    lineHeight: 18,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterTag: {
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterTagText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  alternativeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  alternativeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  alternativeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  alternativeText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  helpSection: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  helpList: {
    gap: 6,
  },
  helpItem: {
    fontSize: 12,
    color: '#0066CC',
    lineHeight: 18,
  },
});

