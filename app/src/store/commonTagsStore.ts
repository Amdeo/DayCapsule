import { create } from 'zustand';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { Storage } from '@/src/utils/storage';
import { logger } from '@/src/utils/logger';

const STORAGE_KEY = 'common_tags';
const MAX_TAGS = 20;

export const DEFAULT_COMMON_TAGS: string[] = [
  '工作', '学习', '健康', '心情', '朋友',
  '家人', '美食', '旅行', '思考', '娱乐', '购物', '天气',
];

// 对外语义收口为“预制标签”，底层仍复用现有 store 与持久化 key。
export const DEFAULT_PRESET_TAGS = DEFAULT_COMMON_TAGS;

interface CommonTagsStore {
  tags: string[];
  isLoaded: boolean;
  loadCommonTags: () => Promise<void>;
  addCommonTag: (tag: string) => Promise<void>;
  removeCommonTag: (tag: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  reorderCommonTags: (fromIndex: number, toIndex: number) => Promise<void>;
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
      showErrorFeedback({
        title: '加载失败',
        message: '预制标签加载失败，已回退到默认标签。',
        actions: [{ label: '知道了', role: 'primary' }],
      });
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
      showErrorFeedback({
        title: '保存失败',
        message: '预制标签已更新，但保存失败，请稍后重试。',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    }
  },

  removeCommonTag: async (tag: string) => {
    const next = get().tags.filter((t) => t !== tag);
    set({ tags: next });
    try {
      await Storage.setObject(STORAGE_KEY, next);
    } catch (error) {
      logger.error('Failed to save common tags after remove:', error);
      showErrorFeedback({
        title: '保存失败',
        message: '预制标签已更新，但保存失败，请稍后重试。',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    }
  },

  resetToDefaults: async () => {
    set({ tags: DEFAULT_COMMON_TAGS });
    try {
      await Storage.setObject(STORAGE_KEY, DEFAULT_COMMON_TAGS);
    } catch (error) {
      logger.error('Failed to save common tags after reset:', error);
      showErrorFeedback({
        title: '保存失败',
        message: '预制标签已恢复，但保存失败，请稍后重试。',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    }
  },

  reorderCommonTags: async (fromIndex: number, toIndex: number) => {
    const current = get().tags;
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= current.length ||
      toIndex >= current.length
    ) {
      return;
    }

    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    set({ tags: next });
    try {
      await Storage.setObject(STORAGE_KEY, next);
    } catch (error) {
      logger.error('Failed to save common tags after reorder:', error);
      showErrorFeedback({
        title: '保存失败',
        message: '预制标签顺序已更新，但保存失败，请稍后重试。',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    }
  },
}));
