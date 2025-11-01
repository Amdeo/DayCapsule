import React, {useState, useEffect} from 'react';
import {View, StyleSheet, TouchableOpacity, Text, FlatList} from 'react-native';
import {searchService} from '@services/storage/searchService';
import {logger} from '@services/telemetry/logger';

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  testID?: string;
}

export const TagFilter: React.FC<TagFilterProps> = ({
  selectedTags,
  onTagsChange,
  testID,
}) => {
  const [availableTags, setAvailableTags] = useState<Array<{tag: string; count: number}>>([]);
  const [loading, setLoading] = useState(true);

  // 加载可用标签
  useEffect(() => {
    const loadTags = async () => {
      try {
        setLoading(true);
        const tags = await searchService.getTagStats();
        setAvailableTags(tags);
      } catch (error) {
        logger.error('Failed to load tags', {error});
      } finally {
        setLoading(false);
      }
    };
    loadTags();
  }, []);

  // 切换标签选择
  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  if (loading) {
    return <Text style={styles.loadingText}>加载中...</Text>;
  }

  return (
    <View style={styles.container} testID={testID}>
      <FlatList
        data={availableTags}
        keyExtractor={item => item.tag}
        renderItem={({item}) => (
          <TouchableOpacity
            style={[
              styles.tag,
              selectedTags.includes(item.tag) && styles.tagSelected,
            ]}
            onPress={() => handleToggleTag(item.tag)}
          >
            <Text
              style={[
                styles.tagText,
                selectedTags.includes(item.tag) && styles.tagTextSelected,
              ]}
            >
              {item.tag}
            </Text>
            <Text style={styles.tagCount}>({item.count})</Text>
          </TouchableOpacity>
        )}
        scrollEnabled={false}
        numColumns={2}
        columnWrapperStyle={styles.row}
      />

      {availableTags.length === 0 && (
        <Text style={styles.emptyText}>暂无标签</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tag: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  tagSelected: {
    backgroundColor: '#007AFF',
  },
  tagText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  tagTextSelected: {
    color: '#fff',
  },
  tagCount: {
    fontSize: 11,
    color: '#999',
    marginLeft: 4,
  },
  loadingText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 12,
  },
});

