import React, {useCallback} from 'react';
import {View, StyleSheet, FlatList, ActivityIndicator} from 'react-native';
import {Text, Searchbar, useTheme} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '@store';
import {performSearch, clearResults} from '@store/slices/searchSlice';
import {SearchResultItem} from '../components/SearchResultItem';
import {EmptyState} from '@ui';

export const SearchScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const {results, loading, error} = useSelector((state: RootState) => state.search);
  const [searchQuery, setSearchQuery] = React.useState('');

  // 执行搜索
  const handleSearch = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (text.trim()) {
        dispatch(performSearch({query: text}));
      } else {
        dispatch(clearResults());
      }
    },
    [dispatch],
  );

  // 清除搜索
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    dispatch(clearResults());
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="搜索记忆..."
        onChangeText={handleSearch}
        value={searchQuery}
        onClearIconPress={handleClearSearch}
        style={styles.searchbar}
        testID="search-input"
      />

      {/* 加载状态 */}
      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            搜索中...
          </Text>
        </View>
      )}

      {/* 错误状态 */}
      {error && !loading && (
        <View style={styles.centerContainer}>
          <Text variant="bodyMedium" style={{color: theme.colors.error}}>
            搜索出错: {error}
          </Text>
        </View>
      )}

      {/* 搜索结果 */}
      {!loading && !error && (
        <FlatList
          data={results}
          renderItem={({item}) => (
            <SearchResultItem
              entry={item}
              query={searchQuery}
              testID={`search-result-${item.id}`}
            />
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            searchQuery.trim() ? (
              <EmptyState
                icon="magnify"
                title="未找到结果"
                message={`没有找到包含 "${searchQuery}" 的记录`}
              />
            ) : (
              <EmptyState icon="magnify" title="开始搜索" message="输入关键词搜索您的记忆" />
            )
          }
          showsVerticalScrollIndicator={false}
          testID="search-results"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchbar: {
    margin: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
