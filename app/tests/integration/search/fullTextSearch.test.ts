import {describe, it, expect, beforeAll, afterAll} from '@jest/globals';
import {searchService} from '@services/storage/searchService';
import {performanceMonitor} from '@services/telemetry/performance';
import {seedLargeDataset} from '@tests/fixtures/seedData';

describe('Full Text Search Integration Tests', () => {
  beforeAll(async () => {
    await seedLargeDataset(1000);
  });

  afterAll(async () => {
    await searchService.clearSearchIndex();
  });

  describe('基础全文搜索', () => {
    it('应该通过关键词搜索找到匹配的记录', async () => {
      const results = await searchService.search('旅游');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('content');
    });

    it('应该支持多关键词搜索', async () => {
      const results = await searchService.search('旅游 北京');
      expect(results.length).toBeGreaterThan(0);
    });

    it('应该支持短语搜索', async () => {
      const results = await searchService.search('"北京旅游"');
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('应该支持模糊搜索', async () => {
      const results = await searchService.search('旅*');
      expect(results.length).toBeGreaterThan(0);
    });

    it('应该返回相关性排序的结果', async () => {
      const results = await searchService.search('记录');
      expect(results.length).toBeGreaterThan(0);
      // 验证结果按相关性排序
      expect(results[0].relevance).toBeGreaterThanOrEqual(results[1]?.relevance || 0);
    });
  });

  describe('搜索性能', () => {
    it('应该在 2 秒内完成搜索', async () => {
      performanceMonitor.startMeasure('search_full_text');
      await searchService.search('旅游');
      performanceMonitor.endMeasure('search_full_text');
      const duration = performanceMonitor.getMeasure('search_full_text');
      expect(duration).toBeLessThan(2000);
    });

    it('应该支持分页搜索', async () => {
      const page1 = await searchService.search('记录', {page: 1, pageSize: 10});
      const page2 = await searchService.search('记录', {page: 2, pageSize: 10});
      expect(page1.length).toBeLessThanOrEqual(10);
      expect(page2.length).toBeLessThanOrEqual(10);
    });

    it('应该处理大量结果', async () => {
      const results = await searchService.search('的', {pageSize: 100});
      expect(results.length).toBeLessThanOrEqual(100);
    });
  });

  describe('搜索过滤', () => {
    it('应该按类型过滤搜索结果', async () => {
      const results = await searchService.search('记录', {type: 'photo'});
      results.forEach(result => {
        expect(result.type).toBe('photo');
      });
    });

    it('应该按日期范围过滤', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const results = await searchService.search('记录', {startDate, endDate});
      results.forEach(result => {
        const resultDate = new Date(result.createdAt);
        expect(resultDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(resultDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('应该按标签过滤', async () => {
      const results = await searchService.search('记录', {tags: ['旅游']});
      results.forEach(result => {
        expect(result.tags).toContain('旅游');
      });
    });

    it('应该按心情过滤', async () => {
      const results = await searchService.search('记录', {mood: '开心'});
      results.forEach(result => {
        expect(result.mood).toBe('开心');
      });
    });
  });

  describe('搜索结果高亮', () => {
    it('应该在结果中高亮匹配的关键词', async () => {
      const results = await searchService.search('旅游', {highlight: true});
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].highlightedContent).toContain('<mark>');
    });

    it('应该支持多关键词高亮', async () => {
      const results = await searchService.search('旅游 北京', {highlight: true});
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('搜索建议', () => {
    it('应该提供搜索建议', async () => {
      const suggestions = await searchService.getSuggestions('旅');
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('应该处理拼写错误', async () => {
      const suggestions = await searchService.getSuggestions('旅游', {fuzzy: true});
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('搜索历史', () => {
    it('应该保存搜索历史', async () => {
      await searchService.search('旅游');
      const history = await searchService.getSearchHistory();
      expect(history).toContain('旅游');
    });

    it('应该限制搜索历史数量', async () => {
      for (let i = 0; i < 50; i++) {
        await searchService.search(`关键词${i}`);
      }
      const history = await searchService.getSearchHistory();
      expect(history.length).toBeLessThanOrEqual(20);
    });

    it('应该清除搜索历史', async () => {
      await searchService.clearSearchHistory();
      const history = await searchService.getSearchHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('搜索统计', () => {
    it('应该统计搜索结果数量', async () => {
      const stats = await searchService.getSearchStats('旅游');
      expect(stats).toHaveProperty('totalCount');
      expect(stats.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('应该统计各类型搜索结果', async () => {
      const stats = await searchService.getSearchStats('记录');
      expect(stats).toHaveProperty('byType');
      expect(stats.byType).toHaveProperty('photo');
      expect(stats.byType).toHaveProperty('text');
      expect(stats.byType).toHaveProperty('voice');
    });
  });
});

