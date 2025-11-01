import {database} from './database';
import {logger} from '@services/telemetry/logger';

export interface SearchOptions {
  page?: number;
  pageSize?: number;
  type?: string | string[];
  tags?: string[];
  mood?: string | string[];
  startDate?: Date;
  endDate?: Date;
  highlight?: boolean;
  fuzzy?: boolean;
}

export interface SearchResult {
  id: string;
  content: string;
  type: string;
  tags: string[];
  mood?: string;
  location?: string;
  createdAt: number;
  relevance?: number;
  highlightedContent?: string;
}

export interface FilterConfig {
  name: string;
  tags?: string[];
  mood?: string | string[];
  type?: string | string[];
  startDate?: Date;
  endDate?: Date;
}

class SearchService {
  private searchHistory: string[] = [];
  private maxHistorySize = 20;

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      const {page = 1, pageSize = 20, highlight = false} = options;
      const offset = (page - 1) * pageSize;

      // 构建 FTS5 查询
      let sql = `
        SELECT e.id, e.content, e.type, e.tags, e.mood, e.location, e.createdAt,
               rank as relevance
        FROM entries_fts
        WHERE entries_fts MATCH ?
      `;

      const params: any[] = [query];

      // 添加类型过滤
      if (options.type) {
        const types = Array.isArray(options.type) ? options.type : [options.type];
        sql += ` AND type IN (${types.map(() => '?').join(',')})`;
        params.push(...types);
      }

      // 添加日期范围过滤
      if (options.startDate || options.endDate) {
        if (options.startDate) {
          sql += ` AND createdAt >= ?`;
          params.push(options.startDate.getTime());
        }
        if (options.endDate) {
          sql += ` AND createdAt <= ?`;
          params.push(options.endDate.getTime());
        }
      }

      sql += ` ORDER BY rank DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, offset);

      const results = await database.executeSql(sql, params);
      let searchResults: SearchResult[] = [];

      for (const row of results.rows.raw()) {
        const result: SearchResult = {
          id: row.id,
          content: row.content,
          type: row.type,
          tags: JSON.parse(row.tags || '[]'),
          mood: row.mood,
          location: row.location,
          createdAt: row.createdAt,
          relevance: row.relevance,
        };

        // 应用标签和心情过滤
        if (options.tags && !options.tags.some(tag => result.tags.includes(tag))) {
          continue;
        }
        if (options.mood) {
          const moods = Array.isArray(options.mood) ? options.mood : [options.mood];
          if (!moods.includes(result.mood)) {
            continue;
          }
        }

        // 高亮处理
        if (highlight) {
          result.highlightedContent = this.highlightMatches(result.content, query);
        }

        searchResults.push(result);
      }

      // 保存搜索历史
      this.addToSearchHistory(query);

      logger.info('Search completed', {query, resultCount: searchResults.length});
      return searchResults;
    } catch (error) {
      logger.error('Search failed', {error, query});
      throw error;
    }
  }

  async filterByTags(tags: string[], logic: 'OR' | 'AND' = 'OR'): Promise<SearchResult[]> {
    try {
      const sql = `
        SELECT * FROM entries
        WHERE ${logic === 'AND' ? tags.map(() => "tags LIKE ?").join(' AND ') : tags.map(() => "tags LIKE ?").join(' OR ')}
      `;
      const params = tags.map(tag => `%"${tag}"%`);

      const results = await database.executeSql(sql, params);
      return results.rows.raw().map(row => ({
        id: row.id,
        content: row.content,
        type: row.type,
        tags: JSON.parse(row.tags || '[]'),
        mood: row.mood,
        location: row.location,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      logger.error('Filter by tags failed', {error});
      throw error;
    }
  }

  async filterByMood(mood: string | string[]): Promise<SearchResult[]> {
    try {
      const moods = Array.isArray(mood) ? mood : [mood];
      const sql = `
        SELECT * FROM entries
        WHERE mood IN (${moods.map(() => '?').join(',')})
      `;
      const results = await database.executeSql(sql, moods);
      return results.rows.raw().map(row => ({
        id: row.id,
        content: row.content,
        type: row.type,
        tags: JSON.parse(row.tags || '[]'),
        mood: row.mood,
        location: row.location,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      logger.error('Filter by mood failed', {error});
      throw error;
    }
  }

  async filterByDateRange(
    startDate: Date | string,
    endDate?: Date,
  ): Promise<SearchResult[]> {
    try {
      let start: number;
      let end: number;

      if (typeof startDate === 'string') {
        const today = new Date();
        switch (startDate) {
          case 'today':
            start = new Date(today.setHours(0, 0, 0, 0)).getTime();
            end = new Date(today.setHours(23, 59, 59, 999)).getTime();
            break;
          case 'thisWeek':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            start = weekStart.getTime();
            end = today.getTime();
            break;
          case 'thisMonth':
            start = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
            end = today.getTime();
            break;
          default:
            throw new Error('Invalid date range');
        }
      } else {
        start = startDate.getTime();
        end = endDate?.getTime() || Date.now();
      }

      const sql = `
        SELECT * FROM entries
        WHERE createdAt BETWEEN ? AND ?
        ORDER BY createdAt DESC
      `;
      const results = await database.executeSql(sql, [start, end]);
      return results.rows.raw().map(row => ({
        id: row.id,
        content: row.content,
        type: row.type,
        tags: JSON.parse(row.tags || '[]'),
        mood: row.mood,
        location: row.location,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      logger.error('Filter by date range failed', {error});
      throw error;
    }
  }

  async filterByLocation(location: string): Promise<SearchResult[]> {
    try {
      const sql = `SELECT * FROM entries WHERE location LIKE ?`;
      const results = await database.executeSql(sql, [`%${location}%`]);
      return results.rows.raw().map(row => ({
        id: row.id,
        content: row.content,
        type: row.type,
        tags: JSON.parse(row.tags || '[]'),
        mood: row.mood,
        location: row.location,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      logger.error('Filter by location failed', {error});
      throw error;
    }
  }

  async filterByLocationRadius(config: {
    latitude: number;
    longitude: number;
    radius: number;
  }): Promise<SearchResult[]> {
    try {
      const sql = `
        SELECT * FROM entries
        WHERE (
          6371 * acos(
            cos(radians(?)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(?)) +
            sin(radians(?)) * sin(radians(latitude))
          )
        ) <= ?
      `;
      const results = await database.executeSql(sql, [
        config.latitude,
        config.longitude,
        config.latitude,
        config.radius,
      ]);
      return results.rows.raw().map(row => ({
        id: row.id,
        content: row.content,
        type: row.type,
        tags: JSON.parse(row.tags || '[]'),
        mood: row.mood,
        location: row.location,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      logger.error('Filter by location radius failed', {error});
      throw error;
    }
  }

  async filterByType(type: string | string[]): Promise<SearchResult[]> {
    try {
      const types = Array.isArray(type) ? type : [type];
      const sql = `
        SELECT * FROM entries
        WHERE type IN (${types.map(() => '?').join(',')})
      `;
      const results = await database.executeSql(sql, types);
      return results.rows.raw().map(row => ({
        id: row.id,
        content: row.content,
        type: row.type,
        tags: JSON.parse(row.tags || '[]'),
        mood: row.mood,
        location: row.location,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      logger.error('Filter by type failed', {error});
      throw error;
    }
  }

  async getSuggestions(query: string, options: {fuzzy?: boolean} = {}): Promise<string[]> {
    try {
      const suggestions: Set<string> = new Set();

      // 从搜索历史中获取建议
      this.searchHistory.forEach(item => {
        if (item.includes(query)) {
          suggestions.add(item);
        }
      });

      // 从标签中获取建议
      const tags = await this.getAvailableTags();
      tags.forEach(tag => {
        if (tag.includes(query)) {
          suggestions.add(tag);
        }
      });

      return Array.from(suggestions).slice(0, 10);
    } catch (error) {
      logger.error('Get suggestions failed', {error});
      return [];
    }
  }

  async getAvailableTags(): Promise<string[]> {
    try {
      const sql = `SELECT DISTINCT tags FROM entries`;
      const results = await database.executeSql(sql, []);
      const tags: Set<string> = new Set();
      results.rows.raw().forEach(row => {
        const parsedTags = JSON.parse(row.tags || '[]');
        parsedTags.forEach((tag: string) => tags.add(tag));
      });
      return Array.from(tags);
    } catch (error) {
      logger.error('Get available tags failed', {error});
      return [];
    }
  }

  async getAvailableMoods(): Promise<string[]> {
    try {
      const sql = `SELECT DISTINCT mood FROM entries WHERE mood IS NOT NULL`;
      const results = await database.executeSql(sql, []);
      return results.rows.raw().map(row => row.mood);
    } catch (error) {
      logger.error('Get available moods failed', {error});
      return [];
    }
  }

  async getAvailableLocations(): Promise<string[]> {
    try {
      const sql = `SELECT DISTINCT location FROM entries WHERE location IS NOT NULL`;
      const results = await database.executeSql(sql, []);
      return results.rows.raw().map(row => row.location);
    } catch (error) {
      logger.error('Get available locations failed', {error});
      return [];
    }
  }

  async getTagStats(): Promise<Array<{tag: string; count: number}>> {
    try {
      const tags = await this.getAvailableTags();
      const stats = [];
      for (const tag of tags) {
        const results = await this.filterByTags([tag]);
        stats.push({tag, count: results.length});
      }
      return stats.sort((a, b) => b.count - a.count);
    } catch (error) {
      logger.error('Get tag stats failed', {error});
      return [];
    }
  }

  async getMoodStats(): Promise<Array<{mood: string; count: number}>> {
    try {
      const moods = await this.getAvailableMoods();
      const stats = [];
      for (const mood of moods) {
        const results = await this.filterByMood(mood);
        stats.push({mood, count: results.length});
      }
      return stats.sort((a, b) => b.count - a.count);
    } catch (error) {
      logger.error('Get mood stats failed', {error});
      return [];
    }
  }

  async getTypeStats(): Promise<{[key: string]: number}> {
    try {
      const sql = `SELECT type, COUNT(*) as count FROM entries GROUP BY type`;
      const results = await database.executeSql(sql, []);
      const stats: {[key: string]: number} = {};
      results.rows.raw().forEach(row => {
        stats[row.type] = row.count;
      });
      return stats;
    } catch (error) {
      logger.error('Get type stats failed', {error});
      return {};
    }
  }

  async getSearchStats(query: string): Promise<{totalCount: number; byType: any}> {
    try {
      const results = await this.search(query);
      const byType = {};
      results.forEach(result => {
        byType[result.type] = (byType[result.type] || 0) + 1;
      });
      return {totalCount: results.length, byType};
    } catch (error) {
      logger.error('Get search stats failed', {error});
      return {totalCount: 0, byType: {}};
    }
  }

  async getSearchHistory(): Promise<string[]> {
    return this.searchHistory;
  }

  async clearSearchHistory(): Promise<void> {
    this.searchHistory = [];
  }

  async clearSearchIndex(): Promise<void> {
    try {
      await database.executeSql(`DELETE FROM entries_fts`, []);
      logger.info('Search index cleared');
    } catch (error) {
      logger.error('Clear search index failed', {error});
    }
  }

  async saveFilter(config: FilterConfig): Promise<string> {
    try {
      const filterId = `filter_${Date.now()}`;
      // 实现保存筛选条件的逻辑
      logger.info('Filter saved', {filterId});
      return filterId;
    } catch (error) {
      logger.error('Save filter failed', {error});
      throw error;
    }
  }

  async loadFilter(filterId: string): Promise<FilterConfig> {
    try {
      // 实现加载筛选条件的逻辑
      return {name: 'Loaded Filter'};
    } catch (error) {
      logger.error('Load filter failed', {error});
      throw error;
    }
  }

  private highlightMatches(content: string, query: string): string {
    const regex = new RegExp(`(${query})`, 'gi');
    return content.replace(regex, '<mark>$1</mark>');
  }

  private addToSearchHistory(query: string): void {
    this.searchHistory = this.searchHistory.filter(item => item !== query);
    this.searchHistory.unshift(query);
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory.pop();
    }
  }
}

export const searchService = new SearchService();

