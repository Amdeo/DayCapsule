import {logger} from '@services/telemetry/logger';
import {database} from '@services/storage/database';

export interface SemanticSearchResult {
  id: string;
  content: string;
  type: string;
  similarity: number;
  tags: string[];
  createdAt: number;
}

export interface VectorEmbedding {
  id: string;
  vector: number[];
  content: string;
}

class SemanticSearchService {
  private vectorCache: Map<string, number[]> = new Map();
  private embeddingDimension = 384; // 本地向量维度

  /**
   * 生成文本的向量表示（本地实现）
   * 使用简单的 TF-IDF 和词频统计
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // 检查缓存
      const cacheKey = this.hashText(text);
      if (this.vectorCache.has(cacheKey)) {
        return this.vectorCache.get(cacheKey)!;
      }

      // 分词
      const tokens = this.tokenize(text);
      const vector = this.computeVector(tokens);

      // 缓存向量
      this.vectorCache.set(cacheKey, vector);

      return vector;
    } catch (error) {
      logger.error('Generate embedding failed', {error});
      throw error;
    }
  }

  /**
   * 语义搜索
   */
  async semanticSearch(query: string, topK: number = 10): Promise<SemanticSearchResult[]> {
    try {
      // 生成查询向量
      const queryVector = await this.generateEmbedding(query);

      // 获取所有记录
      const sql = `SELECT id, content, type, tags, createdAt FROM entries`;
      const results = await database.executeSql(sql, []);

      const similarities: Array<{
        id: string;
        content: string;
        type: string;
        tags: string[];
        createdAt: number;
        similarity: number;
      }> = [];

      // 计算相似度
      for (const row of results.rows.raw()) {
        const contentVector = await this.generateEmbedding(row.content);
        const similarity = this.cosineSimilarity(queryVector, contentVector);

        similarities.push({
          id: row.id,
          content: row.content,
          type: row.type,
          tags: JSON.parse(row.tags || '[]'),
          createdAt: row.createdAt,
          similarity,
        });
      }

      // 按相似度排序并返回 topK
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK)
        .map(item => ({
          id: item.id,
          content: item.content,
          type: item.type,
          similarity: item.similarity,
          tags: item.tags,
          createdAt: item.createdAt,
        }));
    } catch (error) {
      logger.error('Semantic search failed', {error});
      throw error;
    }
  }

  /**
   * 混合搜索（全文 + 语义）
   */
  async hybridSearch(
    query: string,
    options: {
      fullTextWeight?: number;
      semanticWeight?: number;
      topK?: number;
    } = {},
  ): Promise<SemanticSearchResult[]> {
    try {
      const {fullTextWeight = 0.5, semanticWeight = 0.5, topK = 10} = options;

      // 全文搜索
      const fullTextResults = await this.fullTextSearch(query, topK * 2);

      // 语义搜索
      const semanticResults = await this.semanticSearch(query, topK * 2);

      // 合并结果
      const resultMap = new Map<string, SemanticSearchResult>();

      fullTextResults.forEach(result => {
        resultMap.set(result.id, {
          ...result,
          similarity: (result.similarity || 0) * fullTextWeight,
        });
      });

      semanticResults.forEach(result => {
        if (resultMap.has(result.id)) {
          const existing = resultMap.get(result.id)!;
          existing.similarity += result.similarity * semanticWeight;
        } else {
          resultMap.set(result.id, {
            ...result,
            similarity: result.similarity * semanticWeight,
          });
        }
      });

      // 排序并返回
      return Array.from(resultMap.values())
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
    } catch (error) {
      logger.error('Hybrid search failed', {error});
      throw error;
    }
  }

  /**
   * 相似记录推荐
   */
  async findSimilarEntries(entryId: string, topK: number = 5): Promise<SemanticSearchResult[]> {
    try {
      // 获取目标记录
      const sql = `SELECT content FROM entries WHERE id = ?`;
      const results = await database.executeSql(sql, [entryId]);

      if (results.rows.length === 0) {
        return [];
      }

      const targetContent = results.rows.item(0).content;

      // 语义搜索
      const similarEntries = await this.semanticSearch(targetContent, topK + 1);

      // 排除自己
      return similarEntries.filter(entry => entry.id !== entryId).slice(0, topK);
    } catch (error) {
      logger.error('Find similar entries failed', {error});
      throw error;
    }
  }

  /**
   * 聚类相似记录
   */
  async clusterSimilarEntries(threshold: number = 0.7): Promise<Array<string[]>> {
    try {
      const sql = `SELECT id, content FROM entries`;
      const results = await database.executeSql(sql, []);

      const entries = results.rows.raw();
      const clusters: Array<string[]> = [];
      const visited = new Set<string>();

      for (const entry of entries) {
        if (visited.has(entry.id)) {
          continue;
        }

        const cluster = [entry.id];
        visited.add(entry.id);

        const entryVector = await this.generateEmbedding(entry.content);

        for (const otherEntry of entries) {
          if (visited.has(otherEntry.id)) {
            continue;
          }

          const otherVector = await this.generateEmbedding(otherEntry.content);
          const similarity = this.cosineSimilarity(entryVector, otherVector);

          if (similarity >= threshold) {
            cluster.push(otherEntry.id);
            visited.add(otherEntry.id);
          }
        }

        if (cluster.length > 1) {
          clusters.push(cluster);
        }
      }

      return clusters;
    } catch (error) {
      logger.error('Cluster similar entries failed', {error});
      throw error;
    }
  }

  /**
   * 获取记录的语义标签
   */
  async generateSemanticTags(entryId: string): Promise<string[]> {
    try {
      const sql = `SELECT content FROM entries WHERE id = ?`;
      const results = await database.executeSql(sql, [entryId]);

      if (results.rows.length === 0) {
        return [];
      }

      const content = results.rows.item(0).content;
      const tokens = this.tokenize(content);

      // 提取关键词作为语义标签
      const keywords = this.extractKeywords(tokens, 5);

      return keywords;
    } catch (error) {
      logger.error('Generate semantic tags failed', {error});
      return [];
    }
  }

  /**
   * 全文搜索（用于混合搜索）
   */
  private async fullTextSearch(query: string, topK: number): Promise<SemanticSearchResult[]> {
    try {
      const sql = `
        SELECT id, content, type, tags, createdAt, rank as similarity
        FROM entries_fts
        WHERE entries_fts MATCH ?
        ORDER BY rank DESC
        LIMIT ?
      `;
      const results = await database.executeSql(sql, [query, topK]);

      return results.rows.raw().map(row => ({
        id: row.id,
        content: row.content,
        type: row.type,
        similarity: Math.abs(row.similarity) / 100, // 归一化
        tags: JSON.parse(row.tags || '[]'),
        createdAt: row.createdAt,
      }));
    } catch (error) {
      logger.error('Full text search failed', {error});
      return [];
    }
  }

  /**
   * 分词
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * 计算向量表示
   */
  private computeVector(tokens: string[]): number[] {
    const vector = new Array(this.embeddingDimension).fill(0);

    tokens.forEach((token, index) => {
      const hash = this.hashString(token);
      for (let i = 0; i < this.embeddingDimension; i++) {
        vector[i] += Math.sin(hash + i) * Math.cos(index + i);
      }
    });

    // 归一化
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? vector.map(val => val / norm) : vector;
  }

  /**
   * 余弦相似度
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < Math.min(vec1.length, vec2.length); i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  /**
   * 提取关键词
   */
  private extractKeywords(tokens: string[], topK: number): string[] {
    const frequency: {[key: string]: number} = {};

    tokens.forEach(token => {
      frequency[token] = (frequency[token] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([token]) => token);
  }

  /**
   * 哈希字符串
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * 哈希文本
   */
  private hashText(text: string): string {
    return `hash_${this.hashString(text)}`;
  }

  /**
   * 清除向量缓存
   */
  clearCache(): void {
    this.vectorCache.clear();
    logger.info('Semantic search cache cleared');
  }
}

export const semanticSearchService = new SemanticSearchService();

