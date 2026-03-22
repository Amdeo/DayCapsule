/**
 * entryStore 单元测试
 */

const mockDataSource = {
  getEntriesPage: jest.fn().mockResolvedValue([]),
  getEntryCount: jest.fn().mockResolvedValue(0),
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
  getAllTags: jest.fn().mockResolvedValue([]),
  restoreEntries: jest.fn().mockResolvedValue([]),
};

jest.mock('@/src/database/dataSource', () => ({
  getActiveDataSource: () => mockDataSource,
  get localDataSource() {
    return mockDataSource;
  },
  switchDataSource: jest.fn(),
}));

jest.mock('@/src/database/operations', () => ({
  addEntry: jest.fn().mockImplementation(async (entry) => ({
    ...entry,
    id: 'local-entry-1',
    timestamp: 1700000000000,
  })),
  updateEntry: jest.fn().mockResolvedValue(undefined),
  deleteEntry: jest.fn().mockResolvedValue(undefined),
  markEntryPendingDelete: jest.fn().mockResolvedValue(undefined),
  getVoiceEntriesBySyncStatus: jest.fn().mockResolvedValue([]),
  getPhotoEntriesBySyncStatus: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/src/utils/fileSystem', () => ({
  deleteFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/services/voiceUploadQueue', () => ({
  cancelVoiceUpload: jest.fn(),
}));

jest.mock('@/src/services/photoUploadQueue', () => ({
  cancelPhotoUpload: jest.fn(),
}));

const mockRefreshCloudSyncIndicator = jest.fn(async () => undefined);
jest.mock('@/src/store/cloudSyncIndicatorStore', () => ({
  useCloudSyncIndicatorStore: {
    getState: () => ({
      refresh: mockRefreshCloudSyncIndicator,
    }),
  },
}));

let mockCloudMode: boolean | 'switching' = false;
jest.mock('@/src/store/settingsStore', () => {
  const useSettingsStore = Object.assign(
    () => ({ cloudMode: mockCloudMode }),
    {
      getState: () => ({ cloudMode: mockCloudMode }),
      setState: (partial: { cloudMode?: boolean | 'switching' }) => {
        if (partial.cloudMode !== undefined) {
          mockCloudMode = partial.cloudMode;
        }
      },
    },
  );

  return { useSettingsStore };
});

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
import { useSettingsStore } from '../settingsStore';
import * as DB from '@/src/database/operations';
import { deleteFile } from '@/src/utils/fileSystem';

const PAGE_SIZE = 20;

const makeEntry = (id: string, timestamp: number) => ({
  id,
  type: 'text' as const,
  content: id,
  timestamp,
  syncStatus: 'synced' as const,
});

const makeFullPage = (prefix: string, startTimestamp: number) =>
  Array.from({ length: PAGE_SIZE }, (_, index) =>
    makeEntry(`${prefix}-${index}`, startTimestamp - index)
  );

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
    isLoading: false,
    isLoadingMore: false,
    cursor: null,
    hasMore: true,
    searchQuery: '',
    filterType: 'all',
    filterDateRange: 'all',
    selectedTags: [],
    loadRetryCount: 0,
    activeQueryKey: '',
    currentPlayingId: null,
  });

describe('entryStore', () => {
  beforeEach(() => {
    resetStore();
    jest.resetAllMocks();
    mockCloudMode = false;
    mockDataSource.getEntriesPage.mockResolvedValue([]);
    mockDataSource.getEntryCount.mockResolvedValue(0);
    mockDataSource.addEntry.mockImplementation((entry) =>
      Promise.resolve({
        ...entry,
        id: 'test-id-1',
        timestamp: 1700000000000,
        syncStatus: 'synced',
      })
    );
    mockDataSource.updateEntry.mockResolvedValue(undefined);
    mockDataSource.deleteEntry.mockResolvedValue(undefined);
    mockDataSource.getAllTags.mockResolvedValue([]);
    mockDataSource.restoreEntries.mockResolvedValue([]);
    (DB.addEntry as jest.Mock).mockImplementation(async (entry) => ({
      ...entry,
      id: 'local-entry-1',
      timestamp: 1700000000000,
    }));
    (DB.updateEntry as jest.Mock).mockResolvedValue(undefined);
    (DB.deleteEntry as jest.Mock).mockResolvedValue(undefined);
    (DB.markEntryPendingDelete as jest.Mock).mockResolvedValue(undefined);
    (DB.getVoiceEntriesBySyncStatus as jest.Mock).mockResolvedValue([]);
    (DB.getPhotoEntriesBySyncStatus as jest.Mock).mockResolvedValue([]);
    (deleteFile as jest.Mock).mockResolvedValue(undefined);
    mockRefreshCloudSyncIndicator.mockResolvedValue(undefined);
    useSettingsStore.setState({ cloudMode: false });
  });

  // ─── loadEntries ────────────────────────────────────────────────────────────

  describe('loadEntries', () => {
    it('应该加载第一页记录', async () => {
      const mockEntries = [
        { id: '1', type: 'text', content: '测试', timestamp: 1700000000000, syncStatus: 'synced' },
      ];
      mockDataSource.getEntriesPage.mockResolvedValue(mockEntries);

      await useEntryStore.getState().loadEntries();

      expect(useEntryStore.getState().entries).toHaveLength(1);
      expect(useEntryStore.getState().isLoading).toBe(false);
    });

    it('加载时 isLoading 应该为 true', async () => {
      let capturedLoading = false;
      mockDataSource.getEntriesPage.mockImplementation(async () => {
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
      mockDataSource.getEntriesPage.mockResolvedValue(mockEntries);

      await useEntryStore.getState().loadEntries();

      const entries = useEntryStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('2');
      expect(mockDataSource.deleteEntry).toHaveBeenCalledWith('1');
    });

    it('满页时 hasMore 应该为 true', async () => {
      const fullPage = Array.from({ length: PAGE_SIZE }, (_, i) => ({
        id: String(i),
        type: 'text' as const,
        content: `记录${i}`,
        timestamp: 1700000000000 - i * 1000,
        syncStatus: 'synced' as const,
      }));
      mockDataSource.getEntriesPage.mockResolvedValue(fullPage);

      await useEntryStore.getState().loadEntries();

      expect(useEntryStore.getState().hasMore).toBe(true);
      expect(useEntryStore.getState().cursor).toBe(fullPage[PAGE_SIZE - 1].timestamp);
    });

    it('不足一页时 hasMore 应该为 false', async () => {
      mockDataSource.getEntriesPage.mockResolvedValue([
        { id: '1', type: 'text', content: '仅一条', timestamp: 1700000000000, syncStatus: 'synced' },
      ]);

      await useEntryStore.getState().loadEntries();

      expect(useEntryStore.getState().hasMore).toBe(false);
    });

    it('旧的首屏请求晚返回时不应覆盖新的筛选结果', async () => {
      const first = createDeferred<any[]>();
      const second = createDeferred<any[]>();

      mockDataSource.getEntriesPage
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);

      const firstLoad = useEntryStore.getState().loadEntries();
      const secondLoad = useEntryStore.getState().applySearchFilters({ query: 'second' });

      second.resolve([{ id: 'new', type: 'text', content: 'new', timestamp: 2, syncStatus: 'synced' }]);
      await secondLoad;

      first.resolve([{ id: 'old', type: 'text', content: 'old', timestamp: 1, syncStatus: 'synced' }]);
      await firstLoad;

      expect(useEntryStore.getState().searchQuery).toBe('second');
      expect(useEntryStore.getState().entries.map((entry) => entry.id)).toEqual(['new']);
    });

    it('applySearchFilters 开启新首屏查询时应重置 isLoadingMore 为 false', async () => {
      useEntryStore.setState({ isLoadingMore: true, cursor: 999, hasMore: true });
      mockDataSource.getEntriesPage.mockResolvedValue([
        makeEntry('1', 10),
      ]);

      await useEntryStore.getState().applySearchFilters({
        query: 'hit',
        type: 'text',
        dateRange: 'today',
        tags: ['b', 'a'],
      });

      expect(useEntryStore.getState().searchQuery).toBe('hit');
      expect(useEntryStore.getState().entries.map((entry) => entry.id)).toEqual(['1']);
      expect(useEntryStore.getState().isLoadingMore).toBe(false);
    });

    it('数据库表未就绪的延迟重试在签名过期后应放弃', async () => {
      jest.useFakeTimers();
      try {
        mockDataSource.getEntriesPage
          .mockRejectedValueOnce(new Error('no such table: entries'))
          .mockResolvedValueOnce([{ id: 'fresh', type: 'text', content: 'fresh', timestamp: 1, syncStatus: 'synced' }])
          .mockResolvedValueOnce([{ id: 'stale', type: 'text', content: 'stale', timestamp: 0, syncStatus: 'synced' }]);

        const firstLoad = useEntryStore.getState().loadEntries();
        await Promise.resolve();

        await useEntryStore.getState().applySearchFilters({ query: 'fresh' });

        jest.runOnlyPendingTimers();
        await Promise.resolve();
        await Promise.resolve();
        await firstLoad;

        expect(useEntryStore.getState().entries.map((entry) => entry.id)).toEqual(['fresh']);
      } finally {
        jest.useRealTimers();
      }
    });

    it('应该把待上传照片合并到首屏列表中', async () => {
      mockDataSource.getEntriesPage.mockResolvedValue([
        { id: 'synced-1', type: 'text', content: '正常记录', timestamp: 1700000000000, syncStatus: 'synced' },
      ]);
      (DB.getPhotoEntriesBySyncStatus as jest.Mock).mockResolvedValue([
        {
          id: 'photo-pending-1',
          type: 'photo',
          content: '',
          timestamp: 1700000001000,
          syncStatus: 'pending_upload',
          media: [
            {
              uri: 'file:///cache/media/photos/display/photo_1.jpg',
              thumbnail: 'file:///cache/media/photos/thumbnails/thumb_1.jpg',
              mimeType: 'image/jpeg',
              size: 2048,
            },
          ],
        },
      ]);

      await useEntryStore.getState().loadEntries();

      expect(DB.getPhotoEntriesBySyncStatus).toHaveBeenCalledWith(['pending_upload', 'uploading']);
      expect(useEntryStore.getState().entries.map((entry) => entry.id)).toEqual([
        'photo-pending-1',
        'synced-1',
      ]);
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

      useEntryStore.setState({ entries: firstPage, cursor: 2000, hasMore: true });
      mockDataSource.getEntriesPage.mockResolvedValue(secondPage);

      await useEntryStore.getState().loadMore();

      const entries = useEntryStore.getState().entries;
      expect(entries).toHaveLength(2);
      expect(entries[1].id).toBe('2');
    });

    it('hasMore 为 false 时不应该发起请求', async () => {
      useEntryStore.setState({ hasMore: false });

      await useEntryStore.getState().loadMore();

      expect(mockDataSource.getEntriesPage).not.toHaveBeenCalled();
    });

    it('isLoadingMore 为 true 时不应该重复请求', async () => {
      useEntryStore.setState({ isLoadingMore: true, hasMore: true });

      await useEntryStore.getState().loadMore();

      expect(mockDataSource.getEntriesPage).not.toHaveBeenCalled();
    });

    it('最后一页后 hasMore 应该变为 false', async () => {
      useEntryStore.setState({ cursor: 2000, hasMore: true });
      mockDataSource.getEntriesPage.mockResolvedValue([
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

      useEntryStore.setState({ entries: existing, cursor: 2000, hasMore: true });
      mockDataSource.getEntriesPage.mockResolvedValue(duplicatePage);

      await useEntryStore.getState().loadMore();

      expect(useEntryStore.getState().entries.map((entry) => entry.id)).toEqual(['1', '2']);
    });

    it('searchEntries 切换到新查询后首个 loadMore 不应沿用旧查询的分页会话', async () => {
      const deferred = createDeferred<any[]>();
      const firstPage = makeFullPage('first', 4000);
      const freshPage = makeFullPage('fresh', 3000);
      mockDataSource.getEntriesPage
        .mockResolvedValueOnce(firstPage)
        .mockReturnValueOnce(deferred.promise)
        .mockResolvedValueOnce(freshPage)
        .mockResolvedValueOnce([makeEntry('fresh-more', 2000)]);

      await useEntryStore.getState().applySearchFilters({ query: 'first' });
      useEntryStore.setState({ cursor: firstPage.at(-1)?.timestamp ?? null, hasMore: true });
      const staleLoadMore = useEntryStore.getState().loadMore();

      await useEntryStore.getState().searchEntries('fresh');
      useEntryStore.setState({ cursor: freshPage.at(-1)?.timestamp ?? null, hasMore: true });
      await useEntryStore.getState().loadMore();

      deferred.resolve([makeEntry('stale-more', 1999)]);
      await staleLoadMore;

      const ids = useEntryStore.getState().entries.map((entry) => entry.id);
      expect(mockDataSource.getEntriesPage).toHaveBeenCalledTimes(4);
      expect(ids).toContain('fresh-more');
      expect(ids).not.toContain('stale-more');
    });

    it('setFilterType 开启新筛选会话后首个 loadMore 不应沿用旧查询的分页锁', async () => {
      const firstPage = makeFullPage('first', 5000);
      const voicePage = makeFullPage('voice', 4000);

      mockDataSource.getEntriesPage
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(voicePage)
        .mockResolvedValueOnce([makeEntry('voice-more', 3000)]);

      await useEntryStore.getState().applySearchFilters({ query: 'first' });
      useEntryStore.setState({
        isLoadingMore: true,
        cursor: firstPage.at(-1)?.timestamp ?? null,
        hasMore: true,
      });

      useEntryStore.getState().setFilterType('voice');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      useEntryStore.setState({ cursor: voicePage.at(-1)?.timestamp ?? null, hasMore: true });
      await useEntryStore.getState().loadMore();

      expect(mockDataSource.getEntriesPage).toHaveBeenCalledTimes(3);
      expect(useEntryStore.getState().entries.map((entry) => entry.id)).toContain('voice-more');
    });
  });

  // ─── addEntry ───────────────────────────────────────────────────────────────

  describe('addEntry', () => {
    it('应该添加新记录到 store', async () => {
      const newEntryData = { type: 'text' as const, content: '新记录', tags: ['测试'] };
      mockDataSource.addEntry.mockResolvedValue({
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
      (DB.addEntry as jest.Mock).mockRejectedValueOnce(new Error('数据库错误'));

      await expect(
        useEntryStore.getState().addEntry({ type: 'text', content: '测试' })
      ).rejects.toThrow('数据库错误');
    });

    it('cloudMode 关闭时应该把误传入的 pending 状态归一化为 synced', async () => {
      useSettingsStore.setState({ cloudMode: false });
      (DB.addEntry as jest.Mock).mockResolvedValueOnce({
        id: 'local-entry-offline',
        type: 'text',
        content: '离线记录',
        timestamp: 1700000000002,
        syncStatus: 'synced',
        syncOp: 'update',
      });

      await useEntryStore.getState().addEntry({
        type: 'text',
        content: '离线记录',
        syncStatus: 'pending',
      });

      expect(DB.addEntry).toHaveBeenCalledWith(expect.objectContaining({
        content: '离线记录',
        syncStatus: 'synced',
        syncOp: 'update',
      }));
    });

    it('cloudMode 开启时也应该通过 DB.addEntry 本地写入', async () => {
      useSettingsStore.setState({ cloudMode: true });
      (DB.addEntry as jest.Mock).mockResolvedValueOnce({
        id: 'local-entry-2',
        type: 'text',
        content: '云端模式本地写入',
        timestamp: 1700000000001,
        syncStatus: 'pending',
        syncOp: 'create',
      });

      await useEntryStore.getState().addEntry({ type: 'text', content: '云端模式本地写入' });

      expect(DB.addEntry).toHaveBeenCalledWith(expect.objectContaining({
        content: '云端模式本地写入',
        syncStatus: 'pending',
        syncOp: 'create',
      }));
      expect(mockDataSource.addEntry).not.toHaveBeenCalled();
      expect(mockRefreshCloudSyncIndicator).toHaveBeenCalled();
    });
  });

  // ─── updateEntry ───────────────────────────────────────────────────────────

  describe('updateEntry', () => {
    it('cloudMode 开启时应该通过 DB.updateEntry 并保留语音上传状态', async () => {
      useSettingsStore.setState({ cloudMode: true });
      useEntryStore.setState({
        entries: [
          {
            id: 'voice-1',
            type: 'voice',
            content: '',
            timestamp: 1700000000000,
            syncStatus: 'pending_upload',
          },
        ],
      });

      await useEntryStore.getState().updateEntry('voice-1', {
        content: 'updated',
        syncStatus: 'pending_upload',
        updatedAt: 1700000001000,
      });

      expect(DB.updateEntry).toHaveBeenCalledWith('voice-1', expect.objectContaining({
        content: 'updated',
        syncStatus: 'pending_upload',
        baseUpdatedAt: 1700000001000,
      }));
      expect(mockDataSource.updateEntry).not.toHaveBeenCalled();
      expect(mockRefreshCloudSyncIndicator).toHaveBeenCalled();
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
      });

      await useEntryStore.getState().deleteEntry('1');

      const entries = useEntryStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('2');
      expect(mockDataSource.deleteEntry).toHaveBeenCalledWith('1');
    });

    it('cloudMode 开启时应该把 synced 记录标记为 pending_delete，而不是调用远端删除', async () => {
      useSettingsStore.setState({ cloudMode: true });
      useEntryStore.setState({
        entries: [
          { id: '1', type: 'text', content: '记录1', timestamp: 1700000000000, syncStatus: 'synced' },
        ],
      });

      await useEntryStore.getState().deleteEntry('1');

      expect(DB.markEntryPendingDelete).toHaveBeenCalledWith('1');
      expect(mockDataSource.deleteEntry).not.toHaveBeenCalled();
      expect(mockRefreshCloudSyncIndicator).toHaveBeenCalled();
    });

    it('删除 pending_upload 照片时应该取消上传并清理本地 cache 文件', async () => {
      const { cancelPhotoUpload } = jest.requireMock('@/src/services/photoUploadQueue') as {
        cancelPhotoUpload: jest.Mock;
      };
      const { deleteFile } = jest.requireMock('@/src/utils/fileSystem') as {
        deleteFile: jest.Mock;
      };

      useSettingsStore.setState({ cloudMode: true });
      useEntryStore.setState({
        entries: [
          {
            id: 'photo-1',
            type: 'photo',
            content: '',
            timestamp: 1700000000000,
            syncStatus: 'pending_upload',
            media: [
              {
                uri: 'file:///cache/media/photos/display/photo_1.jpg',
                thumbnail: 'file:///cache/media/photos/thumbnails/thumb_1.jpg',
                mimeType: 'image/jpeg',
                size: 2048,
              },
            ],
          },
        ],
      });

      await useEntryStore.getState().deleteEntry('photo-1');

      expect(cancelPhotoUpload).toHaveBeenCalledWith('photo-1');
      expect(deleteFile).toHaveBeenCalledWith('file:///cache/media/photos/display/photo_1.jpg');
      expect(deleteFile).toHaveBeenCalledWith('file:///cache/media/photos/thumbnails/thumb_1.jpg');
      expect(DB.deleteEntry).toHaveBeenCalledWith('photo-1');
      expect(mockDataSource.deleteEntry).not.toHaveBeenCalled();
      expect(DB.markEntryPendingDelete).not.toHaveBeenCalled();
      expect(mockRefreshCloudSyncIndicator).toHaveBeenCalled();
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
