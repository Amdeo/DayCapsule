/**
 * database/operations 单元测试
 */

// Mock expo-sqlite
const mockDb = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
  withTransactionAsync: jest.fn(),
};

jest.mock('@/src/database/sqlite', () => ({
  getDatabase: jest.fn(() => mockDb),
  getDatabaseScopeKey: jest.fn(() => null),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  waitFor,
} from '@testing-library/react-native';
import {
  getAllEntries,
  getEntryById,
  addEntry,
  updateEntry,
  deleteEntry,
  getPhotoEntriesBySyncStatus,
  getEntriesByLocalReadyState,
  getCloudSyncIndicatorSummary,
  getLocalSyncOverviewCounts,
  markEntryPendingDelete,
  searchEntries,
  getEntriesCount,
  getAllTags,
  getEntriesPage,
  restoreEntries,
  invalidateColumnCache,
} from '../operations';
import { logger } from '@/src/utils/logger';

describe('database/operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateColumnCache();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.getFirstAsync.mockResolvedValue(undefined);
    mockDb.runAsync.mockResolvedValue(undefined);
    mockDb.withTransactionAsync.mockImplementation(async (callback: () => Promise<void>) => callback());
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

    it('应该从数据库行中保留 sync_status 与 media_json.remoteUri', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 'voice-1',
          type: 'voice',
          content: '',
          timestamp: 1700000000000,
          tags: null,
          media_json: JSON.stringify([
            {
              uri: 'file:///cache/voice.m4a',
              remoteUri: 'https://cdn.example.com/voice.m4a',
              mimeType: 'audio/m4a',
              size: 100,
              duration: 12000,
            },
          ]),
          recording_status: 'completed',
          recording_duration: 12,
          sync_status: 'pending_upload',
        },
      ]);

      const result = await getAllEntries();

      expect(result[0].syncStatus).toBe('pending_upload');
      expect(result[0].media?.[0]?.remoteUri).toBe('https://cdn.example.com/voice.m4a');
    });

    it('应该把旧脏数据中的字符串 media_json 归一化为 media 数组', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 'voice-legacy',
          type: 'voice',
          content: '同步语音',
          timestamp: 1700000000000,
          tags: null,
          media_json: JSON.stringify(JSON.stringify({
            uri: 'https://cdn.example.com/voice-legacy.m4a',
            mimeType: 'audio/m4a',
            size: 100,
            duration: 12000,
          })),
          recording_status: 'completed',
          recording_duration: 12,
          sync_status: 'synced',
        },
      ]);

      const result = await getAllEntries();

      expect(result[0].media).toEqual([
        expect.objectContaining({
          uri: 'https://cdn.example.com/voice-legacy.m4a',
          mimeType: 'audio/m4a',
          duration: 12000,
        }),
      ]);
    });

    it('应该把旧脏数据中的图片 media_json 字符串数组归一化并保留缩略图', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 'photo-legacy',
          type: 'photo',
          content: '同步图片',
          timestamp: 1700000002000,
          tags: null,
          media_json: JSON.stringify(JSON.stringify([
            {
              uri: 'https://cdn.example.com/photo-legacy-1.jpg',
              mimeType: 'image/jpeg',
              size: 100,
              thumbnail: 'https://cdn.example.com/photo-legacy-1-thumb.jpg',
            },
            {
              uri: 'https://cdn.example.com/photo-legacy-2.jpg',
              mimeType: 'image/jpeg',
              size: 120,
              thumbnail: 'https://cdn.example.com/photo-legacy-2-thumb.jpg',
            },
          ])),
          recording_status: null,
          recording_duration: null,
          sync_status: 'synced',
        },
      ]);

      const result = await getAllEntries();

      expect(result[0].media).toEqual([
        expect.objectContaining({
          uri: 'https://cdn.example.com/photo-legacy-1.jpg',
          thumbnail: 'https://cdn.example.com/photo-legacy-1-thumb.jpg',
        }),
        expect.objectContaining({
          uri: 'https://cdn.example.com/photo-legacy-2.jpg',
          thumbnail: 'https://cdn.example.com/photo-legacy-2-thumb.jpg',
        }),
      ]);
    });

    it('应该在 media_json 缺失时回退读取旧版 media_uri 录音字段', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 'voice-media-uri-legacy',
          type: 'voice',
          content: '',
          timestamp: 1700000003000,
          tags: null,
          media_json: null,
          media_uri: 'file:///legacy/voice.m4a',
          media_type: 'audio/m4a',
          media_duration: 18000,
          media_thumbnail: null,
          media_metadata: JSON.stringify({
            createdAt: 1700000000000,
            modifiedAt: 1700000001000,
            bitrate: 128000,
          }),
          recording_status: 'completed',
          recording_duration: 18,
          sync_status: 'synced',
        },
      ]);

      const result = await getAllEntries();

      expect(result[0].media).toEqual([
        expect.objectContaining({
          uri: 'file:///legacy/voice.m4a',
          mimeType: 'audio/m4a',
          duration: 18000,
          metadata: expect.objectContaining({
            createdAt: 1700000000000,
            modifiedAt: 1700000001000,
            bitrate: 128000,
          }),
        }),
      ]);
    });

    it('应该把数据库脏枚举值收敛为安全的 Entry 字段', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 'dirty-row-1',
          type: 'weird',
          content: '脏数据',
          timestamp: 1700000004000,
          tags: null,
          media_json: null,
          recording_status: 'broken',
          recording_duration: 12,
          sync_status: 'mystery',
          sync_op: 'noop',
          local_ready_state: 'later',
        },
        {
          id: 'dirty-row-2',
          type: 'voice',
          content: '合法状态',
          timestamp: 1700000005000,
          tags: null,
          media_json: null,
          recording_status: 'stopping',
          recording_duration: 8,
          sync_status: 'synced',
          sync_op: 'update',
          local_ready_state: 'ready',
        },
      ]);

      const result = await getAllEntries();

      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'dirty-row-1',
          type: 'text',
          recordingStatus: undefined,
          syncStatus: 'synced',
          syncOp: 'update',
          localReadyState: 'ready',
        })
      );
      expect(result[1]).toEqual(
        expect.objectContaining({
          id: 'dirty-row-2',
          recordingStatus: 'stopping',
        })
      );
    });
  });

  // ─── getEntriesPage ─────────────────────────────────────────────────────────

  describe('getEntriesPage', () => {
    it('存在 deleted 列时应该排除逻辑删除记录', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([
          { name: 'id' },
          { name: 'type' },
          { name: 'content' },
          { name: 'timestamp' },
          { name: 'deleted' },
        ])
        .mockResolvedValueOnce([]);

      await getEntriesPage({}, 20);

      const [sql, params] = mockDb.getAllAsync.mock.calls.at(-1) ?? [];
      expect(sql).toContain('WHERE e.deleted = 0');
      expect(params).toEqual([20]);
    });

    it('无过滤条件时应该查询全部并带 LIMIT', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await getEntriesPage({}, 20);

      const [sql, params] = mockDb.getAllAsync.mock.calls.at(-1) ?? [];
      expect(sql).toContain('ORDER BY e.timestamp DESC LIMIT ?');
      expect(params).toEqual([20]);
    });

    it('传入 cursor 时应该添加 timestamp < ? 条件', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await getEntriesPage({}, 20, 1700000000000);

      const [sql, params] = mockDb.getAllAsync.mock.calls.at(-1) ?? [];
      expect(sql).toContain('e.timestamp < ?');
      expect(params[0]).toBe(1700000000000);
    });

    it('传入 type 过滤时应该添加 type = ? 条件', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await getEntriesPage({ type: 'photo' }, 20);

      const [sql, params] = mockDb.getAllAsync.mock.calls.at(-1) ?? [];
      expect(sql).toContain('e.type = ?');
      expect(params).toContain('photo');
    });

    it('传入 search 时应该添加 FTS content 过滤条件', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await getEntriesPage({ search: '旅行' }, 20);

      const [sql, params] = mockDb.getAllAsync.mock.calls.at(-1) ?? [];
      expect(sql).toContain('e.id IN (SELECT f.entry_id FROM entries_fts f WHERE f.content MATCH ?)');
      expect(sql).not.toContain('e.tags LIKE ?');
      expect(params).toContain('"旅行"*');
    });

    it('search 与 tags 组合时应保持参数顺序并安全规范化 FTS 查询', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await getEntriesPage({ search: 'foo"bar', tags: ['工作'] }, 20);

      const [sql, params] = mockDb.getAllAsync.mock.calls.at(-1) ?? [];
      expect(sql).toContain('e.id IN (SELECT f.entry_id FROM entries_fts f WHERE f.content MATCH ?)');
      expect(sql).toContain('e.id IN (SELECT et.entry_id FROM entry_tags et JOIN tags t ON et.tag_id = t.id WHERE t.name = ?)');
      expect(params).toEqual(['"foo""bar"*', '工作', 20]);
    });

    it('传入 tags 时应该使用 JOIN 子查询（AND 语义）', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await getEntriesPage({ tags: ['工作', '重要'] }, 20);

      const [sql, params] = mockDb.getAllAsync.mock.calls.at(-1) ?? [];
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

  // ─── getEntryById ───────────────────────────────────────────────────────────

  describe('getEntryById', () => {
    it('应该读取 baseUpdatedAt userId deleted 与 conflictedCopyOf', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({
        id: 'entry-1',
        type: 'text',
        content: 'server copy',
        timestamp: 1700000000000,
        tags: '["工作"]',
        sync_status: 'conflict-local-copy',
        sync_op: 'update',
        conflicted_copy_of: 'entry-root',
        base_updated_at: 1699999999000,
        user_id: 'user-1',
        deleted: 1,
        updated_at: 1700000001000,
      });

      const result = await getEntryById('entry-1');

      expect(result).toMatchObject({
        id: 'entry-1',
        syncStatus: 'conflict-local-copy',
        conflictedCopyOf: 'entry-root',
        baseUpdatedAt: 1699999999000,
        userId: 'user-1',
        deleted: true,
        updatedAt: 1700000001000,
      });
    });
  });

  describe('getPhotoEntriesBySyncStatus', () => {
    it('应该只查询 photo 类型的待上传记录', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([
          { name: 'id' },
          { name: 'type' },
          { name: 'content' },
          { name: 'timestamp' },
          { name: 'sync_status' },
        ])
        .mockResolvedValueOnce([
          {
            id: 'photo-1',
            type: 'photo',
            content: '',
            timestamp: 1700000000000,
            sync_status: 'pending_upload',
            tags: null,
            media_json: JSON.stringify([]),
          },
        ]);

      const result = await getPhotoEntriesBySyncStatus(['pending_upload', 'uploading']);

      const [sql, params] = mockDb.getAllAsync.mock.calls[1];
      expect(sql).toContain("WHERE type = 'photo' AND sync_status IN");
      expect(params).toEqual(['pending_upload', 'uploading']);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('photo');
      expect(result[0].syncStatus).toBe('pending_upload');
    });
  });

  // ─── searchEntries ──────────────────────────────────────────────────────────

  describe('searchEntries', () => {
    it('应该使用 FTS content lookup 并限制结果数量', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await searchEntries('测试');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('JOIN entries_fts f ON f.entry_id = e.id'),
        ['"测试"*', 100]
      );
      expect(mockDb.getAllAsync.mock.calls[0][0]).toContain('f.content MATCH ?');
      expect(mockDb.getAllAsync.mock.calls[0][0]).toContain('LIMIT ?');
    });

    it('应该支持自定义 limit', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await searchEntries('测试', 50);

      const callArgs = mockDb.getAllAsync.mock.calls[0];
      expect(callArgs[1]).toEqual(['"测试"*', 50]);
    });

    it('空白 search 应返回空数组且不查询数据库', async () => {
      const result = await searchEntries('   ');

      expect(result).toEqual([]);
      expect(mockDb.getAllAsync).not.toHaveBeenCalled();
    });

    it('应将多词和特殊字符安全规范化后传给 MATCH', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await searchEntries('C++ note');

      const callArgs = mockDb.getAllAsync.mock.calls[0];
      expect(callArgs[1]).toEqual(['"C++"* AND "note"*', 100]);
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

    it('有多个 tags 时应批量写入 tags 和 entry_tags', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await addEntry({
        type: 'text' as const,
        content: '批量标签',
        tags: ['工作', '重要'],
      });

      const sqlCalls = mockDb.runAsync.mock.calls.map(([sql, params]) => ({
        sql: sql as string,
        params: params as unknown[],
      }));

      const tagInsert = sqlCalls.find(({ sql }) =>
        sql.includes('INSERT OR IGNORE INTO tags (name) VALUES (?), (?)')
      );
      const entryTagInsert = sqlCalls.find(({ sql }) =>
        sql.includes('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id)')
      );

      expect(tagInsert?.params).toEqual(['工作', '重要']);
      expect(entryTagInsert?.sql).toContain('WHERE name IN (?, ?)');
      expect(entryTagInsert?.params).toEqual([expect.any(String), '工作', '重要']);
    });

    it('单条记录的重复 tags 应在批量写入前去重', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await addEntry({
        type: 'text' as const,
        content: '去重标签',
        tags: ['工作', '工作', '重要'],
      });

      const sqlCalls = mockDb.runAsync.mock.calls.map(([sql, params]) => ({
        sql: sql as string,
        params: params as unknown[],
      }));

      const tagInsert = sqlCalls.find(({ sql }) =>
        sql.includes('INSERT OR IGNORE INTO tags (name) VALUES (?), (?)')
      );
      const entryTagInsert = sqlCalls.find(({ sql }) =>
        sql.includes('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id)')
      );

      expect(tagInsert?.params).toEqual(['工作', '重要']);
      expect(entryTagInsert?.sql).toContain('WHERE name IN (?, ?)');
      expect(entryTagInsert?.params).toEqual([expect.any(String), '工作', '重要']);
    });

    it('重复 tags 写入 entries.tags JSON 列时也应按原顺序去重', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await addEntry({
        type: 'text' as const,
        content: 'JSON 去重标签',
        tags: ['工作', '工作', '重要'],
      });

      const [, params] = mockDb.runAsync.mock.calls[0];
      expect(params[4]).toBe(JSON.stringify(['工作', '重要']));
    });

    it('空 tags 时只应清旧关联而不再写 tags 或 entry_tags', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await addEntry({
        type: 'text' as const,
        content: '空标签',
        tags: [],
      });

      const tagSqlCalls = mockDb.runAsync.mock.calls
        .map(([sql, params]) => ({ sql: sql as string, params: params as unknown[] }))
        .filter(({ sql }) => sql.includes('entry_tags') || sql.includes('INSERT OR IGNORE INTO tags'));

      expect(tagSqlCalls).toEqual([
        {
          sql: 'DELETE FROM entry_tags WHERE entry_id = ?',
          params: [expect.any(String)],
        },
      ]);
    });

    it('写入 media_json 时应该保留两张图片而不是只写首图', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_json' },
        { name: 'sync_status' },
      ]);

      await addEntry({
        type: 'photo',
        content: '',
        syncStatus: 'pending_upload',
        media: [
          {
            uri: 'file:///cache/photo-1.jpg',
            thumbnail: 'file:///cache/thumb-1.jpg',
            mimeType: 'image/jpeg',
            size: 100,
          },
          {
            uri: 'file:///cache/photo-2.jpg',
            thumbnail: 'file:///cache/thumb-2.jpg',
            mimeType: 'image/jpeg',
            size: 200,
          },
        ],
      });

      const [, params] = mockDb.runAsync.mock.calls[0];
      expect(JSON.parse(params[5])).toHaveLength(2);
    });

    it('addEntry 应继续使用普通 INSERT INTO entries', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_json' },
      ]);

      await addEntry({
        type: 'text' as const,
        content: 'insert form lock',
      });

      const [sql] = mockDb.runAsync.mock.calls[0];
      expect(sql).toContain('INSERT INTO entries');
      expect(sql).not.toContain('INSERT OR IGNORE INTO entries');
    });

    it('addEntry 应同步写入 entries_fts content 索引', async () => {
      const result = await addEntry({ type: 'text' as const, content: 'FTS 新记录' });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT INTO entries_fts (entry_id, content) VALUES (?, ?)',
        [result.id, 'FTS 新记录']
      );
    });

    it('新环境中写入两张图片后重新读取仍应保留两张', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_json' },
        { name: 'sync_status' },
      ]);

      const created = await addEntry({
        type: 'photo',
        content: '',
        syncStatus: 'pending_upload',
        media: [
          {
            uri: 'file:///cache/photo-1.jpg',
            thumbnail: 'file:///cache/thumb-1.jpg',
            mimeType: 'image/jpeg',
            size: 100,
          },
          {
            uri: 'file:///cache/photo-2.jpg',
            thumbnail: 'file:///cache/thumb-2.jpg',
            mimeType: 'image/jpeg',
            size: 200,
          },
        ],
      });

      const [, insertParams] = mockDb.runAsync.mock.calls[0];
      mockDb.getFirstAsync.mockResolvedValueOnce({
        id: created.id,
        type: 'photo',
        content: '',
        timestamp: created.timestamp,
        tags: null,
        media_json: insertParams[5],
        sync_status: 'pending_upload',
        sync_op: 'update',
        updated_at: created.timestamp,
      });

      const reloaded = await getEntryById(created.id);

      expect(reloaded?.media).toHaveLength(2);
      expect(reloaded?.media?.[0]).toMatchObject({
        uri: 'file:///cache/photo-1.jpg',
        thumbnail: 'file:///cache/thumb-1.jpg',
      });
      expect(reloaded?.media?.[1]).toMatchObject({
        uri: 'file:///cache/photo-2.jpg',
        thumbnail: 'file:///cache/thumb-2.jpg',
      });
    });

    it('写入 media_json 时应该同时持久化 sync_status', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_json' },
        { name: 'sync_status' },
      ]);

      const result = await addEntry({
        type: 'voice',
        content: '',
        syncStatus: 'pending_upload',
        recordingStatus: 'completed',
        media: [{
          uri: 'file:///cache/voice.m4a',
          remoteUri: 'https://cdn.example.com/voice.m4a',
          mimeType: 'audio/m4a',
          size: 100,
          duration: 12000,
        }],
      });

      const [sql, params] = mockDb.runAsync.mock.calls[0];
      expect(sql).toContain('sync_status');
      expect(sql).not.toContain('sync_op');
      expect(params).toContain('pending_upload');
      expect(result.syncStatus).toBe('pending_upload');
    });

    it('列存在时应该持久化 baseUpdatedAt userId deleted 与 conflictedCopyOf', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_json' },
        { name: 'sync_status' },
        { name: 'sync_op' },
        { name: 'conflicted_copy_of' },
        { name: 'base_updated_at' },
        { name: 'user_id' },
        { name: 'deleted' },
      ]);

      const result = await addEntry({
        type: 'text',
        content: '带同步元数据',
        syncStatus: 'pending',
        syncOp: 'update',
        conflictedCopyOf: 'entry-root',
        baseUpdatedAt: 1700000000000,
        userId: 'user-1',
        deleted: true,
      });

      const [sql, params] = mockDb.runAsync.mock.calls[0];
      expect(sql).toContain('conflicted_copy_of');
      expect(sql).toContain('base_updated_at');
      expect(sql).toContain('user_id');
      expect(sql).toContain('deleted');
      expect(params).toContain('entry-root');
      expect(params).toContain(1700000000000);
      expect(params).toContain('user-1');
      expect(params).toContain(1);
      expect(result).toMatchObject({
        conflictedCopyOf: 'entry-root',
        baseUpdatedAt: 1700000000000,
        userId: 'user-1',
        deleted: true,
      });
    });

    it('reads localReadyState from rows and persists it on add/update', async () => {
      const tableColumns = [
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_json' },
        { name: 'local_ready_state' },
      ];
      mockDb.getAllAsync.mockResolvedValue(tableColumns);

      const created = await addEntry({
        type: 'text',
        content: '带 localReadyState',
        localReadyState: 'processing',
      });

      const [insertSql, insertParams] = mockDb.runAsync.mock.calls[0];
      expect(insertSql).toContain('local_ready_state');
      expect(insertParams).toContain('processing');
      expect(created.localReadyState).toBe('processing');

      await updateEntry(created.id, { localReadyState: 'ready' });
      const [updateSql, updateParams] = mockDb.runAsync.mock.calls.at(-1) ?? [];
      expect(updateSql).toContain('local_ready_state = ?');
      expect(updateParams).toContain('ready');

      mockDb.getAllAsync.mockImplementationOnce(async (sql: string) => {
        if (sql.includes('SELECT * FROM entries')) {
          return [
            {
              id: created.id,
              type: 'text',
              content: '带 localReadyState',
              timestamp: created.timestamp,
              tags: null,
              local_ready_state: 'processing',
            },
          ];
        }
        return tableColumns;
      });

      const rows = await getAllEntries();
      expect(rows[0].localReadyState).toBe('processing');
    });

    it('media_json 不可用时应把首个媒体写入 legacy 列并保留 metadata 序列化', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_thumbnail' },
        { name: 'media_metadata' },
      ]);

      await addEntry({
        type: 'photo',
        content: '',
        media: [
          {
            uri: 'file:///cache/photo-1.jpg',
            thumbnail: 'file:///cache/thumb-1.jpg',
            mimeType: 'image/jpeg',
            size: 100,
            metadata: {
              createdAt: 1700000000000,
              modifiedAt: 1700000001000,
              width: 1200,
            },
          },
          {
            uri: 'file:///cache/photo-2.jpg',
            thumbnail: 'file:///cache/thumb-2.jpg',
            mimeType: 'image/jpeg',
            size: 200,
          },
        ],
      });

      const [, params] = mockDb.runAsync.mock.calls[0];
      expect(params[5]).toBe('file:///cache/photo-1.jpg');
      expect(params[6]).toBe('image/jpeg');
      expect(params[7]).toBeNull();
      expect(params[8]).toBe('file:///cache/thumb-1.jpg');
      expect(params[9]).toBe(JSON.stringify({
        createdAt: 1700000000000,
        modifiedAt: 1700000001000,
        width: 1200,
      }));
    });

    it('legacy 扩展媒体列分支遇到 stopping 时 recording_status 应写入 null', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_thumbnail' },
        { name: 'media_metadata' },
      ]);

      await addEntry({
        type: 'voice',
        content: '',
        recordingStatus: 'stopping',
        media: [
          {
            uri: 'file:///cache/voice-1.m4a',
            mimeType: 'audio/m4a',
            size: 100,
            duration: 12000,
            thumbnail: 'file:///cache/thumb-1.jpg',
            metadata: {
              createdAt: 1700000000000,
              modifiedAt: 1700000001000,
            },
          },
        ],
      });

      const [, params] = mockDb.runAsync.mock.calls[0];
      expect(params[10]).toBeNull();
    });

    it('media_json 与扩展 legacy 列都不可用时应把首个媒体写入旧版 legacy 列', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
      ]);

      await addEntry({
        type: 'voice',
        content: '',
        media: [
          {
            uri: 'file:///cache/voice-1.m4a',
            mimeType: 'audio/m4a',
            size: 100,
            duration: 12000,
          },
          {
            uri: 'file:///cache/voice-2.m4a',
            mimeType: 'audio/m4a',
            size: 200,
            duration: 24000,
          },
        ],
      });

      const [, params] = mockDb.runAsync.mock.calls[0];
      expect(params[5]).toBe('file:///cache/voice-1.m4a');
      expect(params[6]).toBe('audio/m4a');
      expect(params[7]).toBe(12000);
    });
  });

  // ─── updateEntry ───────────────────────────────────────────────────────────

  describe('updateEntry', () => {
    it('updateEntry 更新 content 时应同步刷新 entries_fts', async () => {
      await updateEntry('entry-1', { content: 'FTS 更新内容' });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM entries_fts WHERE entry_id = ?',
        ['entry-1']
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT INTO entries_fts (entry_id, content) VALUES (?, ?)',
        ['entry-1', 'FTS 更新内容']
      );
    });

    it('列存在时应该更新 baseUpdatedAt userId deleted 与 conflictedCopyOf', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_json' },
        { name: 'sync_status' },
        { name: 'sync_op' },
        { name: 'conflicted_copy_of' },
        { name: 'base_updated_at' },
        { name: 'user_id' },
        { name: 'deleted' },
      ]);

      await updateEntry('entry-1', {
        conflictedCopyOf: 'entry-root',
        baseUpdatedAt: 1700000000000,
        userId: 'user-1',
        deleted: true,
      });

      const [sql, params] = mockDb.runAsync.mock.calls[0];
      expect(sql).toContain('conflicted_copy_of = ?');
      expect(sql).toContain('base_updated_at = ?');
      expect(sql).toContain('user_id = ?');
      expect(sql).toContain('deleted = ?');
      expect(params).toContain('entry-root');
      expect(params).toContain(1700000000000);
      expect(params).toContain('user-1');
      expect(params).toContain(1);
    });

    it('media_json 不可用时应把首个媒体更新到 legacy 列并保留 metadata 序列化', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_thumbnail' },
        { name: 'media_metadata' },
      ]);

      await updateEntry('entry-1', {
        media: [
          {
            uri: 'file:///cache/photo-1.jpg',
            thumbnail: 'file:///cache/thumb-1.jpg',
            mimeType: 'image/jpeg',
            size: 100,
            metadata: {
              createdAt: 1700000000000,
              modifiedAt: 1700000001000,
              width: 1200,
            },
          },
          {
            uri: 'file:///cache/photo-2.jpg',
            thumbnail: 'file:///cache/thumb-2.jpg',
            mimeType: 'image/jpeg',
            size: 200,
          },
        ],
      });

      const [sql, params] = mockDb.runAsync.mock.calls[0];
      expect(sql).toContain('media_uri = ?, media_type = ?, media_duration = ?, media_thumbnail = ?, media_metadata = ?');
      expect(params[0]).toBe('file:///cache/photo-1.jpg');
      expect(params[1]).toBe('image/jpeg');
      expect(params[2]).toBeNull();
      expect(params[3]).toBe('file:///cache/thumb-1.jpg');
      expect(params[4]).toBe(JSON.stringify({
        createdAt: 1700000000000,
        modifiedAt: 1700000001000,
        width: 1200,
      }));
    });

    it('media_json 与扩展 legacy 列都不可用时应把首个媒体更新到旧版 legacy 列', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
      ]);

      await updateEntry('entry-1', {
        media: [
          {
            uri: 'file:///cache/voice-1.m4a',
            mimeType: 'audio/m4a',
            size: 100,
            duration: 12000,
          },
          {
            uri: 'file:///cache/voice-2.m4a',
            mimeType: 'audio/m4a',
            size: 200,
            duration: 24000,
          },
        ],
      });

      const [sql, params] = mockDb.runAsync.mock.calls[0];
      expect(sql).toContain('media_uri = ?, media_type = ?, media_duration = ?');
      expect(sql).not.toContain('media_thumbnail = ?');
      expect(sql).not.toContain('media_metadata = ?');
      expect(params[0]).toBe('file:///cache/voice-1.m4a');
      expect(params[1]).toBe('audio/m4a');
      expect(params[2]).toBe(12000);
    });

    it('更新空 tags 时只应清旧关联而不再写 tags 或 entry_tags', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
      ]);

      await updateEntry('entry-empty-tags', { tags: [] });

      const tagSqlCalls = mockDb.runAsync.mock.calls
        .map(([sql, params]) => ({ sql: sql as string, params: params as unknown[] }))
        .filter(({ sql }) => sql.includes('entry_tags') || sql.includes('INSERT OR IGNORE INTO tags'));

      expect(tagSqlCalls).toEqual([
        {
          sql: 'DELETE FROM entry_tags WHERE entry_id = ?',
          params: ['entry-empty-tags'],
        },
      ]);
    });

    it('更新重复 tags 时 entries.tags JSON 列也应按原顺序去重', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
      ]);

      await updateEntry('entry-dedupe-tags', { tags: ['工作', '工作', '重要'] });

      const [sql, params] = mockDb.runAsync.mock.calls[0];
      expect(sql).toContain('tags = ?');
      expect(params[0]).toBe(JSON.stringify(['工作', '重要']));
    });
  });

  describe('getEntriesByLocalReadyState', () => {
    it('returns entries by localReadyState', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([
          { name: 'id' },
          { name: 'type' },
          { name: 'content' },
          { name: 'timestamp' },
          { name: 'local_ready_state' },
        ])
        .mockResolvedValueOnce([
          {
            id: 'entry-1',
            type: 'text',
            content: 'processing row',
            timestamp: 1,
            tags: null,
            local_ready_state: 'processing',
          },
        ]);

      const result = await getEntriesByLocalReadyState(['processing']);

      const [sql, params] = mockDb.getAllAsync.mock.calls[1];
      expect(sql).toContain('local_ready_state IN');
      expect(params).toEqual(['processing']);
      expect(result[0].localReadyState).toBe('processing');
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

    it('deleteEntry 应删除对应的 entries_fts 记录', async () => {
      await deleteEntry('entry-1');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM entries_fts WHERE entry_id = ?',
        ['entry-1']
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

  // ─── restoreEntries ─────────────────────────────────────────────────────────

  describe('restoreEntries', () => {
    it('restoreEntries 应回填恢复记录的 entries_fts content', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_json' },
      ]);
      mockDb.getFirstAsync.mockResolvedValueOnce({ changes: 1 });

      await restoreEntries([
        { id: 'restore-fts-1', type: 'text', content: '恢复全文索引', timestamp: 1, syncStatus: 'synced' },
      ]);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT INTO entries_fts (entry_id, content) VALUES (?, ?)',
        ['restore-fts-1', '恢复全文索引']
      );
    });

    it('应该在单个事务中恢复多条记录，并在单条失败后继续处理后续记录', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_json' },
      ]);
      mockDb.withTransactionAsync.mockImplementation(async (callback: () => Promise<void>) => callback());

      mockDb.runAsync.mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('INSERT OR IGNORE INTO entries') && params?.[0] === '2') {
          throw new Error('insert failed');
        }
        return undefined;
      });

      mockDb.getFirstAsync
        .mockResolvedValueOnce({ changes: 1 })
        .mockResolvedValueOnce({ changes: 1 });

      const result = await restoreEntries([
        { id: '1', type: 'text', content: 'first', timestamp: 1, syncStatus: 'synced' },
        { id: '2', type: 'text', content: 'second', timestamp: 2, syncStatus: 'synced' },
        { id: '3', type: 'text', content: 'third', timestamp: 3, syncStatus: 'synced' },
      ]);

      const insertCalls = mockDb.runAsync.mock.calls.filter(
        ([sql]: any[]) => typeof sql === 'string' && sql.includes('INSERT OR IGNORE INTO entries')
      );

      expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);
      expect(insertCalls).toHaveLength(3);
      expect(mockDb.getFirstAsync).toHaveBeenCalledTimes(2);
      expect(result).toEqual(['1', '3']);
    });

    it('列存在时应该恢复 baseUpdatedAt userId deleted 与 conflictedCopyOf', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_json' },
        { name: 'sync_status' },
        { name: 'conflicted_copy_of' },
        { name: 'base_updated_at' },
        { name: 'user_id' },
        { name: 'deleted' },
      ]);
      mockDb.withTransactionAsync.mockImplementation(async (callback: () => Promise<void>) => callback());
      mockDb.getFirstAsync.mockResolvedValueOnce({ changes: 1 });

      await restoreEntries([
        {
          id: 'entry-1',
          type: 'text',
          content: 'restore me',
          timestamp: 1,
          syncStatus: 'conflict-local-copy',
          conflictedCopyOf: 'entry-root',
          baseUpdatedAt: 1700000000000,
          userId: 'user-1',
          deleted: true,
        },
      ]);

      const [sql, params] = mockDb.runAsync.mock.calls[0];
      expect(sql).toContain('conflicted_copy_of');
      expect(sql).toContain('base_updated_at');
      expect(sql).toContain('user_id');
      expect(sql).toContain('deleted');
      expect(params).toContain('entry-root');
      expect(params).toContain(1700000000000);
      expect(params).toContain('user-1');
      expect(params).toContain(1);
    });

    it('恢复记录时应该优先持久化 updatedAt 到 updated_at', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_json' },
        { name: 'sync_status' },
        { name: 'sync_op' },
      ]);
      mockDb.withTransactionAsync.mockImplementation(async (callback: () => Promise<void>) => callback());
      mockDb.getFirstAsync.mockResolvedValueOnce({ changes: 1 });

      await restoreEntries([
        {
          id: 'entry-2',
          type: 'text',
          content: 'restore updatedAt',
          timestamp: 1000,
          editedAt: 2000,
          updatedAt: 3000,
          syncStatus: 'synced',
          syncOp: 'update',
        },
      ]);

      const [, params] = mockDb.runAsync.mock.calls[0];
      expect(params.at(-1)).toBe(3000);
      expect(params.at(-2)).toBe(1000);
    });

    it('没有 media_json 但存在扩展 legacy 媒体列时应恢复 thumbnail 与 metadata', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_thumbnail' },
        { name: 'media_metadata' },
      ]);
      mockDb.withTransactionAsync.mockImplementation(async (callback: () => Promise<void>) => callback());
      mockDb.getFirstAsync.mockResolvedValueOnce({ changes: 1 });

      await restoreEntries([
        {
          id: 'restore-legacy-media-1',
          type: 'photo',
          content: 'restore legacy media',
          timestamp: 1,
          media: [
            {
              uri: 'file:///cache/photo-1.jpg',
              thumbnail: 'file:///cache/thumb-1.jpg',
              mimeType: 'image/jpeg',
              size: 100,
              metadata: {
                createdAt: 1700000000000,
                modifiedAt: 1700000001000,
                width: 1200,
              },
            },
          ],
        },
      ]);

      const [sql, params] = mockDb.runAsync.mock.calls[0];
      expect(sql).toContain('media_thumbnail');
      expect(sql).toContain('media_metadata');
      expect(params[8]).toBe('file:///cache/thumb-1.jpg');
      expect(params[9]).toBe(JSON.stringify({
        createdAt: 1700000000000,
        modifiedAt: 1700000001000,
        width: 1200,
      }));
    });

    it('恢复带 tags 的记录时应继续写入规范化标签关联', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_json' },
      ]);
      mockDb.withTransactionAsync.mockImplementation(async (callback: () => Promise<void>) => callback());
      mockDb.getFirstAsync.mockResolvedValueOnce({ changes: 1 });

      await restoreEntries([
        {
          id: 'tagged-restore-1',
          type: 'text',
          content: 'restore tags',
          timestamp: 1,
          tags: ['恢复', '批量'],
        },
      ]);

      const sqlCalls = mockDb.runAsync.mock.calls.map(([sql, params]) => ({
        sql: sql as string,
        params: params as unknown[],
      }));
      const entryTagInsert = sqlCalls.find(({ sql }) =>
        sql.includes('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id)')
      );

      expect(sqlCalls.some(({ sql }) => sql.includes('DELETE FROM entry_tags'))).toBe(true);
      expect(sqlCalls.some(({ sql }) => sql.includes('INSERT OR IGNORE INTO tags (name) VALUES (?), (?)'))).toBe(true);
      expect(entryTagInsert?.sql).toContain('WHERE name IN (?, ?)');
      expect(entryTagInsert?.params).toEqual(['tagged-restore-1', '恢复', '批量']);
      expect((entryTagInsert?.sql.match(/\?/g) ?? []).length).toBe(entryTagInsert?.params?.length);
    });

    it('恢复重复 tags 时 JSON tags 与规范化表都应使用同一去重顺序', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_json' },
      ]);
      mockDb.withTransactionAsync.mockImplementation(async (callback: () => Promise<void>) => callback());
      mockDb.getFirstAsync.mockResolvedValueOnce({ changes: 1 });

      await restoreEntries([
        {
          id: 'restore-dedupe-tags-1',
          type: 'text',
          content: 'restore dedupe tags',
          timestamp: 1,
          tags: ['恢复', '恢复', '批量'],
        },
      ]);

      const [insertSql, insertParams] = mockDb.runAsync.mock.calls[0];
      const entryTagInsert = mockDb.runAsync.mock.calls
        .map(([sql, params]) => ({ sql: sql as string, params: params as unknown[] }))
        .find(({ sql }) => sql.includes('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id)'));

      expect(insertSql).toContain('INSERT OR IGNORE INTO entries');
      expect(insertParams[4]).toBe(JSON.stringify(['恢复', '批量']));
      expect(entryTagInsert?.params).toEqual(['restore-dedupe-tags-1', '恢复', '批量']);
    });

    it('restoreEntries 应继续使用 INSERT OR IGNORE INTO entries', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_json' },
      ]);
      mockDb.withTransactionAsync.mockImplementation(async (callback: () => Promise<void>) => callback());
      mockDb.getFirstAsync.mockResolvedValueOnce({ changes: 1 });

      await restoreEntries([
        {
          id: 'restore-insert-form-1',
          type: 'text',
          content: 'restore insert form lock',
          timestamp: 1,
        },
      ]);

      const [sql] = mockDb.runAsync.mock.calls[0];
      expect(sql).toContain('INSERT OR IGNORE INTO entries');
      expect(sql).not.toContain('INSERT INTO entries\n');
    });

    it('恢复空 tags 时只应清旧关联而不再写 tags 或 entry_tags', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'tags' },
        { name: 'media_json' },
      ]);
      mockDb.withTransactionAsync.mockImplementation(async (callback: () => Promise<void>) => callback());
      mockDb.getFirstAsync.mockResolvedValueOnce({ changes: 1 });

      await restoreEntries([
        {
          id: 'restore-empty-tags-1',
          type: 'text',
          content: 'restore empty tags',
          timestamp: 1,
          tags: [],
        },
      ]);

      const tagSqlCalls = mockDb.runAsync.mock.calls
        .map(([sql, params]) => ({ sql: sql as string, params: params as unknown[] }))
        .filter(({ sql }) => sql.includes('entry_tags') || sql.includes('INSERT OR IGNORE INTO tags'));

      expect(tagSqlCalls).toEqual([
        {
          sql: 'DELETE FROM entry_tags WHERE entry_id = ?',
          params: ['restore-empty-tags-1'],
        },
      ]);
    });
  });

  // ─── markEntryPendingDelete ────────────────────────────────────────────────

  describe('markEntryPendingDelete', () => {
    it('缺少 sync_op 列时应该只写 pending_delete 而不报错', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'sync_status' },
        { name: 'deleted' },
      ]);

      await markEntryPendingDelete('entry-1');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.not.stringContaining('sync_op = ?'),
        expect.arrayContaining(['pending_delete', 1, 'entry-1'])
      );
    });

    it('应该保留记录并写入 pending_delete delete deleted', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'sync_status' },
        { name: 'sync_op' },
        { name: 'deleted' },
      ]);

      await markEntryPendingDelete('entry-1');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('sync_status = ?'),
        expect.arrayContaining(['pending_delete', 'delete', 1, 'entry-1'])
      );
      expect((mockDb.runAsync.mock.calls[0]?.[0] as string)).not.toContain('DELETE FROM entries');
    });
  });

  describe('getCloudSyncIndicatorSummary', () => {
    it('returns counts for pending, pending_delete, pending_upload, uploading and failed', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'sync_status' },
      ]);
      mockDb.getFirstAsync.mockResolvedValueOnce({
        pending_entries: 1,
        pending_uploads: 1,
        uploading_entries: 1,
        failed_entries: 1,
      });

      const summary = await getCloudSyncIndicatorSummary();

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('SUM(CASE WHEN sync_status IN (\'pending\', \'pending_delete\')'),
      );
      expect(summary).toEqual({
        pendingEntries: 1,
        pendingUploads: 1,
        uploadingEntries: 1,
        failedEntries: 1,
      });
    });

    it('returns zero summary and logs warn when PRAGMA table_info(entries) is empty', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      const summary = await getCloudSyncIndicatorSummary();

      expect(summary).toEqual({
        pendingEntries: 0,
        pendingUploads: 0,
        uploadingEntries: 0,
        failedEntries: 0,
      });
      expect(logger.warn).toHaveBeenCalledWith(
        '[syncQueries] cloud sync indicator degraded: entries table is not ready'
      );
    });

    it('returns zero summary and logs warn when the aggregate query hits no such table: entries', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([
        { name: 'id' },
        { name: 'sync_status' },
      ]);
      mockDb.getFirstAsync.mockRejectedValueOnce(new Error('no such table: entries'));

      const summary = await getCloudSyncIndicatorSummary();

      expect(summary).toEqual({
        pendingEntries: 0,
        pendingUploads: 0,
        uploadingEntries: 0,
        failedEntries: 0,
      });
      expect(logger.warn).toHaveBeenCalledWith(
        '[syncQueries] cloud sync indicator degraded: no such table: entries'
      );
    });
  });

  describe('getLocalSyncOverviewCounts', () => {
    it('存在 deleted 列时应排除逻辑删除记录', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
        { name: 'deleted' },
      ]);
      mockDb.getFirstAsync.mockResolvedValueOnce({
        entry_count: 5,
        photo_count: 2,
        voice_count: 1,
      });

      const counts = await getLocalSyncOverviewCounts();

      const [sql] = mockDb.getFirstAsync.mock.calls[0];
      expect(sql).toContain('COUNT(*) AS entry_count');
      expect(sql).toContain("COALESCE(SUM(CASE WHEN type = 'photo' THEN 1 ELSE 0 END), 0) AS photo_count");
      expect(sql).toContain("COALESCE(SUM(CASE WHEN type = 'voice' THEN 1 ELSE 0 END), 0) AS voice_count");
      expect(sql).toContain('WHERE deleted = 0');
      expect(counts).toEqual({
        entryCount: 5,
        photoCount: 2,
        voiceCount: 1,
      });
    });

    it('不存在 deleted 列时不应附加过滤条件', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { name: 'id' },
        { name: 'type' },
        { name: 'content' },
        { name: 'timestamp' },
      ]);
      mockDb.getFirstAsync.mockResolvedValueOnce({
        entry_count: 3,
        photo_count: 1,
        voice_count: 1,
      });

      const counts = await getLocalSyncOverviewCounts();

      const [sql] = mockDb.getFirstAsync.mock.calls[0];
      expect(sql).not.toContain('WHERE deleted = 0');
      expect(counts).toEqual({
        entryCount: 3,
        photoCount: 1,
        voiceCount: 1,
      });
    });
  });
});
