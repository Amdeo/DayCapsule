/**
 * entryStore 单元测试
 */

jest.mock('@/src/database/operations', () => ({
  getEntriesPage: jest.fn().mockResolvedValue([]),
  getAllEntries: jest.fn().mockResolvedValue([]),
  addEntry: jest.fn().mockImplementation((entry) =>
    Promise.resolve({
      ...entry,
      id: 'test-id-1',
      timestamp: 1700000000000,
      syncStatus: 'synced',
    })
  ),
  updateEntry: jest.fn().mockResolvedValue(undefined),
  deleteEntry: jest.fn().mockResolvedValue(undefined),
  searchEntries: jest.fn().mockResolvedValue([]),
  getAllTags: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { useEntryStore } from '../entryStore';
import * as DB from '@/src/database/operations';

const PAGE_SIZE = 20;

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const resetStore = () =>
  useEntryStore.setState({
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
  });

describe('entryStore', () => {
  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
  });

  // ─── loadEntries ────────────────────────────────────────────────────────────

  describe('loadEntries', () => {
    it('应该加载第一页记录', async () => {
      const mockEntries = [
        { id: '1', type: 'text', content: '测试', timestamp: 1700000000000, syncStatus: 'synced' },
      ];
      (DB.getEntriesPage as jest.Mock).mockResolvedValue(mockEntries);

      await useEntryStore.getState().loadEntries();

      expect(useEntryStore.getState().entries).toHaveLength(1);
      expect(useEntryStore.getState().isLoading).toBe(false);
    });

    it('加载时 isLoading 应该为 true', async () => {
      let capturedLoading = false;
      (DB.getEntriesPage as jest.Mock).mockImplementation(async () => {
        capturedLoading = useEntryStore.getState().isLoading;
        return [];
      });

      await useEntryStore.getState().loadEntries();

      expect(capturedLoading).toBe(true);
    });

    it('应该清理无效的录音状态记录', async () => {
      const mockEntries = [
        { id: '1', type: 'voice', content: '', timestamp: 1700000000000, recordingStatus: 'recording', syncStatus: 'synced' },
        { id: '2', type: 'text', content: '正常记录', timestamp: 1700000000001, syncStatus: 'synced' },
      ];
      (DB.getEntriesPage as jest.Mock).mockResolvedValue(mockEntries);

      await useEntryStore.getState().loadEntries();

      const entries = useEntryStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('2');
      expect(DB.deleteEntry).toHaveBeenCalledWith('1');
    });

    it('满页时 hasMore 应该为 true', async () => {
      const fullPage = Array.from({ length: PAGE_SIZE }, (_, i) => ({
        id: String(i),
        type: 'text' as const,
        content: `记录${i}`,
        timestamp: 1700000000000 - i * 1000,
        syncStatus: 'synced' as const,
      }));
      (DB.getEntriesPage as jest.Mock).mockResolvedValue(fullPage);

      await useEntryStore.getState().loadEntries();

      expect(useEntryStore.getState().hasMore).toBe(true);
      expect(useEntryStore.getState().cursor).toBe(fullPage[PAGE_SIZE - 1].timestamp);
    });

    it('不足一页时 hasMore 应该为 false', async () => {
      (DB.getEntriesPage as jest.Mock).mockResolvedValue([
        { id: '1', type: 'text', content: '仅一条', timestamp: 1700000000000, syncStatus: 'synced' },
      ]);

      await useEntryStore.getState().loadEntries();

      expect(useEntryStore.getState().hasMore).toBe(false);
    });

    it('旧的首屏请求晚返回时不应覆盖新的筛选结果', async () => {
      const first = createDeferred<any[]>();
      const second = createDeferred<any[]>();

      (DB.getEntriesPage as jest.Mock)
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);

      useEntryStore.getState().setSearchQuery('first');
      const firstLoad = useEntryStore.getState().applyFilters();

      useEntryStore.getState().setSearchQuery('second');
      const secondLoad = useEntryStore.getState().applyFilters();

      second.resolve([{ id: 'new', type: 'text', content: 'new', timestamp: 2, syncStatus: 'synced' }]);
      await secondLoad;

      first.resolve([{ id: 'old', type: 'text', content: 'old', timestamp: 1, syncStatus: 'synced' }]);
      await firstLoad;

      expect(useEntryStore.getState().entries.map((entry) => entry.id)).toEqual(['new']);
    });

    it('applySearchFilters 开启新查询时应重置遗留的 isLoadingMore', async () => {
      useEntryStore.setState({ isLoadingMore: true });
      (DB.getEntriesPage as jest.Mock).mockResolvedValue([
        { id: '1', type: 'text', content: 'hit', timestamp: 10, syncStatus: 'synced' },
      ]);

      await useEntryStore.getState().applySearchFilters({
        query: 'hit',
        type: 'text',
        dateRange: 'today',
        tags: ['b', 'a'],
      });

      expect(useEntryStore.getState().searchQuery).toBe('hit');
      expect(useEntryStore.getState().isLoadingMore).toBe(false);
      expect(useEntryStore.getState().entries.map((entry) => entry.id)).toEqual(['1']);
    });

    it('数据库表未就绪的延迟重试在签名过期后应放弃', async () => {
      jest.useFakeTimers();
      try {
        (DB.getEntriesPage as jest.Mock)
          .mockRejectedValueOnce(new Error('no such table: entries'))
          .mockResolvedValueOnce([{ id: 'fresh', type: 'text', content: 'fresh', timestamp: 1, syncStatus: 'synced' }]);

        const firstLoad = useEntryStore.getState().loadEntries();
        await Promise.resolve();

        useEntryStore.getState().setSearchQuery('fresh');
        await useEntryStore.getState().applyFilters();

        jest.runOnlyPendingTimers();
        await Promise.resolve();
        await firstLoad;

        expect(useEntryStore.getState().entries.map((entry) => entry.id)).toEqual(['fresh']);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  // ─── loadMore ───────────────────────────────────────────────────────────────

  describe('loadMore', () => {
    it('应该追加下一页记录', async () => {
      const firstPage = [
        { id: '1', type: 'text' as const, content: '第一页', timestamp: 2000, syncStatus: 'synced' as const },
      ];
      const secondPage = [
        { id: '2', type: 'text' as const, content: '第二页', timestamp: 1000, syncStatus: 'synced' as const },
      ];

      useEntryStore.setState({ entries: firstPage, filteredEntries: firstPage, cursor: 2000, hasMore: true });
      (DB.getEntriesPage as jest.Mock).mockResolvedValue(secondPage);

      await useEntryStore.getState().loadMore();

      const entries = useEntryStore.getState().entries;
      expect(entries).toHaveLength(2);
      expect(entries[1].id).toBe('2');
    });

    it('hasMore 为 false 时不应该发起请求', async () => {
      useEntryStore.setState({ hasMore: false });

      await useEntryStore.getState().loadMore();

      expect(DB.getEntriesPage).not.toHaveBeenCalled();
    });

    it('isLoadingMore 为 true 时不应该重复请求', async () => {
      useEntryStore.setState({ isLoadingMore: true, hasMore: true });

      await useEntryStore.getState().loadMore();

      expect(DB.getEntriesPage).not.toHaveBeenCalled();
    });

    it('最后一页后 hasMore 应该变为 false', async () => {
      useEntryStore.setState({ cursor: 2000, hasMore: true });
      (DB.getEntriesPage as jest.Mock).mockResolvedValue([
        { id: '99', type: 'text' as const, content: '最后一条', timestamp: 1000, syncStatus: 'synced' as const },
      ]);

      await useEntryStore.getState().loadMore();

      expect(useEntryStore.getState().hasMore).toBe(false);
    });

    it('重复返回同一分页结果时只保留一份 id', async () => {
      const existing = [
        { id: '1', type: 'text' as const, content: '第一页', timestamp: 2000, syncStatus: 'synced' as const },
      ];
      const duplicatePage = [
        { id: '1', type: 'text' as const, content: '第一页', timestamp: 2000, syncStatus: 'synced' as const },
        { id: '2', type: 'text' as const, content: '第二页', timestamp: 1000, syncStatus: 'synced' as const },
      ];

      useEntryStore.setState({ entries: existing, filteredEntries: existing, cursor: 2000, hasMore: true });
      (DB.getEntriesPage as jest.Mock).mockResolvedValue(duplicatePage);

      await useEntryStore.getState().loadMore();

      expect(useEntryStore.getState().entries.map((entry) => entry.id)).toEqual(['1', '2']);
    });

    it('切换到新查询后旧的 isLoadingMore 不应阻塞新的 loadMore', async () => {
      useEntryStore.setState({ isLoadingMore: true, cursor: 2000, hasMore: true });
      (DB.getEntriesPage as jest.Mock)
        .mockResolvedValueOnce([
          { id: 'fresh', type: 'text', content: 'fresh', timestamp: 1500, syncStatus: 'synced' },
        ])
        .mockResolvedValueOnce([
          { id: 'fresh-2', type: 'text', content: 'fresh-2', timestamp: 1400, syncStatus: 'synced' },
        ]);

      await useEntryStore.getState().applySearchFilters({ query: 'fresh' });
      await useEntryStore.getState().loadMore();

      expect(DB.getEntriesPage).toHaveBeenCalledTimes(2);
    });

    it('旧查询的分页结果晚返回时不应污染当前查询', async () => {
      const stalePage = createDeferred<any[]>();
      const freshPage = createDeferred<any[]>();

      (DB.getEntriesPage as jest.Mock)
        .mockResolvedValueOnce([{ id: 'first', type: 'text', content: 'first', timestamp: 2000, syncStatus: 'synced' }])
        .mockReturnValueOnce(stalePage.promise)
        .mockResolvedValueOnce([{ id: 'fresh', type: 'text', content: 'fresh', timestamp: 1500, syncStatus: 'synced' }])
        .mockReturnValueOnce(freshPage.promise);

      await useEntryStore.getState().applySearchFilters({ query: 'first' });
      const staleLoadMore = useEntryStore.getState().loadMore();

      await useEntryStore.getState().applySearchFilters({ query: 'fresh' });

      freshPage.resolve([{ id: 'fresh-2', type: 'text', content: 'fresh-2', timestamp: 1400, syncStatus: 'synced' }]);
      await useEntryStore.getState().loadMore();

      stalePage.resolve([{ id: 'stale-2', type: 'text', content: 'stale-2', timestamp: 1300, syncStatus: 'synced' }]);
      await staleLoadMore;

      expect(useEntryStore.getState().entries.map((entry) => entry.id)).toEqual(['fresh', 'fresh-2']);
    });
  });

  // ─── addEntry ───────────────────────────────────────────────────────────────

  describe('addEntry', () => {
    it('应该添加新记录到 store', async () => {
      const newEntryData = { type: 'text' as const, content: '新记录', tags: ['测试'] };
      (DB.addEntry as jest.Mock).mockResolvedValue({
        ...newEntryData,
        id: 'new-id',
        timestamp: Date.now(),
        syncStatus: 'synced',
      });

      await useEntryStore.getState().addEntry(newEntryData);

      const entries = useEntryStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].content).toBe('新记录');
    });

    it('添加失败时应该抛出错误', async () => {
      (DB.addEntry as jest.Mock).mockRejectedValue(new Error('数据库错误'));

      await expect(
        useEntryStore.getState().addEntry({ type: 'text', content: '测试' })
      ).rejects.toThrow('数据库错误');
    });
  });

  // ─── deleteEntry ────────────────────────────────────────────────────────────

  describe('deleteEntry', () => {
    it('应该从 store 中删除指定记录', async () => {
      useEntryStore.setState({
        entries: [
          { id: '1', type: 'text', content: '记录1', timestamp: 1700000000000, syncStatus: 'synced' },
          { id: '2', type: 'text', content: '记录2', timestamp: 1700000000001, syncStatus: 'synced' },
        ],
        filteredEntries: [
          { id: '1', type: 'text', content: '记录1', timestamp: 1700000000000, syncStatus: 'synced' },
          { id: '2', type: 'text', content: '记录2', timestamp: 1700000000001, syncStatus: 'synced' },
        ],
      });

      await useEntryStore.getState().deleteEntry('1');

      const entries = useEntryStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('2');
      expect(DB.deleteEntry).toHaveBeenCalledWith('1');
    });
  });

  // ─── filters ────────────────────────────────────────────────────────────────

  describe('setFilterType', () => {
    it('应该更新过滤类型', () => {
      useEntryStore.getState().setFilterType('photo');
      expect(useEntryStore.getState().filterType).toBe('photo');
    });
  });

  describe('toggleTag', () => {
    it('应该添加未选中的标签', () => {
      useEntryStore.getState().toggleTag('旅行');
      expect(useEntryStore.getState().selectedTags).toContain('旅行');
    });

    it('应该移除已选中的标签', () => {
      useEntryStore.setState({ selectedTags: ['旅行'] });
      useEntryStore.getState().toggleTag('旅行');
      expect(useEntryStore.getState().selectedTags).not.toContain('旅行');
    });
  });

  // ─── getRecentEntries ───────────────────────────────────────────────────────

  describe('getRecentEntries', () => {
    it('应该按时间倒序返回最近的记录', () => {
      useEntryStore.setState({
        entries: [
          { id: '1', type: 'text', content: '记录1', timestamp: 1000, syncStatus: 'synced' },
          { id: '2', type: 'text', content: '记录2', timestamp: 3000, syncStatus: 'synced' },
          { id: '3', type: 'text', content: '记录3', timestamp: 2000, syncStatus: 'synced' },
        ],
      });

      const recent = useEntryStore.getState().getRecentEntries(2);
      expect(recent).toHaveLength(2);
      expect(recent[0].id).toBe('2');
      expect(recent[1].id).toBe('3');
    });
  });
});
