import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import {AITag} from '../hooks/useAITags';

interface AITagSuggestionsProps {
  tags: AITag[];
  isLoading: boolean;
  error?: string | null;
  onTagToggle: (tagName: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  testID?: string;
}

export const AITagSuggestions: React.FC<AITagSuggestionsProps> = ({
  tags,
  isLoading,
  error,
  onTagToggle,
  onSelectAll,
  onDeselectAll,
  testID,
}) => {
  if (isLoading) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>正在分析图像...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
        </View>
      </View>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  const selectedCount = tags.filter(tag => tag.isSelected).length;

  return (
    <View style={styles.container} testID={testID}>
      {/* 标题和操作按钮 */}
      <View style={styles.header}>
        <Text style={styles.title}>🤖 AI 标签建议</Text>
        <View style={styles.actions}>
          {selectedCount > 0 && selectedCount < tags.length && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onSelectAll}
              testID="select_all_button"
            >
              <Text style={styles.actionButtonText}>全选</Text>
            </TouchableOpacity>
          )}
          {selectedCount > 0 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onDeselectAll}
              testID="deselect_all_button"
            >
              <Text style={styles.actionButtonText}>取消</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 标签列表 */}
      <FlatList
        data={tags}
        keyExtractor={item => item.name}
        renderItem={({item}) => (
          <TouchableOpacity
            style={[
              styles.tagItem,
              item.isSelected && styles.tagItemSelected,
            ]}
            onPress={() => onTagToggle(item.name)}
            testID={`ai_tag_${item.name}`}
          >
            <View style={styles.tagContent}>
              <Text
                style={[
                  styles.tagName,
                  item.isSelected && styles.tagNameSelected,
                ]}
              >
                {item.name}
              </Text>
              <View style={styles.confidenceContainer}>
                <View
                  style={[
                    styles.confidenceBar,
                    {width: `${item.confidence * 100}%`},
                  ]}
                />
              </View>
            </View>
            <Text style={styles.confidenceText}>
              {(item.confidence * 100).toFixed(0)}%
            </Text>
            <View
              style={[
                styles.checkbox,
                item.isSelected && styles.checkboxSelected,
              ]}
            >
              {item.isSelected && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        scrollEnabled={false}
      />

      {/* 统计信息 */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          已选择 {selectedCount}/{tags.length} 个标签
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '600',
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tagItemSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  tagContent: {
    flex: 1,
    marginRight: 8,
  },
  tagName: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  tagNameSelected: {
    color: '#007AFF',
  },
  confidenceContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  confidenceText: {
    fontSize: 11,
    color: '#999',
    marginRight: 8,
    minWidth: 35,
    textAlign: 'right',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
});

