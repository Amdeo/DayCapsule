import {databaseService} from '@services/storage/database';
import {encryptionService} from '@services/storage/encryption';

/**
 * 文字记录集成测试
 * 测试从文字输入到保存的完整流程
 */
describe('Text Capture Integration Tests', () => {
  beforeAll(async () => {
    // 初始化数据库和加密服务
    await databaseService.init();
    await encryptionService.init();
  });

  afterEach(async () => {
    // 清理测试数据
    jest.clearAllMocks();
  });

  describe('Text Capture Flow', () => {
    it('应该成功保存文字记录到数据库', async () => {
      const testContent = '今天天气真好，去公园散步了一圈。';
      const testTags = ['日常', '散步'];

      const mockTextData = {
        type: 'text',
        content: testContent,
        timestamp: Date.now(),
        tags: testTags,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 保存记录
      const entryId = await databaseService.insertEntry(mockTextData);

      // 验证记录已保存
      expect(entryId).toBeDefined();
      expect(typeof entryId).toBe('string');

      // 验证可以检索记录
      const savedEntry = await databaseService.getEntry(entryId);
      expect(savedEntry).toBeDefined();
      expect(savedEntry?.content).toBe(testContent);
      expect(savedEntry?.type).toBe('text');
    });

    it('应该支持长文本内容', async () => {
      const longContent = '这是一个很长的文本记录。'.repeat(100);

      const mockTextData = {
        type: 'text',
        content: longContent,
        timestamp: Date.now(),
        tags: ['长文本'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await databaseService.insertEntry(mockTextData);
      const savedEntry = await databaseService.getEntry(entryId);

      expect(savedEntry?.content).toBe(longContent);
      expect(savedEntry?.content.length).toBeGreaterThan(1000);
    });

    it('应该支持富文本格式（换行、缩进等）', async () => {
      const richContent = `第一段内容
第二段内容
  缩进的内容
第三段内容`;

      const mockTextData = {
        type: 'text',
        content: richContent,
        timestamp: Date.now(),
        tags: ['富文本'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await databaseService.insertEntry(mockTextData);
      const savedEntry = await databaseService.getEntry(entryId);

      expect(savedEntry?.content).toBe(richContent);
      expect(savedEntry?.content).toContain('\n');
    });

    it('应该支持为文字添加标签', async () => {
      const testContent = '带标签的文字记录';
      const testTags = ['工作', '重要', '待办'];

      const mockTextData = {
        type: 'text',
        content: testContent,
        timestamp: Date.now(),
        tags: testTags,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await databaseService.insertEntry(mockTextData);
      const savedEntry = await databaseService.getEntry(entryId);

      expect(savedEntry?.tags).toEqual(testTags);
    });

    it('应该支持为文字设置心情', async () => {
      const testContent = '今天很开心';
      const testMood = 'happy';

      const mockTextData = {
        type: 'text',
        content: testContent,
        timestamp: Date.now(),
        mood: testMood,
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await databaseService.insertEntry(mockTextData);
      const savedEntry = await databaseService.getEntry(entryId);

      expect(savedEntry?.mood).toBe(testMood);
    });

    it('应该记录文字的地理位置信息', async () => {
      const testContent = '在咖啡馆写的笔记';
      const testLocation = {
        latitude: 39.9042,
        longitude: 116.4074,
        address: '北京市朝阳区某咖啡馆',
      };

      const mockTextData = {
        type: 'text',
        content: testContent,
        timestamp: Date.now(),
        location: {
          latitude: testLocation.latitude,
          longitude: testLocation.longitude,
          address: testLocation.address,
        },
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await databaseService.insertEntry(mockTextData);
      const savedEntry = await databaseService.getEntry(entryId);

      expect(savedEntry?.location?.latitude).toBe(testLocation.latitude);
      expect(savedEntry?.location?.longitude).toBe(testLocation.longitude);
      expect(savedEntry?.location?.address).toBe(testLocation.address);
    });

    it('应该在 2 秒内完成文字保存流程', async () => {
      const startTime = Date.now();

      const mockTextData = {
        type: 'text',
        content: '性能测试文字',
        timestamp: Date.now(),
        tags: ['性能'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await databaseService.insertEntry(mockTextData);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证在 2 秒内完成
      expect(duration).toBeLessThan(2000);
    });

    it('应该支持全文搜索文字内容', async () => {
      const testContent = '这是一个可搜索的文字记录';

      const mockTextData = {
        type: 'text',
        content: testContent,
        timestamp: Date.now(),
        tags: ['搜索'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await databaseService.insertEntry(mockTextData);

      // 搜索记录
      const searchResults = await databaseService.searchEntries('可搜索');
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults.some(e => e.id === entryId)).toBe(true);
    });

    it('应该支持更新已保存的文字记录', async () => {
      const mockTextData = {
        type: 'text',
        content: '原始文字内容',
        timestamp: Date.now(),
        tags: ['原始'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await databaseService.insertEntry(mockTextData);

      // 更新记录
      const updatedData = {
        ...mockTextData,
        id: entryId,
        content: '更新后的文字内容',
        tags: ['更新'],
        updatedAt: Date.now(),
      };

      await databaseService.updateEntry(updatedData);

      // 验证更新
      const savedEntry = await databaseService.getEntry(entryId);
      expect(savedEntry?.content).toBe('更新后的文字内容');
      expect(savedEntry?.tags).toEqual(['更新']);
    });

    it('应该支持删除文字记录', async () => {
      const mockTextData = {
        type: 'text',
        content: '待删除的文字',
        timestamp: Date.now(),
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await databaseService.insertEntry(mockTextData);

      // 删除记录
      await databaseService.deleteEntry(entryId);

      // 验证已删除
      const deletedEntry = await databaseService.getEntry(entryId);
      expect(deletedEntry).toBeNull();
    });

    it('应该支持特殊字符和 emoji', async () => {
      const testContent = '今天很开心 😊 天气很好 ☀️ 去公园散步了 🚶';

      const mockTextData = {
        type: 'text',
        content: testContent,
        timestamp: Date.now(),
        tags: ['emoji'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await databaseService.insertEntry(mockTextData);
      const savedEntry = await databaseService.getEntry(entryId);

      expect(savedEntry?.content).toBe(testContent);
      expect(savedEntry?.content).toContain('😊');
    });

    it('应该支持多语言文本', async () => {
      const testContent = '英文: Hello World\n中文: 你好世界\n日文: こんにちは';

      const mockTextData = {
        type: 'text',
        content: testContent,
        timestamp: Date.now(),
        tags: ['多语言'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await databaseService.insertEntry(mockTextData);
      const savedEntry = await databaseService.getEntry(entryId);

      expect(savedEntry?.content).toBe(testContent);
    });
  });
});

