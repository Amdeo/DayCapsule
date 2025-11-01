import {describe, it, expect, beforeAll, afterAll} from '@jest/globals';
import {searchService} from '@services/storage/searchService';
import {performanceMonitor} from '@services/telemetry/performance';
import {seedLargeDataset} from '@tests/fixtures/seedData';

describe('Search Filters Integration Tests', () => {
  beforeAll(async () => {
    await seedLargeDataset(1000);
  });

  afterAll(async () => {
    await searchService.clearSearchIndex();
  });

  describe('标签筛选', () => {
    it('应该按单个标签筛选', async () => {
      const results = await searchService.filterByTags(['旅游']);
      results.forEach(result => {
        expect(result.tags).toContain('旅游');
      });
    });

    it('应该按多个标签筛选（OR 逻辑）', async () => {
      const results = await searchService.filterByTags(['旅游', '美食']);
      results.forEach(result => {
        expect(
          result.tags.includes('旅游') || result.tags.includes('美食'),
        ).toBe(true);
      });
    });

    it('应该支持标签交集筛选', async () => {
      const results = await searchService.filterByTags(['旅游', '美食'], 'AND');
      results.forEach(result => {
        expect(result.tags).toContain('旅游');
        expect(result.tags).toContain('美食');
      });
    });

    it('应该获取所有可用标签', async () => {
      const tags = await searchService.getAvailableTags();
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
    });

    it('应该统计标签使用频率', async () => {
      const tagStats = await searchService.getTagStats();
      expect(tagStats.length).toBeGreaterThan(0);
      expect(tagStats[0]).toHaveProperty('tag');
      expect(tagStats[0]).toHaveProperty('count');
    });
  });

  describe('心情筛选', () => {
    it('应该按心情筛选', async () => {
      const results = await searchService.filterByMood('开心');
      results.forEach(result => {
        expect(result.mood).toBe('开心');
      });
    });

    it('应该按多个心情筛选', async () => {
      const results = await searchService.filterByMood(['开心', '平静']);
      results.forEach(result => {
        expect(['开心', '平静']).toContain(result.mood);
      });
    });

    it('应该获取所有可用心情', async () => {
      const moods = await searchService.getAvailableMoods();
      expect(Array.isArray(moods)).toBe(true);
      expect(moods.length).toBeGreaterThan(0);
    });

    it('应该统计心情分布', async () => {
      const moodStats = await searchService.getMoodStats();
      expect(moodStats.length).toBeGreaterThan(0);
      expect(moodStats[0]).toHaveProperty('mood');
      expect(moodStats[0]).toHaveProperty('count');
    });
  });

  describe('日期范围筛选', () => {
    it('应该按日期范围筛选', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const results = await searchService.filterByDateRange(startDate, endDate);
      results.forEach(result => {
        const resultDate = new Date(result.createdAt);
        expect(resultDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(resultDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('应该支持快速日期范围（今天、本周、本月）', async () => {
      const today = await searchService.filterByDateRange('today');
      const thisWeek = await searchService.filterByDateRange('thisWeek');
      const thisMonth = await searchService.filterByDateRange('thisMonth');

      expect(Array.isArray(today)).toBe(true);
      expect(Array.isArray(thisWeek)).toBe(true);
      expect(Array.isArray(thisMonth)).toBe(true);
    });
  });

  describe('地点筛选', () => {
    it('应该按地点筛选', async () => {
      const results = await searchService.filterByLocation('北京');
      results.forEach(result => {
        expect(result.location).toContain('北京');
      });
    });

    it('应该按地理位置范围筛选', async () => {
      const results = await searchService.filterByLocationRadius({
        latitude: 39.9042,
        longitude: 116.4074,
        radius: 10, // 10km
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it('应该获取所有可用地点', async () => {
      const locations = await searchService.getAvailableLocations();
      expect(Array.isArray(locations)).toBe(true);
    });
  });

  describe('类型筛选', () => {
    it('应该按类型筛选', async () => {
      const results = await searchService.filterByType('photo');
      results.forEach(result => {
        expect(result.type).toBe('photo');
      });
    });

    it('应该按多个类型筛选', async () => {
      const results = await searchService.filterByType(['photo', 'text']);
      results.forEach(result => {
        expect(['photo', 'text']).toContain(result.type);
      });
    });

    it('应该统计各类型数量', async () => {
      const typeStats = await searchService.getTypeStats();
      expect(typeStats).toHaveProperty('photo');
      expect(typeStats).toHaveProperty('text');
      expect(typeStats).toHaveProperty('voice');
    });
  });

  describe('组合筛选', () => {
    it('应该支持多条件组合筛选', async () => {
      const results = await searchService.search('旅游', {
        tags: ['旅游'],
        mood: '开心',
        type: 'photo',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it('应该在 2 秒内完成组合筛选', async () => {
      performanceMonitor.startMeasure('combined_filter');
      await searchService.search('记录', {
        tags: ['旅游', '美食'],
        mood: '开心',
        type: 'photo',
      });
      performanceMonitor.endMeasure('combined_filter');
      const duration = performanceMonitor.getMeasure('combined_filter');
      expect(duration).toBeLessThan(2000);
    });

    it('应该支持筛选条件保存', async () => {
      const filterId = await searchService.saveFilter({
        name: '我的旅游记录',
        tags: ['旅游'],
        mood: '开心',
        type: 'photo',
      });
      expect(filterId).toBeDefined();
    });

    it('应该支持筛选条件加载', async () => {
      const filterId = await searchService.saveFilter({
        name: '我的旅游记录',
        tags: ['旅游'],
      });
      const filter = await searchService.loadFilter(filterId);
      expect(filter.name).toBe('我的旅游记录');
      expect(filter.tags).toContain('旅游');
    });
  });

  describe('筛选性能', () => {
    it('应该快速返回筛选结果', async () => {
      performanceMonitor.startMeasure('filter_performance');
      await searchService.filterByTags(['旅游']);
      performanceMonitor.endMeasure('filter_performance');
      const duration = performanceMonitor.getMeasure('filter_performance');
      expect(duration).toBeLessThan(1000);
    });

    it('应该支持大量筛选条件', async () => {
      const tags = Array.from({length: 50}, (_, i) => `tag${i}`);
      const results = await searchService.filterByTags(tags);
      expect(Array.isArray(results)).toBe(true);
    });
  });
});

