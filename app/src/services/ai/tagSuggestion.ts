/**
 * 标签建议服务
 * 基于历史标签和内容分析提供自动标签建议
 */

import {databaseService} from '@services/storage/database';
import {logger} from '@services/telemetry/logger';

interface TagFrequency {
  tag: string;
  count: number;
  lastUsed: number;
}

class TagSuggestionService {
  private tagCache: Map<string, TagFrequency> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 3600000; // 1 小时

  /**
   * 获取标签建议
   * @param content 内容文本
   * @param limit 返回的建议数量
   */
  async getSuggestions(content: string, limit: number = 5): Promise<string[]> {
    try {
      // 更新缓存
      await this.updateTagCache();

      // 获取基于内容的建议
      const contentBasedTags = this.extractTagsFromContent(content);

      // 获取基于历史的建议
      const historyBasedTags = this.getHistoryBasedTags(limit);

      // 合并并去重
      const allSuggestions = [...new Set([...contentBasedTags, ...historyBasedTags])];

      return allSuggestions.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get tag suggestions', error);
      return [];
    }
  }

  /**
   * 从内容中提取可能的标签
   */
  private extractTagsFromContent(content: string): string[] {
    const suggestions: string[] = [];

    // 关键词匹配
    const keywords: {[key: string]: string[]} = {
      工作: ['工作', '会议', '项目', '代码', '开发', '编程', '任务', '截止'],
      生活: ['生活', '日常', '琐事', '家务', '购物', '做饭', '洗衣'],
      旅行: ['旅行', '旅游', '出游', '景点', '游玩', '度假', '远足', '自驾'],
      美食: ['美食', '吃饭', '餐厅', '菜', '食物', '烹饪', '烘焙', '咖啡'],
      运动: ['运动', '健身', '跑步', '瑜伽', '游泳', '篮球', '足球', '锻炼'],
      学习: ['学习', '读书', '课程', '教程', '笔记', '复习', '考试', '培训'],
      家人: ['家人', '父母', '孩子', '妻子', '丈夫', '兄弟', '姐妹', '亲戚'],
      朋友: ['朋友', '聚会', '聚餐', '聊天', '同学', '同事', '朋友圈'],
      心情: ['开心', '高兴', '难过', '伤心', '生气', '烦恼', '焦虑', '放松'],
      想法: ['想法', '思考', '感悟', '反思', '计划', '目标', '梦想', '愿望'],
    };

    const lowerContent = content.toLowerCase();

    for (const [tag, keywords_list] of Object.entries(keywords)) {
      for (const keyword of keywords_list) {
        if (lowerContent.includes(keyword)) {
          suggestions.push(tag);
          break; // 每个标签只添加一次
        }
      }
    }

    return suggestions;
  }

  /**
   * 获取基于历史使用频率的标签建议
   */
  private getHistoryBasedTags(limit: number): string[] {
    const tags = Array.from(this.tagCache.values())
      .sort((a, b) => {
        // 按使用频率排序，频率相同则按最后使用时间排序
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return b.lastUsed - a.lastUsed;
      })
      .slice(0, limit)
      .map(tf => tf.tag);

    return tags;
  }

  /**
   * 更新标签缓存
   */
  private async updateTagCache(): Promise<void> {
    const now = Date.now();

    // 如果缓存未过期，直接返回
    if (this.cacheExpiry > now) {
      return;
    }

    try {
      // 从数据库获取所有记录
      const entries = await databaseService.getEntries(1000, 0);

      // 统计标签频率
      const tagFrequency: Map<string, TagFrequency> = new Map();

      for (const entry of entries) {
        for (const tag of entry.tags) {
          const existing = tagFrequency.get(tag);
          if (existing) {
            existing.count += 1;
            existing.lastUsed = Math.max(existing.lastUsed, entry.timestamp);
          } else {
            tagFrequency.set(tag, {
              tag,
              count: 1,
              lastUsed: entry.timestamp,
            });
          }
        }
      }

      this.tagCache = tagFrequency;
      this.cacheExpiry = now + this.CACHE_DURATION;

      logger.debug('Tag cache updated', {tagCount: tagFrequency.size});
    } catch (error) {
      logger.error('Failed to update tag cache', error);
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.tagCache.clear();
    this.cacheExpiry = 0;
  }

  /**
   * 获取所有历史标签
   */
  async getAllHistoricalTags(): Promise<string[]> {
    await this.updateTagCache();
    return Array.from(this.tagCache.keys()).sort();
  }
}

export const tagSuggestionService = new TagSuggestionService();
