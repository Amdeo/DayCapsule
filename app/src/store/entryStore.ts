/**
 * Entry Store - 游标分页 + Zustand
 * 内存只保留当前已加载页，写操作直接更新内存无需重新全量加载
 */

import { create } from 'zustand';
import { Entry } from '@/src/types/entry';
import * as DB from '@/src/database/operations';
import { EntryFilters } from '@/src/database/operations';
import { logger } from '@/src/utils/logger';

const PAGE_SIZE = 20;
const MAX_LOAD_RETRIES = 5;

/** 从当前过滤状态构建 DB 查询参数 */
const buildFilters = (state: {
  filterType: string;
  filterDateRange: string;
  searchQuery: string;
  selectedTags: string[];
}): EntryFilters => {
  const filters: EntryFilters = {};
  if (state.filterType !== 'all') {
    filters.type = state.filterType as EntryFilters['type'];
  }
  if (state.filterDateRange !== 'all') {
    const now = Date.now();
    const ranges: Record<string, number> = {
      today: 86_400_000,
      week: 604_800_000,
      month: 2_592_000_000,
    };
    filters.startTime = now - (ranges[state.filterDateRange] ?? 0);
  }
  if (state.searchQuery.trim()) {
    filters.search = state.searchQuery;
  }
  if (state.selectedTags.length) {
    filters.tags = state.selectedTags;
  }
  return filters;
};

const buildQueryKey = (state: {
  searchQuery: string;
  filterType: string;
  filterDateRange: string;
  selectedTags: string[];
}) =>
  JSON.stringify({
    query: state.searchQuery,
    type: state.filterType,
    dateRange: state.filterDateRange,
    tags: [...state.selectedTags].sort((a, b) => a.localeCompare(b)),
  });

const mergeUniqueById = (prev: Entry[], next: Entry[]): Entry[] => {
  const seen = new Set(prev.map((entry) => entry.id));
  const uniqueNext = next.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
  return [...prev, ...uniqueNext];
};

const removeBrokenRecordingEntries = async (page: Entry[]): Promise<Entry[]> => {
  const cleaned: Entry[] = [];

  for (const entry of page) {
    if (entry.recordingStatus === 'recording' || entry.recordingStatus === 'paused') {
      try {
        await DB.deleteEntry(entry.id);
        logger.log('🧹 清理无效录音:', entry.id);
        continue;
      } catch {
        // 如果删除失败，保留原 entry，避免静默丢数据
      }
    }

    cleaned.push(entry);
  }

  return cleaned;
};

interface EntryStore {
  // 数据
  entries: Entry[];
  activeQueryKey: string;
  isLoading: boolean;
  isLoadingMore: boolean;
  cursor: number | null;    // 最后一条的 timestamp，用于下一页查询
  hasMore: boolean;

  // 过滤状态
  searchQuery: string;
  filterType: 'all' | 'text' | 'photo' | 'voice';
  filterDateRange: 'all' | 'today' | 'week' | 'month';
  selectedTags: string[];

  // 重试计数
  loadRetryCount: number;

  // 播放状态
  currentPlayingId: string | null;
  setCurrentPlayingId: (id: string | null) => void;

  // 数据加载
  loadEntries: () => Promise<void>;
  loadMore: () => Promise<void>;
  refreshEntries: () => Promise<void>;

  // CRUD
  addEntry: (entry: Omit<Entry, 'id' | 'timestamp'>) => Promise<void>;
  updateEntry: (id: string, updates: Partial<Entry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;

  // 查询
  getRecentEntries: (limit?: number) => Entry[];
  searchEntries: (query: string) => Promise<void>;
  getAllTags: () => Promise<string[]>;

  // 录音
  updateRecordingStatus: (id: string, status: 'recording' | 'paused' | 'completed') => Promise<void>;
  updateRecordingDuration: (id: string, duration: number) => void;
  completeRecording: (id: string, uri: string, duration: number) => Promise<void>;

  // 过滤器
  setSearchQuery: (query: string) => void;
  setFilterType: (type: 'all' | 'text' | 'photo' | 'voice') => void;
  setFilterDateRange: (range: 'all' | 'today' | 'week' | 'month') => void;
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  applyFilters: () => Promise<void>;
  applySearchFilters: (filters: {
    query?: string;
    type?: 'all' | 'text' | 'photo' | 'voice';
    dateRange?: 'all' | 'today' | 'week' | 'month';
    tags?: string[];
  }) => Promise<void>;
  restoreEntries: (entries: Entry[]) => Promise<string[]>;
}

export const useEntryStore = create<EntryStore>((set, get) => {
  const executeFirstPageQuery = async (
    queryKey: string,
    retryCount: number,
    options: { allowRetry: boolean; logLabel: string }
  ): Promise<void> => {
    try {
      const filters = buildFilters(get());
      const page = await DB.getEntriesPage(filters, PAGE_SIZE);
      const cleaned = await removeBrokenRecordingEntries(page);

      if (get().activeQueryKey !== queryKey) {
        logger.debug('[entryStore] Ignore stale first-page result:', queryKey);
        return;
      }

      set((state) => ({
        entries: cleaned,
        cursor: cleaned.at(-1)?.timestamp ?? null,
        hasMore: page.length === PAGE_SIZE,
        isLoading: false,
        isLoadingMore: false,
        loadRetryCount: retryCount > 0 ? 0 : state.loadRetryCount,
      }));
      logger.log('✅ 加载了', cleaned.length, '条记录');
    } catch (error: any) {
      logger.error(`Failed to ${options.logLabel}:`, error);

      if (
        options.allowRetry &&
        error?.message?.includes('no such table') &&
        retryCount < MAX_LOAD_RETRIES
      ) {
        const nextRetry = retryCount + 1;
        set({ loadRetryCount: nextRetry });
        logger.log(`⏳ 数据库表尚未创建，${nextRetry}/${MAX_LOAD_RETRIES} 秒后重试...`);

        setTimeout(() => {
          if (get().activeQueryKey !== queryKey) return;
          void executeFirstPageQuery(queryKey, nextRetry, options);
        }, 500);
        return;
      }

      if (get().activeQueryKey === queryKey) {
        set((state) => ({
          isLoading: false,
          isLoadingMore: false,
          loadRetryCount: options.allowRetry ? 0 : state.loadRetryCount,
        }));
      }
    }
  };

  return ({
  entries: [],
  activeQueryKey: '',
  isLoading: false,
  isLoadingMore: false,
  cursor: null,
  hasMore: true,
  searchQuery: '',
  filterType: 'all',
  filterDateRange: 'all',
  selectedTags: [],
  loadRetryCount: 0,
  currentPlayingId: null,
  setCurrentPlayingId: (id) => set({ currentPlayingId: id }),

  /**
   * 首次加载（重置游标，加载第一页）
   */
  loadEntries: async () => {
    const state = get();
    const queryKey = buildQueryKey(state);
    set({
      activeQueryKey: queryKey,
      isLoading: true,
      isLoadingMore: false,
      cursor: null,
      hasMore: true,
    });
    await executeFirstPageQuery(queryKey, state.loadRetryCount, {
      allowRetry: true,
      logLabel: 'load entries',
    });
  },

  /**
   * 加载下一页（追加到 entries 末尾）
   */
  loadMore: async () => {
    const { cursor, isLoadingMore, hasMore, activeQueryKey } = get();
    if (isLoadingMore || !hasMore) return;

    set({ isLoadingMore: true });
    try {
      const filters = buildFilters(get());
      const page = await DB.getEntriesPage(filters, PAGE_SIZE, cursor ?? undefined);

      if (get().activeQueryKey !== activeQueryKey) {
        logger.debug('[entryStore] Ignore stale loadMore result:', activeQueryKey);
        return;
      }

      set((s) => {
        const next = mergeUniqueById(s.entries, page);
        return {
          entries: next,
          cursor: page.at(-1)?.timestamp ?? s.cursor,
          hasMore: page.length === PAGE_SIZE,
          isLoadingMore: false,
        };
      });
    } catch (error) {
      logger.error('Failed to load more entries:', error);
      if (get().activeQueryKey === activeQueryKey) {
        set({ isLoadingMore: false });
      }
    }
  },

  refreshEntries: async () => get().loadEntries(),

  /**
   * 添加记录：写 DB 后 prepend 到内存头部，无需重新加载
   */
  addEntry: async (entry) => {
    try {
      const newEntry = await DB.addEntry(entry);
      set((s) => ({
        entries: [newEntry, ...s.entries],
      }));
      logger.log('✅ 添加记录:', newEntry.id);
    } catch (error) {
      logger.error('Failed to add entry:', error);
      throw error;
    }
  },

  /**
   * 更新记录：写 DB 后 map 更新内存
   */
  updateEntry: async (id, updates) => {
    try {
      await DB.updateEntry(id, updates);
      const patch = (arr: Entry[]) =>
        arr.map((e) => (e.id === id ? { ...e, ...updates } : e));
      set((s) => ({ entries: patch(s.entries) }));
      logger.log('✅ 更新记录:', id);
    } catch (error) {
      logger.error('Failed to update entry:', error);
      throw error;
    }
  },

  /**
   * 删除记录：写 DB 后从内存移除
   */
  deleteEntry: async (id) => {
    try {
      await DB.deleteEntry(id);
      const remove = (arr: Entry[]) => arr.filter((e) => e.id !== id);
      set((s) => ({ entries: remove(s.entries) }));
      logger.log('✅ 删除记录:', id);
    } catch (error) {
      logger.error('Failed to delete entry:', error);
      throw error;
    }
  },

  getRecentEntries: (limit = 10) =>
    [...get().entries].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit),

  searchEntries: async (query) => {
    set({ searchQuery: query });
    await get().applyFilters();
  },

  getAllTags: () => DB.getAllTags(),

  updateRecordingStatus: async (id, status) => get().updateEntry(id, { recordingStatus: status }),

  /** 仅内存更新，避免 100ms 高频 I/O */
  updateRecordingDuration: (id, duration) => {
    const patch = (arr: Entry[]) =>
      arr.map((e) => (e.id === id ? { ...e, recordingDuration: duration } : e));
    set((s) => ({ entries: patch(s.entries) }));
  },

  completeRecording: async (id, uri, duration) =>
    get().updateEntry(id, {
      recordingStatus: 'completed',
      recordingDuration: Math.floor(duration / 1000),
      media: [{ uri, mimeType: 'audio/m4a', size: 0, duration }],
    }),

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().applyFilters();
  },

  setFilterType: (type) => {
    set({ filterType: type });
    get().applyFilters();
  },

  setFilterDateRange: (range) => {
    set({ filterDateRange: range });
    get().applyFilters();
  },

  toggleTag: (tag) => {
    const { selectedTags } = get();
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    set({ selectedTags: newTags });
    get().applyFilters();
  },

  clearTags: () => {
    set({ selectedTags: [] });
    get().applyFilters();
  },

  /**
   * 批量应用搜索筛选条件，只触发一次数据库查询
   */
  applySearchFilters: async (filters) => {
    set({
      searchQuery: filters.query ?? get().searchQuery,
      filterType: filters.type ?? get().filterType,
      filterDateRange: filters.dateRange ?? get().filterDateRange,
      selectedTags: filters.tags ?? get().selectedTags,
    });
    await get().applyFilters();
  },

  /**
   * 批量恢复备份记录，完成后重新加载第一页
   */
  restoreEntries: async (entries: Entry[]): Promise<string[]> => {
    const insertedIds = await DB.restoreEntries(entries);
    await get().loadEntries();
    return insertedIds;
  },

  /**
   * 过滤条件变更：重置游标，重新加载第一页
   */
  applyFilters: async () => {
    const state = get();
    const queryKey = buildQueryKey(state);
    set({
      activeQueryKey: queryKey,
      isLoading: true,
      isLoadingMore: false,
      cursor: null,
      hasMore: true,
    });

    await executeFirstPageQuery(queryKey, state.loadRetryCount, {
      allowRetry: false,
      logLabel: 'apply filters',
    });
  },
  });
});

export type { Entry };
