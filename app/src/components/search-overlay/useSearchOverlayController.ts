import { useCallback, useEffect, useMemo, useState } from 'react';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import type {
  SearchDateRange,
  SearchFilterType,
} from './searchOverlayOptions';

interface UseSearchOverlayControllerOptions {
  visible: boolean;
  searchQuery: string;
  filterType: SearchFilterType;
  filterDateRange: SearchDateRange;
  selectedTags: string[];
  commonTags: string[];
  tagsLoaded: boolean;
  loadCommonTags: () => void | Promise<void>;
  getAllTags: () => Promise<string[]>;
  applySearchFilters: (filters: {
    query: string;
    type: SearchFilterType;
    dateRange: SearchDateRange;
    tags: string[];
  }) => Promise<void>;
  onClose: () => void;
  onSearch: (query: string) => void;
}

export function useSearchOverlayController({
  visible,
  searchQuery,
  filterType,
  filterDateRange,
  selectedTags,
  commonTags,
  tagsLoaded,
  loadCommonTags,
  getAllTags,
  applySearchFilters,
  onClose,
  onSearch,
}: UseSearchOverlayControllerOptions) {
  const [localQuery, setLocalQuery] = useState('');
  const [localType, setLocalType] = useState<SearchFilterType>('all');
  const [localDate, setLocalDate] = useState<SearchDateRange>('all');
  const [localTags, setLocalTags] = useState<string[]>([]);
  const [allTagsList, setAllTagsList] = useState<string[]>([]);

  useEffect(() => {
    if (!tagsLoaded) {
      void loadCommonTags();
    }
  }, [tagsLoaded, loadCommonTags]);

  useEffect(() => {
    if (visible) {
      setLocalQuery(searchQuery);
      setLocalType(filterType);
      setLocalDate(filterDateRange);
      setLocalTags([...selectedTags]);
      void getAllTags()
        .then(setAllTagsList)
        .catch(() => {
          setAllTagsList([]);
          showErrorFeedback({
            title: '加载失败',
            message: '标签加载失败，请稍后重试',
            actions: [{ label: '知道了', role: 'primary' }],
          });
        });
    }
  }, [filterDateRange, filterType, getAllTags, searchQuery, selectedTags, visible]);

  const extraCommonTags = useMemo(
    () => commonTags.filter((tag) => !allTagsList.includes(tag)),
    [allTagsList, commonTags],
  );

  const handleToggleTag = useCallback((tag: string) => {
    setLocalTags((tags) =>
      tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag],
    );
  }, []);

  const handleSearch = useCallback(async () => {
    try {
      await applySearchFilters({
        query: localQuery,
        type: localType,
        dateRange: localDate,
        tags: localTags,
      });
      onSearch(localQuery);
      onClose();
    } catch {
      showErrorFeedback({
        title: '搜索失败',
        message: '搜索结果加载失败，请稍后重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    }
  }, [applySearchFilters, localDate, localQuery, localTags, localType, onClose, onSearch]);

  const handleReset = useCallback(() => {
    setLocalQuery('');
    setLocalType('all');
    setLocalDate('all');
    setLocalTags([]);
  }, []);

  const clearLocalQuery = useCallback(() => {
    setLocalQuery('');
  }, []);

  const clearTags = useCallback(() => {
    setLocalTags([]);
  }, []);

  const hasActiveFilters =
    !!localQuery.trim() ||
    localType !== 'all' ||
    localDate !== 'all' ||
    localTags.length > 0;

  return {
    localQuery,
    setLocalQuery,
    localType,
    setLocalType,
    localDate,
    setLocalDate,
    localTags,
    allTagsList,
    extraCommonTags,
    hasActiveFilters,
    handleToggleTag,
    handleSearch,
    handleReset,
    clearLocalQuery,
    clearTags,
  };
}
