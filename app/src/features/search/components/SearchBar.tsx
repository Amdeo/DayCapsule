import React, {useState, useCallback} from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
  Modal,
} from 'react-native';
import {searchService} from '@services/storage/searchService';
import {logger} from '@services/telemetry/logger';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSearch: (query: string) => void;
  onClear: () => void;
  onFilterPress: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onSearch,
  onClear,
  onFilterPress,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 获取搜索建议
  const handleTextChange = useCallback(
    async (text: string) => {
      onChangeText(text);

      if (text.length > 0) {
        try {
          const sug = await searchService.getSuggestions(text);
          setSuggestions(sug);
          setShowSuggestions(true);
        } catch (error) {
          logger.error('Failed to get suggestions', {error});
        }
      } else {
        setShowSuggestions(false);
      }
    },
    [onChangeText],
  );

  // 选择建议
  const handleSuggestionPress = useCallback(
    (suggestion: string) => {
      onChangeText(suggestion);
      onSearch(suggestion);
      setShowSuggestions(false);
    },
    [onChangeText, onSearch],
  );

  // 清除搜索
  const handleClear = useCallback(() => {
    onChangeText('');
    onClear();
    setShowSuggestions(false);
  }, [onChangeText, onClear]);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="搜索记录..."
          placeholderTextColor="#999"
          value={value}
          onChangeText={handleTextChange}
          onSubmitEditing={() => onSearch(value)}
          testID="search_input"
        />

        {value.length > 0 && (
          <TouchableOpacity onPress={handleClear} testID="clear_search_button">
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onFilterPress} testID="filter_button">
          <Text style={styles.filterButton}>⚙️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSearch(value)}
          testID="search_button"
          style={styles.searchButton}
        >
          <Text style={styles.searchButtonText}>搜索</Text>
        </TouchableOpacity>
      </View>

      {/* 搜索建议 */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer} testID="search_suggestions">
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `${item}_${index}`}
            renderItem={({item, index}) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(item)}
                testID={`suggestion_item_${index}`}
              >
                <Text style={styles.suggestionText}>{item}</Text>
              </TouchableOpacity>
            )}
            scrollEnabled={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#333',
  },
  clearButton: {
    fontSize: 18,
    color: '#999',
    marginHorizontal: 8,
  },
  filterButton: {
    fontSize: 18,
    marginHorizontal: 8,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  },
});

