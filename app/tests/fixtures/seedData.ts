import {databaseService} from '@services/storage/database';
import {logger} from '@services/telemetry/logger';

export interface SeedDataOptions {
  count?: number;
  startDate?: Date;
  endDate?: Date;
  types?: string[];
  moods?: string[];
  tags?: string[];
}

const DEFAULT_TYPES = ['photo', 'text', 'voice'];
const DEFAULT_MOODS = ['happy', 'excited', 'calm', 'tired', 'sad'];
const DEFAULT_TAGS = [
  'work',
  'life',
  'travel',
  'food',
  'family',
  'friends',
  'hobby',
  'health',
  'learning',
  'achievement',
];

const SAMPLE_CONTENTS = [
  '今天天气真好，出去散步了一圈',
  '完成了一个重要的项目',
  '和朋友一起吃饭，很开心',
  '学习了新的技能',
  '健身房锻炼，感觉很充实',
  '看了一部不错的电影',
  '旅游到了一个新的地方',
  '家人聚在一起，很温暖',
  '工作中遇到了一些挑战',
  '今天的收获很大',
];

class SeedDataGenerator {
  async generateTestData(options: SeedDataOptions = {}): Promise<number> {
    const {
      count = 10000,
      startDate = new Date(new Date().getFullYear() - 2, 0, 1),
      endDate = new Date(),
      types = DEFAULT_TYPES,
      moods = DEFAULT_MOODS,
      tags = DEFAULT_TAGS,
    } = options;

    logger.info('Starting seed data generation', {count, startDate, endDate});

    try {
      let createdCount = 0;
      const totalDays = Math.floor(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      for (let i = 0; i < count; i++) {
        // 随机选择日期
        const randomDays = Math.floor(Math.random() * totalDays);
        const entryDate = new Date(startDate);
        entryDate.setDate(startDate.getDate() + randomDays);

        // 随机选择时间
        const randomHours = Math.floor(Math.random() * 24);
        const randomMinutes = Math.floor(Math.random() * 60);
        entryDate.setHours(randomHours, randomMinutes, 0, 0);

        // 随机选择类型
        const type = types[Math.floor(Math.random() * types.length)];

        // 随机选择心情
        const mood = moods[Math.floor(Math.random() * moods.length)];

        // 随机选择标签
        const selectedTags = [];
        for (let j = 0; j < Math.floor(Math.random() * 3) + 1; j++) {
          const tag = tags[Math.floor(Math.random() * tags.length)];
          if (!selectedTags.includes(tag)) {
            selectedTags.push(tag);
          }
        }

        // 随机选择内容
        const content = SAMPLE_CONTENTS[Math.floor(Math.random() * SAMPLE_CONTENTS.length)];

        // 创建条目
        const entryId = await databaseService.insertEntry({
          type,
          content,
          createdAt: entryDate.getTime(),
          updatedAt: entryDate.getTime(),
          mood,
          tags: selectedTags,
        });

        if (entryId) {
          createdCount++;

          if (createdCount % 1000 === 0) {
            logger.info(`Generated ${createdCount} entries`);
          }
        }
      }

      logger.info('Seed data generation completed', {
        createdCount,
        totalRequested: count,
      });

      return createdCount;
    } catch (error) {
      logger.error('Failed to generate seed data', {error});
      throw error;
    }
  }

  async generateSmallDataset(): Promise<number> {
    return this.generateTestData({count: 100});
  }

  async generateMediumDataset(): Promise<number> {
    return this.generateTestData({count: 1000});
  }

  async generateLargeDataset(): Promise<number> {
    return this.generateTestData({count: 10000});
  }

  async generateCustomDataset(count: number): Promise<number> {
    return this.generateTestData({count});
  }

  async clearAllData(): Promise<void> {
    try {
      await databaseService.clearTestData();
      logger.info('All test data cleared');
    } catch (error) {
      logger.error('Failed to clear test data', {error});
      throw error;
    }
  }

  async getDatasetStats(): Promise<{
    totalEntries: number;
    byType: Record<string, number>;
    byMood: Record<string, number>;
    dateRange: {start: Date; end: Date};
  }> {
    try {
      // 这需要从数据库查询
      // 这里只是示例结构
      return {
        totalEntries: 0,
        byType: {},
        byMood: {},
        dateRange: {
          start: new Date(),
          end: new Date(),
        },
      };
    } catch (error) {
      logger.error('Failed to get dataset stats', {error});
      throw error;
    }
  }
}

export const seedDataGenerator = new SeedDataGenerator();

// 导出便利函数
export async function seedSmallDataset(): Promise<number> {
  return seedDataGenerator.generateSmallDataset();
}

export async function seedMediumDataset(): Promise<number> {
  return seedDataGenerator.generateMediumDataset();
}

export async function seedLargeDataset(): Promise<number> {
  return seedDataGenerator.generateLargeDataset();
}

export async function seedCustomDataset(count: number): Promise<number> {
  return seedDataGenerator.generateCustomDataset(count);
}

export async function clearSeedData(): Promise<void> {
  return seedDataGenerator.clearAllData();
}

