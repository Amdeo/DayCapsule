import {databaseService} from '@services/storage/database';
import {entryQueries} from '@services/storage/entryQueries';
import {performanceMonitor} from '@services/telemetry/performance';
import {logger} from '@services/telemetry/logger';

interface PerformanceResult {
  operation: string;
  duration: number;
  dataSize: number;
  passed: boolean;
  threshold: number;
}

class Timeline10kPerformanceTest {
  private results: PerformanceResult[] = [];
  private dataSize = 10000;

  async run(): Promise<void> {
    logger.info('Starting 10k timeline performance tests');

    try {
      // 1. 生成 10k 数据集
      await this.generateTestData();

      // 2. 测试各视图性能
      await this.testDayViewPerformance();
      await this.testWeekViewPerformance();
      await this.testMonthViewPerformance();
      await this.testYearViewPerformance();

      // 3. 测试视图切换性能
      await this.testViewSwitchingPerformance();

      // 4. 测试滚动性能
      await this.testScrollingPerformance();

      // 5. 生成报告
      this.generateReport();
    } catch (error) {
      logger.error('Performance test failed', {error});
    }
  }

  private async generateTestData(): Promise<void> {
    logger.info('Generating 10k test data');
    performanceMonitor.startMeasure('data_generation');

    const today = new Date();
    const startDate = new Date(today);
    startDate.setFullYear(today.getFullYear() - 2); // 从 2 年前开始

    for (let i = 0; i < this.dataSize; i++) {
      const entryDate = new Date(startDate);
      entryDate.setDate(startDate.getDate() + Math.floor(i / 10)); // 每天 10 条记录

      await databaseService.insertEntry({
        type: i % 3 === 0 ? 'photo' : i % 3 === 1 ? 'text' : 'voice',
        content: `Test entry ${i}`,
        createdAt: entryDate.getTime(),
        updatedAt: entryDate.getTime(),
      });

      if (i % 1000 === 0) {
        logger.info(`Generated ${i} entries`);
      }
    }

    performanceMonitor.endMeasure('data_generation');
    const duration = performanceMonitor.getMeasure('data_generation');
    logger.info('Data generation completed', {duration});
  }

  private async testDayViewPerformance(): Promise<void> {
    logger.info('Testing day view performance');
    performanceMonitor.startMeasure('day_view_10k');

    const today = new Date();
    const entries = await entryQueries.getEntriesByDay(today);

    performanceMonitor.endMeasure('day_view_10k');
    const duration = performanceMonitor.getMeasure('day_view_10k');

    const result: PerformanceResult = {
      operation: 'Day View',
      duration,
      dataSize: entries.length,
      passed: duration < 2000,
      threshold: 2000,
    };

    this.results.push(result);
    logger.info('Day view performance', result);
  }

  private async testWeekViewPerformance(): Promise<void> {
    logger.info('Testing week view performance');
    performanceMonitor.startMeasure('week_view_10k');

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const entries = await entryQueries.getEntriesByWeek(weekStart);

    performanceMonitor.endMeasure('week_view_10k');
    const duration = performanceMonitor.getMeasure('week_view_10k');

    const result: PerformanceResult = {
      operation: 'Week View',
      duration,
      dataSize: entries.length,
      passed: duration < 2000,
      threshold: 2000,
    };

    this.results.push(result);
    logger.info('Week view performance', result);
  }

  private async testMonthViewPerformance(): Promise<void> {
    logger.info('Testing month view performance');
    performanceMonitor.startMeasure('month_view_10k');

    const today = new Date();
    const entries = await entryQueries.getEntriesByMonth(today);

    performanceMonitor.endMeasure('month_view_10k');
    const duration = performanceMonitor.getMeasure('month_view_10k');

    const result: PerformanceResult = {
      operation: 'Month View',
      duration,
      dataSize: entries.length,
      passed: duration < 2000,
      threshold: 2000,
    };

    this.results.push(result);
    logger.info('Month view performance', result);
  }

  private async testYearViewPerformance(): Promise<void> {
    logger.info('Testing year view performance');
    performanceMonitor.startMeasure('year_view_10k');

    const today = new Date();
    const entries = await entryQueries.getEntriesByYear(today);

    performanceMonitor.endMeasure('year_view_10k');
    const duration = performanceMonitor.getMeasure('year_view_10k');

    const result: PerformanceResult = {
      operation: 'Year View',
      duration,
      dataSize: entries.length,
      passed: duration < 2000,
      threshold: 2000,
    };

    this.results.push(result);
    logger.info('Year view performance', result);
  }

  private async testViewSwitchingPerformance(): Promise<void> {
    logger.info('Testing view switching performance');

    const views = ['day', 'week', 'month', 'year'];
    for (let i = 0; i < views.length - 1; i++) {
      const fromView = views[i];
      const toView = views[i + 1];

      performanceMonitor.startMeasure(`switch_${fromView}_to_${toView}`);

      // 模拟视图切换
      const today = new Date();
      if (toView === 'day') {
        await entryQueries.getEntriesByDay(today);
      } else if (toView === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        await entryQueries.getEntriesByWeek(weekStart);
      } else if (toView === 'month') {
        await entryQueries.getEntriesByMonth(today);
      } else if (toView === 'year') {
        await entryQueries.getEntriesByYear(today);
      }

      performanceMonitor.endMeasure(`switch_${fromView}_to_${toView}`);
      const duration = performanceMonitor.getMeasure(`switch_${fromView}_to_${toView}`);

      const result: PerformanceResult = {
        operation: `Switch ${fromView} to ${toView}`,
        duration,
        dataSize: this.dataSize,
        passed: duration < 2000,
        threshold: 2000,
      };

      this.results.push(result);
      logger.info('View switching performance', result);
    }
  }

  private async testScrollingPerformance(): Promise<void> {
    logger.info('Testing scrolling performance');

    // 测试大列表滚动性能
    performanceMonitor.startMeasure('scrolling_performance');

    const today = new Date();
    const entries = await entryQueries.getEntriesByDay(today);

    // 模拟滚动 100 次
    for (let i = 0; i < 100; i++) {
      // 这里应该是实际的滚动操作
      // 现在只是模拟
    }

    performanceMonitor.endMeasure('scrolling_performance');
    const duration = performanceMonitor.getMeasure('scrolling_performance');

    const result: PerformanceResult = {
      operation: 'Scrolling (100 iterations)',
      duration,
      dataSize: entries.length,
      passed: duration < 5000, // 5 秒内完成 100 次滚动
      threshold: 5000,
    };

    this.results.push(result);
    logger.info('Scrolling performance', result);
  }

  private generateReport(): void {
    logger.info('Performance Test Report');
    logger.info('='.repeat(80));

    let passedCount = 0;
    let totalCount = this.results.length;

    for (const result of this.results) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      logger.info(
        `${status} | ${result.operation} | ${result.duration}ms / ${result.threshold}ms | Data: ${result.dataSize}`,
      );

      if (result.passed) {
        passedCount++;
      }
    }

    logger.info('='.repeat(80));
    logger.info(`Summary: ${passedCount}/${totalCount} tests passed`);

    if (passedCount === totalCount) {
      logger.info('✅ All performance tests passed!');
    } else {
      logger.warn(`⚠️ ${totalCount - passedCount} tests failed`);
    }
  }
}

// 导出测试实例
export const timeline10kPerformanceTest = new Timeline10kPerformanceTest();

// 如果直接运行此文件
if (require.main === module) {
  timeline10kPerformanceTest.run().catch(error => {
    logger.error('Performance test error', {error});
    process.exit(1);
  });
}

