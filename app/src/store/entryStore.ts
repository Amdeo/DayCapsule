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

// 过滤版本号：防止快速连续调用时旧结果覆盖新结果
let filterVersion = 0;

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

interface EntryStore {
  // 数据
  entries: Entry[];
  filteredEntries: Entry[]; // 保持与 entries 同步，供 Timeline 兼容使用
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

const MAX_LOAD_RETRIES = 5;

export const useEntryStore = create<EntryStore>((set, get) => ({
  entries: [],
  filteredEntries: [],
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
    const { loadRetryCount } = get();
    set({ isLoading: true, cursor: null, hasMore: true });
    try {
      const state = get();
      const filters = buildFilters(state);
      const page = await DB.getEntriesPage(filters, PAGE_SIZE);

      // 清理无效录音状态
      const cleaned: Entry[] = [];
      for (const entry of page) {
        if (entry.recordingStatus === 'recording' || entry.recordingStatus === 'paused') {
          try {
            await DB.deleteEntry(entry.id);
            logger.log('🧹 清理无效录音:', entry.id);
          } catch {
            cleaned.push(entry);
          }
        } else {
          cleaned.push(entry);
        }
      }

      // 加载成功，重置重试计数
      if (loadRetryCount > 0) {
        set({ loadRetryCount: 0 });
      }

      set({
        entries: cleaned,
        filteredEntries: cleaned,
        cursor: cleaned.at(-1)?.timestamp ?? null,
        hasMore: page.length === PAGE_SIZE,
        isLoading: false,
      });
      logger.log('✅ 加载了', cleaned.length, '条记录');
    } catch (error: any) {
      logger.error('Failed to load entries:', error);
      if (error?.message?.includes('no such table')) {
        if (loadRetryCount < MAX_LOAD_RETRIES) {
          const nextRetry = loadRetryCount + 1;
          set({ loadRetryCount: nextRetry });
          logger.log(`⏳ 数据库表尚未创建，${nextRetry}/${MAX_LOAD_RETRIES} 秒后重试...`);
          setTimeout(() => get().loadEntries(), 500);
        } else {
          logger.error('❌ 数据库表加载失败，已达最大重试次数');
          set({ isLoading: false, loadRetryCount: 0 });
        }
      } else {
        set({ isLoading: false, loadRetryCount: 0 });
      }
    }
  },

  /**
   * 加载下一页（追加到 entries 末尾）
   */
  loadMore: async () => {
    const { cursor, isLoadingMore, hasMore } = get();
    if (isLoadingMore || !hasMore) return;

    set({ isLoadingMore: true });
    try {
      const state = get();
      const filters = buildFilters(state);
      const page = await DB.getEntriesPage(filters, PAGE_SIZE, cursor ?? undefined);

      set((s) => {
        const next = [...s.entries, ...page];
        return {
          entries: next,
          filteredEntries: next,
          cursor: page.at(-1)?.timestamp ?? s.cursor,
          hasMore: page.length === PAGE_SIZE,
          isLoadingMore: false,
        };
      });
    } catch (error) {
      logger.error('Failed to load more entries:', error);
      set({ isLoadingMore: false });
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
        filteredEntries: [newEntry, ...s.filteredEntries],
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
      set((s) => ({ entries: patch(s.entries), filteredEntries: patch(s.filteredEntries) }));
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
      set((s) => ({ entries: remove(s.entries), filteredEntries: remove(s.filteredEntries) }));
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
    set((s) => ({ entries: patch(s.entries), filteredEntries: patch(s.filteredEntries) }));
  },

  completeRecording: async (id, uri, duration) =>
    get().updateEntry(id, {
      recordingStatus: 'completed',
      recordingDuration: Math.floor(duration / 1000),
      media: { uri, mimeType: 'audio/m4a', size: 0, duration },
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
    const version = ++filterVersion;
    set({ isLoading: true, cursor: null, hasMore: true });

    try {
      const state = get();
      const filters = buildFilters(state);
      const page = await DB.getEntriesPage(filters, PAGE_SIZE);

      if (version !== filterVersion) return;

      set({
        entries: page,
        filteredEntries: page,
        cursor: page.at(-1)?.timestamp ?? null,
        hasMore: page.length === PAGE_SIZE,
        isLoading: false,
      });
    } catch (error) {
      logger.error('Failed to apply filters:', error);
      if (version === filterVersion) set({ isLoading: false });
    }
  },
}));

export type { Entry };
