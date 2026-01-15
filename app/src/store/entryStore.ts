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
}

interface EntryStore {
  entries: Entry[];
  isLoading: boolean;
  loadEntries: () => Promise<void>;
  addEntry: (entry: Omit<Entry, 'id' | 'timestamp'>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  getRecentEntries: (limit?: number) => Entry[];
}

export const useEntryStore = create<EntryStore>((set, get) => ({
  entries: [],
  isLoading: false,

  /**
   * 从 AsyncStorage 加载数据
   */
  loadEntries: async () => {
    set({ isLoading: true });
    try {
      const entries = await Storage.getObject<Entry[]>(ENTRIES_KEY);
      set({ entries: entries || [], isLoading: false });
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
}));
