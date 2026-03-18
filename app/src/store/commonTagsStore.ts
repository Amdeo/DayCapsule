import { create } from 'zustand';
import { Storage } from '@/src/utils/storage';
import { logger } from '@/src/utils/logger';

const STORAGE_KEY = 'common_tags';
const MAX_TAGS = 20;

export const DEFAULT_COMMON_TAGS: string[] = [
  '工作', '学习', '健康', '心情', '朋友',
  '家人', '美食', '旅行', '思考', '娱乐', '购物', '天气',
];

interface CommonTagsStore {
  tags: string[];
  isLoaded: boolean;
  loadCommonTags: () => Promise<void>;
  addCommonTag: (tag: string) => Promise<void>;
  removeCommonTag: (tag: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

export const useCommonTagsStore = create<CommonTagsStore>((set, get) => ({
  tags: DEFAULT_COMMON_TAGS,
  isLoaded: false,

  loadCommonTags: async () => {
    try {
      const stored = await Storage.getObject<string[]>(STORAGE_KEY);
      set({ tags: stored ?? DEFAULT_COMMON_TAGS, isLoaded: true });
    } catch (error) {
      logger.error('Failed to load common tags:', error);
      set({ tags: DEFAULT_COMMON_TAGS, isLoaded: true });
    }
  },

  addCommonTag: async (tag: string) => {
    const current = get().tags;
    if (current.includes(tag) || current.length >= MAX_TAGS) return;
    const next = [...current, tag];
    set({ tags: next });
    try {
      await Storage.setObject(STORAGE_KEY, next);
    } catch (error) {
      logger.error('Failed to save common tags after add:', error);
    }
  },

  removeCommonTag: async (tag: string) => {
    const next = get().tags.filter((t) => t !== tag);
    set({ tags: next });
    try {
      await Storage.setObject(STORAGE_KEY, next);
    } catch (error) {
      logger.error('Failed to save common tags after remove:', error);
    }
  },

  resetToDefaults: async () => {
    set({ tags: DEFAULT_COMMON_TAGS });
    try {
      await Storage.setObject(STORAGE_KEY, DEFAULT_COMMON_TAGS);
    } catch (error) {
      logger.error('Failed to save common tags after reset:', error);
    }
  },
}));
