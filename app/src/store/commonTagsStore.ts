import { create } from 'zustand';
import { Storage } from '@/src/utils/storage';

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
    const stored = await Storage.getObject<string[]>(STORAGE_KEY);
    set({ tags: stored ?? DEFAULT_COMMON_TAGS, isLoaded: true });
  },

  addCommonTag: async (tag: string) => {
    const current = get().tags;
    if (current.includes(tag) || current.length >= MAX_TAGS) return;
    const next = [...current, tag];
    set({ tags: next });
    await Storage.setObject(STORAGE_KEY, next);
  },

  removeCommonTag: async (tag: string) => {
    const next = get().tags.filter((t) => t !== tag);
    set({ tags: next });
    await Storage.setObject(STORAGE_KEY, next);
  },

  resetToDefaults: async () => {
    set({ tags: DEFAULT_COMMON_TAGS });
    await Storage.setObject(STORAGE_KEY, DEFAULT_COMMON_TAGS);
  },
}));
