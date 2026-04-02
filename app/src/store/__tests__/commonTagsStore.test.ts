jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getObject: jest.fn(),
    setObject: jest.fn(),
  },
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

import { useCommonTagsStore } from '../commonTagsStore';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';

const { Storage } = require('@/src/utils/storage');

const DEFAULTS = ['工作', '学习', '健康', '心情', '朋友', '家人', '美食', '旅行', '思考', '娱乐', '购物', '天气'];

const resetStore = () =>
  useCommonTagsStore.setState({ tags: DEFAULTS, isLoaded: false });

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('loadCommonTags', () => {
  it('defaults to 12 preset tags when storage is empty', async () => {
    Storage.getObject.mockResolvedValue(null);
    await useCommonTagsStore.getState().loadCommonTags();
    expect(useCommonTagsStore.getState().tags).toEqual(DEFAULTS);
  });

  it('loads persisted tags from storage', async () => {
    Storage.getObject.mockResolvedValue(['旅行', '美食']);
    await useCommonTagsStore.getState().loadCommonTags();
    expect(useCommonTagsStore.getState().tags).toEqual(['旅行', '美食']);
  });

  it('falls back to defaults when storage throws', async () => {
    Storage.getObject.mockRejectedValue(new Error('storage error'));
    await useCommonTagsStore.getState().loadCommonTags();
    expect(useCommonTagsStore.getState().tags).toEqual(DEFAULTS);
    expect(useCommonTagsStore.getState().isLoaded).toBe(true);
  });

  it('shows branded feedback when loading persisted tags fails', async () => {
    Storage.getObject.mockRejectedValueOnce(new Error('storage error'));

    await useCommonTagsStore.getState().loadCommonTags();

    expect(showErrorFeedback).toHaveBeenCalledWith({
      title: '加载失败',
      message: '预制标签加载失败，已回退到默认标签。',
      actions: [{ label: '知道了', role: 'primary' }],
    });
  });
});

describe('addCommonTag', () => {
  it('adds a new tag', async () => {
    Storage.setObject.mockResolvedValue(undefined);
    useCommonTagsStore.setState({ tags: ['工作'], isLoaded: true });
    await useCommonTagsStore.getState().addCommonTag('学习');
    expect(useCommonTagsStore.getState().tags).toContain('学习');
  });

  it('does not add duplicate tags', async () => {
    Storage.setObject.mockResolvedValue(undefined);
    useCommonTagsStore.setState({ tags: ['工作'], isLoaded: true });
    await useCommonTagsStore.getState().addCommonTag('工作');
    expect(useCommonTagsStore.getState().tags.filter((t) => t === '工作')).toHaveLength(1);
  });

  it('does not exceed 20 tags', async () => {
    Storage.setObject.mockResolvedValue(undefined);
    const twentyTags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
    useCommonTagsStore.setState({ tags: twentyTags, isLoaded: true });
    await useCommonTagsStore.getState().addCommonTag('extra');
    expect(useCommonTagsStore.getState().tags).toHaveLength(20);
  });

  it('shows branded feedback when persisting a new tag fails', async () => {
    Storage.setObject.mockRejectedValueOnce(new Error('disk full'));
    useCommonTagsStore.setState({ tags: ['工作'], isLoaded: true });

    await useCommonTagsStore.getState().addCommonTag('学习');

    expect(useCommonTagsStore.getState().tags).toEqual(['工作', '学习']);
    expect(showErrorFeedback).toHaveBeenCalledWith({
      title: '保存失败',
      message: '预制标签已更新，但保存失败，请稍后重试。',
      actions: [{ label: '知道了', role: 'primary' }],
    });
  });
});

describe('removeCommonTag', () => {
  it('removes a tag', async () => {
    Storage.setObject.mockResolvedValue(undefined);
    useCommonTagsStore.setState({ tags: ['工作', '学习'], isLoaded: true });
    await useCommonTagsStore.getState().removeCommonTag('工作');
    expect(useCommonTagsStore.getState().tags).not.toContain('工作');
  });
});

describe('resetToDefaults', () => {
  it('restores the 12 default tags', async () => {
    Storage.setObject.mockResolvedValue(undefined);
    useCommonTagsStore.setState({ tags: ['自定义'], isLoaded: true });
    await useCommonTagsStore.getState().resetToDefaults();
    expect(useCommonTagsStore.getState().tags).toEqual(DEFAULTS);
  });
});

describe('reorderCommonTags', () => {
  it('reorders tags and persists the new order', async () => {
    Storage.setObject.mockResolvedValue(undefined);
    useCommonTagsStore.setState({ tags: ['工作', '学习', '旅行'], isLoaded: true });

    await useCommonTagsStore.getState().reorderCommonTags(0, 2);

    expect(useCommonTagsStore.getState().tags).toEqual(['学习', '旅行', '工作']);
    expect(Storage.setObject).toHaveBeenCalledWith('common_tags', ['学习', '旅行', '工作']);
  });

  it('shows branded feedback when persisting a reordered tag list fails', async () => {
    Storage.setObject.mockRejectedValueOnce(new Error('disk full'));
    useCommonTagsStore.setState({ tags: ['工作', '学习', '旅行'], isLoaded: true });

    await useCommonTagsStore.getState().reorderCommonTags(0, 2);

    expect(useCommonTagsStore.getState().tags).toEqual(['学习', '旅行', '工作']);
    expect(showErrorFeedback).toHaveBeenCalledWith({
      title: '保存失败',
      message: '预制标签顺序已更新，但保存失败，请稍后重试。',
      actions: [{ label: '知道了', role: 'primary' }],
    });
  });
});
