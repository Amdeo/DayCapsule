/**
 * Entry Store - 使用 Expo SQLite
 * 提供数据查询和操作
 */

import { create } from 'zustand';
import { Entry } from '@/src/types/entry';
import * as DB from '@/src/database/operations';

interface EntryStore {
  // 状态
  entries: Entry[];
  isLoading: boolean;
  searchQuery: string;
  filteredEntries: Entry[];
  filterType: 'all' | 'text' | 'photo' | 'voice';
  filterDateRange: 'all' | 'today' | 'week' | 'month';
  selectedTags: string[];

  // 数据加载
  loadEntries: () => Promise<void>;
  refreshEntries: () => Promise<void>;

  // CRUD 操作
  addEntry: (entry: Omit<Entry, 'id' | 'timestamp'>) => Promise<void>;
  updateEntry: (id: string, updates: Partial<Entry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;

  // 查询方法
  getRecentEntries: (limit?: number) => Entry[];
  searchEntries: (query: string) => Promise<void>;
  getAllTags: () => Promise<string[]>;

  // 录音相关
  updateRecordingStatus: (id: string, status: 'recording' | 'paused' | 'completed') => Promise<void>;
  updateRecordingDuration: (id: string, duration: number) => Promise<void>;
  completeRecording: (id: string, uri: string, duration: number) => Promise<void>;

  // 过滤器
  setSearchQuery: (query: string) => void;
  setFilterType: (type: 'all' | 'text' | 'photo' | 'voice') => void;
  setFilterDateRange: (range: 'all' | 'today' | 'week' | 'month') => void;
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  applyFilters: () => Promise<void>;
}

export const useEntryStore = create<EntryStore>((set, get) => ({
  // 初始状态
  entries: [],
  isLoading: false,
  searchQuery: '',
  filteredEntries: [],
  filterType: 'all',
  filterDateRange: 'all',
  selectedTags: [],

  /**
   * 从 SQLite 加载数据
   */
  loadEntries: async () => {
    set({ isLoading: true });
    try {
      const entries = await DB.getAllEntries();

      // 清理无效的录音状态
      const cleanedEntries = entries.filter(entry => {
        if (entry.recordingStatus === 'recording' || entry.recordingStatus === 'paused') {
          console.log('🧹 清理无效录音:', entry.id);
          DB.deleteEntry(entry.id).catch(console.error);
          return false;
        }
        return true;
      });

      set({ entries: cleanedEntries, isLoading: false });
      console.log('✅ 加载了', cleanedEntries.length, '条记录');
    } catch (error: any) {
      console.error('Failed to load entries:', error);
      // 如果是表不存在的错误，等待一会儿后重试
      if (error?.message?.includes('no such table')) {
        console.log('⏳ 数据库表尚未创建，等待后重试...');
        setTimeout(() => {
          get().loadEntries();
        }, 500);
      } else {
        set({ isLoading: false });
      }
    }
  },

  /**
   * 刷新数据
   */
  refreshEntries: async () => {
    await get().loadEntries();
  },

  /**
   * 添加新记录
   */
  addEntry: async (entry) => {
    try {
      const newEntry = await DB.addEntry(entry);
      const newEntries = [...get().entries, newEntry];
      set({ entries: newEntries });
      console.log('✅ 添加记录:', newEntry.id);
    } catch (error) {
      console.error('Failed to add entry:', error);
      throw error;
    }
  },

  /**
   * 更新记录
   */
  updateEntry: async (id, updates) => {
    try {
      await DB.updateEntry(id, updates);
      const newEntries = get().entries.map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry
      );
      set({ entries: newEntries });
      console.log('✅ 更新记录:', id);
    } catch (error) {
      console.error('Failed to update entry:', error);
      throw error;
    }
  },

  /**
   * 删除记录
   */
  deleteEntry: async (id) => {
    try {
      await DB.deleteEntry(id);
      const newEntries = get().entries.filter((e) => e.id !== id);
      set({ entries: newEntries });
      console.log('✅ 删除记录:', id);
    } catch (error) {
      console.error('Failed to delete entry:', error);
      throw error;
    }
  },

  /**
   * 获取最近的记录
   */
  getRecentEntries: (limit = 10) => {
    const { entries } = get();
    return entries
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  },

  /**
   * 搜索记录
   */
  searchEntries: async (query) => {
    try {
      if (!query.trim()) {
        set({ filteredEntries: get().entries });
        return;
      }
      const results = await DB.searchEntries(query);
      set({ filteredEntries: results });
    } catch (error) {
      console.error('Failed to search entries:', error);
    }
  },

  /**
   * 获取所有标签
   */
  getAllTags: async () => {
    try {
      return await DB.getAllTags();
    } catch (error) {
      console.error('Failed to get all tags:', error);
      return [];
    }
  },

  /**
   * 更新录音状态
   */
  updateRecordingStatus: async (id, status) => {
    await get().updateEntry(id, { recordingStatus: status });
  },

  /**
   * 更新录音时长
   */
  updateRecordingDuration: async (id, duration) => {
    await get().updateEntry(id, { recordingDuration: duration });
  },

  /**
   * 完成录音
   */
  completeRecording: async (id, uri, duration) => {
    await get().updateEntry(id, {
      recordingStatus: 'completed',
      recordingDuration: Math.floor(duration / 1000),
      media: {
        uri,
        mimeType: 'audio/m4a',
        size: 0,
        duration,
      },
    });
  },

  /**
   * 设置搜索关键词
   */
  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().applyFilters();
  },

  /**
   * 设置类型过滤
   */
  setFilterType: (type) => {
    set({ filterType: type });
    get().applyFilters();
  },

  /**
   * 设置日期范围过滤
   */
  setFilterDateRange: (range) => {
    set({ filterDateRange: range });
    get().applyFilters();
  },

  /**
   * 切换标签选择
   */
  toggleTag: (tag) => {
    const { selectedTags } = get();
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    set({ selectedTags: newTags });
    get().applyFilters();
  },

  /**
   * 清除所有标签选择
   */
  clearTags: () => {
    set({ selectedTags: [] });
    get().applyFilters();
  },

  /**
   * 应用所有过滤条件
   */
  applyFilters: async () => {
    const { entries, searchQuery, filterType, filterDateRange, selectedTags } = get();
    let filtered = [...entries];

    // 应用搜索过滤
    if (searchQuery.trim()) {
      const results = await DB.searchEntries(searchQuery);
      filtered = results;
    }

    // 应用类型过滤
    if (filterType !== 'all') {
      filtered = filtered.filter((entry) => entry.type === filterType);
    }

    // 应用日期范围过滤
    if (filterDateRange !== 'all') {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const oneWeekMs = 7 * oneDayMs;
      const oneMonthMs = 30 * oneDayMs;

      let startTime: number;
      switch (filterDateRange) {
        case 'today':
          startTime = now - oneDayMs;
          break;
        case 'week':
          startTime = now - oneWeekMs;
          break;
        case 'month':
          startTime = now - oneMonthMs;
          break;
        default:
          startTime = 0;
      }

      filtered = filtered.filter((entry) => entry.timestamp >= startTime);
    }

    // 应用标签过滤
    if (selectedTags.length > 0) {
      filtered = filtered.filter((entry) => {
        if (!entry.tags || entry.tags.length === 0) {
          return false;
        }
        return selectedTags.every((tag) => entry.tags?.includes(tag));
      });
    }

    set({ filteredEntries: filtered });
  },
}));

// 导出 Entry 类型以保持兼容性
export type { Entry };
