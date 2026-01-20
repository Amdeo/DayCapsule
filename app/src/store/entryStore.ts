import { create } from 'zustand';
import { Storage } from '@/src/utils/storage';

// 存储键常量
const ENTRIES_KEY = 'entries';

export interface Entry {
  id: string;
  type: 'text' | 'photo' | 'voice';
  content: string;
  timestamp: number;
  tags?: string[];
  media?: {
    uri: string;
    type: 'photo' | 'voice';
    duration?: number;
  };
}

interface EntryStore {
  entries: Entry[];
  isLoading: boolean;
  searchQuery: string;
  filteredEntries: Entry[];
  filterType: 'all' | 'text' | 'photo' | 'voice';
  filterDateRange: 'all' | 'today' | 'week' | 'month';
  selectedTags: string[];
  loadEntries: () => Promise<void>;
  addEntry: (entry: Omit<Entry, 'id' | 'timestamp'>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  updateEntry: (id: string, updates: Partial<Entry>) => Promise<void>;
  getRecentEntries: (limit?: number) => Entry[];
  setSearchQuery: (query: string) => void;
  searchEntries: (query: string) => Entry[];
  setFilterType: (type: 'all' | 'text' | 'photo' | 'voice') => void;
  setFilterDateRange: (range: 'all' | 'today' | 'week' | 'month') => void;
  applyFilters: () => void;
  getAllTags: () => string[];
  toggleTag: (tag: string) => void;
  clearTags: () => void;
}

export const useEntryStore = create<EntryStore>((set, get) => ({
  entries: [],
  isLoading: false,
  searchQuery: '',
  filteredEntries: [],
  filterType: 'all',
  filterDateRange: 'all',
  selectedTags: [],

  /**
   * 从 AsyncStorage 加载数据
   */
  loadEntries: async () => {
    set({ isLoading: true });
    try {
      let entries = await Storage.getObject<Entry[]>(ENTRIES_KEY);

      // 如果没有数据，添加一些示例数据
      if (!entries || entries.length === 0) {
        const now = Date.now();
        const sampleEntries: Entry[] = [
          {
            id: `sample-${now - 600000}`,
            type: 'text',
            content: '今天天气真好，阳光明媚，适合出去走走。☀️',
            timestamp: now - 10 * 60 * 1000, // 10分钟前
            tags: ['生活', '天气'],
          },
          {
            id: `sample-${now - 7200000}`,
            type: 'text',
            content: '早上喝了一杯咖啡，精神倍增！☕️ 新的一天开始了。',
            timestamp: now - 2 * 60 * 60 * 1000, // 2小时前
            tags: ['早餐', '咖啡'],
          },
          {
            id: `sample-${now - 18000000}`,
            type: 'text',
            content: '完成了一个重要的项目milestone，感觉很有成就感 🎉',
            timestamp: now - 5 * 60 * 60 * 1000, // 5小时前
            tags: ['工作', '成就'],
          },
          {
            id: `sample-${now - 86400000}`,
            type: 'text',
            content: '昨天看了一部很棒的电影《星际穿越》，诺兰的作品总是让人思考。',
            timestamp: now - 24 * 60 * 60 * 1000, // 昨天
            tags: ['电影', '娱乐'],
          },
          {
            id: `sample-${now - 259200000}`,
            type: 'text',
            content: '周末计划：健身、读书、见朋友。希望都能实现！💪',
            timestamp: now - 3 * 24 * 60 * 60 * 1000, // 3天前
            tags: ['计划', '周末'],
          },
        ];

        await Storage.setObject(ENTRIES_KEY, sampleEntries);
        set({ entries: sampleEntries, isLoading: false });
        console.log('✅ 添加了示例数据:', sampleEntries.length, '条');
      } else {
        set({ entries, isLoading: false });
        console.log('✅ 加载了现有数据:', entries.length, '条');
      }
    } catch (error) {
      console.error('Failed to load entries:', error);
      set({ isLoading: false });
    }
  },

  /**
   * 添加新记录（异步保存）
   */
  addEntry: async (entry) => {
    const newEntry: Entry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };

    const newEntries = [...get().entries, newEntry];
    set({ entries: newEntries });

    // 异步保存到 AsyncStorage
    await Storage.setObject(ENTRIES_KEY, newEntries);
  },

  /**
   * 删除记录（异步保存）
   */
  deleteEntry: async (id) => {
    const newEntries = get().entries.filter((e) => e.id !== id);
    set({ entries: newEntries });

    // 异步保存到 AsyncStorage
    await Storage.setObject(ENTRIES_KEY, newEntries);
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
   * 更新记录
   */
  updateEntry: async (id, updates) => {
    const newEntries = get().entries.map((entry) =>
      entry.id === id ? { ...entry, ...updates } : entry
    );
    set({ entries: newEntries });
    await Storage.setObject(ENTRIES_KEY, newEntries);
  },

  /**
   * 设置搜索关键词
   */
  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().applyFilters();
  },

  /**
   * 搜索记录
   */
  searchEntries: (query) => {
    const { entries } = get();
    if (!query.trim()) {
      return entries;
    }

    const lowerQuery = query.toLowerCase();
    return entries.filter((entry) => {
      // 搜索内容
      if (entry.content.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      // 搜索标签
      if (entry.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))) {
        return true;
      }
      return false;
    });
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
   * 应用所有过滤条件
   */
  applyFilters: () => {
    const { entries, searchQuery, filterType, filterDateRange, selectedTags } = get();
    let filtered = [...entries];

    // 应用搜索过滤
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((entry) => {
        if (entry.content.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        if (entry.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))) {
          return true;
        }
        return false;
      });
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

      filtered = filtered.filter((entry) => {
        const diff = now - entry.timestamp;
        switch (filterDateRange) {
          case 'today':
            return diff < oneDayMs;
          case 'week':
            return diff < oneWeekMs;
          case 'month':
            return diff < oneMonthMs;
          default:
            return true;
        }
      });
    }

    // 应用标签过滤
    if (selectedTags.length > 0) {
      filtered = filtered.filter((entry) => {
        if (!entry.tags || entry.tags.length === 0) {
          return false;
        }
        // 记录必须包含所有选中的标签
        return selectedTags.every((tag) => entry.tags?.includes(tag));
      });
    }

    set({ filteredEntries: filtered });
  },

  /**
   * 获取所有标签
   */
  getAllTags: () => {
    const { entries } = get();
    const tagsSet = new Set<string>();
    entries.forEach((entry) => {
      entry.tags?.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
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
}));
