import {useEffect, useCallback, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {
  addToSearchHistory,
  clearSearchHistory,
  removeFromSearchHistory,
  setHotTags,
} from '@store/slices/searchSlice';
import {searchService} from '@services/storage/searchService';
import {logger} from '@services/telemetry/logger';

export interface UseSearchHistoryReturn {
  searchHistory: string[];
  hotTags: Array<{tag: string; count: number}>;
  addSearch: (query: string) => void;
  removeSearch: (query: string) => void;
  clearHistory: () => void;
  loadHotTags: () => Promise<void>;
}

export const useSearchHistory = (): UseSearchHistoryReturn => {
  const dispatch = useDispatch();
  const {searchHistory, hotTags} = useSelector((state: any) => state.search);
  const [isLoading, setIsLoading] = useState(false);

  // 加载热门标签
  const loadHotTags = useCallback(async () => {
    try {
      setIsLoading(true);
      const tags = await searchService.getTagStats();
      dispatch(setHotTags(tags.slice(0, 10)));
      logger.info('Hot tags loaded', {count: tags.length});
    } catch (error) {
      logger.error('Failed to load hot tags', {error});
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  // 添加搜索到历史
  const addSearch = useCallback(
    (query: string) => {
      if (query.trim()) {
        dispatch(addToSearchHistory(query));
        logger.info('Search added to history', {query});
      }
    },
    [dispatch],
  );

  // 从历史中删除
  const removeSearch = useCallback(
    (query: string) => {
      dispatch(removeFromSearchHistory(query));
      logger.info('Search removed from history', {query});
    },
    [dispatch],
  );

  // 清除历史
  const clearHistory = useCallback(() => {
    dispatch(clearSearchHistory());
    logger.info('Search history cleared');
  }, [dispatch]);

  // 初始化加载热门标签
  useEffect(() => {
    if (hotTags.length === 0) {
      loadHotTags();
    }
  }, []);

  return {
    searchHistory,
    hotTags,
    addSearch,
    removeSearch,
    clearHistory,
    loadHotTags,
  };
};

/**
 * 搜索建议 Hook
 */
export interface UseSearchSuggestionsReturn {
  suggestions: string[];
  isLoading: boolean;
  getSuggestions: (query: string) => Promise<void>;
  clearSuggestions: () => void;
}

export const useSearchSuggestions = (): UseSearchSuggestionsReturn => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      const sug = await searchService.getSuggestions(query);
      setSuggestions(sug);
      logger.info('Suggestions loaded', {query, count: sug.length});
    } catch (error) {
      logger.error('Failed to get suggestions', {error});
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isLoading,
    getSuggestions,
    clearSuggestions,
  };
};

/**
 * 搜索统计 Hook
 */
export interface SearchStatistics {
  totalSearches: number;
  uniqueQueries: number;
  mostSearched: string[];
  searchTrends: Array<{query: string; count: number}>;
}

export interface UseSearchStatisticsReturn {
  statistics: SearchStatistics | null;
  isLoading: boolean;
  loadStatistics: () => Promise<void>;
}

export const useSearchStatistics = (): UseSearchStatisticsReturn => {
  const {searchHistory} = useSelector((state: any) => state.search);
  const [statistics, setStatistics] = useState<SearchStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadStatistics = useCallback(async () => {
    try {
      setIsLoading(true);

      // 计算统计数据
      const totalSearches = searchHistory.length;
      const uniqueQueries = new Set(searchHistory).size;

      // 计算最常搜索的查询
      const queryCount: {[key: string]: number} = {};
      searchHistory.forEach(query => {
        queryCount[query] = (queryCount[query] || 0) + 1;
      });

      const searchTrends = Object.entries(queryCount)
        .map(([query, count]) => ({query, count}))
        .sort((a, b) => b.count - a.count);

      const mostSearched = searchTrends.slice(0, 5).map(item => item.query);

      setStatistics({
        totalSearches,
        uniqueQueries,
        mostSearched,
        searchTrends,
      });

      logger.info('Search statistics loaded', {
        totalSearches,
        uniqueQueries,
      });
    } catch (error) {
      logger.error('Failed to load search statistics', {error});
    } finally {
      setIsLoading(false);
    }
  }, [searchHistory]);

  // 初始化加载统计
  useEffect(() => {
    loadStatistics();
  }, [searchHistory]);

  return {
    statistics,
    isLoading,
    loadStatistics,
  };
};

