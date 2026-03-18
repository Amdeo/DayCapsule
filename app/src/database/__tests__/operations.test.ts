/**
 * database/operations 单元测试
 */

// Mock expo-sqlite
const mockDb = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
};

jest.mock('@/src/database/sqlite', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  getAllEntries,
  getEntryById,
  addEntry,
  updateEntry,
  deleteEntry,
  searchEntries,
  getEntriesCount,
  getAllTags,
  getEntriesPage,
} from '../operations';

describe('database/operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── getAllEntries ───────────────────────────────────────────────────────────

  describe('getAllEntries', () => {
    it('没有 limit 时应该查询所有记录', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { id: '1', type: 'text', content: '测试', timestamp: 1700000000000, tags: null, media_uri: null, recording_status: null },
      ]);

      const result = await getAllEntries();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM entries ORDER BY timestamp DESC'
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('有 limit 时应该使用参数化查询防止 SQL 注入', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await getAllEntries(10);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM entries ORDER BY timestamp DESC LIMIT ?',
        [10]
      );
    });

    it('出错时应该返回空数组', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('DB Error'));

      const result = await getAllEntries();
      expect(result).toEqual([]);
    });
  });

  // ─── getEntriesPage ─────────────────────────────────────────────────────────

  describe('getEntriesPage', () => {
    it('无过滤条件时应该查询全部并带 LIMIT', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await getEntriesPage({}, 20);

      const [sql, params] = mockDb.getAllAsync.mock.calls[0];
      expect(sql).toContain('ORDER BY e.timestamp DESC LIMIT ?');
      expect(params).toEqual([20]);
    });

    it('传入 cursor 时应该添加 timestamp < ? 条件', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await getEntriesPage({}, 20, 1700000000000);

      const [sql, params] = mockDb.getAllAsync.mock.calls[0];
      expect(sql).toContain('e.timestamp < ?');
      expect(params[0]).toBe(1700000000000);
    });

    it('传入 type 过滤时应该添加 type = ? 条件', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await getEntriesPage({ type: 'photo' }, 20);

      const [sql, params] = mockDb.getAllAsync.mock.calls[0];
      expect(sql).toContain('e.type = ?');
      expect(params).toContain('photo');
    });

    it('传入 search 时应该添加 LIKE 条件', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await getEntriesPage({ search: '旅行' }, 20);

      const [sql, params] = mockDb.getAllAsync.mock.calls[0];
      expect(sql).toContain('LIKE ?');
      expect(params).toContain('%旅行%');
    });

    it('传入 tags 时应该使用 JOIN 子查询（AND 语义）', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await getEntriesPage({ tags: ['工作', '重要'] }, 20);

      const [sql, params] = mockDb.getAllAsync.mock.calls[0];
      expect(sql.match(/entry_tags/g)?.length).toBe(2); // 两个 tag 各一个子查询
      expect(params).toContain('工作');
      expect(params).toContain('重要');
    });

    it('出错时应该返回空数组', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('DB Error'));

      const result = await getEntriesPage({}, 20);
      expect(result).toEqual([]);
    });
  });

  // ─── searchEntries ──────────────────────────────────────────────────────────

  describe('searchEntries', () => {
    it('应该使用 LIMIT 限制结果数量', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await searchEntries('测试');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        ['%测试%', '%测试%', 100]
      );
    });

    it('应该支持自定义 limit', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await searchEntries('测试', 50);

      const callArgs = mockDb.getAllAsync.mock.calls[0];
      expect(callArgs[1]).toEqual(['%测试%', '%测试%', 50]);
    });
  });

  // ─── addEntry ───────────────────────────────────────────────────────────────

  describe('addEntry', () => {
    it('应该插入新记录并返回', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      const entry = { type: 'text' as const, content: '新记录', tags: ['标签'] };
      const result = await addEntry(entry);

      expect(mockDb.runAsync).toHaveBeenCalled();
      expect(result.content).toBe('新记录');
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('有 tags 时应该调用 upsertEntryTags（双写）', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await addEntry({ type: 'text' as const, content: '带标签', tags: ['工作'] });

      // INSERT INTO entries + DELETE entry_tags + INSERT tags + INSERT entry_tags = 4 calls
      expect(mockDb.runAsync.mock.calls.length).toBeGreaterThanOrEqual(3);
      const sqls = mockDb.runAsync.mock.calls.map((c: any[]) => c[0] as string);
      expect(sqls.some((s) => s.includes('INSERT OR IGNORE INTO tags'))).toBe(true);
      expect(sqls.some((s) => s.includes('entry_tags'))).toBe(true);
    });

    it('有多个 tags 时应并发发起每个 tag 的首个 SQL，再继续关联写入', async () => {
      const pendingTagWrites: Array<{ sql: string; resolve: () => void }> = [];

      mockDb.getAllAsync.mockResolvedValue([{ name: 'id' }, { name: 'type' }, { name: 'content' }, { name: 'timestamp' }, { name: 'tags' }]);
      mockDb.runAsync.mockImplementation((sql: string) => {
        if (sql.includes('INSERT OR IGNORE INTO tags') || sql.includes('INSERT OR IGNORE INTO entry_tags')) {
          return new Promise<void>((resolve) => {
            pendingTagWrites.push({ sql, resolve });
          });
        }
        return Promise.resolve(undefined);
      });

      const addEntryPromise = addEntry({
        type: 'text' as const,
        content: '并发标签',
        tags: ['工作', '重要'],
      });

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(pendingTagWrites).toHaveLength(2);
      expect(pendingTagWrites.every(({ sql }) => sql.includes('INSERT OR IGNORE INTO tags'))).toBe(true);

      pendingTagWrites.splice(0).forEach(({ resolve }) => resolve());
      await Promise.resolve();
      await Promise.resolve();

      expect(pendingTagWrites).toHaveLength(2);
      expect(pendingTagWrites.every(({ sql }) => sql.includes('INSERT OR IGNORE INTO entry_tags'))).toBe(true);

      pendingTagWrites.splice(0).forEach(({ resolve }) => resolve());
      await addEntryPromise;
    });
  });

  // ─── deleteEntry ────────────────────────────────────────────────────────────

  describe('deleteEntry', () => {
    it('应该使用参数化查询删除记录', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await deleteEntry('test-id');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM entries WHERE id = ?',
        ['test-id']
      );
    });

    it('删除失败时应该抛出错误', async () => {
      mockDb.runAsync.mockRejectedValue(new Error('DB Error'));

      await expect(deleteEntry('test-id')).rejects.toThrow('DB Error');
    });
  });

  // ─── getAllTags ──────────────────────────────────────────────────────────────

  describe('getAllTags', () => {
    it('应该从规范化 tags 表查询', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: '工作' },
        { name: '旅行' },
      ]);

      const tags = await getAllTags();

      const [sql] = mockDb.getAllAsync.mock.calls[0];
      expect(sql).toContain('FROM tags');
      expect(tags).toEqual(['工作', '旅行']);
    });

    it('出错时应该返回空数组', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('DB Error'));

      const tags = await getAllTags();
      expect(tags).toEqual([]);
    });
  });

  // ─── getEntriesCount ────────────────────────────────────────────────────────

  describe('getEntriesCount', () => {
    it('应该返回记录总数', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 42 });

      const count = await getEntriesCount();
      expect(count).toBe(42);
    });

    it('出错时应该返回 0', async () => {
      mockDb.getFirstAsync.mockRejectedValue(new Error('DB Error'));

      const count = await getEntriesCount();
      expect(count).toBe(0);
    });
  });
});
