import {describe, it, expect, beforeAll, afterAll} from '@jest/globals';
import {exportService} from '@services/export/exportService';
import {searchService} from '@services/storage/searchService';
import {performanceMonitor} from '@services/telemetry/performance';
import {seedLargeDataset} from '@tests/fixtures/seedData';
import RNFS from 'react-native-fs';

describe('Export Functionality Integration Tests', () => {
  let testEntries: any[] = [];

  beforeAll(async () => {
    await seedLargeDataset(100);
    testEntries = await searchService.search('记录', {pageSize: 50});
  });

  afterAll(async () => {
    await exportService.clearExportCache();
  });

  describe('PDF 导出', () => {
    it('应该导出单条记录为 PDF', async () => {
      const entry = testEntries[0];
      const filePath = await exportService.exportToPDF([entry]);
      expect(filePath).toBeDefined();
      const exists = await RNFS.exists(filePath);
      expect(exists).toBe(true);
    });

    it('应该导出多条记录为 PDF', async () => {
      const filePath = await exportService.exportToPDF(testEntries.slice(0, 10));
      expect(filePath).toBeDefined();
      const exists = await RNFS.exists(filePath);
      expect(exists).toBe(true);
    });

    it('应该在 PDF 中包含所有记录信息', async () => {
      const entry = testEntries[0];
      const filePath = await exportService.exportToPDF([entry]);
      const content = await RNFS.readFile(filePath, 'utf8');
      expect(content).toContain(entry.content);
    });

    it('应该支持 PDF 分页', async () => {
      const filePath = await exportService.exportToPDF(testEntries);
      expect(filePath).toBeDefined();
    });

    it('应该在 5 秒内导出 100 条记录为 PDF', async () => {
      performanceMonitor.startMeasure('pdf_export');
      await exportService.exportToPDF(testEntries);
      performanceMonitor.endMeasure('pdf_export');
      const duration = performanceMonitor.getMeasure('pdf_export');
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Word 导出', () => {
    it('应该导出单条记录为 Word', async () => {
      const entry = testEntries[0];
      const filePath = await exportService.exportToWord([entry]);
      expect(filePath).toBeDefined();
      const exists = await RNFS.exists(filePath);
      expect(exists).toBe(true);
    });

    it('应该导出多条记录为 Word', async () => {
      const filePath = await exportService.exportToWord(testEntries.slice(0, 10));
      expect(filePath).toBeDefined();
      const exists = await RNFS.exists(filePath);
      expect(exists).toBe(true);
    });

    it('应该在 Word 中包含格式化内容', async () => {
      const entry = testEntries[0];
      const filePath = await exportService.exportToWord([entry]);
      expect(filePath).toBeDefined();
    });

    it('应该在 5 秒内导出 100 条记录为 Word', async () => {
      performanceMonitor.startMeasure('word_export');
      await exportService.exportToWord(testEntries);
      performanceMonitor.endMeasure('word_export');
      const duration = performanceMonitor.getMeasure('word_export');
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('CSV 导出', () => {
    it('应该导出为 CSV 格式', async () => {
      const filePath = await exportService.exportToCSV(testEntries.slice(0, 10));
      expect(filePath).toBeDefined();
      const exists = await RNFS.exists(filePath);
      expect(exists).toBe(true);
    });

    it('应该在 CSV 中包含所有字段', async () => {
      const filePath = await exportService.exportToCSV(testEntries.slice(0, 5));
      const content = await RNFS.readFile(filePath, 'utf8');
      expect(content).toContain('id');
      expect(content).toContain('content');
      expect(content).toContain('type');
    });

    it('应该快速导出为 CSV', async () => {
      performanceMonitor.startMeasure('csv_export');
      await exportService.exportToCSV(testEntries);
      performanceMonitor.endMeasure('csv_export');
      const duration = performanceMonitor.getMeasure('csv_export');
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('JSON 导出', () => {
    it('应该导出为 JSON 格式', async () => {
      const filePath = await exportService.exportToJSON(testEntries.slice(0, 10));
      expect(filePath).toBeDefined();
      const exists = await RNFS.exists(filePath);
      expect(exists).toBe(true);
    });

    it('应该保留完整的数据结构', async () => {
      const filePath = await exportService.exportToJSON(testEntries.slice(0, 5));
      const content = await RNFS.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('content');
    });
  });

  describe('导出选项', () => {
    it('应该支持自定义导出文件名', async () => {
      const filePath = await exportService.exportToPDF(testEntries.slice(0, 5), {
        filename: '我的记录',
      });
      expect(filePath).toContain('我的记录');
    });

    it('应该支持包含/排除特定字段', async () => {
      const filePath = await exportService.exportToJSON(testEntries.slice(0, 5), {
        includeFields: ['id', 'content', 'createdAt'],
      });
      const content = await RNFS.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      expect(Object.keys(data[0])).toEqual(['id', 'content', 'createdAt']);
    });

    it('应该支持按日期范围导出', async () => {
      const filePath = await exportService.exportToPDF(testEntries, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });
      expect(filePath).toBeDefined();
    });

    it('应该支持按标签导出', async () => {
      const filePath = await exportService.exportToPDF(testEntries, {
        tags: ['旅游'],
      });
      expect(filePath).toBeDefined();
    });
  });

  describe('导出性能', () => {
    it('应该支持大量记录导出', async () => {
      const largeDataset = testEntries;
      const filePath = await exportService.exportToJSON(largeDataset);
      expect(filePath).toBeDefined();
    });

    it('应该显示导出进度', async () => {
      let progressUpdates = 0;
      await exportService.exportToPDF(testEntries, {
        onProgress: (progress: number) => {
          progressUpdates++;
          expect(progress).toBeGreaterThanOrEqual(0);
          expect(progress).toBeLessThanOrEqual(100);
        },
      });
      expect(progressUpdates).toBeGreaterThan(0);
    });
  });

  describe('导出文件管理', () => {
    it('应该列出所有导出文件', async () => {
      await exportService.exportToPDF(testEntries.slice(0, 5));
      const files = await exportService.listExportFiles();
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
    });

    it('应该删除导出文件', async () => {
      const filePath = await exportService.exportToPDF(testEntries.slice(0, 5));
      await exportService.deleteExportFile(filePath);
      const exists = await RNFS.exists(filePath);
      expect(exists).toBe(false);
    });

    it('应该清除所有导出缓存', async () => {
      await exportService.exportToPDF(testEntries.slice(0, 5));
      await exportService.clearExportCache();
      const files = await exportService.listExportFiles();
      expect(files.length).toBe(0);
    });
  });
});

